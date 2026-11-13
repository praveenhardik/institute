"""College management (Phase 1): academic setup, HOD and staff, student profiles,
subjects, and period-wise attendance."""
import os
import re
import sqlite3
import sys
from datetime import date
from typing import Optional

from flask import Blueprint, g, jsonify, request

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.db import IntegrityError, execute_write, get_db_connection, query_all, query_one
from backend.auth import require_auth

college_bp = Blueprint("college", __name__, url_prefix="/api/college")

SETUP_ROLES = ["super_admin", "admin"]
STAFF_ROLES = ["super_admin", "admin", "hod"]          # can manage staff, students, subjects
FACULTY_ROLES = ["teacher", "class_teacher"]           # can be assigned subjects and mark attendance
STAFF_TARGET_ROLES = ["teacher", "class_teacher", "hod"]
STUDENT_ROLES = ["student", "class_leader"]
SHORTAGE_LIMIT = 75                                    # percent attendance required
EDIT_WINDOW_HOURS = 24
PERIODS = range(1, 9)
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _str(data, key):
    value = data.get(key)
    return "" if value is None else str(value).strip()


def _int_or_none(value):
    if value in (None, "", "null"):
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return -1


def _my_department_id():
    dept_row = query_one("SELECT id FROM departments WHERE hod_user_id = ?", (g.current_user["id"],))
    if dept_row and dept_row.get("id"):
        return dept_row["id"]
    row = query_one("SELECT department_id FROM staff_profiles WHERE user_id = ?", (g.current_user["id"],))
    if row and row.get("department_id"):
        return row["department_id"]
    sd_row = query_one("SELECT department_id FROM staff_departments WHERE user_id = ?", (g.current_user["id"],))
    if sd_row and sd_row.get("department_id"):
        return sd_row["department_id"]
    return None


def _is_hod_scope():
    return g.current_user["role"] == "hod"


def _integrity_message(err):
    text = str(err)
    if "UNIQUE" in text.upper() or "DUPLICATE" in text.upper():
        return "This name, code, roll number or date already exists"
    return "A linked record does not exist"


def _save(sql, args):
    try:
        return execute_write(sql, args), None
    except (IntegrityError, sqlite3.IntegrityError) as err:
        return None, _integrity_message(err)


def _valid_date(value):
    if not DATE_RE.match(value or ""):
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


# ---------------------------------------------------------------------------
# Academic setup (Super Admin / College Admin manage; everyone signed in can read)
# ---------------------------------------------------------------------------

@college_bp.route("/academic-years", methods=["GET"])
@require_auth()
def list_years():
    return jsonify({"years": query_all("SELECT * FROM academic_years ORDER BY start_date DESC")}), 200


def _notify_teaching_staff(title, message, reference_id):
    """Put a notice in My Notifications for every Teacher and Class Teacher."""
    sender = g.current_user
    for role in ("teacher", "class_teacher"):
        execute_write("""
            INSERT INTO notifications (recipient_role, sender_id, sender_role, sender_name, type, title, message, reference_id, is_read)
            VALUES (?, ?, ?, ?, 'broadcast', ?, ?, ?, 0)
        """, (role, sender["id"], sender["role"], sender["name"], title, message, reference_id))


@college_bp.route("/academic-years", methods=["POST"])
@require_auth(allowed_roles=SETUP_ROLES)
def create_year():
    data = request.get_json() or {}
    name, start, end = _str(data, "name"), _str(data, "start_date"), _str(data, "end_date")
    if not name or not _valid_date(start) or not _valid_date(end) or end <= start:
        return jsonify({"error": "Name, a start date and a later end date are required"}), 400
    new_id, err = _save("INSERT INTO academic_years (name, start_date, end_date) VALUES (?, ?, ?)", (name, start, end))
    if err:
        return jsonify({"error": err}), 400
    _notify_teaching_staff(
        f"New Academic Year: {name}",
        f"{g.current_user['name']} added the academic year {name}, from {start} to {end}.",
        new_id)
    return jsonify({"message": f"Academic year {name} added", "id": new_id}), 201


@college_bp.route("/semesters", methods=["GET"])
@require_auth()
def list_semesters():
    rows = query_all("""
        SELECT s.id, s.name, s.start_date, s.end_date, s.academic_year_id, y.name AS academic_year
        FROM semesters s JOIN academic_years y ON s.academic_year_id = y.id
        ORDER BY y.start_date DESC, s.start_date
    """)
    return jsonify({"semesters": rows}), 200


@college_bp.route("/semesters", methods=["POST"])
@require_auth(allowed_roles=SETUP_ROLES)
def create_semester():
    data = request.get_json() or {}
    year_id = _int_or_none(data.get("academic_year_id"))
    name, start, end = _str(data, "name"), _str(data, "start_date"), _str(data, "end_date")
    if not year_id or year_id < 0 or not name or not _valid_date(start) or not _valid_date(end) or end <= start:
        return jsonify({"error": "Academic year, semester name and valid start/end dates are required"}), 400
    new_id, err = _save(
        "INSERT INTO semesters (academic_year_id, name, start_date, end_date) VALUES (?, ?, ?, ?)",
        (year_id, name, start, end))
    if err:
        return jsonify({"error": err}), 400
    year = query_one("SELECT name FROM academic_years WHERE id = ?", (year_id,))
    _notify_teaching_staff(
        f"New Semester: {name}",
        f"{g.current_user['name']} added {name} for the academic year {year['name'] if year else ''}, from {start} to {end}.",
        new_id)
    return jsonify({"message": f"Semester {name} added", "id": new_id}), 201


@college_bp.route("/departments", methods=["GET"])
@require_auth()
def list_departments():
    rows = query_all("""
        SELECT d.id, d.name, d.code, d.hod_user_id, u.name AS hod_name
        FROM departments d LEFT JOIN users u ON d.hod_user_id = u.id
        ORDER BY d.name
    """)
    return jsonify({"departments": rows}), 200


@college_bp.route("/my-departments", methods=["GET"])
@require_auth()
def my_departments():
    """Departments the signed-in person belongs to: a staff member's department, the department
    a HOD heads, or a student's batch department. Also lists departments still waiting for approval."""
    user = g.current_user
    found = {}
    if user["role"] in ("student", "class_leader"):
        for d in query_all("""
            SELECT d.id, d.name, d.code FROM student_profiles st
            LEFT JOIN batches b ON b.id = st.batch_id LEFT JOIN programs p ON p.id = b.program_id
            JOIN departments d ON d.id = COALESCE(st.department_id, p.department_id)
            WHERE st.user_id = ?""", (user["id"],)):
            found[d["id"]] = dict(d, relation="Student" if user["role"] == "student" else "Class Leader")
    else:
        staff_label = {"class_teacher": "Class Teacher", "teacher": "Teacher", "hod": "HOD"}.get(user["role"], "Staff")
        # Check staff_departments
        for d in query_all("""
            SELECT d.id, d.name, d.code FROM staff_departments sd
            JOIN departments d ON d.id = sd.department_id WHERE sd.user_id = ?
            ORDER BY d.name""", (user["id"],)):
            found[d["id"]] = dict(d, relation=staff_label)
        # Also check staff_profiles fallback
        for d in query_all("""
            SELECT d.id, d.name, d.code FROM staff_profiles sp
            JOIN departments d ON d.id = sp.department_id WHERE sp.user_id = ?""", (user["id"],)):
            if d["id"] not in found:
                found[d["id"]] = dict(d, relation=staff_label)
        for d in query_all("SELECT id, name, code FROM departments WHERE hod_user_id = ?", (user["id"],)):
            found[d["id"]] = dict(d, relation="HOD")
    pending = query_all(
        "SELECT id, name, code FROM department_requests WHERE requested_user_id = ? AND status = 'pending'", (user["id"],))
    return jsonify({"departments": list(found.values()), "pending": pending}), 200


@college_bp.route("/my-departments", methods=["PUT"])
@require_auth(allowed_roles=["teacher", "class_teacher"])
def update_my_departments():
    """Allow teachers and class teachers to manage/edit their assigned departments (up to 10)."""
    data = request.get_json() or {}
    dept_ids = data.get("department_ids") or []
    if not isinstance(dept_ids, list) or len(dept_ids) == 0:
        return jsonify({"error": "Please select at least one department"}), 400
    if len(dept_ids) > 10:
        return jsonify({"error": "You can select up to 10 departments maximum"}), 400

    valid_ids = []
    for x in dept_ids:
        try:
            x_int = int(x)
            if query_one("SELECT id FROM departments WHERE id = ?", (x_int,)):
                valid_ids.append(x_int)
        except (ValueError, TypeError):
            pass

    if not valid_ids:
        return jsonify({"error": "No valid departments selected"}), 400

    if g.current_user["role"] == "class_teacher" and len(valid_ids) > 1:
        return jsonify({"error": "Class Teachers can be assigned to only 1 department."}), 400

    user_id = g.current_user["id"]
    execute_write("DELETE FROM staff_departments WHERE user_id = ?", (user_id,))
    for did in valid_ids:
        execute_write("INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)", (user_id, did))

    # Also update primary in staff_profiles
    sp = query_one("SELECT user_id FROM staff_profiles WHERE user_id = ?", (user_id,))
    if sp:
        execute_write("UPDATE staff_profiles SET department_id = ? WHERE user_id = ?", (valid_ids[0], user_id))
    else:
        execute_write("INSERT INTO staff_profiles (user_id, department_id, designation) VALUES (?, ?, 'Faculty')", (user_id, valid_ids[0]))

    return jsonify({"message": "Departments updated successfully", "department_ids": valid_ids}), 200


@college_bp.route("/students/by-department", methods=["GET"])
@college_bp.route("/departments/<int:dept_id>/students", methods=["GET"])
@require_auth(allowed_roles=["super_admin", "admin", "principal", "hod", "class_teacher", "teacher"])
def students_by_department(dept_id: Optional[int] = None):
    """Students of every department, or of the department chosen in the list."""
    raw = str(dept_id) if dept_id is not None else (request.args.get("department_id") or "").strip()
    if raw and not raw.isdigit():
        return jsonify({"error": "Choose a valid department"}), 400
    today_str = date.today().isoformat()
    sql = """
        SELECT u.id, u.name, u.email, u.username, u.status, st.roll_number,
               COALESCE(st.academic_year, u.academic_year) AS academic_year,
               COALESCE(st.previous_year, u.previous_year) AS previous_year,
               st.year_changed_at,
               COALESCE(st.department_id, d.id) AS department_id,
               COALESCE(d.name, 'General') AS department_name,
               b.name AS batch_name, s.name AS section_name,
               st.guardian_name, st.guardian_phone, st.guardian_email,
               (SELECT sda.status FROM student_daily_attendance sda 
                WHERE sda.student_id = u.id AND sda.attendance_date = ?) AS today_attendance
        FROM users u
        LEFT JOIN student_profiles st ON st.user_id = u.id
        LEFT JOIN batches b ON b.id = st.batch_id
        LEFT JOIN programs p ON p.id = b.program_id
        LEFT JOIN departments d ON d.id = COALESCE(st.department_id, p.department_id)
        LEFT JOIN sections s ON s.id = st.section_id
        WHERE u.role IN ('student', 'class_leader')
    """
    params = [today_str]
    if _is_hod_scope():
        hod_dept = _my_department_id()
        if not hod_dept:
            return jsonify({"students": [], "today": today_str}), 200
        sql += " AND (COALESCE(st.department_id, d.id, p.department_id) = ?)"
        params.append(hod_dept)
    elif raw:
        sql += " AND (COALESCE(st.department_id, d.id, p.department_id) = ?)"
        params.append(int(raw))
    sql += " ORDER BY d.name, b.name, st.roll_number, u.name"
    res_students = query_all(sql, tuple(params))
    caller = g.current_user
    if caller and caller.get("role") in ["class_teacher", "teacher"]:
        from backend.routes_teacher import extract_dept_and_year
        c_dept, ct_year = extract_dept_and_year(caller)
        if ct_year:
            filtered = []
            for s in res_students:
                s_y = s.get("academic_year")
                s_prev = s.get("previous_year")
                if not s_y:
                    _, ex_y = extract_dept_and_year(s)
                    s_y = ex_y
                    s["academic_year"] = ex_y
                # Class teacher sees current year students AND previous year students transferred from their year
                if s_y == ct_year or s_prev == ct_year:
                    filtered.append(s)
            res_students = filtered
    return jsonify({"students": res_students, "today": today_str}), 200


@college_bp.route("/attendance/mark-student", methods=["POST"])
@require_auth(allowed_roles=["super_admin", "admin", "principal", "class_teacher", "teacher"])
def mark_student_attendance():
    """Mark daily attendance for a single student as Present ('P') or Absent ('A')."""
    data = request.get_json(silent=True) or {}
    raw_sid = data.get("student_id")
    raw_status = (data.get("status") or "").strip().upper()
    att_date = (data.get("date") or date.today().isoformat()).strip()

    if not raw_sid:
        return jsonify({"error": "Student ID is required"}), 400
    try:
        student_id = int(raw_sid)
    except (ValueError, TypeError):
        return jsonify({"error": "Student ID must be an integer"}), 400

    if raw_status not in ("P", "A", "OD", "L"):
        return jsonify({"error": "Attendance status must be P (Present) or A (Absent)"}), 400

    if not _valid_date(att_date):
        return jsonify({"error": "Choose a valid date"}), 400
    if att_date > date.today().isoformat():
        return jsonify({"error": "Attendance cannot be marked for a future date"}), 400

    student = query_one("SELECT id, name FROM users WHERE id = ? AND role IN ('student', 'class_leader')", (student_id,))
    if not student:
        return jsonify({"error": "Student not found"}), 404

    # Upsert daily attendance record
    execute_write("""
        INSERT INTO student_daily_attendance (student_id, attendance_date, status, marked_by, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id, attendance_date) DO UPDATE SET
            status = EXCLUDED.status,
            marked_by = EXCLUDED.marked_by,
            updated_at = CURRENT_TIMESTAMP
    """, (student_id, att_date, raw_status, g.current_user["id"]))

    status_label = "Present" if raw_status == "P" else "Absent"
    return jsonify({
        "message": f"Marked {student['name']} as {status_label} for {att_date}",
        "student_id": student_id,
        "date": att_date,
        "status": raw_status,
        "status_label": status_label
    }), 200


@college_bp.route("/departments/public", methods=["GET"])
def public_departments():
    """Department names for the Create Account page. No sign-in needed."""
    return jsonify({"departments": query_all("SELECT id, name, code FROM departments ORDER BY name")}), 200


@college_bp.route("/departments/teachers", methods=["GET"])
@require_auth(allowed_roles=["super_admin", "admin", "class_teacher", "teacher"])
def departments_with_teachers():
    """Teachers, class teachers and HODs grouped by department (read-only)."""
    departments = query_all("""
        SELECT d.id, d.name, d.code, u.name AS hod_name
        FROM departments d LEFT JOIN users u ON d.hod_user_id = u.id
        ORDER BY d.name
    """)
    staff = query_all("""
        SELECT u.id, u.name, u.email, u.role, sp.department_id, sp.designation
        FROM users u
        LEFT JOIN staff_profiles sp ON sp.user_id = u.id
        WHERE u.role IN ('hod', 'teacher', 'class_teacher') AND u.status = 'active'
        ORDER BY u.name
    """)
    groups = {d["id"]: dict(d, teachers=[]) for d in departments}
    unassigned = []
    for s in staff:
        entry = {"id": s["id"], "name": s["name"], "email": s["email"],
                 "role": s["role"], "designation": s["designation"]}
        if s["department_id"] in groups:
            groups[s["department_id"]]["teachers"].append(entry)
        else:
            unassigned.append(entry)
    return jsonify({"departments": list(groups.values()), "unassigned": unassigned}), 200


@college_bp.route("/departments", methods=["POST"])
@require_auth(allowed_roles=["super_admin"])
def create_department():
    if g.current_user.get("role") != "super_admin":
        return jsonify({"error": "Forbidden: Only Super Admins can add an Academic Department."}), 403
    count_row = query_one("SELECT COUNT(*) AS cnt FROM departments")
    if count_row and count_row["cnt"] >= 10:
        return jsonify({"error": "Maximum limit of 10 departments reached for this college."}), 400
    data = request.get_json() or {}
    name, code = _str(data, "name"), _str(data, "code").upper()
    if not name or not code:
        return jsonify({"error": "Department name and code are required"}), 400
    new_id, err = _save("INSERT INTO departments (name, code) VALUES (?, ?)", (name, code))
    if err:
        return jsonify({"error": err}), 400
    return jsonify({"message": f"Department {name} added", "id": new_id}), 201


# ---------------------------------------------------------------------------
# New department requests (raised when a staff account is created with a new department)
# ---------------------------------------------------------------------------

def _notify_requester(user_id, title, message, department_name):
    if not user_id:
        return
    execute_write("""
        INSERT INTO notifications (recipient_id, sender_id, sender_role, sender_name, type, title, message, department_name, is_read)
        VALUES (?, ?, ?, ?, 'department_decision', ?, ?, ?, 0)
    """, (user_id, g.current_user["id"], g.current_user["role"], g.current_user["name"], title, message, department_name))


@college_bp.route("/department-requests", methods=["POST"])
@require_auth(allowed_roles=["super_admin", "admin", "teacher", "class_teacher", "hod"])
def create_department_request():
    """Submit a new department.
    - If submitted by Admin or Super Admin, it is created directly in departments.
    - If submitted by Teacher, Class Teacher, or HOD, a pending request is created and a notification is dispatched to the College Admin for approval or reject.
    """
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    code = (data.get("code") or "").strip().upper()

    if not name or not code:
        return jsonify({"error": "Department name and department code are required"}), 400

    if len(name) < 2 or len(name) > 100:
        return jsonify({"error": "Department name must be between 2 and 100 characters"}), 400
    if len(code) < 1 or len(code) > 20:
        return jsonify({"error": "Department code must be between 1 and 20 characters"}), 400

    # Check if department already exists
    existing = query_one("SELECT id, name FROM departments WHERE lower(name) = lower(?) OR lower(code) = lower(?)", (name, code))
    if existing:
        return jsonify({"error": f"Department '{existing['name']}' already exists with this name or code."}), 400

    user = g.current_user
    # Admin / Super Admin creates directly
    if user["role"] in SETUP_ROLES:
        dept_id, err = _save("INSERT INTO departments (name, code) VALUES (?, ?)", (name, code))
        if err:
            return jsonify({"error": err}), 400
        return jsonify({"message": f"Department '{name}' ({code}) created successfully.", "id": dept_id}), 201

    # Check if a pending request already exists
    pending_existing = query_one(
        "SELECT id FROM department_requests WHERE status = 'pending' AND (lower(name) = lower(?) OR lower(code) = lower(?))",
        (name, code)
    )
    if pending_existing:
        return jsonify({"error": "A request for this department name or code is already waiting for approval."}), 400

    req_id, err = _save(
        "INSERT INTO department_requests (name, code, requested_user_id, requested_by_id, status) VALUES (?, ?, ?, ?, 'pending')",
        (name, code, user["id"], user["id"])
    )
    if err:
        return jsonify({"error": err}), 400

    # Dispatch notification to College Admin for approval / rejection
    sender_role_display = user["role"].replace("_", " ").title()
    execute_write("""
        INSERT INTO notifications (recipient_role, sender_id, sender_role, sender_name, type, title, message, reference_id, department_name, is_read)
        VALUES ('admin', ?, ?, ?, 'department_request', ?, ?, ?, ?, 0)
    """, (
        user["id"], user["role"], user["name"],
        f"New Department Request: {name}",
        f"{user['name']} ({sender_role_display}) submitted a request to add a new department: '{name}' ({code}). Please review to Approve or Reject.",
        req_id, name
    ))

    return jsonify({
        "message": f"Department request for '{name}' ({code}) submitted successfully! A notification has been sent to the College Admin for approval.",
        "request_id": req_id
    }), 201


@college_bp.route("/department-requests", methods=["GET"])
@require_auth(allowed_roles=SETUP_ROLES)
def list_department_requests():
    rows = query_all("""
        SELECT r.id, r.name, r.code, r.created_at, r.requested_user_id,
               u.name AS requested_user_name, u.role AS requested_user_role,
               b.name AS requested_by_name
        FROM department_requests r
        LEFT JOIN users u ON r.requested_user_id = u.id
        LEFT JOIN users b ON r.requested_by_id = b.id
        WHERE r.status = 'pending'
        ORDER BY r.id DESC
    """)
    return jsonify({"requests": rows}), 200


@college_bp.route("/department-requests/<int:req_id>/approve", methods=["POST"])
@require_auth(allowed_roles=SETUP_ROLES)
def approve_department_request(req_id: int):
    req = query_one("SELECT * FROM department_requests WHERE id = ? AND status = 'pending'", (req_id,))
    if not req:
        return jsonify({"error": "This request is no longer waiting for approval"}), 404
    dept_id, err = _save("INSERT INTO departments (name, code) VALUES (?, ?)", (req["name"], req["code"]))
    if err:
        return jsonify({"error": "A department with this name or code already exists. Reject this request instead."}), 400
    if req["requested_user_id"]:
        requester = query_one("SELECT role FROM users WHERE id = ?", (req["requested_user_id"],))
        if requester and requester["role"] in ("student", "class_leader"):
            execute_write("""
                INSERT INTO student_profiles (user_id, department_id) VALUES (?, ?)
                ON CONFLICT(user_id) DO UPDATE SET department_id = excluded.department_id
            """, (req["requested_user_id"], dept_id))
        else:
            execute_write("""
                INSERT INTO staff_profiles (user_id, department_id) VALUES (?, ?)
                ON CONFLICT(user_id) DO UPDATE SET department_id = excluded.department_id
            """, (req["requested_user_id"], dept_id))
            if requester and requester["role"] == "hod":
                execute_write("UPDATE departments SET hod_user_id = NULL WHERE hod_user_id = ?", (req["requested_user_id"],))
                execute_write("UPDATE departments SET hod_user_id = ? WHERE id = ?", (req["requested_user_id"], dept_id))
    execute_write(
        "UPDATE department_requests SET status = 'approved', decided_by_id = ?, decided_at = CURRENT_TIMESTAMP WHERE id = ?",
        (g.current_user["id"], req_id))
    execute_write("UPDATE notifications SET is_read = 1 WHERE reference_id = ? AND type = 'department_request'", (req_id,))
    # Notices written while the department was pending now show the real department
    execute_write("UPDATE notifications SET department_name = ? WHERE department_name = ?",
                  (req["name"], f"{req['name']} (pending approval)"))
    _notify_requester(req["requested_by_id"], "Department Approved",
                      f"The new department {req['name']} ({req['code']}) was approved. The account has been added to it.",
                      req["name"])
    return jsonify({"message": f"Department {req['name']} approved and created", "id": dept_id}), 200


@college_bp.route("/department-requests/<int:req_id>", methods=["PUT"])
@require_auth()
def edit_department_request(req_id: int):
    """Correct the name or code of a department request while it waits for approval.
    Only the account the request is for, or the person who asked for it, may edit it."""
    user = g.current_user
    req = query_one("SELECT * FROM department_requests WHERE id = ? AND status = 'pending'", (req_id,))
    if not req:
        return jsonify({"error": "This request is no longer waiting for approval"}), 404
    if user["id"] not in (req["requested_user_id"], req["requested_by_id"]):
        return jsonify({"error": "Only the account this request is for, or the person who asked for it, can edit it"}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip() or req["name"]
    code = (data.get("code") or "").strip() or req["code"]
    if query_one("SELECT id FROM departments WHERE lower(name) = lower(?) OR lower(code) = lower(?)", (name, code)):
        return jsonify({"error": "A department with this name or code already exists"}), 400
    if query_one("""SELECT id FROM department_requests WHERE status = 'pending' AND id != ?
                    AND (lower(name) = lower(?) OR lower(code) = lower(?))""", (req_id, name, code)):
        return jsonify({"error": "Another request already asks for this name or code"}), 400

    old_label = f"{req['name']} (pending approval)"
    execute_write("UPDATE department_requests SET name = ?, code = ? WHERE id = ?", (name, code, req_id))
    execute_write("UPDATE notifications SET department_name = ? WHERE reference_id = ? AND type = 'department_request'",
                  (name, req_id))
    execute_write("UPDATE notifications SET department_name = ? WHERE department_name = ?",
                  (f"{name} (pending approval)", old_label))
    return jsonify({"message": f"Department request updated to {name} ({code})", "id": req_id, "name": name, "code": code}), 200


@college_bp.route("/department-requests/<int:req_id>", methods=["DELETE"])
@require_auth()
def withdraw_department_request(req_id: int):
    """Withdraw a department request that still waits for approval. Only the account it is for,
    or the person who asked for it, may withdraw it. The request row and its admin notice are removed."""
    user = g.current_user
    req = query_one("SELECT * FROM department_requests WHERE id = ? AND status = 'pending'", (req_id,))
    if not req:
        return jsonify({"error": "This request is no longer waiting for approval"}), 404
    if user["id"] not in (req["requested_user_id"], req["requested_by_id"]):
        return jsonify({"error": "Only the account this request is for, or the person who asked for it, can delete it"}), 403

    execute_write("DELETE FROM department_requests WHERE id = ?", (req_id,))
    execute_write("DELETE FROM notifications WHERE reference_id = ? AND type = 'department_request'", (req_id,))
    # Notices that said the department was pending no longer name a department
    execute_write("UPDATE notifications SET department_name = NULL WHERE department_name = ?",
                  (f"{req['name']} (pending approval)",))
    return jsonify({"message": f"Department request for {req['name']} deleted"}), 200


@college_bp.route("/department-requests/<int:req_id>/reject", methods=["POST"])
@require_auth(allowed_roles=SETUP_ROLES)
def reject_department_request(req_id: int):
    req = query_one("SELECT * FROM department_requests WHERE id = ? AND status = 'pending'", (req_id,))
    if not req:
        return jsonify({"error": "This request is no longer waiting for approval"}), 404
    execute_write(
        "UPDATE department_requests SET status = 'rejected', decided_by_id = ?, decided_at = CURRENT_TIMESTAMP WHERE id = ?",
        (g.current_user["id"], req_id))
    execute_write("UPDATE notifications SET is_read = 1 WHERE reference_id = ? AND type = 'department_request'", (req_id,))
    # Notices that said the department was pending no longer name a department
    execute_write("UPDATE notifications SET department_name = NULL WHERE department_name = ?",
                  (f"{req['name']} (pending approval)",))
    _notify_requester(req["requested_by_id"], "Department Request Not Approved",
                      f"The request for the new department {req['name']} ({req['code']}) was not approved. Choose an existing department or ask the College Admin.",
                      None)
    return jsonify({"message": f"Request for {req['name']} rejected"}), 200


@college_bp.route("/departments/<int:dept_id>/hod", methods=["PUT"])
@require_auth(allowed_roles=SETUP_ROLES)
def assign_hod(dept_id: int):
    data = request.get_json() or {}
    hod_id = _int_or_none(data.get("hod_user_id"))
    dept = query_one("SELECT id, name FROM departments WHERE id = ?", (dept_id,))
    if not dept:
        return jsonify({"error": "Department not found"}), 404
    hod = query_one("SELECT id, name, role FROM users WHERE id = ?", (hod_id,)) if hod_id else None
    if not hod or hod["role"] != "hod":
        return jsonify({"error": "Choose an account with the HOD role"}), 400
    execute_write("UPDATE departments SET hod_user_id = NULL WHERE hod_user_id = ?", (hod_id,))
    execute_write("UPDATE departments SET hod_user_id = ? WHERE id = ?", (hod_id, dept_id))
    execute_write("""
        INSERT INTO staff_profiles (user_id, department_id) VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET department_id = excluded.department_id
    """, (hod_id, dept_id))
    return jsonify({"message": f"{hod['name']} is now HOD of {dept['name']}"}), 200


@college_bp.route("/programs", methods=["GET"])
@require_auth()
def list_programs():
    user = g.current_user
    user_role = user.get("role")
    user_id = user.get("id")

    # Teachers and Class Teachers see only their assigned department(s) programmes
    if user_role in ("teacher", "class_teacher"):
        depts = query_all("""
            SELECT department_id FROM staff_departments WHERE user_id = ?
            UNION
            SELECT department_id FROM staff_profiles WHERE user_id = ?
        """, (user_id, user_id))
        dept_ids = [d["department_id"] for d in depts if d["department_id"] is not None]
        if not dept_ids:
            raw_text = f"{user.get('username', '')} {user.get('name', '')} {user.get('email', '')}".lower()
            dept_map = {'mect': 'MECT', 'mech': 'MECH', 'aero': 'AERO', 'cse': 'CSE', 'eee': 'EEE', 'ece': 'ECE'}
            for k, code in dept_map.items():
                if k in raw_text:
                    d_row = query_one("SELECT id FROM departments WHERE UPPER(code) = ? OR UPPER(name) LIKE ?", (code, f"%{code}%"))
                    if d_row and d_row.get("id"):
                        dept_ids = [d_row["id"]]
                        break
        if dept_ids:
            placeholders = ",".join("?" for _ in dept_ids)
            rows = query_all(f"""
                SELECT p.id, p.name, p.degree, p.duration_years, p.department_id, d.name AS department_name
                FROM programs p JOIN departments d ON p.department_id = d.id
                WHERE p.department_id IN ({placeholders})
                ORDER BY d.name, p.name
            """, tuple(dept_ids))
            return jsonify({"programs": rows}), 200
        return jsonify({"programs": []}), 200

    # HOD sees only their department's programmes
    elif user_role == "hod":
        hod_depts = query_all("""
            SELECT id AS department_id FROM departments WHERE hod_user_id = ?
            UNION
            SELECT department_id FROM staff_departments WHERE user_id = ?
            UNION
            SELECT department_id FROM staff_profiles WHERE user_id = ?
        """, (user_id, user_id, user_id))
        dept_ids = [d["department_id"] for d in hod_depts if d["department_id"] is not None]
        if dept_ids:
            placeholders = ",".join("?" for _ in dept_ids)
            rows = query_all(f"""
                SELECT p.id, p.name, p.degree, p.duration_years, p.department_id, d.name AS department_name
                FROM programs p JOIN departments d ON p.department_id = d.id
                WHERE p.department_id IN ({placeholders})
                ORDER BY d.name, p.name
            """, tuple(dept_ids))
            return jsonify({"programs": rows}), 200

    rows = query_all("""
        SELECT p.id, p.name, p.degree, p.duration_years, p.department_id, d.name AS department_name
        FROM programs p JOIN departments d ON p.department_id = d.id ORDER BY d.name, p.name
    """)
    return jsonify({"programs": rows}), 200


@college_bp.route("/programs", methods=["POST"])
@require_auth(allowed_roles=SETUP_ROLES + ["hod"])
def create_program():
    data = request.get_json() or {}
    dept_id = _int_or_none(data.get("department_id"))
    if _is_hod_scope() and dept_id != _my_department_id():
        return jsonify({"error": "HODs can add programmes only in their own department"}), 403
    name, degree = _str(data, "name"), _str(data, "degree")
    years = _int_or_none(data.get("duration_years") or 4)
    if not dept_id or dept_id < 0 or not name or not degree or years is None or years < 1 or years > 6:
        return jsonify({"error": "Department, programme name, degree and duration (1-6 years) are required"}), 400
    new_id, err = _save(
        "INSERT INTO programs (department_id, name, degree, duration_years) VALUES (?, ?, ?, ?)",
        (dept_id, name, degree, years))
    if err:
        return jsonify({"error": err}), 400
    return jsonify({"message": f"Programme {name} added", "id": new_id}), 201


@college_bp.route("/batches", methods=["GET"])
@require_auth()
def list_batches():
    rows = query_all("""
        SELECT b.id, b.name, b.program_id, p.name AS program_name, p.department_id, d.name AS department_name,
               (SELECT COUNT(*) FROM student_profiles sp WHERE sp.batch_id = b.id) AS student_count,
               (SELECT COUNT(*) FROM sections sec WHERE sec.batch_id = b.id) AS section_count
        FROM batches b 
        LEFT JOIN programs p ON b.program_id = p.id 
        LEFT JOIN departments d ON p.department_id = d.id
        ORDER BY d.name, p.name, b.name
    """)
    return jsonify({"batches": rows}), 200


def _create_batch_with_new_programme(data, name):
    """Create the new programme and the batch in one step (programme chosen as "New programme")."""
    dept_id = _my_department_id() if _is_hod_scope() else _int_or_none(data.get("department_id"))
    pname, degree = _str(data, "program_name"), _str(data, "degree")
    years = _int_or_none(data.get("duration_years") or 4)
    if not name or not dept_id or dept_id < 0 or not pname or not degree or years is None or years < 1 or years > 6:
        return jsonify({"error": "Batch name, department, new programme name, degree and duration (1-6 years) are required"}), 400
    if not query_one("SELECT id FROM departments WHERE id = ?", (dept_id,)):
        return jsonify({"error": "Department not found"}), 400
    program_id, err = _save(
        "INSERT INTO programs (department_id, name, degree, duration_years) VALUES (?, ?, ?, ?)",
        (dept_id, pname, degree, years))
    if err:
        return jsonify({"error": err}), 400
    _, err = _save("INSERT INTO batches (program_id, name) VALUES (?, ?)", (program_id, name))
    if err:
        return jsonify({"error": err}), 400
    return jsonify({"message": f"Programme {pname} and batch {name} added", "id": program_id}), 201


@college_bp.route("/batches", methods=["POST"])
@require_auth(allowed_roles=SETUP_ROLES + ["hod", "teacher", "class_teacher", "dean"])
def create_batch():
    data = request.get_json() or {}
    name = _str(data, "name")
    if _str(data, "program_id") == "new":
        return _create_batch_with_new_programme(data, name)
    program_id = _int_or_none(data.get("program_id"))
    if not program_id or program_id < 0 or not name:
        return jsonify({"error": "Programme and batch name (for example 2026-2030) are required"}), 400
    if _is_hod_scope():
        prog = query_one("SELECT department_id FROM programs WHERE id = ?", (program_id,))
        if not prog or not _my_department_id() or prog["department_id"] != _my_department_id():
            return jsonify({"error": "You can add batches only to programmes in your department"}), 403
    new_id, err = _save("INSERT INTO batches (program_id, name) VALUES (?, ?)", (program_id, name))
    if err:
        return jsonify({"error": err}), 400

    student_ids = data.get("student_ids") or []
    if student_ids and new_id:
        for sid in student_ids:
            try:
                sid_int = int(sid)
                execute_write("""
                    INSERT INTO student_profiles (user_id, batch_id) VALUES (?, ?)
                    ON CONFLICT (user_id) DO UPDATE SET batch_id = EXCLUDED.batch_id
                """, (sid_int, new_id))
            except Exception:
                pass

    return jsonify({"message": f"Batch {name} added", "id": new_id}), 201


@college_bp.route("/batches/<int:batch_id>/students", methods=["GET"])
@require_auth()
def get_batch_students(batch_id):
    """List student IDs enrolled in this batch."""
    rows = query_all("SELECT user_id FROM student_profiles WHERE batch_id = ?", (batch_id,))
    return jsonify({"student_ids": [r["user_id"] for r in rows]}), 200


@college_bp.route("/batches/<int:batch_id>/students", methods=["POST"])
@require_auth(allowed_roles=SETUP_ROLES + ["hod", "teacher", "class_teacher", "dean"])
def assign_batch_students(batch_id):
    """Assign or update students enrolled in this batch."""
    batch = query_one("SELECT id, name FROM batches WHERE id = ?", (batch_id,))
    if not batch:
        return jsonify({"error": "Batch not found"}), 404
    data = request.get_json() or {}
    student_ids = data.get("student_ids") or []
    
    # If mode is 'set', students not in student_ids can be unassigned from this batch
    mode = data.get("mode", "add")
    if mode == "set":
        execute_write("UPDATE student_profiles SET batch_id = NULL WHERE batch_id = ?", (batch_id,))

    for sid in student_ids:
        try:
            sid_int = int(sid)
            execute_write("""
                INSERT INTO student_profiles (user_id, batch_id) VALUES (?, ?)
                ON CONFLICT (user_id) DO UPDATE SET batch_id = EXCLUDED.batch_id
            """, (sid_int, batch_id))
        except Exception:
            pass

    count_row = query_one("SELECT COUNT(*) AS c FROM student_profiles WHERE batch_id = ?", (batch_id,))
    return jsonify({
        "message": f"Updated enrolled students for batch '{batch['name']}'",
        "student_count": count_row["c"] if count_row else len(student_ids)
    }), 200


@college_bp.route("/batches/<int:batch_id>", methods=["DELETE"])
@require_auth(allowed_roles=SETUP_ROLES + ["hod", "teacher", "class_teacher", "dean"])
def delete_batch(batch_id):
    batch = query_one("SELECT id, name FROM batches WHERE id = ?", (batch_id,))
    if not batch:
        return jsonify({"error": "Batch not found"}), 404

    # 1. Unlink students belonging to any sections of this batch or directly to this batch
    execute_write("""
        UPDATE student_profiles
        SET section_id = NULL
        WHERE section_id IN (SELECT id FROM sections WHERE batch_id = ?)
    """, (batch_id,))
    execute_write("UPDATE student_profiles SET batch_id = NULL WHERE batch_id = ?", (batch_id,))

    # 2. Clean subjects associated with this batch
    subjects = query_all("SELECT id FROM subjects WHERE batch_id = ?", (batch_id,))
    for sub in subjects:
        sub_id = sub["id"]
        execute_write("""
            DELETE FROM attendance_records
            WHERE session_id IN (SELECT id FROM attendance_sessions WHERE subject_id = ?)
        """, (sub_id,))
        execute_write("DELETE FROM attendance_sessions WHERE subject_id = ?", (sub_id,))
    execute_write("DELETE FROM subjects WHERE batch_id = ?", (batch_id,))

    # 3. Delete sections of this batch
    execute_write("DELETE FROM sections WHERE batch_id = ?", (batch_id,))

    # 4. Delete the batch completely
    execute_write("DELETE FROM batches WHERE id = ?", (batch_id,))

    return jsonify({"message": f"Batch '{batch['name']}' deleted permanently from all users"}), 200


@college_bp.route("/sections", methods=["GET"])
@require_auth()
def list_sections():
    rows = query_all("""
        SELECT s.id, s.name, s.batch_id, b.name AS batch_name, p.department_id, d.name AS department_name
        FROM sections s
        LEFT JOIN batches b ON s.batch_id = b.id
        LEFT JOIN programs p ON p.id = b.program_id
        LEFT JOIN departments d ON d.id = p.department_id
        ORDER BY s.name ASC
    """)
    return jsonify({"sections": rows}), 200


@college_bp.route("/sections", methods=["POST"])
@require_auth(allowed_roles=SETUP_ROLES + ["hod"])
def create_section():
    data = request.get_json() or {}
    batch_id = _int_or_none(data.get("batch_id"))
    name = _str(data, "name")
    if not batch_id or batch_id < 0 or not name:
        return jsonify({"error": "Batch and section name are required"}), 400
    if _is_hod_scope():
        batch = query_one("""SELECT p.department_id FROM batches b JOIN programs p ON p.id = b.program_id
                             WHERE b.id = ?""", (batch_id,))
        if not batch or not _my_department_id() or batch["department_id"] != _my_department_id():
            return jsonify({"error": "You can add sections only to batches in your department"}), 403
    new_id, err = _save("INSERT INTO sections (batch_id, name) VALUES (?, ?)", (batch_id, name))
    if err:
        return jsonify({"error": err}), 400
    return jsonify({"message": f"Section {name} added", "id": new_id}), 201


@college_bp.route("/sections/<int:section_id>", methods=["DELETE"])
@require_auth(allowed_roles=SETUP_ROLES + ["hod", "teacher", "class_teacher", "dean"])
def delete_section(section_id):
    section = query_one("SELECT id, name, batch_id FROM sections WHERE id = ?", (section_id,))
    if not section:
        return jsonify({"error": "Section not found"}), 404

    if _is_hod_scope():
        batch = query_one("""SELECT p.department_id FROM batches b JOIN programs p ON p.id = b.program_id
                             WHERE b.id = ?""", (section["batch_id"],))
        if not batch or not _my_department_id() or batch["department_id"] != _my_department_id():
            return jsonify({"error": "You can only delete sections in your department"}), 403

    # 1. Unlink student profiles from this section
    execute_write("UPDATE student_profiles SET section_id = NULL WHERE section_id = ?", (section_id,))

    # 2. Delete the section permanently
    execute_write("DELETE FROM sections WHERE id = ?", (section_id,))

    return jsonify({"message": f"Section '{section['name']}' deleted permanently"}), 200


@college_bp.route("/holidays", methods=["GET"])
@require_auth()
def list_holidays():
    return jsonify({"holidays": query_all("SELECT * FROM holidays ORDER BY holiday_date")}), 200


@college_bp.route("/holidays", methods=["POST"])
@require_auth(allowed_roles=SETUP_ROLES)
def create_holiday():
    data = request.get_json() or {}
    day, name = _str(data, "holiday_date"), _str(data, "name")
    if not _valid_date(day) or not name:
        return jsonify({"error": "A valid holiday date and name are required"}), 400
    new_id, err = _save("INSERT INTO holidays (holiday_date, name) VALUES (?, ?)", (day, name))
    if err:
        return jsonify({"error": err}), 400
    return jsonify({"message": f"Holiday {name} added", "id": new_id}), 201


# ---------------------------------------------------------------------------
# HOD and staff
# ---------------------------------------------------------------------------

@college_bp.route("/staff", methods=["GET"])
@require_auth(allowed_roles=STAFF_ROLES)
def list_staff():
    sql = """
        SELECT u.id, u.name, u.email, u.username, u.role, u.status,
               sp.department_id, d.name AS department_name, sp.designation, sp.qualification
        FROM users u
        LEFT JOIN staff_profiles sp ON sp.user_id = u.id
        LEFT JOIN departments d ON d.id = sp.department_id
        WHERE u.role IN ('hod', 'teacher', 'class_teacher') AND u.status = 'active'
    """
    params = []
    if _is_hod_scope():
        dept = _my_department_id()
        if not dept:
            return jsonify({"staff": [], "message": "You are not assigned to a department yet"}), 200
        sql += " AND sp.department_id = ?"
        params.append(dept)
    sql += " ORDER BY u.name"
    return jsonify({"staff": query_all(sql, tuple(params))}), 200


@college_bp.route("/staff/<int:user_id>", methods=["PUT"])
@require_auth(allowed_roles=STAFF_ROLES)
def update_staff(user_id: int):
    data = request.get_json() or {}
    target = query_one("SELECT id, name, role FROM users WHERE id = ?", (user_id,))
    if not target or target["role"] not in STAFF_TARGET_ROLES:
        return jsonify({"error": "Staff member not found"}), 404
    dept_id = _int_or_none(data.get("department_id"))
    if dept_id is None or dept_id < 0:
        return jsonify({"error": "Choose a department"}), 400
    if not query_one("SELECT id FROM departments WHERE id = ?", (dept_id,)):
        return jsonify({"error": "Department not found"}), 400
    if _is_hod_scope():
        my_dept = _my_department_id()
        current = query_one("SELECT department_id FROM staff_profiles WHERE user_id = ?", (user_id,))
        if dept_id != my_dept or (current and current["department_id"] not in (None, my_dept)):
            return jsonify({"error": "HOD can manage staff of their own department only"}), 403
    execute_write("""
        INSERT INTO staff_profiles (user_id, department_id, designation, qualification) VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET department_id = excluded.department_id,
            designation = excluded.designation, qualification = excluded.qualification
    """, (user_id, dept_id, _str(data, "designation"), _str(data, "qualification")))
    return jsonify({"message": f"{target['name']} updated"}), 200


# ---------------------------------------------------------------------------
# Student profiles
# ---------------------------------------------------------------------------

@college_bp.route("/students", methods=["GET"])
@require_auth(allowed_roles=STAFF_ROLES + FACULTY_ROLES + ["librarian"])
def list_students():
    sql = """
        SELECT u.id, u.name, u.email, u.username, u.status,
               sp.roll_number, sp.batch_id, sp.section_id, sp.guardian_name, sp.guardian_phone, sp.guardian_email,
               b.name AS batch_name, s.name AS section_name, p.name AS program_name,
               COALESCE(sp.department_id, p.department_id) AS department_id,
               COALESCE(d.name, 'General') AS department_name
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN batches b ON b.id = sp.batch_id
        LEFT JOIN sections s ON s.id = sp.section_id
        LEFT JOIN programs p ON p.id = b.program_id
        LEFT JOIN departments d ON d.id = COALESCE(sp.department_id, p.department_id)
        WHERE u.role IN ('student', 'class_leader')
    """
    params = []
    if _is_hod_scope():
        dept = _my_department_id()
        if not dept:
            return jsonify({"students": []}), 200
        sql += " AND (COALESCE(sp.department_id, p.department_id) = ?)"
        params.append(dept)
    sql += " ORDER BY sp.roll_number, u.name"
    return jsonify({"students": query_all(sql, tuple(params))}), 200


@college_bp.route("/students/<int:user_id>/profile", methods=["PUT"])
@require_auth(allowed_roles=STAFF_ROLES)
def update_student_profile(user_id: int):
    data = request.get_json() or {}
    target = query_one("SELECT id, name, role FROM users WHERE id = ?", (user_id,))
    if not target or target["role"] not in STUDENT_ROLES:
        return jsonify({"error": "Student not found"}), 404

    batch_id = _int_or_none(data.get("batch_id"))
    section_id = _int_or_none(data.get("section_id"))
    if batch_id is not None and batch_id < 0:
        return jsonify({"error": "Choose a valid batch"}), 400
    if section_id is not None and section_id < 0:
        return jsonify({"error": "Choose a valid section"}), 400
    if batch_id is not None:
        batch = query_one("""
            SELECT b.id, p.department_id FROM batches b JOIN programs p ON b.program_id = p.id WHERE b.id = ?
        """, (batch_id,))
        if not batch:
            return jsonify({"error": "Batch not found"}), 400
        if _is_hod_scope() and batch["department_id"] != _my_department_id():
            return jsonify({"error": "HOD can manage students of their own department only"}), 403
    if section_id is not None:
        if batch_id is None or not query_one("SELECT id FROM sections WHERE id = ? AND batch_id = ?", (section_id, batch_id)):
            return jsonify({"error": "The section must belong to the chosen batch"}), 400

    roll = _str(data, "roll_number") or None
    existing = query_one("SELECT user_id, batch_id, section_id, department_id FROM student_profiles WHERE user_id = ?", (user_id,))
    if batch_id is None and existing is not None and existing["batch_id"]:
        batch_id = existing["batch_id"]
        if section_id is None:
            section_id = existing["section_id"]
    elif _is_hod_scope() and batch_id is None:
        default_b = query_one("""
            SELECT b.id FROM batches b
            JOIN programs p ON p.id = b.program_id
            WHERE p.department_id = ?
            ORDER BY b.id ASC LIMIT 1
        """, (_my_department_id(),))
        if default_b:
            batch_id = default_b["id"]

    dept_id = _my_department_id() if _is_hod_scope() else None
    if existing and existing.get("department_id"):
        dept_id = existing["department_id"] or dept_id

    if _is_hod_scope() and existing is not None:
        current = query_one("""
            SELECT p.department_id FROM student_profiles sp
            LEFT JOIN batches b ON b.id = sp.batch_id LEFT JOIN programs p ON p.id = b.program_id
            WHERE sp.user_id = ?
        """, (user_id,))
        if current and current["department_id"] not in (None, _my_department_id()):
            return jsonify({"error": "This student belongs to another department"}), 403

    try:
        execute_write("""
            INSERT INTO student_profiles (user_id, roll_number, batch_id, section_id, department_id, guardian_name, guardian_phone, guardian_email)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET roll_number = excluded.roll_number,
                batch_id = COALESCE(excluded.batch_id, student_profiles.batch_id),
                section_id = COALESCE(excluded.section_id, student_profiles.section_id),
                department_id = COALESCE(excluded.department_id, student_profiles.department_id),
                guardian_name = excluded.guardian_name,
                guardian_phone = excluded.guardian_phone,
                guardian_email = excluded.guardian_email
        """, (user_id, roll, batch_id, section_id, dept_id, _str(data, "guardian_name"),
              _str(data, "guardian_phone"), _str(data, "guardian_email")))
    except (IntegrityError, sqlite3.IntegrityError) as err:
        return jsonify({"error": _integrity_message(err)}), 400
    return jsonify({"message": f"Profile of {target['name']} saved"}), 200


# ---------------------------------------------------------------------------
# Subjects
# ---------------------------------------------------------------------------

SUBJECT_SELECT = """
    SELECT sub.id, sub.name, sub.code, sub.batch_id, sub.department_id, sub.faculty_user_id,
           b.name AS batch_name, p.name AS program_name, d.name AS department_name, f.name AS faculty_name
    FROM subjects sub
    JOIN batches b ON b.id = sub.batch_id
    JOIN programs p ON p.id = b.program_id
    JOIN departments d ON d.id = sub.department_id
    LEFT JOIN users f ON f.id = sub.faculty_user_id
"""


@college_bp.route("/subjects", methods=["GET"])
@require_auth(allowed_roles=STAFF_ROLES + FACULTY_ROLES)
def list_subjects():
    role = g.current_user["role"]
    sql, params = SUBJECT_SELECT, []
    if role == "hod":
        sql += " WHERE sub.department_id = ?"
        params.append(_my_department_id() or -1)
    elif role in FACULTY_ROLES:
        sql += " WHERE sub.faculty_user_id = ?"
        params.append(g.current_user["id"])
    sql += " ORDER BY sub.name"
    return jsonify({"subjects": query_all(sql, tuple(params))}), 200


def _check_faculty(faculty_id):
    """Return an error message if this account cannot teach subjects in the HOD's scope."""
    faculty = query_one("SELECT id, role FROM users WHERE id = ?", (faculty_id,))
    if not faculty or faculty["role"] not in FACULTY_ROLES:
        return "Choose a teacher or class teacher account"
    if _is_hod_scope():
        row = query_one("SELECT department_id FROM staff_profiles WHERE user_id = ?", (faculty_id,))
        if not row or row["department_id"] != _my_department_id():
            return "This teacher is not in your department"
    return None


@college_bp.route("/subjects", methods=["POST"])
@require_auth(allowed_roles=STAFF_ROLES)
def create_subject():
    data = request.get_json() or {}
    name, code = _str(data, "name"), _str(data, "code").upper()
    batch_id = _int_or_none(data.get("batch_id"))
    faculty_id = _int_or_none(data.get("faculty_user_id"))
    if not name or not code or not batch_id or batch_id < 0:
        return jsonify({"error": "Subject name, code and batch are required"}), 400
    batch = query_one("""
        SELECT b.id, p.department_id FROM batches b JOIN programs p ON b.program_id = p.id WHERE b.id = ?
    """, (batch_id,))
    if not batch:
        return jsonify({"error": "Batch not found"}), 400
    if _is_hod_scope() and batch["department_id"] != _my_department_id():
        return jsonify({"error": "HOD can add subjects to their own department only"}), 403
    if faculty_id is not None:
        err = _check_faculty(faculty_id)
        if err:
            return jsonify({"error": err}), 400
    new_id, err = _save(
        "INSERT INTO subjects (name, code, department_id, batch_id, faculty_user_id) VALUES (?, ?, ?, ?, ?)",
        (name, code, batch["department_id"], batch_id, faculty_id))
    if err:
        return jsonify({"error": err}), 400
    return jsonify({"message": f"Subject {name} added", "id": new_id}), 201


@college_bp.route("/subjects/<int:subject_id>/faculty", methods=["PUT"])
@require_auth(allowed_roles=STAFF_ROLES)
def assign_faculty(subject_id: int):
    data = request.get_json() or {}
    subject = query_one("SELECT id, name, department_id FROM subjects WHERE id = ?", (subject_id,))
    if not subject:
        return jsonify({"error": "Subject not found"}), 404
    if _is_hod_scope() and subject["department_id"] != _my_department_id():
        return jsonify({"error": "HOD can assign faculty of their own department only"}), 403
    faculty_id = _int_or_none(data.get("faculty_user_id"))
    if faculty_id is None or faculty_id < 0:
        return jsonify({"error": "Choose a teacher"}), 400
    err = _check_faculty(faculty_id)
    if err:
        return jsonify({"error": err}), 400
    execute_write("UPDATE subjects SET faculty_user_id = ? WHERE id = ?", (faculty_id, subject_id))
    return jsonify({"message": f"Faculty assigned to {subject['name']}"}), 200


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------

def _session_state(subject_id, day, period):
    """Return (session_row_or_None, editable_flag) for one subject, date and period."""
    session = query_one(
        "SELECT id, marked_by, created_at FROM attendance_sessions WHERE subject_id = ? AND session_date = ? AND period = ?",
        (subject_id, day, period))
    if not session:
        return None, True
    still_open = query_one(
        "SELECT 1 AS ok FROM attendance_sessions WHERE id = ? AND datetime(created_at, '+24 hours') > datetime('now')",
        (session["id"],))
    return session, bool(still_open)


def _owned_subject(subject_id):
    return query_one(SUBJECT_SELECT + " WHERE sub.id = ? AND sub.faculty_user_id = ?",
                     (subject_id, g.current_user["id"]))


def _check_attendance_day(day, period):
    if not _valid_date(day):
        return "Choose a valid date"
    if day > date.today().isoformat():
        return "Attendance cannot be marked for a future date"
    if period not in PERIODS:
        return "Choose a period from 1 to 8"
    if query_one("SELECT id FROM holidays WHERE holiday_date = ?", (day,)):
        return "This date is a holiday, so attendance is not marked"
    return None


@college_bp.route("/attendance/my-subjects", methods=["GET"])
@require_auth(allowed_roles=FACULTY_ROLES)
def my_subjects():
    rows = query_all(SUBJECT_SELECT + " WHERE sub.faculty_user_id = ? ORDER BY sub.name", (g.current_user["id"],))
    return jsonify({"subjects": rows}), 200


@college_bp.route("/attendance/roster", methods=["GET"])
@require_auth(allowed_roles=FACULTY_ROLES)
def attendance_roster():
    subject_id = _int_or_none(request.args.get("subject_id"))
    day = (request.args.get("date") or "").strip()
    period = _int_or_none(request.args.get("period"))
    if not subject_id or subject_id < 0 or not _owned_subject(subject_id):
        return jsonify({"error": "This subject is not assigned to you"}), 403
    err = _check_attendance_day(day, period)
    if err:
        return jsonify({"error": err}), 400

    session, editable = _session_state(subject_id, day, period)
    students = query_all("""
        SELECT u.id, u.name, sp.roll_number,
               (SELECT ar.status FROM attendance_records ar WHERE ar.student_id = u.id AND ar.session_id = ?) AS status
        FROM users u JOIN student_profiles sp ON sp.user_id = u.id
        JOIN subjects sub ON sub.id = ?
        WHERE sp.batch_id = sub.batch_id AND u.status = 'active' AND u.role IN ('student', 'class_leader')
        ORDER BY sp.roll_number, u.name
    """, (session["id"] if session else -1, subject_id))
    return jsonify({
        "students": students,
        "session_exists": session is not None,
        "editable": editable,
        "message": "" if editable else "The 24-hour edit window for this attendance has closed",
    }), 200


@college_bp.route("/attendance/roster", methods=["POST"])
@require_auth(allowed_roles=FACULTY_ROLES)
def save_attendance():
    data = request.get_json() or {}
    subject_id = _int_or_none(data.get("subject_id"))
    day = _str(data, "date")
    period = _int_or_none(data.get("period"))
    records = data.get("records") or []
    if not subject_id or subject_id < 0 or not _owned_subject(subject_id):
        return jsonify({"error": "This subject is not assigned to you"}), 403
    err = _check_attendance_day(day, period)
    if err:
        return jsonify({"error": err}), 400

    roster = query_all("""
        SELECT u.id FROM users u JOIN student_profiles sp ON sp.user_id = u.id
        JOIN subjects sub ON sub.id = ?
        WHERE sp.batch_id = sub.batch_id AND u.status = 'active' AND u.role IN ('student', 'class_leader')
    """, (subject_id,))
    roster_ids = {row["id"] for row in roster}
    if not roster_ids:
        return jsonify({"error": "No students are enrolled in this subject's batch yet"}), 400

    status_by_student = {}
    for item in records:
        sid = _int_or_none(item.get("student_id"))
        status = _str(item, "status").upper()
        if sid not in roster_ids:
            return jsonify({"error": "A student is not in this subject's batch"}), 400
        if status not in ("P", "A", "OD", "L"):
            return jsonify({"error": "Status must be P (present), A (absent) or OD (on duty)"}), 400
        status_by_student[sid] = status
    if set(status_by_student) != roster_ids:
        return jsonify({"error": "Mark every student in the batch before saving"}), 400

    session, editable = _session_state(subject_id, day, period)
    if session and not editable:
        return jsonify({"error": "The 24-hour edit window for this attendance has closed"}), 403

    conn = get_db_connection()
    try:
        if session is None:
            cur = conn.execute(
                "INSERT INTO attendance_sessions (subject_id, session_date, period, marked_by) VALUES (?, ?, ?, ?)",
                (subject_id, day, period, g.current_user["id"]))
            session_id = cur.lastrowid
        else:
            session_id = session["id"]
            conn.execute("DELETE FROM attendance_records WHERE session_id = ?", (session_id,))
        for sid, status in status_by_student.items():
            conn.execute("INSERT INTO attendance_records (session_id, student_id, status) VALUES (?, ?, ?)",
                         (session_id, sid, status))
        conn.commit()
    finally:
        conn.close()
    return jsonify({"message": "Attendance saved" if session is None else "Attendance updated"}), 200


@college_bp.route("/attendance/me", methods=["GET"])
@college_bp.route("/attendance/student-summary", methods=["GET"])
@require_auth(allowed_roles=STUDENT_ROLES)
def my_attendance():
    student_id = g.current_user["id"]
    profile = query_one("SELECT batch_id FROM student_profiles WHERE user_id = ?", (student_id,))

    today_str = date.today().isoformat()
    today_row = query_one("""
        SELECT status, attendance_date FROM student_daily_attendance
        WHERE student_id = ? AND attendance_date = ?
    """, (student_id, today_str))
    today_status = today_row["status"] if today_row else None

    daily_records = query_all("""
        SELECT sda.id, sda.attendance_date, sda.status, sda.updated_at, u.name AS marked_by_name
        FROM student_daily_attendance sda
        LEFT JOIN users u ON u.id = sda.marked_by
        WHERE sda.student_id = ?
        ORDER BY sda.attendance_date DESC, sda.id DESC
    """, (student_id,))

    daily_total = len([r for r in daily_records if r.get("status") != 'L'])
    daily_attended = len([r for r in daily_records if r.get("status") in ('P', 'OD')])
    daily_pct = round(daily_attended * 100 / daily_total, 1) if daily_total else None

    subjects = []
    subject_total = 0
    subject_attended = 0
    if profile and profile.get("batch_id"):
        rows = query_all("""
            SELECT sub.id AS subject_id, sub.name AS subject_name, sub.code AS subject_code, f.name AS faculty_name,
                (SELECT COUNT(*) FROM attendance_records ar JOIN attendance_sessions se ON se.id = ar.session_id
                 WHERE se.subject_id = sub.id AND ar.student_id = ? AND ar.status <> 'L') AS total_count,
                (SELECT COUNT(*) FROM attendance_records ar JOIN attendance_sessions se ON se.id = ar.session_id
                 WHERE se.subject_id = sub.id AND ar.student_id = ? AND ar.status IN ('P', 'OD')) AS attended_count
            FROM subjects sub LEFT JOIN users f ON f.id = sub.faculty_user_id
            WHERE sub.batch_id = ? ORDER BY sub.name
        """, (student_id, student_id, profile["batch_id"]))
        for row in rows:
            pct = round(row["attended_count"] * 100 / row["total_count"], 1) if row["total_count"] else None
            subjects.append({**row, "percentage": pct, "shortage": pct is not None and pct < SHORTAGE_LIMIT})
            subject_total += row["total_count"]
            subject_attended += row["attended_count"]

    total_combined = subject_total + daily_total
    attended_combined = subject_attended + daily_attended
    if total_combined > 0:
        overall = round(attended_combined * 100 / total_combined, 1)
    else:
        overall = None

    return jsonify({
        "subjects": subjects,
        "overall": overall,
        "overall_percentage": overall,
        "total_count": total_combined,
        "attended_count": attended_combined,
        "today_date": today_str,
        "today_status": today_status,
        "today_status_label": "Present" if today_status == "P" else ("Absent" if today_status == "A" else None),
        "daily_records": daily_records,
        "daily_total": daily_total,
        "daily_attended": daily_attended,
        "daily_percentage": daily_pct,
        "shortage_limit": SHORTAGE_LIMIT
    }), 200


@college_bp.route("/attendance/shortages", methods=["GET"])
@require_auth(allowed_roles=STAFF_ROLES)
def attendance_shortages():
    sql = """
        SELECT u.id, u.name, sp.roll_number, b.name AS batch_name, s.name AS section_name, p.department_id,
            (SELECT COUNT(*) FROM attendance_records ar WHERE ar.student_id = u.id AND ar.status <> 'L') AS total,
            (SELECT COUNT(*) FROM attendance_records ar WHERE ar.student_id = u.id AND ar.status IN ('P', 'OD')) AS attended
        FROM users u
        JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN batches b ON b.id = sp.batch_id
        LEFT JOIN sections s ON s.id = sp.section_id
        LEFT JOIN programs p ON p.id = b.program_id
        WHERE u.role IN ('student', 'class_leader') AND u.status = 'active'
    """
    params = []
    if _is_hod_scope():
        sql += " AND p.department_id = ?"
        params.append(_my_department_id() or -1)
    rows = query_all(sql, tuple(params))
    shortages = []
    for row in rows:
        if row["total"]:
            pct = round(row["attended"] * 100 / row["total"], 1)
            if pct < SHORTAGE_LIMIT:
                shortages.append({**row, "percentage": pct})
    shortages.sort(key=lambda r: r["percentage"])
    return jsonify({"shortages": shortages, "shortage_limit": SHORTAGE_LIMIT}), 200
