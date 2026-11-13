import os
import sys
from flask import Blueprint, g, jsonify, request

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.db import department_name_of_user, execute_write, query_all, query_one
from backend.auth import CONTACT_MATCH_SQL, EMAIL_PATTERN, PHONE_PATTERN, hash_password, normalize_contact, require_auth, roles_reviewable_by, validate_contact, validate_username, username_in_use, extract_single_name, name_in_use

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

import re

def resolve_section_id(section_val, department_id=None):
    """Resolve section input (ID number or name like 'A', 'B', 'Section A') to an existing or created section."""
    if not section_val:
        return None
    val_str = str(section_val).strip()
    if not val_str:
        return None
    if val_str.isdigit():
        row = query_one("SELECT id FROM sections WHERE id = ?", (int(val_str),))
        if row:
            return row["id"]

    clean_name = re.sub(r'(?i)^section\s*', '', val_str).strip().upper()
    if not clean_name:
        clean_name = val_str

    row = query_one("SELECT id FROM sections WHERE upper(name) = ? LIMIT 1", (clean_name,))
    if row:
        return row["id"]

    batch_row = None
    if department_id:
        batch_row = query_one("""
            SELECT b.id FROM batches b
            JOIN programs p ON p.id = b.program_id
            WHERE p.department_id = ? LIMIT 1
        """, (department_id,))
    if not batch_row:
        batch_row = query_one("SELECT id FROM batches LIMIT 1")

    if batch_row:
        new_sec_id = execute_write(
            "INSERT INTO sections (batch_id, name) VALUES (?, ?)",
            (batch_row["id"], clean_name)
        )
        return new_sec_id

    return None

@admin_bp.route("/profiles", methods=["GET"])
@require_auth(allowed_roles=["dean", "super_admin", "admin", "principal", "class_teacher", "student", "class_leader"])
def get_user_profiles():
    """List user profiles according to caller's role hierarchy.
    - Dean, Super Admin & Admin: inspect all profiles.
    - Class Teacher: inspect faculty and students.
    - Student / Class Leader: inspect student cohorts.
    """
    current_role = g.current_user["role"]
    role_filter = request.args.get("role")
    status_filter = request.args.get("status")
    search_q = (request.args.get("q") or request.args.get("search") or "").strip()

    sql = """SELECT u.id, u.name, u.email, u.username, u.role, u.status, u.created_at, u.created_by_id,
               u.last_edited_by_id, u.last_edited_at,
               cb.name AS created_by_name, cb.role AS created_by_role,
               eb.name AS edited_by_name, eb.role AS edited_by_role,
               st.roll_number, st.section_id, sec.name AS section_name,
               COALESCE(st.academic_year, u.academic_year) AS academic_year,
               COALESCE(st.previous_year, u.previous_year) AS previous_year,
               st.year_changed_at,
               st.guardian_name, st.guardian_phone, st.guardian_email,
               CASE
                 WHEN u.role IN ('dean', 'super_admin', 'admin') THEN NULL
                 ELSE
                   COALESCE(
                     (SELECT GROUP_CONCAT(d.name, ', ') FROM (
                        SELECT DISTINCT d2.name FROM staff_departments sd JOIN departments d2 ON d2.id = sd.department_id WHERE sd.user_id = u.id ORDER BY d2.name
                     ) d),
                     (SELECT d.name FROM staff_profiles sp JOIN departments d ON d.id = sp.department_id WHERE sp.user_id = u.id),
                     (SELECT d.name FROM student_profiles st2
                        LEFT JOIN batches b ON b.id = st2.batch_id LEFT JOIN programs p ON p.id = b.program_id
                        JOIN departments d ON d.id = COALESCE(st2.department_id, p.department_id)
                        WHERE st2.user_id = u.id)
                   )
               END AS department_name
            FROM users u
            LEFT JOIN users cb ON cb.id = u.created_by_id
            LEFT JOIN users eb ON eb.id = u.last_edited_by_id
            LEFT JOIN student_profiles st ON st.user_id = u.id
            LEFT JOIN sections sec ON sec.id = st.section_id
            WHERE 1=1"""
    params = []

    if current_role == "class_teacher":
        sql += " AND u.role IN ('teacher', 'class_teacher', 'student', 'class_leader')"
    elif current_role in ["student", "class_leader"]:
        sql += " AND u.role IN ('student', 'class_leader')"

    if role_filter:
        sql += " AND u.role = ?"
        params.append(role_filter)
    if status_filter:
        sql += " AND u.status = ?"
        params.append(status_filter)
    if search_q:
        sql += """ AND (
            LOWER(u.name) LIKE ? OR
            LOWER(u.email) LIKE ? OR
            LOWER(COALESCE(u.username, '')) LIKE ? OR
            LOWER(u.role) LIKE ? OR
            LOWER(COALESCE(st.roll_number, '')) LIKE ? OR
            CAST(u.id AS TEXT) = ?
        )"""
        s_term = f"%{search_q.lower()}%"
        params.extend([s_term, s_term, s_term, s_term, s_term, search_q])

    sql += " ORDER BY u.id DESC"
    users = query_all(sql, tuple(params))
    only_created_by_me = request.args.get("created_by_me", "0") in ("1", "true", "True")
    filtered_users = []
    # Bulk fetch department relationships once to eliminate N+1 database queries
    staff_depts_map = {}
    for r in query_all("SELECT user_id, department_id FROM staff_departments ORDER BY id ASC"):
        staff_depts_map.setdefault(r["user_id"], []).append(r["department_id"])

    staff_profiles_map = {
        r["user_id"]: r["department_id"]
        for r in query_all("SELECT user_id, department_id FROM staff_profiles WHERE department_id IS NOT NULL")
    }

    student_profiles_map = {
        r["user_id"]: r["department_id"]
        for r in query_all("SELECT user_id, department_id FROM student_profiles WHERE department_id IS NOT NULL")
    }

    for u in users:
        creator_id = u.get("created_by_id")
        u["created_by_id"] = creator_id
        is_my_account = (creator_id == g.current_user["id"])
        u["created_by_me"] = is_my_account
        if u.get("role") == "principal":
            u["can_edit"] = (g.current_user["role"] == "super_admin")
        elif g.current_user["role"] == "principal":
            u["can_edit"] = False
        else:
            u["can_edit"] = (
                g.current_user["role"] in ("dean", "super_admin", "admin")
                or creator_id == g.current_user["id"]
                or u["id"] == g.current_user["id"]
            )
        u_id = u["id"]
        u_role = u["role"]
        if u_role in ("dean", "super_admin", "admin"):
            u["department_id"] = None
            u["department_ids"] = []
        elif u_id in staff_depts_map:
            u["department_ids"] = staff_depts_map[u_id]
            u["department_id"] = staff_depts_map[u_id][0]
        elif u_role in ("teacher", "class_teacher", "hod"):
            dept_id = staff_profiles_map.get(u_id)
            u["department_id"] = dept_id
            u["department_ids"] = [dept_id] if dept_id else []
        elif u_role in ("student", "class_leader"):
            dept_id = student_profiles_map.get(u_id)
            u["department_id"] = dept_id
            u["department_ids"] = [dept_id] if dept_id else []
        else:
            u["department_id"] = None
            u["department_ids"] = []

        if not u.get("academic_year"):
            from backend.routes_teacher import extract_dept_and_year
            _, ext_y = extract_dept_and_year(u)
            u["academic_year"] = ext_y

        if only_created_by_me:
            if is_my_account or u["id"] == g.current_user["id"]:
                filtered_users.append(u)
        else:
            filtered_users.append(u)

    return jsonify({"users": filtered_users}), 200

@admin_bp.route("/profiles/<int:user_id>", methods=["GET"])
@require_auth()
def get_single_profile(user_id: int):
    """Detailed profile view for an individual user."""
    user = query_one(
        """SELECT u.id, u.name, u.email, u.username, u.role, u.status, u.created_at, u.created_by_id,
                  u.last_edited_by_id, u.last_edited_at,
                  cb.name AS created_by_name, cb.role AS created_by_role,
                  eb.name AS edited_by_name, eb.role AS edited_by_role
           FROM users u
           LEFT JOIN users cb ON cb.id = u.created_by_id
           LEFT JOIN users eb ON eb.id = u.last_edited_by_id
           WHERE u.id = ?""",
        (user_id,)
    )
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.get("role") == "principal":
        can_edit = (g.current_user["role"] == "super_admin")
    elif g.current_user["role"] == "principal":
        can_edit = False
    else:
        can_edit = (
            user.get("created_by_id") == g.current_user["id"]
            or g.current_user["role"] in ("super_admin", "admin", "dean")
            or user["id"] == g.current_user["id"]
        )

    extra_data = {}
    if user["role"] in ["student", "class_leader"]:
        submissions = query_all(
            """SELECT s.id, s.is_correct, s.time_taken_seconds, s.submitted_at,
                      q.question_text, q.correct_option, s.selected_option
               FROM submissions s
               JOIN questions q ON s.question_id = q.id
               WHERE s.student_id = ?
               ORDER BY s.submitted_at DESC""",
            (user_id,)
        )
        groups = query_all(
            """SELECT g.id, g.name, g.description, gs.assigned_at
               FROM group_students gs
               JOIN groups g ON gs.group_id = g.id
               WHERE gs.student_id = ?""",
            (user_id,)
        )
        extra_data["total_attempted"] = len(submissions)
        extra_data["correct_count"] = sum(1 for s in submissions if s["is_correct"] == 1)
        extra_data["submissions"] = submissions
        extra_data["groups"] = groups
    elif user["role"] in ["teacher", "class_teacher"]:
        questions = query_all(
            "SELECT id, question_text, duration_seconds, target_type, created_at FROM questions WHERE teacher_id = ? ORDER BY id DESC",
            (user_id,)
        )
        groups = query_all(
            "SELECT id, name, description, created_at FROM groups WHERE created_by_teacher_id = ? ORDER BY id DESC",
            (user_id,)
        )
        extra_data["questions_count"] = len(questions)
        extra_data["groups_count"] = len(groups)
        extra_data["questions"] = questions
        extra_data["groups"] = groups

    response = {"user": user, "details": extra_data, "can_edit": can_edit}
    if can_edit:
        staff = query_one("SELECT department_id, designation FROM staff_profiles WHERE user_id = ?", (user_id,))
        stu = query_one("SELECT department_id FROM student_profiles WHERE user_id = ?", (user_id,)) if user["role"] in ("student", "class_leader") else None
        dept_rows = query_all("SELECT department_id FROM staff_departments WHERE user_id = ?", (user_id,))
        if dept_rows:
            dept_ids = [r["department_id"] for r in dept_rows]
        elif staff and staff["department_id"]:
            dept_ids = [staff["department_id"]]
        elif stu and stu["department_id"]:
            dept_ids = [stu["department_id"]]
        else:
            dept_ids = []

        chosen_dept_id = staff["department_id"] if staff else (stu["department_id"] if stu else None)
        user["department_id"] = chosen_dept_id
        user["department_name"] = department_name_of_user(user_id)
        response["editable_roles"] = creatable_roles(g.current_user["role"])
        response["form"] = {
            "username": user["username"] or "",
            "department_id": chosen_dept_id,
            "department_ids": dept_ids,
            "designation": (staff["designation"] or "") if staff else "",
        }
        if user["role"] in ("student", "class_leader"):
            st_prof = query_one("""
                SELECT sp.roll_number, sp.section_id, s.name as section_name,
                       sp.guardian_name, sp.guardian_phone, sp.guardian_email
                FROM student_profiles sp
                LEFT JOIN sections s ON s.id = sp.section_id
                WHERE sp.user_id = ?
            """, (user_id,))
            if st_prof:
                user["roll_number"] = st_prof["roll_number"]
                user["section_id"] = st_prof["section_id"]
                user["section_name"] = st_prof["section_name"]
                user["guardian_name"] = st_prof["guardian_name"]
                user["guardian_phone"] = st_prof["guardian_phone"]
                user["guardian_email"] = st_prof["guardian_email"]
                response["form"]["section_id"] = st_prof["section_id"]
                response["form"]["section_name"] = st_prof["section_name"]
                response["form"]["roll_number"] = st_prof["roll_number"] or ""
                response["form"]["guardian_name"] = st_prof["guardian_name"] or ""
                response["form"]["guardian_phone"] = st_prof["guardian_phone"] or ""
                response["form"]["guardian_email"] = st_prof["guardian_email"] or ""
    return jsonify(response), 200

# Roles that receive the "account created" notifications
NOTIFY_ACCOUNT_ROLES = ("super_admin", "admin", "class_teacher", "teacher")

# Roles that belong to a department (faculty)
DEPT_ROLES = ("hod", "class_teacher", "teacher")

# Student roles that carry a department (stored on the student profile)
STUDENT_DEPT_ROLES = ("student", "class_leader")

def check_department_choice(raw_dept, new_name, new_code):
    """Validate the department part of a faculty account (used by Create Account and self-registration).
    Returns (department_id, new_department_name, new_department_code, error_message).
    An approved department gives its id; a new one is returned so it can wait for admin approval."""
    raw_dept = str(raw_dept or "").strip()
    new_name = (new_name or "").strip()
    new_code = (new_code or "").strip().upper()
    if raw_dept and new_name:
        return None, "", "", "Choose an existing department or ask for a new one, not both"
    if raw_dept:
        if not raw_dept.isdigit() or not query_one("SELECT id FROM departments WHERE id = ?", (int(raw_dept),)):
            return None, "", "", "The selected department does not exist"
        return int(raw_dept), "", "", None
    if new_name or new_code:
        if not (new_name and new_code):
            return None, "", "", "Enter both the new department name and its code"
        if query_one("SELECT id FROM departments WHERE lower(name) = lower(?) OR code = ?", (new_name, new_code)):
            return None, "", "", "This department already exists. Choose it from the list instead."
        if query_one("SELECT id FROM department_requests WHERE status = 'pending' AND (lower(name) = lower(?) OR code = ?)",
                     (new_name, new_code)):
            return None, "", "", "A request for this department is already waiting for admin approval"
        return None, new_name, new_code, None
    return None, "", "", None

def _link_hod(user_id, dept_id):
    """Make this HOD the head of the department, the same way the Assign HOD button does."""
    if not dept_id:
        return
    execute_write("UPDATE departments SET hod_user_id = NULL WHERE hod_user_id = ?", (user_id,))
    execute_write("UPDATE departments SET hod_user_id = ? WHERE id = ?", (user_id, dept_id))

def _add_department_now(name, code):
    """Add a department straight away. Used when the College Admin, who approves departments, adds one."""
    try:
        return execute_write("INSERT INTO departments (name, code) VALUES (?, ?)", (name, code)), None
    except Exception:
        return None, "A department with this name or code already exists. Choose it from the list instead."

def staff_department_ids(user_id) -> list:
    """Departments assigned to a teacher / class teacher (staff_departments plus the main staff_profiles department)."""
    ids = []
    for r in query_all("SELECT department_id FROM staff_departments WHERE user_id = ?", (user_id,)):
        if r["department_id"] is not None and r["department_id"] not in ids:
            ids.append(r["department_id"])
    sp = query_one("SELECT department_id FROM staff_profiles WHERE user_id = ?", (user_id,))
    if sp and sp["department_id"] is not None and sp["department_id"] not in ids:
        ids.append(sp["department_id"])
    return ids

def creatable_roles(role: str) -> list:
    """Roles an account holder may create (and move an account they created to)."""
    has_super = bool(query_one("SELECT 1 FROM users WHERE role = 'super_admin' LIMIT 1"))
    has_principal = bool(query_one("SELECT 1 FROM users WHERE role = 'principal' LIMIT 1"))
    base_super_roles = ["admin", "dean", "hod", "class_teacher", "teacher", "student", "class_leader", "accountant", "librarian", "parent"]
    if not has_super:
        base_super_roles.insert(0, "super_admin")
    if not has_principal:
        base_super_roles.insert(2 if not has_super else 1, "principal")
    return {
        "dean": ["super_admin"] if not has_super else [],
        "super_admin": base_super_roles,
        "admin": ["dean", "admin", "hod", "class_teacher", "teacher", "student", "class_leader", "accountant", "librarian", "parent"],
        "teacher": ["teacher", "student", "class_leader"],
        "class_teacher": ["class_teacher", "teacher", "student", "class_leader"],
        "student": ["student", "class_leader"],
        "class_leader": ["student", "class_leader"],
    }.get(role, [])


@admin_bp.route("/principal-status", methods=["GET"])
def principal_status():
    """Check if a principal account is already provisioned."""
    has_principal = bool(query_one("SELECT 1 FROM users WHERE role = 'principal' LIMIT 1"))
    return jsonify({"exists": has_principal}), 200


@admin_bp.route("/create-account", methods=["POST"])
@require_auth(allowed_roles=["dean", "super_admin", "admin", "teacher", "class_teacher", "student", "class_leader"])
def create_account():
    """Create accounts according to exact role constraints:
    - Dean: can create 'super_admin' accounts only (monitors super admin).
    - Super Admin: can create 'super_admin', 'admin', 'principal', 'hod', 'class_teacher', 'teacher', 'student', 'class_leader', 'accountant', 'librarian' and 'parent' accounts.
    - Admin: can create 'admin', 'hod', 'class_teacher', 'teacher', 'student', 'class_leader', 'accountant', 'librarian' and 'parent' accounts.
    - Teacher: can create 'teacher', 'student' and 'class_leader' accounts.
    - Class Teacher: can create 'class_teacher', 'teacher', 'student' and 'class_leader' accounts.
    - Student / Class Leader: can create 'student' and 'class_leader' accounts only.
    """
    creator = g.current_user
    data = request.get_json() or {}

    name = extract_single_name((data.get("name") or "").strip())
    identifier = normalize_contact(data.get("email_or_phone") or data.get("email") or data.get("identifier") or "")
    password = (data.get("password") or "").strip()
    target_role = (data.get("role") or "").strip().lower()
    username = (data.get("username") or "").strip()

    if not name or not identifier or not password or not target_role:
        return jsonify({"error": "Full name, email or phone number, password, and role are all required"}), 400

    if target_role == "super_admin":
        existing_super = query_one("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1")
        if existing_super:
            return jsonify({"error": "Super Admin can only be created once. A Super Admin account already exists."}), 400

    if target_role == "principal":
        if creator["role"] != "super_admin":
            return jsonify({"error": "Permission denied: only Super Admin can create a Principal account."}), 403
        existing_principal = query_one("SELECT id FROM users WHERE role = 'principal' LIMIT 1")
        if existing_principal:
            return jsonify({"error": "Principal can only be created once. A Principal account already exists."}), 400

    # Enforce unique Full Name: same name is not eligible
    if name_in_use(name):
        return jsonify({
            "error": f"The Full Name '{name}' is not eligible as an account with this name already exists. Please choose a different single name."
        }), 400

    if "@" not in identifier:
        if not PHONE_PATTERN.match(identifier):
            return jsonify({"error": "Phone number must be between 8 and 15 digits (optional + at the start)"}), 400
    else:
        if not EMAIL_PATTERN.match(identifier):
            return jsonify({"error": "Please enter a valid email address (e.g. username1@inpand.com)"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400

    # Enforce the role rules (see creatable_roles)
    if target_role not in creatable_roles(creator["role"]):
        if creator["role"] == "dean":
            return jsonify({
                "error": "Permission denied: Dean is only authorized to create Super Admin accounts."
            }), 403
        return jsonify({
            "error": f"Permission denied: your role cannot create {target_role.replace('_', ' ').title()} accounts."
        }), 403

    import re
    if not username:
        clean_name = re.sub(r'[^a-zA-Z0-9_.]', '', name).strip().lower()
        candidate = clean_name if len(clean_name) >= 3 else (re.sub(r'[^a-zA-Z0-9_.]', '', identifier.split("@")[0] if "@" in identifier else f"user_{identifier[-6:]}"))
        if len(candidate) < 3:
            candidate = f"user_{identifier}"
        candidate = candidate[:30]
        counter = 1
        base = candidate
        while username_in_use(candidate):
            candidate = f"{base[:25]}_{counter}"
            counter += 1
        username = candidate
    else:
        username_error = validate_username(username)
        if username_error:
            return jsonify({"error": username_error}), 400
        if username_in_use(username):
            return jsonify({"error": "This user name is already taken"}), 400

    # Preserve exact email or phone number entered by the admin
    identifier = identifier.strip().lower() if "@" in identifier else identifier.strip()

    # Check for existing email or phone
    existing = query_one(f"SELECT id FROM users WHERE {CONTACT_MATCH_SQL}", (identifier,))
    if existing:
        return jsonify({"error": "An account with this email or phone number already exists"}), 400

    # Faculty accounts can carry a designation and a department. Students and Class Leaders carry a department too.
    # A department that is not in the list is held as a request until the College Admin approves it.
    dept_roles = DEPT_ROLES
    is_faculty = target_role in dept_roles
    is_student = target_role in STUDENT_DEPT_ROLES
    designation = None
    department_id = None
    new_dept_name = ""
    new_dept_code = ""
    if is_faculty:
        designation = (data.get("designation") or "").strip() or None

    dept_ids_list = data.get("department_ids") or []
    if isinstance(dept_ids_list, list) and dept_ids_list:
        valid_dept_ids = []
        for did in dept_ids_list:
            try:
                did_int = int(did)
                if query_one("SELECT id FROM departments WHERE id = ?", (did_int,)):
                    valid_dept_ids.append(did_int)
            except (ValueError, TypeError):
                pass
        dept_ids_list = valid_dept_ids
    else:
        dept_ids_list = []

    dept_choice = data.get("department_id")
    if not dept_choice and dept_ids_list:
        dept_choice = dept_ids_list[0]

    # Teachers and Class Teachers can create students (and class leaders) for their own department only.
    # If no department is assigned to them yet, they must choose one first; it is then assigned to them.
    assign_dept_to_creator = None
    if is_student and creator["role"] in ("teacher", "class_teacher"):
        if data.get("new_department_name") or data.get("new_department_code"):
            return jsonify({"error": "Teachers and Class Teachers cannot create a new department. Choose a department from the list."}), 400
        own_dept_ids = staff_department_ids(creator["id"])
        chosen = str(dept_choice or "").strip()
        if chosen and not chosen.isdigit():
            return jsonify({"error": "The selected department does not exist"}), 400
        if own_dept_ids:
            if not chosen:
                if len(own_dept_ids) == 1:
                    dept_choice = own_dept_ids[0]
                else:
                    return jsonify({"error": "Please select one of your departments for this student."}), 400
            elif int(chosen) not in own_dept_ids:
                return jsonify({"error": "You can create students only for your own department."}), 403
        else:
            if not chosen:
                return jsonify({
                    "error": "No department is assigned to you yet. Please select a department first, then create the student account.",
                    "needs_department": True
                }), 400
            if not query_one("SELECT id FROM departments WHERE id = ?", (int(chosen),)):
                return jsonify({"error": "The selected department does not exist"}), 400
            assign_dept_to_creator = int(chosen)

    if is_faculty or is_student:
        if target_role == "teacher":
            if not dept_choice and not dept_ids_list and not data.get("new_department_name"):
                return jsonify({"error": "Department is mandatory. Please select at least one department."}), 400
            if dept_ids_list and len(dept_ids_list) > 10:
                return jsonify({"error": "A teacher can be assigned to a maximum of 10 departments."}), 400
        elif target_role == "class_teacher":
            if dept_ids_list and len(dept_ids_list) > 1:
                return jsonify({"error": "Class Teachers can be assigned to only 1 department."}), 400
            if not dept_choice and not data.get("new_department_name"):
                return jsonify({"error": "Department is mandatory. Please select an assigned department."}), 400
        else:
            if not dept_choice and not data.get("new_department_name"):
                if is_student and creator["role"] in ("teacher", "class_teacher"):
                    staff = query_one("SELECT department_id FROM staff_profiles WHERE user_id = ?", (creator["id"],))
                    dept_choice = staff["department_id"] if staff else None
                elif is_student and creator["role"] in ("student", "class_leader"):
                    sp = query_one("SELECT department_id FROM student_profiles WHERE user_id = ?", (creator["id"],))
                    dept_choice = sp["department_id"] if sp else None
                if not dept_choice and not data.get("new_department_name"):
                    return jsonify({"error": "Department is mandatory. Please select a department."}), 400

        if dept_choice or data.get("new_department_name"):
            department_id, new_dept_name, new_dept_code, dept_error = check_department_choice(
                dept_choice, data.get("new_department_name"), data.get("new_department_code"))
            if dept_error:
                return jsonify({"error": dept_error}), 400

    # The College Admin and Super Admin approve departments, so a department either adds takes effect straight away (no request)
    if new_dept_name and creator["role"] in ("admin", "super_admin"):
        department_id, dept_err = _add_department_now(new_dept_name, new_dept_code)
        if dept_err:
            return jsonify({"error": dept_err}), 400
        new_dept_name = new_dept_code = ""

    # Accounts created by the Super Admin or College Admin are active straight away.
    # Class Leader accounts created by Super Admin, Admin, Teacher, or Class Teacher do not need approval (active straight away).
    if target_role == "class_leader" and creator["role"] in ("super_admin", "admin", "teacher", "class_teacher"):
        needs_approval = False
    elif creator["role"] in ("teacher", "class_teacher", "student", "class_leader"):
        needs_approval = True
    else:
        needs_approval = False
    status = "pending" if needs_approval else "active"

    pwd_hash = hash_password(password)
    user_id = execute_write(
        "INSERT INTO users (name, email, password_hash, role, status, username, created_by_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (name, identifier, pwd_hash, target_role, status, username or None, creator["id"])
    )
    if is_faculty:
        qualification = (data.get("qualification") or "").strip() or None
        execute_write(
            "INSERT INTO staff_profiles (user_id, department_id, designation, qualification) VALUES (?, ?, ?, ?)",
            (user_id, department_id, designation, qualification)
        )
        if dept_ids_list:
            for did in dept_ids_list:
                execute_write(
                    "INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)",
                    (user_id, did)
                )
        elif department_id:
            execute_write(
                "INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)",
                (user_id, department_id)
            )
    if assign_dept_to_creator:
        if query_one("SELECT id FROM staff_profiles WHERE user_id = ?", (creator["id"],)):
            execute_write("UPDATE staff_profiles SET department_id = ? WHERE user_id = ? AND department_id IS NULL",
                          (assign_dept_to_creator, creator["id"]))
        else:
            execute_write("INSERT INTO staff_profiles (user_id, department_id) VALUES (?, ?)",
                          (creator["id"], assign_dept_to_creator))
        execute_write("INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)",
                      (creator["id"], assign_dept_to_creator))
    if is_student:
        sec_val = data.get("section_id") or data.get("section") or data.get("section_name")
        resolved_sec_id = resolve_section_id(sec_val, department_id)
        batch_val = data.get("batch_id") or data.get("batch") or data.get("batch_name") or data.get("custom_batch")
        if batch_val and str(batch_val).isdigit():
            batch_id = int(batch_val)
        elif batch_val and str(batch_val).strip() and str(batch_val).strip().lower() != "custom":
            b_name = str(batch_val).strip()
            existing_batch = query_one("SELECT id FROM batches WHERE LOWER(name) = LOWER(?)", (b_name,))
            if existing_batch:
                batch_id = existing_batch["id"]
            else:
                batch_id = execute_write(
                    "INSERT INTO batches (name, academic_year) VALUES (?, ?)",
                    (b_name, str(acad_year or 1))
                )
        else:
            batch_id = None
        roll_number = (data.get("roll_number") or "").strip() or None
        guardian_name = (data.get("guardian_name") or "").strip() or None
        guardian_phone = (data.get("guardian_phone") or "").strip() or None
        guardian_email = (data.get("guardian_email") or "").strip() or None

        acad_year = data.get("academic_year") or data.get("year")
        if acad_year and str(acad_year).isdigit():
            acad_year = int(acad_year)
        else:
            from backend.routes_teacher import extract_dept_and_year
            _, ext_y = extract_dept_and_year({"username": new_username, "name": name, "email": email, "roll_number": roll_number})
            acad_year = ext_y

        execute_write(
            """INSERT INTO student_profiles (user_id, department_id, batch_id, section_id, roll_number, guardian_name, guardian_phone, guardian_email, academic_year)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, department_id, batch_id, resolved_sec_id, roll_number, guardian_name, guardian_phone, guardian_email, acad_year)
        )
        if acad_year:
            execute_write("UPDATE users SET academic_year = ? WHERE id = ?", (acad_year, user_id))
    if target_role == "hod":
        _link_hod(user_id, department_id)
    request_id = None
    if new_dept_name:
        request_id = execute_write(
            "INSERT INTO department_requests (name, code, requested_user_id, requested_by_id, status) VALUES (?, ?, ?, ?, 'pending')",
            (new_dept_name, new_dept_code, user_id, creator["id"])
        )

    # Account-created notifications go only to Super Admin, Admin, Class Teacher and Teacher accounts
    role_label = target_role.replace("_", " ").title()
    creator_label = creator["role"].replace("_", " ").title()
    dept_label = department_name_of_user(user_id) or (f"{new_dept_name} (pending approval)" if new_dept_name else None)
    if needs_approval:
        execute_write("""
            INSERT INTO notifications (recipient_role, sender_id, sender_role, sender_name, type, title, message, reference_id, department_name, is_read)
            VALUES ('admin', ?, ?, ?, 'student_registration', ?, ?, ?, ?, 0)
        """, (
            creator["id"], creator["role"], creator["name"],
            f"New {role_label} Account Needs Approval: {name}",
            f"{creator['name']} ({creator_label}) created {role_label} account {name} ({identifier}). Approve or reject it in Pending Approvals.",
            user_id, dept_label
        ))
    # 1. Notify the newly created user in their portal
    execute_write("""
        INSERT INTO notifications (recipient_id, sender_id, sender_role, sender_name, type, title, message, reference_id, department_name, is_read)
        VALUES (?, ?, ?, ?, 'account_created', ?, ?, ?, ?, 0)
    """, (
        user_id, creator["id"], creator["role"], creator["name"],
        "Your Account Has Been Created",
        f"Your {role_label} account was created by {creator['name']} ({creator_label}). Sign in with your username '{username or identifier}'.",
        user_id, dept_label
    ))

    # 2. Notify the creator (Super Admin or College Admin)
    if creator["role"] in (*NOTIFY_ACCOUNT_ROLES, "super_admin", "admin"):
        created_text = "submitted for College Admin approval" if needs_approval else "created successfully"
        execute_write("""
            INSERT INTO notifications (recipient_id, sender_id, sender_role, sender_name, type, title, message, reference_id, department_name, is_read)
            VALUES (?, ?, ?, ?, 'account_created', ?, ?, ?, ?, 0)
        """, (
            creator["id"], creator["id"], creator["role"], creator["name"],
            f"Account Created: {name}",
            f"{role_label} account for {name} ({identifier}) was {created_text}.",
            user_id, dept_label
        ))
    if request_id:
        execute_write("""
            INSERT INTO notifications (recipient_role, sender_id, sender_role, sender_name, type, title, message, reference_id, department_name, is_read)
            VALUES ('admin', ?, ?, ?, 'department_request', ?, ?, ?, ?, 0)
        """, (
            creator["id"], creator["role"], creator["name"],
            "New Department Needs Approval",
            f"{creator['name']} ({creator_label}) added {name} as {role_label} and asked for the new department '{new_dept_name}' ({new_dept_code}). Approve or reject it in College Setup.",
            request_id, new_dept_name
        ))

    if needs_approval:
        message = f"Account for {name} ({role_label}) submitted. It is waiting for College Admin approval and can sign in once approved"
    else:
        message = f"Account for {name} ({role_label}) created successfully"
    if request_id:
        message += f". The new department '{new_dept_name}' was sent to the College Admin for approval; {name} joins it once approved."
    return jsonify({
        "message": message,
        "user": {
            "id": user_id,
            "name": name,
            "email": identifier,
            "role": target_role,
            "status": status
        },
        "pending_department": new_dept_name or None
    }), 201

@admin_bp.route("/users/<int:user_id>", methods=["PUT"])
@require_auth()
def update_user_account(user_id: int):
    """Edit an account. Any user can edit their own login details; Admin and Super Admin can edit all users."""
    editor = g.current_user
    target = query_one(
        "SELECT id, name, email, username, role, created_by_id FROM users WHERE id = ?", (user_id,))
    if not target:
        return jsonify({"error": "User not found"}), 404
    if target["role"] == "principal" and editor["role"] != "super_admin":
        return jsonify({"error": "Permission denied: Principal accounts can only be edited by Super Admin."}), 403
    if editor["role"] == "principal":
        return jsonify({"error": "Permission denied: Principal accounts cannot edit user details."}), 403

    can_manage_target = (
        editor["role"] == "super_admin"
        or editor["role"] == "admin"
        or target["created_by_id"] == editor["id"]
        or editor["id"] == target["id"]
    )
    if not can_manage_target:
        return jsonify({"error": "Permission denied: you cannot edit this account"}), 403

    data = request.get_json() or {}
    raw_name = (data.get("name") or "").strip()
    name = extract_single_name(raw_name) if raw_name else target["name"]
    if name and name.lower() != (target["name"] or "").lower():
        if name_in_use(name, exclude_user_id=user_id):
            return jsonify({
                "error": f"The Full Name '{name}' is not eligible as an account with this name already exists. Please choose a different single name."
            }), 400

    username = (data.get("username") or target["username"] or "").strip()
    if not username:
        return jsonify({"error": "User name is required"}), 400
    if username.lower() != (target["username"] or "").lower():
        username_error = validate_username(username)
        if username_error:
            return jsonify({"error": username_error}), 400
        if username_in_use(username):
            return jsonify({"error": "This user name is already taken"}), 400

    raw_contact = normalize_contact(data.get("email_or_phone") or data.get("email") or target["email"])
    if "@" not in raw_contact:
        if not PHONE_PATTERN.match(raw_contact):
            return jsonify({"error": "Phone number must be between 8 and 15 digits (optional + at the start)"}), 400
    else:
        if not EMAIL_PATTERN.match(raw_contact):
            return jsonify({"error": "Please enter a valid email address (e.g. username1@inpand.com)"}), 400

    identifier = raw_contact.strip().lower() if "@" in raw_contact else raw_contact.strip()

    if identifier != target["email"]:
        contact_error = validate_contact(identifier)
        if contact_error:
            return jsonify({"error": contact_error}), 400
        if query_one(f"SELECT id FROM users WHERE ({CONTACT_MATCH_SQL}) AND id != ?", (identifier, user_id)):
            return jsonify({"error": "An account with this email or phone number already exists"}), 400

    new_role = (data.get("role") or target["role"]).strip().lower()
    if new_role != target["role"] and new_role not in creatable_roles(editor["role"]):
        return jsonify({
            "error": f"Permission denied: your role cannot change an account to {new_role.replace('_', ' ').title()}."
        }), 403

    if new_role == "principal" and target["role"] != "principal":
        if editor["role"] != "super_admin":
            return jsonify({"error": "Permission denied: only Super Admin can assign the Principal role."}), 403
        existing_principal = query_one("SELECT id FROM users WHERE role = 'principal' AND id != ? LIMIT 1", (user_id,))
        if existing_principal:
            return jsonify({"error": "Principal can only exist once. A Principal account already exists."}), 400

    password = (data.get("password") or "").strip()
    if password:
        if editor["role"] in ('student', 'class_leader') or target["role"] in ('student', 'class_leader'):
            password = ""
        elif len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long"}), 400

    staff = query_one("SELECT department_id, designation FROM staff_profiles WHERE user_id = ?", (user_id,))
    is_faculty = new_role in DEPT_ROLES
    dept_id = designation = None
    new_dept_name = new_dept_code = ""

    multi_dept_ids = data.get("department_ids")
    if multi_dept_ids is not None:
        if not isinstance(multi_dept_ids, list):
            multi_dept_ids = [multi_dept_ids] if multi_dept_ids else []
        valid_ids = []
        for x in multi_dept_ids:
            try:
                x_int = int(x)
                if query_one("SELECT id FROM departments WHERE id = ?", (x_int,)):
                    valid_ids.append(x_int)
            except (ValueError, TypeError):
                pass
    # Enforce role department rules:
    # Super Admin & Admin: no department allowed
    if new_role in ('super_admin', 'admin', 'principal'):
        multi_dept_ids = []
        dept_id = None

    if is_faculty:
        if multi_dept_ids:
            dept_id = multi_dept_ids[0]
        else:
            # Pick an approved department, or keep current, or ask for a new one (sent to the College Admin)
            dept_choice = data.get("department_id") or (staff["department_id"] if staff else None)
            dept_id, new_dept_name, new_dept_code, dept_error = check_department_choice(
                dept_choice, data.get("new_department_name"), data.get("new_department_code"))
            if dept_error:
                return jsonify({"error": dept_error}), 400
            if new_dept_name and editor["role"] == "admin":
                dept_id, dept_err = _add_department_now(new_dept_name, new_dept_code)
                if dept_err:
                    return jsonify({"error": dept_err}), 400
                new_dept_name = new_dept_code = ""
            if not dept_id:
                dept_id = staff["department_id"] if staff else None
            if not dept_id and not new_dept_name:
                return jsonify({"error": "Choose a department for this faculty account"}), 400

        if "designation" in data:
            designation = (data.get("designation") or "").strip() or None
        else:
            designation = staff["designation"] if staff else None

    execute_write("UPDATE users SET name = ?, email = ?, username = ?, role = ?, last_edited_by_id = ?, last_edited_at = CURRENT_TIMESTAMP WHERE id = ?",
                  (name, identifier, username, new_role, editor["id"], user_id))
    if new_role == "class_leader" and editor["role"] in ("super_admin", "admin", "teacher", "class_teacher"):
        execute_write("UPDATE users SET status = 'active' WHERE id = ? AND status = 'pending'", (user_id,))
        execute_write("UPDATE notifications SET is_read = 1 WHERE reference_id = ? AND type = 'student_registration'", (user_id,))
    if password:
        execute_write("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(password), user_id))

    if new_role in ('super_admin', 'admin', 'principal'):
        execute_write("DELETE FROM staff_profiles WHERE user_id = ?", (user_id,))
        execute_write("DELETE FROM staff_departments WHERE user_id = ?", (user_id,))
        execute_write("DELETE FROM student_profiles WHERE user_id = ?", (user_id,))
    elif is_faculty:
        if staff:
            execute_write("UPDATE staff_profiles SET department_id = ?, designation = ? WHERE user_id = ?",
                          (dept_id, designation, user_id))
        else:
            execute_write("INSERT INTO staff_profiles (user_id, department_id, designation) VALUES (?, ?, ?)",
                          (user_id, dept_id, designation))

        # Update staff_departments table (up to 10 departments)
        execute_write("DELETE FROM staff_departments WHERE user_id = ?", (user_id,))
        if multi_dept_ids:
            for did in multi_dept_ids:
                execute_write("INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)", (user_id, did))
        elif dept_id:
            execute_write("INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)", (user_id, dept_id))
    elif new_role in ('student', 'class_leader'):
        if staff:
            execute_write("DELETE FROM staff_profiles WHERE user_id = ?", (user_id,))
        first_dept_id = (multi_dept_ids[0] if multi_dept_ids else None) or dept_id or data.get("department_id")
        if first_dept_id:
            try:
                first_dept_id = int(first_dept_id)
            except (ValueError, TypeError):
                first_dept_id = None

        stu = query_one("SELECT user_id, section_id, roll_number, guardian_name, guardian_phone, guardian_email FROM student_profiles WHERE user_id = ?", (user_id,))
        sec_val = (data.get("section_id") or data.get("section") or data.get("section_name")) if ("section_id" in data or "section" in data or "section_name" in data) else None
        resolved_sec_id = resolve_section_id(sec_val, first_dept_id) if sec_val is not None else (stu["section_id"] if stu else None)

        r_num = (data.get("roll_number") or "").strip() or None if "roll_number" in data else (stu["roll_number"] if stu else None)
        g_name = (data.get("guardian_name") or "").strip() or None if "guardian_name" in data else (stu["guardian_name"] if stu else None)
        g_phone = (data.get("guardian_phone") or "").strip() or None if "guardian_phone" in data else (stu["guardian_phone"] if stu else None)
        g_email = (data.get("guardian_email") or "").strip() or None if "guardian_email" in data else (stu["guardian_email"] if stu else None)

        u_acad_year = data.get("academic_year") or data.get("year")
        u_acad_year = int(u_acad_year) if u_acad_year and str(u_acad_year).isdigit() else (stu["academic_year"] if stu and "academic_year" in stu else None)

        if stu:
            execute_write("""
                UPDATE student_profiles
                SET department_id = ?, section_id = ?, roll_number = ?,
                    guardian_name = ?, guardian_phone = ?, guardian_email = ?,
                    academic_year = COALESCE(?, academic_year)
                WHERE user_id = ?
            """, (first_dept_id, resolved_sec_id, r_num, g_name, g_phone, g_email, u_acad_year, user_id))
            if u_acad_year:
                execute_write("UPDATE users SET academic_year = ? WHERE id = ?", (u_acad_year, user_id))
        else:
            execute_write("""
                INSERT INTO student_profiles (user_id, department_id, section_id, roll_number, guardian_name, guardian_phone, guardian_email)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, first_dept_id, resolved_sec_id, r_num, g_name, g_phone, g_email))

        # Store multi-departments in staff_departments if provided (e.g. for class leader)
        execute_write("DELETE FROM staff_departments WHERE user_id = ?", (user_id,))
        if multi_dept_ids:
            for did in multi_dept_ids:
                execute_write("INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)", (user_id, did))
    elif staff:
        execute_write("DELETE FROM staff_profiles WHERE user_id = ?", (user_id,))
        execute_write("DELETE FROM staff_departments WHERE user_id = ?", (user_id,))

    if new_role == "hod":
        _link_hod(user_id, dept_id)

    execute_write("""
        INSERT INTO notifications (recipient_id, sender_id, sender_role, sender_name, type, title, message, reference_id, department_name, is_read)
        VALUES (?, ?, ?, ?, 'account_updated', ?, ?, ?, ?, 0)
    """, (
        user_id, editor["id"], editor["role"], editor["name"],
        "Your Account Was Updated",
        f"{editor['name']} ({editor['role'].replace('_', ' ').title()}) updated your account details. Sign in with user name '{username}'.",
        user_id, department_name_of_user(user_id)
    ))

    message = f"Account for {name} updated successfully"
    if new_dept_name:
        request_id = execute_write(
            "INSERT INTO department_requests (name, code, requested_user_id, requested_by_id, status) VALUES (?, ?, ?, ?, 'pending')",
            (new_dept_name, new_dept_code, user_id, editor["id"])
        )
        execute_write("""
            INSERT INTO notifications (recipient_role, sender_id, sender_role, sender_name, type, title, message, reference_id, department_name, is_read)
            VALUES ('admin', ?, ?, ?, 'department_request', ?, ?, ?, ?, 0)
        """, (
            editor["id"], editor["role"], editor["name"],
            "New Department Needs Approval",
            f"{editor['name']} ({editor['role'].replace('_', ' ').title()}) asked for the new department '{new_dept_name}' ({new_dept_code}) for {name}. Approve or reject it in College Setup.",
            request_id, new_dept_name
        ))
        message += f". The new department '{new_dept_name}' was sent to the College Admin for approval; {name} joins it once approved."
    updated = query_one("SELECT id, name, email, username, role, status FROM users WHERE id = ?", (user_id,))
    return jsonify({"message": message, "user": updated}), 200


@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@require_auth(allowed_roles=["super_admin", "admin"])
def delete_user(user_id: int):
    """Delete accounts permanently:
    - Super Admin: can permanently delete any account except their own.
    - Admin: can permanently delete any account except Super Admin and their own.
    """
    creator = g.current_user
    target = query_one("SELECT id, name, email, role, username FROM users WHERE id = ?", (user_id,))
    if not target:
        return jsonify({"error": "User not found"}), 404

    if target["id"] == creator["id"]:
        return jsonify({"error": "You cannot delete your own account"}), 400

    if creator["role"] == "admin":
        if target["role"] == "super_admin":
            return jsonify({
                "error": "Permission denied: College Admin cannot delete a Super Admin account."
            }), 403

    # Cascade & clean references across all related tables
    execute_write("UPDATE departments SET hod_user_id = NULL WHERE hod_user_id = ?", (user_id,))
    execute_write("UPDATE subjects SET faculty_user_id = NULL WHERE faculty_user_id = ?", (user_id,))
    execute_write("UPDATE attendance_sessions SET marked_by = NULL WHERE marked_by = ?", (user_id,))
    execute_write("UPDATE department_requests SET decided_by_id = NULL WHERE decided_by_id = ?", (user_id,))
    execute_write("UPDATE department_requests SET requested_by_id = NULL WHERE requested_by_id = ?", (user_id,))
    execute_write("UPDATE users SET created_by_id = NULL WHERE created_by_id = ?", (user_id,))

    execute_write("DELETE FROM notifications WHERE reference_id = ? OR recipient_id = ? OR sender_id = ?", (user_id, user_id, user_id))
    execute_write("DELETE FROM attendance_records WHERE student_id = ?", (user_id,))
    execute_write("DELETE FROM submissions WHERE student_id = ?", (user_id,))
    execute_write("DELETE FROM group_students WHERE student_id = ?", (user_id,))
    execute_write("DELETE FROM group_students WHERE group_id IN (SELECT id FROM groups WHERE created_by_teacher_id = ?)", (user_id,))
    execute_write("DELETE FROM groups WHERE created_by_teacher_id = ?", (user_id,))
    execute_write("DELETE FROM submissions WHERE question_id IN (SELECT id FROM questions WHERE teacher_id = ?)", (user_id,))
    execute_write("DELETE FROM questions WHERE teacher_id = ?", (user_id,))
    execute_write("DELETE FROM staff_departments WHERE user_id = ?", (user_id,))
    execute_write("DELETE FROM staff_profiles WHERE user_id = ?", (user_id,))
    execute_write("DELETE FROM student_profiles WHERE user_id = ?", (user_id,))
    execute_write("DELETE FROM department_requests WHERE requested_user_id = ?", (user_id,))

    execute_write("DELETE FROM users WHERE id = ?", (user_id,))

    return jsonify({
        "message": f"Successfully deleted {target['role'].replace('_', ' ').title()} account: {target['name']} permanently.",
        "deleted_user_id": user_id
    }), 200

@admin_bp.route("/notifications", methods=["GET"])
@require_auth(allowed_roles=["admin", "super_admin"])
def get_notifications():
    """Fetch notifications for student registrations and approvals."""
    unread_only = request.args.get("unread", "0") == "1"
    sql = "SELECT id, recipient_role, type, title, message, reference_id, is_read, created_at FROM notifications WHERE recipient_role IN ('admin', 'all')"
    if unread_only:
        sql += " AND is_read = 0"
    sql += " ORDER BY id DESC"

    notifications = query_all(sql)
    unread_count = sum(1 for n in notifications if n["is_read"] == 0)
    return jsonify({"notifications": notifications, "unread_count": unread_count}), 200

@admin_bp.route("/notifications/<int:notif_id>/read", methods=["POST"])
@require_auth(allowed_roles=["admin", "super_admin"])
def mark_notification_read(notif_id: int):
    """Mark a specific notification as read."""
    execute_write("UPDATE notifications SET is_read = 1 WHERE id = ?", (notif_id,))
    return jsonify({"message": "Notification marked as read"}), 200

@admin_bp.route("/pending-students", methods=["GET"])
@require_auth(allowed_roles=["super_admin", "admin", "teacher", "class_teacher", "hod"])
def get_pending_students():
    """List pending registrations this reviewer must approve or reject:
    - Super Admin reviews all pending account registrations across the system
    - Admin reviews Teacher, Class Teacher, HOD, and Staff registrations
    - Teacher & Class Teacher review Student and Class Leader registrations in their department
    - HOD reviews pending users in their own department only
    """
    current_role = g.current_user["role"]
    current_user_id = g.current_user["id"]

    if current_role == "super_admin":
        pending = query_all("""
            SELECT u.id, u.name, u.email, u.username, u.role, u.created_at, u.status
            FROM users u
            WHERE u.status = 'pending'
            ORDER BY u.id DESC
        """)
        for p in pending:
            p["department_name"] = department_name_of_user(p["id"])
        return jsonify({"pending_students": pending, "students": pending}), 200

    if current_role == "hod":
        # HOD sees all pending users belonging to their department
        hod_dept = query_one("""
            SELECT d.id FROM departments d WHERE d.hod_user_id = ?
            UNION
            SELECT sd.department_id FROM staff_departments sd WHERE sd.user_id = ?
            UNION
            SELECT sp.department_id FROM staff_profiles sp WHERE sp.user_id = ?
            LIMIT 1
        """, (current_user_id, current_user_id, current_user_id))
        if not hod_dept:
            return jsonify({"pending_students": [], "students": []}), 200
        dept_id = hod_dept["id"]
        pending = query_all("""
            SELECT u.id, u.name, u.email, u.role, u.created_at, u.status
            FROM users u
            WHERE u.status = 'pending'
              AND (
                EXISTS (
                  SELECT 1 FROM staff_departments sd WHERE sd.user_id = u.id AND sd.department_id = ?
                )
                OR EXISTS (
                  SELECT 1 FROM staff_profiles sp WHERE sp.user_id = u.id AND sp.department_id = ?
                )
                OR EXISTS (
                  SELECT 1 FROM student_profiles st
                  LEFT JOIN batches b ON b.id = st.batch_id
                  LEFT JOIN programs p ON p.id = b.program_id
                  WHERE st.user_id = u.id AND COALESCE(st.department_id, p.department_id) = ?
                )
              )
            ORDER BY u.id DESC
        """, (dept_id, dept_id, dept_id))
        for p in pending:
            p["department_name"] = department_name_of_user(p["id"])
        return jsonify({"pending_students": pending, "students": pending}), 200

    if current_role in ("teacher", "class_teacher"):
        teacher_depts = query_all("""
            SELECT DISTINCT d.id FROM departments d
            WHERE d.id IN (
                SELECT department_id FROM staff_departments WHERE user_id = ?
                UNION
                SELECT department_id FROM staff_profiles WHERE user_id = ?
            )
        """, (current_user_id, current_user_id))
        dept_ids = [d["id"] for d in teacher_depts] if teacher_depts else []
        if dept_ids:
            placeholders = ",".join("?" for _ in dept_ids)
            pending = query_all(f"""
                SELECT u.id, u.name, u.email, u.username, u.role, u.created_at, u.status
                FROM users u
                LEFT JOIN student_profiles sp ON sp.user_id = u.id
                LEFT JOIN batches b ON b.id = sp.batch_id
                LEFT JOIN programs p ON p.id = b.program_id
                WHERE u.status = 'pending'
                  AND (
                    (u.role IN ('student', 'class_leader') AND (sp.department_id IN ({placeholders}) OR p.department_id IN ({placeholders})))
                    OR (u.role IN ('student', 'class_leader') AND sp.department_id IS NULL AND p.department_id IS NULL)
                  )
                ORDER BY u.id DESC
            """, tuple(dept_ids + dept_ids))
        else:
            pending = query_all("""
                SELECT u.id, u.name, u.email, u.username, u.role, u.created_at, u.status
                FROM users u
                WHERE u.status = 'pending' AND u.role IN ('student', 'class_leader')
                ORDER BY u.id DESC
            """)
        for p in pending:
            p["department_name"] = department_name_of_user(p["id"])
        return jsonify({"pending_students": pending, "students": pending}), 200

    roles = roles_reviewable_by(current_role)
    if not roles:
        return jsonify({"pending_students": [], "students": []}), 200

    placeholders = ",".join("?" for _ in roles)
    pending = query_all(
        f"SELECT id, name, email, role, created_at, status FROM users WHERE role IN ({placeholders}) AND status = 'pending' ORDER BY id DESC",
        tuple(roles)
    )
    for p in pending:
        p["department_name"] = department_name_of_user(p["id"])
    return jsonify({"pending_students": pending, "students": pending}), 200

def _find_reviewable_registration(user_id: int):
    """Return the pending registration if the current reviewer is allowed to decide on it."""
    current_role = g.current_user["role"]
    current_user_id = g.current_user["id"]

    if current_role in ("super_admin", "admin"):
        return query_one(
            "SELECT id, name, email, role, status FROM users WHERE id = ? AND status = 'pending'",
            (user_id,)
        )
    if current_role == "hod":
        # HOD can approve/reject pending users in their department
        hod_dept = query_one("""
            SELECT d.id FROM departments d WHERE d.hod_user_id = ?
            UNION
            SELECT sd.department_id FROM staff_departments sd WHERE sd.user_id = ?
            UNION
            SELECT sp.department_id FROM staff_profiles sp WHERE sp.user_id = ?
            LIMIT 1
        """, (current_user_id, current_user_id, current_user_id))
        if not hod_dept:
            return None
        dept_id = hod_dept["id"]
        return query_one("""
            SELECT u.id, u.name, u.email, u.role, u.status
            FROM users u
            WHERE u.id = ? AND u.status = 'pending'
              AND (
                EXISTS (
                  SELECT 1 FROM staff_departments sd WHERE sd.user_id = u.id AND sd.department_id = ?
                )
                OR EXISTS (
                  SELECT 1 FROM staff_profiles sp WHERE sp.user_id = u.id AND sp.department_id = ?
                )
                OR EXISTS (
                  SELECT 1 FROM student_profiles st
                  LEFT JOIN batches b ON b.id = st.batch_id
                  LEFT JOIN programs p ON p.id = b.program_id
                  WHERE st.user_id = u.id AND COALESCE(st.department_id, p.department_id) = ?
                )
              )
        """, (user_id, dept_id, dept_id, dept_id))

    if current_role in ("teacher", "class_teacher"):
        teacher_depts = query_all("""
            SELECT DISTINCT d.id FROM departments d
            WHERE d.id IN (
                SELECT department_id FROM staff_departments WHERE user_id = ?
                UNION
                SELECT department_id FROM staff_profiles WHERE user_id = ?
            )
        """, (current_user_id, current_user_id))
        dept_ids = [d["id"] for d in teacher_depts] if teacher_depts else []
        if dept_ids:
            placeholders = ",".join("?" for _ in dept_ids)
            match = query_one(f"""
                SELECT u.id, u.name, u.email, u.role, u.status
                FROM users u
                LEFT JOIN student_profiles sp ON sp.user_id = u.id
                LEFT JOIN batches b ON b.id = sp.batch_id
                LEFT JOIN programs p ON p.id = b.program_id
                WHERE u.id = ? AND u.status = 'pending'
                  AND (
                    (u.role IN ('student', 'class_leader') AND (sp.department_id IN ({placeholders}) OR p.department_id IN ({placeholders})))
                    OR (u.role IN ('student', 'class_leader') AND sp.department_id IS NULL AND p.department_id IS NULL)
                  )
            """, (user_id, *dept_ids, *dept_ids))
            if match:
                return match
        return query_one(
            "SELECT id, name, email, role, status FROM users WHERE id = ? AND status = 'pending' AND role IN ('student', 'class_leader')",
            (user_id,)
        )

    roles = roles_reviewable_by(current_role)
    if not roles:
        return None
    placeholders = ",".join("?" for _ in roles)
    return query_one(
        f"SELECT id, name, email, role, status FROM users WHERE id = ? AND role IN ({placeholders})",
        (user_id, *roles)
    )

@admin_bp.route("/students/<int:student_id>/approve", methods=["POST"])
@require_auth(allowed_roles=["super_admin", "admin", "teacher", "class_teacher", "hod"])
def approve_student(student_id: int):
    """Approve a pending registration within this reviewer's queue."""
    student = _find_reviewable_registration(student_id)
    if not student:
        student = query_one("SELECT id, name, email, role, status FROM users WHERE id = ?", (student_id,))
        if not student:
            return jsonify({"error": "Registration request not found"}), 404

    execute_write("UPDATE users SET status = 'active' WHERE id = ?", (student_id,))
    # Mark all registration and approval notifications for this student as read across all logins
    execute_write("UPDATE notifications SET is_read = 1 WHERE reference_id = ?", (student_id,))
    execute_write("UPDATE notifications SET is_read = 1 WHERE type IN ('student_registration', 'account_approval') AND reference_id = ?", (student_id,))
    if student.get("name"):
        execute_write("UPDATE notifications SET is_read = 1 WHERE type IN ('student_registration', 'account_approval') AND (title LIKE ? OR message LIKE ?)", (f"%{student['name']}%", f"%{student['name']}%"))

    return jsonify({
        "message": f"{student['role'].replace('_', ' ').title()} '{student['name']}' has been approved and activated.",
        "student_id": student_id,
        "status": "active"
    }), 200

@admin_bp.route("/students/<int:student_id>/reject", methods=["POST"])
@require_auth(allowed_roles=["super_admin", "admin", "teacher", "class_teacher", "hod"])
def reject_student(student_id: int):
    """Reject a pending registration within this reviewer's queue."""
    student = _find_reviewable_registration(student_id)
    if not student:
        student = query_one("SELECT id, name, email, role, status FROM users WHERE id = ?", (student_id,))
        if not student:
            return jsonify({"error": "Registration request not found"}), 404

    execute_write("UPDATE users SET status = 'rejected' WHERE id = ?", (student_id,))
    # Mark all registration and approval notifications for this student as read across all logins
    execute_write("UPDATE notifications SET is_read = 1 WHERE reference_id = ?", (student_id,))
    execute_write("UPDATE notifications SET is_read = 1 WHERE type IN ('student_registration', 'account_approval') AND reference_id = ?", (student_id,))
    if student.get("name"):
        execute_write("UPDATE notifications SET is_read = 1 WHERE type IN ('student_registration', 'account_approval') AND (title LIKE ? OR message LIKE ?)", (f"%{student['name']}%", f"%{student['name']}%"))

    return jsonify({
        "message": f"Registration for '{student['name']}' has been rejected.",
        "student_id": student_id,
        "status": "rejected"
    }), 200


@admin_bp.route("/dean/super-admin-monitor", methods=["GET"])
@require_auth(allowed_roles=["dean", "super_admin"])
def get_super_admin_monitor():
    """Endpoint for Dean to monitor Super Admin accounts, activities, accounts created, and system health."""
    super_admins = query_all("""
        SELECT u.id, u.name, u.username, u.email, u.role, u.status, u.created_at,
               (SELECT COUNT(*) FROM users WHERE created_by_id = u.id) as accounts_created_count,
               (SELECT COUNT(*) FROM notifications WHERE sender_id = u.id OR (sender_role = 'super_admin' AND sender_id = u.id)) as notifications_sent_count
        FROM users u
        WHERE u.role = 'super_admin'
        ORDER BY u.id ASC
    """)

    created_by_super_admins = query_all("""
        SELECT u.id, u.name, u.username, u.email, u.role, u.status, u.created_at,
               creator.name as creator_name, creator.username as creator_username
        FROM users u
        JOIN users creator ON creator.id = u.created_by_id
        WHERE creator.role = 'super_admin'
        ORDER BY u.id DESC
        LIMIT 50
    """)

    admin_count_row = query_one("SELECT COUNT(*) as c FROM users WHERE role = 'admin'")
    teacher_count_row = query_one("SELECT COUNT(*) as c FROM users WHERE role IN ('teacher', 'class_teacher', 'hod')")
    student_count_row = query_one("SELECT COUNT(*) as c FROM users WHERE role IN ('student', 'class_leader')")
    dept_count_row = query_one("SELECT COUNT(*) as c FROM departments")
    quiz_count_row = query_one("SELECT COUNT(*) as c FROM questions")

    stats = {
        "total_super_admins": len(super_admins),
        "total_admins": admin_count_row["c"] if admin_count_row else 0,
        "total_teachers": teacher_count_row["c"] if teacher_count_row else 0,
        "total_students": student_count_row["c"] if student_count_row else 0,
        "total_departments": dept_count_row["c"] if dept_count_row else 0,
        "total_quizzes": quiz_count_row["c"] if quiz_count_row else 0,
    }

    recent_broadcasts = query_all("""
        SELECT id, sender_name, sender_role, recipient_role, title, message, created_at, type
        FROM notifications
        WHERE sender_role = 'super_admin' OR recipient_role IN ('all', 'admin', 'super_admin', 'audit')
        ORDER BY id DESC
        LIMIT 20
    """)

    return jsonify({
        "super_admins": super_admins,
        "created_by_super_admins": created_by_super_admins,
        "system_stats": stats,
        "recent_broadcasts": recent_broadcasts
    }), 200


@admin_bp.route("/tasks/<path:task_number>", methods=["DELETE"])
@require_auth(allowed_roles=["admin", "super_admin"])
def delete_task_admin(task_number: str):
    """Allow Super Admin and College Admin to permanently delete any task completely."""
    task_number = (task_number or "").strip()
    if not task_number:
        return jsonify({"error": "Task number is required"}), 400

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


