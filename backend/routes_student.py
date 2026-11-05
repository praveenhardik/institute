import os
import sys
from flask import Blueprint, g, jsonify, request

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.db import execute_write, query_all, query_one
from backend.auth import require_auth
from backend.routes_teacher import extract_dept_and_year

student_bp = Blueprint("student", __name__, url_prefix="/api/student")

def _check_student_question_access(question: dict, student_id: int) -> bool:
    """Ensure the question is assigned to the student by a teacher or class teacher, respecting department & year restrictions."""
    if not question:
        return False
    # Author must have role 'teacher' or 'class_teacher'
    author = query_one("SELECT * FROM users WHERE id = ?", (question["teacher_id"],))
    if not author or author["role"] not in ["teacher", "class_teacher"]:
        return False

    student = query_one("""
        SELECT u.id, u.name, u.username, u.email,
               COALESCE(sp.department_id, p.department_id) as department_id,
               COALESCE(d.code, 'GEN') as dept_code
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN batches b ON b.id = sp.batch_id
        LEFT JOIN programs p ON p.id = b.program_id
        LEFT JOIN departments d ON d.id = COALESCE(sp.department_id, p.department_id)
        WHERE u.id = ?
    """, (student_id,))
    if not student:
        return False

    st_dept, st_year = extract_dept_and_year(student)
    auth_dept, auth_year = extract_dept_and_year(author)

    # Department restriction check: e.g. MECT only
    target_dept_id = question.get("target_department_id")
    if target_dept_id:
        if student.get("department_id") and target_dept_id != student["department_id"]:
            return False
    elif auth_dept and st_dept and auth_dept.upper() != st_dept.upper():
        return False

    # Year restriction check: "they can able to create the question to the of those depart in that year only. year is mentioned in the last."
    target_year = question.get("target_year") or auth_year
    if target_year and st_year and target_year != st_year:
        return False

    if question.get("target_type") == "group":
        member = query_one(
            "SELECT 1 FROM group_students WHERE group_id = ? AND student_id = ?",
            (question.get("target_group_id"), student_id)
        )
        return bool(member)

    if question.get("target_type") == "all":
        # Check student's department matches teacher's department
        dept_id = student.get("department_id")
        if not dept_id:
            if st_dept and auth_dept and st_dept.upper() == auth_dept.upper():
                return True
            return False

        is_assigned = query_one("""
            SELECT 1 FROM users u
            WHERE u.id = ? AND u.role IN ('teacher', 'class_teacher')
              AND (
                  u.id IN (SELECT user_id FROM staff_departments WHERE department_id = ?)
                  OR u.id IN (SELECT user_id FROM staff_profiles WHERE department_id = ?)
              )
        """, (question["teacher_id"], dept_id, dept_id))
        if is_assigned:
            return True
        if auth_dept and st_dept and auth_dept.upper() == st_dept.upper():
            return True
        return False

    return False


@student_bp.route("/questions", methods=["GET"])
@require_auth(allowed_roles=["student", "class_leader"])
def get_available_questions():
    """Fetch only questions assigned to this student by their teacher or class teacher in their department and year."""
    student_id = g.current_user["id"]
    student = g.current_user
    st_dept, st_year = extract_dept_and_year(student)

    # Retrieve groups the student is enrolled in
    student_groups = query_all(
        "SELECT group_id FROM group_students WHERE student_id = ?",
        (student_id,)
    )
    group_ids = [row["group_id"] for row in student_groups]

    # Retrieve student's academic department
    dept_row = query_one("""
        SELECT COALESCE(sp.department_id, p.department_id) as department_id,
               COALESCE(d.code, 'GEN') as dept_code
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN batches b ON b.id = sp.batch_id
        LEFT JOIN programs p ON p.id = b.program_id
        LEFT JOIN departments d ON d.id = COALESCE(sp.department_id, p.department_id)
        WHERE u.id = ?
    """, (student_id,))
    student_dept_id = dept_row["department_id"] if dept_row else None
    if not st_dept and dept_row and dept_row.get("dept_code") != "GEN":
        st_dept = dept_row.get("dept_code")

    target_conditions = []
    params = [student_id]

    if group_ids:
        placeholders = ",".join("?" for _ in group_ids)
        target_conditions.append(f"(q.target_type = 'group' AND q.target_group_id IN ({placeholders}))")
        params.extend(group_ids)

    all_conds = []
    if student_dept_id:
        all_conds.append("""(
            q.target_department_id = ? OR (
                q.target_department_id IS NULL AND q.teacher_id IN (
                    SELECT user_id FROM staff_departments WHERE department_id = ?
                    UNION
                    SELECT user_id FROM staff_profiles WHERE department_id = ?
                )
            )
        )""")
        params.extend([student_dept_id, student_dept_id, student_dept_id])
    elif st_dept:
        all_conds.append("""(
            q.target_department_id IN (SELECT id FROM departments WHERE upper(code) = ? OR upper(name) LIKE ?)
        )""")
        params.extend([st_dept.upper(), f"%{st_dept.upper()}%"])

    if all_conds:
        target_conditions.append(f"(q.target_type = 'all' AND ({' OR '.join(all_conds)}))")

    # If the student is not in any group and has no department, they have no assigned questions
    if not target_conditions:
        return jsonify({"questions": []}), 200

    # Year filter condition:
    # If question has target_year set, student MUST match target_year!
    year_filter_sql = ""
    if st_year:
        year_filter_sql = "AND (q.target_year IS NULL OR q.target_year = ?)"
        params.append(st_year)
    else:
        year_filter_sql = "AND q.target_year IS NULL"

    sql = f"""
        SELECT q.id, q.teacher_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
               COALESCE(q.task_number, 'Task 1') as task_number,
               q.duration_seconds, q.target_type, q.target_group_id, q.target_department_id, q.target_year,
               q.created_at,
               u.name as teacher_name, u.role as teacher_role, g.name as group_name,
               s.selected_option as user_selected_option, s.is_correct as user_is_correct,
               s.time_taken_seconds as user_time_taken, s.submitted_at as user_submitted_at,
               CASE WHEN s.id IS NOT NULL THEN q.correct_option ELSE NULL END as correct_option,
               CASE WHEN s.id IS NOT NULL THEN q.explanation ELSE NULL END as explanation
        FROM questions q
        JOIN users u ON q.teacher_id = u.id
        LEFT JOIN groups g ON q.target_group_id = g.id
        LEFT JOIN submissions s ON q.id = s.question_id AND s.student_id = ?
        WHERE u.role IN ('teacher', 'class_teacher')
          AND ({' OR '.join(target_conditions)})
          {year_filter_sql}
        ORDER BY q.id DESC
    """
    raw_questions = query_all(sql, tuple(params))

    # Python-level verification: ensure author's department and year match student's if specified
    final_questions = []
    if raw_questions:
        teacher_ids = list({q["teacher_id"] for q in raw_questions if q.get("teacher_id")})
        authors_map = {}
        if teacher_ids:
            ph = ",".join("?" for _ in teacher_ids)
            for u in query_all(f"SELECT * FROM users WHERE id IN ({ph})", tuple(teacher_ids)):
                authors_map[u["id"]] = u
        for q in raw_questions:
            author = authors_map.get(q.get("teacher_id"))
            auth_dept, auth_year = extract_dept_and_year(author)
            if auth_dept and st_dept and auth_dept.upper() != st_dept.upper():
                continue
            if auth_year and st_year and auth_year != st_year:
                continue
            final_questions.append(q)

    return jsonify({"questions": final_questions}), 200


@student_bp.route("/questions/<int:question_id>", methods=["GET"])
@require_auth(allowed_roles=["student", "class_leader"])
def get_single_question(question_id: int):
    """Get question details for starting a quiz attempt."""
    student_id = g.current_user["id"]
    question = query_one("""
        SELECT q.id, q.teacher_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
               COALESCE(q.task_number, 'Task 1') as task_number,
               q.duration_seconds, q.target_type, q.target_group_id, q.created_at,
               u.name as teacher_name, g.name as group_name
        FROM questions q
        JOIN users u ON q.teacher_id = u.id
        LEFT JOIN groups g ON q.target_group_id = g.id
        WHERE q.id = ?
    """, (question_id,))

    if not question:
        return jsonify({"error": "Question not found"}), 404

    # Verify authorization: must be assigned by teacher or class teacher
    if not _check_student_question_access(question, student_id):
        return jsonify({"error": "This question is not assigned to you by your teacher or class teacher"}), 403

    # Check if student has already submitted
    existing_sub = query_one(
        "SELECT * FROM submissions WHERE question_id = ? AND student_id = ?",
        (question_id, student_id)
    )

    result = dict(question)
    if existing_sub:
        full_q = query_one("SELECT correct_option, explanation FROM questions WHERE id = ?", (question_id,))
        result["already_submitted"] = True
        result["selected_option"] = existing_sub["selected_option"]
        result["is_correct"] = bool(existing_sub["is_correct"])
        result["correct_option"] = full_q["correct_option"]
        result["explanation"] = full_q["explanation"]
        result["time_taken_seconds"] = existing_sub["time_taken_seconds"]
    else:
        result["already_submitted"] = False

    return jsonify({"question": result}), 200


@student_bp.route("/questions/<int:question_id>/submit", methods=["POST"])
@require_auth(allowed_roles=["student", "class_leader"])
def submit_answer(question_id: int):
    """Submit answer for a question.
    Returns:
    - is_correct: True/False
    - correct_option: The right answer ('A', 'B', 'C', 'D')
    - explanation: Explanatory notes
    This allows immediate green/red UI coloring.
    """
    student_id = g.current_user["id"]
    data = request.get_json() or {}

    selected_option = (data.get("selected_option") or "").strip().upper()
    try:
        time_taken_seconds = int(data.get("time_taken_seconds", 0))
    except (ValueError, TypeError):
        time_taken_seconds = 0

    if selected_option not in ["A", "B", "C", "D"]:
        return jsonify({"error": "Selected option must be one of A, B, C, or D"}), 400

    question = query_one("SELECT * FROM questions WHERE id = ?", (question_id,))
    if not question:
        return jsonify({"error": "Question not found"}), 404

    # Verify authorization: must be assigned by teacher or class teacher
    if not _check_student_question_access(question, student_id):
        return jsonify({"error": "This question is not assigned to you by your teacher or class teacher"}), 403

    # Check for duplicate submission
    existing = query_one(
        "SELECT * FROM submissions WHERE question_id = ? AND student_id = ?",
        (question_id, student_id)
    )
    if existing:
        return jsonify({
            "error": "You have already answered this question. Each question can be answered only once.",
            "already_submitted": True,
            "selected_option": existing["selected_option"],
            "is_correct": bool(existing["is_correct"]),
            "correct_option": question["correct_option"],
            "explanation": question["explanation"],
            "time_taken_seconds": existing["time_taken_seconds"]
        }), 409

    is_correct = 1 if selected_option == question["correct_option"] else 0

    sub_id = execute_write("""
        INSERT INTO submissions (question_id, student_id, selected_option, is_correct, time_taken_seconds)
        VALUES (?, ?, ?, ?, ?)
    """, (question_id, student_id, selected_option, is_correct, time_taken_seconds))

    return jsonify({
        "message": "Answer evaluated successfully",
        "submission_id": sub_id,
        "question_id": question_id,
        "selected_option": selected_option,
        "is_correct": bool(is_correct),
        "correct_option": question["correct_option"],
        "explanation": question["explanation"],
        "time_taken_seconds": time_taken_seconds
    }), 200

@student_bp.route("/history", methods=["GET"])
@require_auth(allowed_roles=["student", "class_leader"])
def get_student_history():
    """Retrieve quiz attempt history and performance stats for the student."""
    student_id = g.current_user["id"]
    submissions = query_all("""
        SELECT s.id, s.question_id, s.selected_option, s.is_correct, s.time_taken_seconds, s.submitted_at,
               q.question_text, q.correct_option, q.explanation, q.duration_seconds
        FROM submissions s
        JOIN questions q ON s.question_id = q.id
        WHERE s.student_id = ?
        ORDER BY s.submitted_at DESC
    """, (student_id,))

    total = len(submissions)
    correct = sum(1 for s in submissions if s["is_correct"] == 1)
    score_percentage = round((correct / total * 100), 1) if total > 0 else 0

    return jsonify({
        "total_attempted": total,
        "total_correct": correct,
        "score_percentage": score_percentage,
        "history": submissions
    }), 200
