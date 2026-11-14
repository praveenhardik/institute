import os
import sys
from flask import Blueprint, g, jsonify, request

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import re
from backend.db import execute_write, query_all, query_one
from backend.auth import require_auth

teacher_bp = Blueprint("teacher", __name__, url_prefix="/api/teacher")

DEPTS_CODE_MAP = {
    'mect': 'MECT',
    'mech': 'MECH',
    'aero': 'AERO',
    'cse': 'CSE',
    'eee': 'EEE',
    'ece': 'ECE'
}

def extract_dept_and_year(user):
    """
    Extracts department code (e.g. MECT, CSE) and academic year (1-4) from user object / fields.
    Handles patterns like:
      tec1 mect, class mect1, tec1mect1, tecaero1, classaero1, tec1cse, tec1ece,
      classcse1, classece1, classeee1, teceee1, leadermect1, stu11_mect, etc.
    "year is mentioned in the last."
    """
    if not user:
        return None, None
        
    text_fields = [
        str(user.get("username") or ""),
        str(user.get("name") or ""),
        str(user.get("email") or "").split("@")[0],
        str(user.get("roll_number") or ""),
        str(user.get("batch_name") or "")
    ]
    combined = " ".join(text_fields).lower()
    cleaned = re.sub(r"^(?:tec|teacher|class(?:_teacher)?|faculty|stu|leader)\s*\d*\s*", "", combined)
    
    # 1. Department
    dept = user.get("dept_code") or user.get("department_code")
    if not dept or dept == "GEN":
        for d in ['mect', 'mech', 'aero', 'cse', 'eee', 'ece']:
            if d in cleaned or d in combined:
                dept = DEPTS_CODE_MAP[d]
                break
                
    # 2. Year: "year is mentioned in the last"
    year = user.get("academic_year")
    if year is not None:
        try:
            year = int(year)
        except (ValueError, TypeError):
            year = None
    if year is None:
        # Check explicit class teacher / teacher / student prefix with year 1-5
        for f in [str(user.get("username") or ""), str(user.get("name") or ""), str(user.get("email") or "").split("@")[0]]:
            m_teacher = re.search(r"(?:class\s*teacher|classteacher|teacher|tec|class|stu|leader)\s*([1-5])", f.lower())
            if m_teacher:
                year = int(m_teacher.group(1))
                break
    if year is None:
        # Check trailing digit in username, name, or email
        for f in [str(user.get("username") or ""), str(user.get("name") or ""), str(user.get("email") or "").split("@")[0]]:
            f_clean = f.strip().lower()
            m_end = re.search(r"([1-5])\s*$", f_clean)
            if m_end:
                year = int(m_end.group(1))
                break
            
    if year is None:
        m_any = re.search(r"\b([1-5])\b|([1-5])", combined)
        if m_any:
            year = int(m_any.group(1) or m_any.group(2))
            
    return dept, year


def _enrich_group_data(group, members):
    """Enrich a group dictionary with member details, questions, correct answers, and student submissions."""
    group["members"] = members
    group["students"] = members
    group["student_count"] = len(members)

    def get_option_text(q_data, opt_letter):
        if not opt_letter:
            return ""
        opt_letter = str(opt_letter).strip().upper()
        if opt_letter == "A":
            return q_data.get("option_a", "")
        if opt_letter == "B":
            return q_data.get("option_b", "")
        if opt_letter == "C":
            return q_data.get("option_c", "")
        if opt_letter == "D":
            return q_data.get("option_d", "")
        return ""

    # 1. Questions specifically published to this group
    group_questions = query_all("""
        SELECT q.id, q.teacher_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
               COALESCE(q.task_number, 'Task 1') as task_number,
               q.correct_option, q.explanation, q.duration_seconds, q.target_type, q.target_group_id,
               q.created_at, u.name as teacher_name
        FROM questions q
        JOIN users u ON q.teacher_id = u.id
        WHERE q.target_group_id = ?
        ORDER BY q.id DESC
    """, (group["id"],))

    # If no questions explicitly targeted to this group, find any questions that members of this group answered
    if not group_questions:
        group_questions = query_all("""
            SELECT DISTINCT q.id, q.teacher_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
                   COALESCE(q.task_number, 'Task 1') as task_number,
                   q.correct_option, q.explanation, q.duration_seconds, q.target_type, q.target_group_id,
                   q.created_at, u.name as teacher_name
            FROM questions q
            JOIN users u ON q.teacher_id = u.id
            JOIN submissions s ON s.question_id = q.id
            JOIN group_students gs ON gs.student_id = s.student_id AND gs.group_id = ?
            ORDER BY q.id DESC
        """, (group["id"],))

    enriched_questions = []
    if group_questions:
        q_ids = [q["id"] for q in group_questions]
        q_placeholders = ",".join("?" for _ in q_ids)
        all_subs = query_all(f"""
            SELECT s.id, s.question_id, s.student_id, s.selected_option, s.is_correct, s.time_taken_seconds, s.submitted_at,
                   u.name as student_name, u.email as student_email, u.username as student_username,
                   sp.roll_number,
                   COALESCE(d.name, 'General') AS department_name
            FROM submissions s
            JOIN users u ON s.student_id = u.id
            JOIN group_students gs ON gs.student_id = u.id AND gs.group_id = ?
            LEFT JOIN student_profiles sp ON sp.user_id = u.id
            LEFT JOIN batches b ON b.id = sp.batch_id
            LEFT JOIN programs p ON p.id = b.program_id
            LEFT JOIN departments d ON d.id = COALESCE(sp.department_id, p.department_id)
            WHERE s.question_id IN ({q_placeholders})
            ORDER BY s.submitted_at DESC
        """, (group["id"], *q_ids))

        subs_by_q = {}
        for sub in all_subs:
            subs_by_q.setdefault(sub["question_id"], {})[sub["student_id"]] = dict(sub)

        for q in group_questions:
            q_dict = dict(q)
            q_dict["correct_answer_text"] = get_option_text(q_dict, q_dict.get("correct_option"))
            subs_by_student = subs_by_q.get(q_dict["id"], {})

        student_results = []
        for m in members:
            sub = subs_by_student.get(m["id"])
            if sub:
                sub["selected_answer_text"] = get_option_text(q_dict, sub["selected_option"])
                sub["correct_option"] = q_dict["correct_option"]
                sub["correct_answer_text"] = q_dict["correct_answer_text"]
                sub["is_correct"] = bool(sub["is_correct"])
                sub["status"] = "submitted"
                student_results.append(sub)
            else:
                student_results.append({
                    "id": None,
                    "student_id": m["id"],
                    "student_name": m["name"],
                    "student_email": m["email"],
                    "student_username": m["username"],
                    "roll_number": m.get("roll_number"),
                    "department_name": m.get("department_name"),
                    "selected_option": None,
                    "selected_answer_text": None,
                    "correct_option": q_dict["correct_option"],
                    "correct_answer_text": q_dict["correct_answer_text"],
                    "is_correct": None,
                    "time_taken_seconds": None,
                    "submitted_at": None,
                    "status": "pending"
                })

        # Include any submissions from other students who might have submitted while in the group
        for s_id, s_obj in subs_by_student.items():
            if not any(r["student_id"] == s_id for r in student_results):
                s_obj["selected_answer_text"] = get_option_text(q_dict, s_obj["selected_option"])
                s_obj["correct_option"] = q_dict["correct_option"]
                s_obj["correct_answer_text"] = q_dict["correct_answer_text"]
                s_obj["is_correct"] = bool(s_obj["is_correct"])
                s_obj["status"] = "submitted"
                student_results.append(s_obj)

        q_dict["submissions"] = list(subs_by_student.values())
        for s in q_dict["submissions"]:
            s["selected_answer_text"] = get_option_text(q_dict, s["selected_option"])
            s["correct_option"] = q_dict["correct_option"]
            s["correct_answer_text"] = q_dict["correct_answer_text"]
            s["is_correct"] = bool(s["is_correct"])
            s["status"] = "submitted"

        q_dict["student_results"] = student_results
        q_dict["submitted_count"] = len(subs_by_student)
        q_dict["correct_count"] = sum(1 for s in subs_by_student.values() if s["is_correct"])
        q_dict["total_members"] = len(members)

        enriched_questions.append(q_dict)

    group["questions"] = enriched_questions
    group["questions_count"] = len(enriched_questions)


@teacher_bp.route("/groups", methods=["GET"])
@require_auth(allowed_roles=["teacher", "class_teacher", "admin", "super_admin", "librarian"])
def get_groups():
    """Retrieve groups created by the teacher/class teacher or all groups with questions and submissions."""
    teacher_id = g.current_user["id"]
    if g.current_user["role"] in ["admin", "super_admin", "librarian"]:
        groups = query_all("""
            SELECT g.id, g.name, g.description, g.created_at, u.name as teacher_name, u.role as teacher_role,
                   (SELECT COUNT(*) FROM group_students gs WHERE gs.group_id = g.id) as student_count
            FROM groups g
            JOIN users u ON g.created_by_teacher_id = u.id
            ORDER BY g.id DESC
        """)
    else:
        groups = query_all("""
            SELECT g.id, g.name, g.description, g.created_at,
                   (SELECT COUNT(*) FROM group_students gs WHERE gs.group_id = g.id) as student_count
            FROM groups g
            WHERE g.created_by_teacher_id = ?
            ORDER BY g.id DESC
        """, (teacher_id,))

    # Enrich with member student IDs, names, emails, usernames, roll numbers, department names, questions, and submissions
    for group in groups:
        members = query_all("""
            SELECT u.id, u.name, u.email, u.username,
                   sp.roll_number,
                   COALESCE(d.name, 'General') AS department_name
            FROM group_students gs
            JOIN users u ON gs.student_id = u.id
            LEFT JOIN student_profiles sp ON sp.user_id = u.id
            LEFT JOIN batches b ON b.id = sp.batch_id
            LEFT JOIN programs p ON p.id = b.program_id
            LEFT JOIN departments d ON d.id = COALESCE(sp.department_id, p.department_id)
            WHERE gs.group_id = ?
            ORDER BY u.name ASC
        """, (group["id"],))
        _enrich_group_data(group, members)

    return jsonify({"groups": groups}), 200

@teacher_bp.route("/groups", methods=["POST"])
@require_auth(allowed_roles=["teacher", "class_teacher", "admin", "super_admin", "dean", "hod", "principal", "academic_coordinator"])
def create_group():
    """Create a new student group."""
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    teacher_id = g.current_user["id"]

    if not name:
        return jsonify({"error": "Group name is required"}), 400

    existing = query_one("SELECT id FROM groups WHERE name = ?", (name,))
    if existing:
        return jsonify({"error": f"A group named '{name}' already exists"}), 400

    group_id = execute_write(
        "INSERT INTO groups (name, description, created_by_teacher_id) VALUES (?, ?, ?)",
        (name, description, teacher_id)
    )

    # Optional initial student assignment
    student_ids = data.get("student_ids", [])
    if isinstance(student_ids, list) and student_ids:
        for sid in student_ids:
            try:
                execute_write(
                    "INSERT OR IGNORE INTO group_students (group_id, student_id) VALUES (?, ?)",
                    (group_id, int(sid))
                )
            except Exception:
                pass

    return jsonify({
        "message": f"Group '{name}' created successfully",
        "group_id": group_id
    }), 201

@teacher_bp.route("/students", methods=["GET"])
@require_auth(allowed_roles=["teacher", "class_teacher", "admin", "super_admin", "dean", "hod", "principal", "academic_coordinator", "librarian"])
def get_available_students():
    """Get all students so teachers can assign them to groups and view rosters."""
    students = query_all("""
        SELECT u.id, u.name, u.email, u.username, u.status, u.created_at,
               sp.roll_number,
               COALESCE(sp.academic_year, u.academic_year) AS academic_year,
               COALESCE(sp.previous_year, u.previous_year) AS previous_year,
               sp.year_changed_at,
               COALESCE(sp.department_id, p.department_id) AS department_id,
               COALESCE(d.code, 'GEN') AS dept_code,
               COALESCE(d.name, 'General') AS department_name,
               b.name AS batch_name,
               s.name AS section_name
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN batches b ON b.id = sp.batch_id
        LEFT JOIN programs p ON p.id = b.program_id
        LEFT JOIN departments d ON d.id = COALESCE(sp.department_id, p.department_id)
        LEFT JOIN sections s ON s.id = sp.section_id
        WHERE u.role IN ('student', 'class_leader')
        ORDER BY u.name ASC
    """)
    for st in students:
        s_dept, s_year = extract_dept_and_year(st)
        if not st.get("academic_year"):
            st["academic_year"] = s_year
        if s_dept and st.get("dept_code") in [None, "GEN"]:
            st["dept_code"] = s_dept

    # For teacher / class teacher, restrict students to their specific department and year if specified
    teacher = g.current_user
    if teacher.get("role") in ["teacher", "class_teacher"]:
        dept_code, teacher_year = extract_dept_and_year(teacher)
        if dept_code or teacher_year:
            filtered = []
            for st in students:
                st_dept = st.get("dept_code")
                st_year = st.get("academic_year")
                st_prev = st.get("previous_year")
                if dept_code and st_dept and st_dept.upper() != dept_code.upper():
                    continue
                if teacher_year and st_year and int(st_year) != int(teacher_year):
                    continue
                filtered.append(st)
            students = filtered

    return jsonify({"students": students}), 200

@teacher_bp.route("/groups/<int:group_id>/assign", methods=["POST"])
@require_auth(allowed_roles=["teacher", "class_teacher", "admin", "super_admin", "dean", "hod", "principal", "academic_coordinator"])
def assign_students_to_group(group_id: int):
    """Assign or update students in a group."""
    group = query_one("SELECT id, name, created_by_teacher_id FROM groups WHERE id = ?", (group_id,))
    if not group:
        return jsonify({"error": "Group not found"}), 404

    # Allow creator or admins / dean
    if group["created_by_teacher_id"] != g.current_user["id"] and g.current_user["role"] not in ["admin", "super_admin", "dean", "principal"]:
        return jsonify({"error": "You do not have permission to modify this group"}), 403

    data = request.get_json() or {}
    student_ids = data.get("student_ids", [])
    if not isinstance(student_ids, list):
        return jsonify({"error": "student_ids must be a list of student user IDs"}), 400

    # Replace group members
    execute_write("DELETE FROM group_students WHERE group_id = ?", (group_id,))
    for sid in student_ids:
        execute_write(
            "INSERT OR IGNORE INTO group_students (group_id, student_id) VALUES (?, ?)",
            (group_id, int(sid))
        )

    return jsonify({
        "message": f"Successfully updated students in group '{group['name']}'.",
        "assigned_count": len(student_ids)
    }), 200

@teacher_bp.route("/groups/<int:group_id>", methods=["DELETE"])
@require_auth(allowed_roles=["teacher", "class_teacher", "admin", "super_admin", "dean", "hod", "principal", "academic_coordinator"])
def delete_group(group_id: int):
    """Delete a student group."""
    group = query_one("SELECT id, name, created_by_teacher_id FROM groups WHERE id = ?", (group_id,))
    if not group:
        return jsonify({"error": "Group not found"}), 404

    if group["created_by_teacher_id"] != g.current_user["id"] and g.current_user["role"] not in ["admin", "super_admin", "dean", "principal"]:
        return jsonify({"error": "You do not have permission to delete this group"}), 403

    execute_write("DELETE FROM group_students WHERE group_id = ?", (group_id,))
    execute_write("DELETE FROM groups WHERE id = ?", (group_id,))
    return jsonify({"message": f"Group '{group['name']}' deleted successfully"}), 200

@teacher_bp.route("/groups/<int:group_id>/submissions", methods=["GET"])
@require_auth(allowed_roles=["teacher", "class_teacher", "admin", "super_admin"])
def get_group_submissions(group_id: int):
    """Retrieve detailed questions, correct answers, and student submissions for a specific group."""
    group = query_one("""
        SELECT g.id, g.name, g.description, g.created_at, g.created_by_teacher_id,
               u.name as teacher_name, u.role as teacher_role
        FROM groups g
        JOIN users u ON g.created_by_teacher_id = u.id
        WHERE g.id = ?
    """, (group_id,))
    if not group:
        return jsonify({"error": "Group not found"}), 404

    members = query_all("""
        SELECT u.id, u.name, u.email, u.username,
               sp.roll_number,
               COALESCE(d.name, 'General') AS department_name
        FROM group_students gs
        JOIN users u ON gs.student_id = u.id
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN batches b ON b.id = sp.batch_id
        LEFT JOIN programs p ON p.id = b.program_id
        LEFT JOIN departments d ON d.id = COALESCE(sp.department_id, p.department_id)
        WHERE gs.group_id = ?
        ORDER BY u.name ASC
    """, (group_id,))

    _enrich_group_data(group, members)
    return jsonify({
        "group": group,
        "questions": group.get("questions", []),
        "members": group.get("members", [])
    }), 200

@teacher_bp.route("/questions", methods=["POST"])
@require_auth(allowed_roles=["teacher", "class_teacher", "admin", "super_admin"])
def create_question():
    """Create a new question.
    Requirements:
    - Minimum duration 30 seconds, maximum 3600 seconds (1 hour).
    - Can publish to 'all' students or specific 'group'.
    - Options A, B, C, D and correct_option.
    """
    teacher_id = g.current_user["id"]
    data = request.get_json() or {}

    question_text = (data.get("question_text") or "").strip()
    opt_a = (data.get("option_a") or "").strip()
    opt_b = (data.get("option_b") or "").strip()
    opt_c = (data.get("option_c") or "").strip()
    opt_d = (data.get("option_d") or "").strip()
    correct_option = (data.get("correct_option") or "").strip().upper()
    explanation = (data.get("explanation") or "").strip()
    task_number = (data.get("task_number") or "").strip()
    target_type = (data.get("target_type") or "all").strip().lower()

    if not task_number:
        return jsonify({"error": "Task number is mandatory (e.g. Task 1). Please select or enter a task number."}), 400

    # Accept either target_group_id or group_id
    raw_group_id = data.get("target_group_id") if data.get("target_group_id") is not None else data.get("group_id")
    target_group_id = None
    if raw_group_id is not None and str(raw_group_id).strip() != "":
        try:
            target_group_id = int(raw_group_id)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid target_group_id format"}), 400

    try:
        duration_seconds = int(data.get("duration_seconds", 60))
    except (ValueError, TypeError):
        return jsonify({"error": "Duration must be an integer between 30 and 3600 seconds"}), 400

    if not question_text or not opt_a or not opt_b or not opt_c or not opt_d:
        return jsonify({"error": "Question text and all four options (A, B, C, D) are required"}), 400

    if correct_option not in ["A", "B", "C", "D"]:
        return jsonify({"error": "Correct option must be one of A, B, C, or D"}), 400

    if duration_seconds < 30 or duration_seconds > 3600:
        return jsonify({"error": "Duration must be between 30 seconds (minimum) and 3600 seconds / 1 hour (maximum)"}), 400

    if target_type not in ["all", "group"]:
        return jsonify({"error": "Target must be 'all' or 'group'"}), 400

    if target_type == "group":
        if not target_group_id:
            return jsonify({"error": "target_group_id is required when publishing to a group"}), 400
        group = query_one("SELECT id, name FROM groups WHERE id = ?", (target_group_id,))
        if not group:
            return jsonify({"error": "Target group not found"}), 404
    else:
        target_group_id = None

    teacher = g.current_user
    dept_code, teacher_year = extract_dept_and_year(teacher)
    target_dept_id = None
    if dept_code:
        dept_row = query_one("SELECT id FROM departments WHERE upper(code) = ? OR upper(name) LIKE ?", (dept_code.upper(), f"%{dept_code.upper()}%"))
        if dept_row:
            target_dept_id = dept_row["id"]
            try:
                execute_write("INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)", (teacher_id, target_dept_id))
            except Exception:
                pass

    question_id = execute_write("""
        INSERT INTO questions (
            teacher_id, question_text, option_a, option_b, option_c, option_d,
            correct_option, explanation, duration_seconds, target_type, target_group_id,
            target_department_id, target_year, task_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        teacher_id, question_text, opt_a, opt_b, opt_c, opt_d,
        correct_option, explanation, duration_seconds, target_type, target_group_id,
        target_dept_id, teacher_year, task_number
    ))

    return jsonify({
        "message": f"Question created and published to {target_type} successfully under {task_number}",
        "question_id": question_id,
        "task_number": task_number
    }), 201

@teacher_bp.route("/tasks", methods=["GET"])
@require_auth(allowed_roles=["teacher", "class_teacher", "admin", "super_admin"])
def get_teacher_tasks():
    """List all available academic tasks with question counts and metadata."""
    try:
        execute_write("""
            CREATE TABLE IF NOT EXISTS academic_tasks (
                id SERIAL PRIMARY KEY,
                task_number TEXT UNIQUE NOT NULL,
                created_by_id INTEGER,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
    except Exception:
        pass

    db_tasks = query_all("SELECT task_number, description, created_at FROM academic_tasks ORDER BY task_number ASC")
    q_tasks = query_all("SELECT DISTINCT COALESCE(task_number, 'Task 1') as task_number FROM questions ORDER BY task_number ASC")

    all_names = set(["Task 1"])
    for r in db_tasks:
        if r.get("task_number"):
            all_names.add(r["task_number"])
    for r in q_tasks:
        if r.get("task_number"):
            all_names.add(r["task_number"])

    sorted_tasks = sorted(list(all_names))

    task_stats = query_all("""
        SELECT COALESCE(q.task_number, 'Task 1') as task_number,
               COUNT(DISTINCT q.id) as question_count,
               COUNT(s.id) as total_submissions
        FROM questions q
        LEFT JOIN submissions s ON s.question_id = q.id
        GROUP BY COALESCE(q.task_number, 'Task 1')
    """)
    stats_map = {r["task_number"]: r for r in task_stats}

    task_details = []
    for t_num in sorted_tasks:
        st = stats_map.get(t_num, {})
        task_details.append({
            "task_number": t_num,
            "question_count": st.get("question_count", 0),
            "total_submissions": st.get("total_submissions", 0)
        })

    return jsonify({
        "tasks": sorted_tasks,
        "task_details": task_details
    }), 200


@teacher_bp.route("/tasks", methods=["POST"])
@require_auth(allowed_roles=["teacher", "class_teacher", "admin", "super_admin"])
def create_teacher_task():
    """Create a new academic task number."""
    data = request.get_json() or {}
    task_number = (data.get("task_number") or "").strip()
    description = (data.get("description") or "").strip()

    if not task_number:
        return jsonify({"error": "Task number/name is required (e.g. 'Task 2')"}), 400

    user_id = g.current_user["id"]

    try:
        execute_write("""
            CREATE TABLE IF NOT EXISTS academic_tasks (
                id SERIAL PRIMARY KEY,
                task_number TEXT UNIQUE NOT NULL,
                created_by_id INTEGER,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        execute_write("""
            INSERT INTO academic_tasks (task_number, created_by_id, description)
            VALUES (?, ?, ?)
            ON CONFLICT (task_number) DO UPDATE SET description = EXCLUDED.description
        """, (task_number, user_id, description))
    except Exception:
        pass

    return jsonify({
        "message": f"Task '{task_number}' created successfully",
        "task_number": task_number
    }), 201

@teacher_bp.route("/questions", methods=["GET"])
@require_auth(allowed_roles=["teacher", "class_teacher", "admin", "super_admin"])
def get_teacher_questions():
    """List questions with submission statistics."""
    teacher_id = g.current_user["id"]
    if g.current_user["role"] in ["admin", "super_admin"]:
        questions = query_all("""
            SELECT q.id, q.teacher_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
                   COALESCE(q.task_number, 'Task 1') as task_number,
                   q.correct_option, q.explanation, q.duration_seconds, q.target_type, q.target_group_id,
                   q.target_department_id, q.target_year, d_t.name as target_department_name,
                   q.created_at, g.name as group_name, u.name as teacher_name,
                   (SELECT COUNT(*) FROM submissions s WHERE s.question_id = q.id) as total_submissions,
                   (SELECT COUNT(*) FROM submissions s WHERE s.question_id = q.id AND s.is_correct = 1) as correct_count
            FROM questions q
            LEFT JOIN groups g ON q.target_group_id = g.id
            LEFT JOIN departments d_t ON q.target_department_id = d_t.id
            JOIN users u ON q.teacher_id = u.id
            ORDER BY q.id DESC
        """)
    else:
        questions = query_all("""
            SELECT q.id, q.teacher_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
                   COALESCE(q.task_number, 'Task 1') as task_number,
                   q.correct_option, q.explanation, q.duration_seconds, q.target_type, q.target_group_id,
                   q.target_department_id, q.target_year, d_t.name as target_department_name,
                   q.created_at, g.name as group_name,
                   (SELECT COUNT(*) FROM submissions s WHERE s.question_id = q.id) as total_submissions,
                   (SELECT COUNT(*) FROM submissions s WHERE s.question_id = q.id AND s.is_correct = 1) as correct_count
            FROM questions q
            LEFT JOIN groups g ON q.target_group_id = g.id
            LEFT JOIN departments d_t ON q.target_department_id = d_t.id
            WHERE q.teacher_id = ?
            ORDER BY q.id DESC
        """, (teacher_id,))

    return jsonify({"questions": questions}), 200

@teacher_bp.route("/questions/<int:question_id>/submissions", methods=["GET"])
@require_auth(allowed_roles=["teacher", "class_teacher", "admin", "super_admin"])
def get_question_submissions(question_id: int):
    """View all student submissions for a question."""
    question = query_one("SELECT * FROM questions WHERE id = ?", (question_id,))
    if not question:
        return jsonify({"error": "Question not found"}), 404

    submissions = query_all("""
        SELECT s.id, s.student_id, s.selected_option, s.is_correct, s.time_taken_seconds, s.submitted_at,
               u.name as student_name, u.email as student_email
        FROM submissions s
        JOIN users u ON s.student_id = u.id
        WHERE s.question_id = ?
        ORDER BY s.submitted_at DESC
    """, (question_id,))

    return jsonify({
        "question": question,
        "submissions": submissions,
        "total_attempted": len(submissions),
        "total_correct": sum(1 for s in submissions if s["is_correct"] == 1)
    }), 200

@teacher_bp.route("/questions/<int:question_id>", methods=["DELETE"])
@require_auth(allowed_roles=["teacher", "class_teacher", "admin", "super_admin"])
def delete_question(question_id: int):
    """Permanently delete a published question and all its student submissions."""
    q = query_one("SELECT * FROM questions WHERE id = ?", (question_id,))
    if not q:
        return jsonify({"error": "Question not found"}), 404

    # Permission check: teachers and class teachers can delete questions they created; admins/super_admins can delete any
    if g.current_user["role"] in ["teacher", "class_teacher"] and q["teacher_id"] != g.current_user["id"]:
        return jsonify({"error": "Permission denied: you can only delete questions created by you"}), 403

    # Delete all submissions associated with the question
    execute_write("DELETE FROM submissions WHERE question_id = ?", (question_id,))
    # Delete notifications referencing this question if any
    execute_write("DELETE FROM notifications WHERE type = 'question' AND reference_id = ?", (question_id,))
    # Delete the question itself
    execute_write("DELETE FROM questions WHERE id = ?", (question_id,))

    return jsonify({"message": "Question and all submissions permanently deleted successfully"}), 200


@teacher_bp.route("/tasks/<path:task_number>", methods=["DELETE"])
@require_auth(allowed_roles=["teacher", "class_teacher", "admin", "super_admin"])
def delete_task(task_number: str):
    """Permanently delete a task completely and all its questions and student submissions."""
    task_number = (task_number or "").strip()
    if not task_number:
        return jsonify({"error": "Task number is required"}), 400

    user = g.current_user
    if user["role"] in ["admin", "super_admin"]:
        q_rows = query_all("SELECT id FROM questions WHERE task_number = ?", (task_number,))
    else:
        q_rows = query_all("SELECT id FROM questions WHERE task_number = ? AND teacher_id = ?", (task_number, user["id"]))

    deleted_from_tasks = 0
    try:
        deleted_from_tasks = execute_write("DELETE FROM academic_tasks WHERE task_number = ?", (task_number,))
    except Exception:
        pass

    if not q_rows and not deleted_from_tasks:
        return jsonify({"error": f"No questions or tasks found for '{task_number}'"}), 404

    q_ids = [r["id"] for r in q_rows]
    if q_ids:
        q_placeholders = ",".join("?" for _ in q_ids)
        execute_write(f"DELETE FROM submissions WHERE question_id IN ({q_placeholders})", tuple(q_ids))
        execute_write(f"DELETE FROM notifications WHERE type = 'question' AND reference_id IN ({q_placeholders})", tuple(q_ids))
        execute_write(f"DELETE FROM questions WHERE id IN ({q_placeholders})", tuple(q_ids))

    return jsonify({
        "message": f"Task '{task_number}' and all {len(q_ids)} associated question(s) permanently deleted successfully.",
        "deleted_count": len(q_ids),
        "task_number": task_number
    }), 200



def get_caller_dept_id(caller):
    """Resolve caller's department id and code."""
    if not caller:
        return None, None
    uid = caller.get("id")
    dept = query_one("""
        SELECT COALESCE(
            (SELECT sd.department_id FROM staff_departments sd WHERE sd.user_id = u.id ORDER BY sd.id LIMIT 1),
            sp.department_id
        ) as id,
        COALESCE(
            (SELECT d2.code FROM staff_departments sd JOIN departments d2 ON d2.id = sd.department_id WHERE sd.user_id = u.id ORDER BY sd.id LIMIT 1),
            d.code
        ) as code
        FROM users u
        LEFT JOIN staff_profiles sp ON sp.user_id = u.id
        LEFT JOIN departments d ON d.id = sp.department_id
        WHERE u.id = ?
    """, (uid,))
    if dept and dept.get("id"):
        return dept["id"], dept.get("code")
    c_dept, _ = extract_dept_and_year(caller)
    if c_dept:
        d_row = query_one("SELECT id, code FROM departments WHERE upper(code) = ?", (c_dept.upper(),))
        if d_row:
            return d_row["id"], d_row["code"]
    return None, None


def compute_promoted_credentials(name, username, email, from_year, to_year):
    """
    Computes updated Name, Username, and Email reflecting the student's new academic year.
    E.g. stu11_mect -> stu21_mect, stu11_mect@inpand.com -> stu21_mect@inpand.com
         leadermect1 -> leadermect2, leadermect11@inpand.com -> leadermect21@inpand.com
    """
    fy_str = str(from_year)
    ty_str = str(to_year)

    # 1. Username
    new_username = username
    if username.startswith(f"stu{fy_str}"):
        new_username = f"stu{ty_str}" + username[len(f"stu{fy_str}"):]
    elif re.search(rf'leader([a-zA-Z]+){fy_str}$', username):
        new_username = re.sub(rf'leader([a-zA-Z]+){fy_str}$', rf'leader\g<1>{ty_str}', username)
    else:
        new_username = re.sub(rf'(stu|year|yr|leader){fy_str}', rf'\g<1>{ty_str}', username, flags=re.IGNORECASE)

    # 2. Name
    new_name = name
    if name.startswith(f"stu{fy_str}"):
        new_name = f"stu{ty_str}" + name[len(f"stu{fy_str}"):]
    elif re.search(rf'leader\s+([a-zA-Z]+){fy_str}$', name):
        new_name = re.sub(rf'leader\s+([a-zA-Z]+){fy_str}$', rf'leader \g<1>{ty_str}', name)
    elif re.search(rf'leader([a-zA-Z]+){fy_str}$', name):
        new_name = re.sub(rf'leader([a-zA-Z]+){fy_str}$', rf'leader\g<1>{ty_str}', name)
    else:
        new_name = re.sub(rf'(stu|year|yr|leader\s*){fy_str}', rf'\g<1>{ty_str}', name, flags=re.IGNORECASE)

    # 3. Email
    if "@" in email:
        local_part, domain = email.split("@", 1)
        if local_part.startswith(f"stu{fy_str}"):
            new_local = f"stu{ty_str}" + local_part[len(f"stu{fy_str}"):]
        elif re.search(rf'leader([a-zA-Z]+){fy_str}(\d*)$', local_part):
            new_local = re.sub(rf'leader([a-zA-Z]+){fy_str}(\d*)$', rf'leader\g<1>{ty_str}\2', local_part)
        else:
            new_local = new_username
        new_email = f"{new_local}@{domain}"
    else:
        new_email = f"{new_username}@inpand.com"

    return new_name, new_username, new_email


@teacher_bp.route("/students-for-year", methods=["GET"])
@require_auth(allowed_roles=["class_teacher", "teacher", "admin", "super_admin", "dean", "hod", "principal"])
def get_students_for_year():
    """Fetch students scoped strictly to the given academic year and department."""
    caller = g.current_user
    year = request.args.get("year", type=int)
    dept_id = request.args.get("department_id", type=int)

    all_depts = query_all("SELECT id, name, code FROM departments ORDER BY name")
    caller_dept_id, caller_dept_code = get_caller_dept_id(caller)
    caller_dept = None
    if caller_dept_id:
        c_row = query_one("SELECT id, name, code FROM departments WHERE id = ?", (caller_dept_id,))
        if c_row:
            caller_dept = dict(c_row)

    # If class teacher or teacher, restrict strictly to their department
    if caller.get("role") in ["teacher", "class_teacher"]:
        if caller_dept_id:
            dept_id = caller_dept_id

    query = """
        SELECT u.id, u.name, u.username, u.email, u.status, u.role,
               COALESCE(sp.academic_year, u.academic_year) as academic_year,
               COALESCE(sp.previous_year, u.previous_year) as previous_year,
               d.id as department_id, d.name as department_name, d.code as department_code
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN batches b ON b.id = sp.batch_id
        LEFT JOIN programs p ON p.id = b.program_id
        LEFT JOIN departments d ON d.id = COALESCE(sp.department_id, p.department_id)
        WHERE u.role IN ('student', 'class_leader')
    """
    params = []
    if year:
        query += " AND COALESCE(sp.academic_year, u.academic_year) = ?"
        params.append(year)
    if dept_id:
        query += " AND COALESCE(sp.department_id, p.department_id) = ?"
        params.append(dept_id)

    query += " ORDER BY u.academic_year ASC, u.id ASC"

    rows = query_all(query, tuple(params))
    students = [dict(r) for r in rows]

    return jsonify({
        "students": students,
        "caller_department": caller_dept,
        "departments": [dict(d) for d in all_depts]
    }), 200


@teacher_bp.route("/change-student-year", methods=["POST"])
@require_auth(allowed_roles=["class_teacher", "teacher", "admin", "super_admin", "dean", "hod", "principal"])
def change_student_year():
    """Promote or change students from one academic year to another, updating full names and emails, or locking logins for passed out students."""
    import datetime
    data = request.get_json() or {}
    from_year = data.get("from_year")
    to_year_raw = data.get("to_year")
    student_ids = data.get("student_ids") or []
    all_students_selected = bool(data.get("all_students", False))
    requested_dept_id = data.get("department_id")

    if not from_year or to_year_raw is None:
        return jsonify({"error": "Both 'From Year' and 'To Year' are required"}), 400

    try:
        from_year = int(from_year)
    except (ValueError, TypeError):
        return jsonify({"error": "'From Year' must be a valid year number"}), 400

    is_passed_out = False
    if str(to_year_raw).lower() in ["5", "passed_out", "graduated", "pass_out"]:
        is_passed_out = True
        to_year = 5
    else:
        try:
            to_year = int(to_year_raw)
        except (ValueError, TypeError):
            return jsonify({"error": "'To Year' must be a valid year number or 'passed_out'"}), 400

    if not is_passed_out and from_year == to_year:
        return jsonify({"error": "Target year ('To Year') must be different from current year ('From Year')"}), 400

    caller = g.current_user
    caller_dept_id, caller_dept_code = get_caller_dept_id(caller)

    # Department Scoping:
    # Class Teachers can only affect students in their department
    target_dept_id = None
    if caller.get("role") in ["teacher", "class_teacher"]:
        target_dept_id = caller_dept_id
    elif requested_dept_id:
        try:
            target_dept_id = int(requested_dept_id)
        except (ValueError, TypeError):
            target_dept_id = None

    # Fetch candidate students matching department
    query = """
        SELECT u.id, u.name, u.username, u.email, u.status, u.role,
               COALESCE(sp.academic_year, u.academic_year) as academic_year,
               d.id as department_id, d.code as dept_code, d.name as dept_name
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN batches b ON b.id = sp.batch_id
        LEFT JOIN programs p ON p.id = b.program_id
        LEFT JOIN departments d ON d.id = COALESCE(sp.department_id, p.department_id)
        WHERE u.role IN ('student', 'class_leader')
    """
    params = []
    if target_dept_id:
        query += " AND COALESCE(sp.department_id, p.department_id) = ?"
        params.append(target_dept_id)

    if (all_students_selected or not student_ids) and from_year != 'all':
        query += " AND COALESCE(sp.academic_year, u.academic_year) = ?"
        params.append(int(from_year))

    matching_candidates = query_all(query, tuple(params))
    candidate_dict = {c["id"]: dict(c) for c in matching_candidates}

    final_target_ids = []
    if all_students_selected or not student_ids:
        final_target_ids = list(candidate_dict.keys())
    else:
        # Filter student_ids to valid candidates in this department
        int_sids = [int(sid) for sid in student_ids if str(sid).isdigit()]
        final_target_ids = [sid for sid in int_sids if sid in candidate_dict]

    if not final_target_ids:
        return jsonify({"error": f"No eligible students found for the selected department"}), 404

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    updated_records = []

    for sid in final_target_ids:
        cand = candidate_dict[sid]
        st_from_year = cand.get("academic_year") or (int(from_year) if from_year != 'all' else 1)
        old_name = cand["name"]
        old_username = cand["username"]
        old_email = cand["email"]

        st_is_passed_out = is_passed_out or st_from_year >= 4 or (to_year >= 5 if isinstance(to_year, int) else False)
        st_to_year = 5 if st_is_passed_out else (to_year if (isinstance(to_year, int) and st_from_year == from_year) else (st_from_year + 1))

        if st_is_passed_out:
            # Mark final year / passed out student: lock login
            execute_write("""
                UPDATE users
                SET status = 'passed_out',
                    academic_year = 5,
                    previous_year = ?
                WHERE id = ?
            """, (st_from_year, sid))

            execute_write("""
                UPDATE student_profiles
                SET academic_year = 5,
                    previous_year = ?,
                    year_changed_at = ?
                WHERE user_id = ?
            """, (st_from_year, now_str, sid))

            updated_records.append({
                "id": sid,
                "old_name": old_name,
                "new_name": old_name,
                "old_username": old_username,
                "new_username": old_username,
                "old_email": old_email,
                "new_email": old_email,
                "status": "passed_out"
            })
        else:
            new_name, new_username, new_email = compute_promoted_credentials(
                old_name, old_username, old_email, st_from_year, st_to_year
            )

            # Avoid collision by checking if new_username or new_email already taken by someone else
            existing_user = query_one(
                "SELECT id FROM users WHERE (lower(username) = ? OR lower(email) = ?) AND id != ?",
                (new_username.lower(), new_email.lower(), sid)
            )
            if existing_user:
                new_username = old_username
                new_email = old_email

            execute_write("""
                UPDATE users
                SET name = ?,
                    username = ?,
                    email = ?,
                    academic_year = ?,
                    previous_year = ?
                WHERE id = ?
            """, (new_name, new_username, new_email, st_to_year, st_from_year, sid))

            execute_write("""
                UPDATE student_profiles
                SET academic_year = ?,
                    previous_year = ?,
                    year_changed_at = ?
                WHERE user_id = ?
            """, (st_to_year, st_from_year, now_str, sid))

            updated_records.append({
                "id": sid,
                "old_name": old_name,
                "new_name": new_name,
                "old_username": old_username,
                "new_username": new_username,
                "old_email": old_email,
                "new_email": new_email,
                "status": "active"
            })

    # Send in-app notification
    try:
        dest_label = "Passed Out (Graduated)" if (is_passed_out or to_year >= 5) else f"Year {to_year}"
        execute_write("""
            INSERT INTO notifications (recipient_role, sender_id, sender_role, sender_name, type, title, message, is_read)
            VALUES (?, ?, ?, ?, 'system', 'Student Academic Year Transition', ?, 0)
        """, (
            'super_admin',
            caller.get('id'),
            caller.get('role'),
            caller.get('name', 'Faculty'),
            f"{len(updated_records)} students were transitioned from Year {from_year} to {dest_label}."
        ))
    except Exception as e:
        print("Note: sending year change notification:", e)

    return jsonify({
        "success": True,
        "message": f"Successfully transitioned {len(updated_records)} students from Year {from_year} to {'Passed Out' if (is_passed_out or to_year >= 5) else f'Year {to_year}'}.",
        "count": len(updated_records),
        "from_year": from_year,
        "to_year": "Passed Out" if (is_passed_out or to_year >= 5) else to_year,
        "is_passed_out": is_passed_out or to_year >= 5,
        "students": updated_records
    }), 200
