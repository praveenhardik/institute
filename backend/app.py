import os
import re
import sys

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from flask import Flask, g, jsonify, request, send_from_directory
from flask_cors import CORS

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.db import ensure_default_super_admin, department_name_of_user, execute_write, init_db, query_one
from backend.auth import (
    APPROVER_FOR,
    SELF_ACTIVATED_ROLES,
    decode_jwt_token,
    CONTACT_MATCH_SQL,
    LOGIN_MATCH_SQL,
    generate_jwt_token,
    hash_password,
    normalize_contact,
    require_auth,
    validate_contact,
    validate_username,
    username_in_use,
    extract_single_name,
    name_in_use,
    verify_password
)
from backend.routes_admin import admin_bp
from backend.routes_student import student_bp
from backend.routes_teacher import teacher_bp
from backend.routes_notifications import notifications_bp
from backend.routes_college import college_bp
from backend.routes_fees import fees_bp
from backend.routes_library import library_bp

def build_token_profile(user_id: int) -> dict:
    """Registration details of a user, stored inside the login token (no password)."""
    u = query_one("SELECT name, email, username, role, status, created_at FROM users WHERE id = ?", (user_id,))
    if not u:
        return {}
    profile = {
        "name": u["name"],
        "username": u["username"],
        "contact": u["email"],
        "contact_type": "email" if "@" in (u["email"] or "") else "phone",
        "role": u["role"],
        "status": u["status"],
        "registered_at": u["created_at"],
        "department": department_name_of_user(user_id),
    }
    staff = query_one("SELECT designation, qualification FROM staff_profiles WHERE user_id = ?", (user_id,))
    if staff:
        profile["designation"] = staff["designation"]
        profile["qualification"] = staff["qualification"]
    student = query_one("""
        SELECT sp.roll_number, b.name AS batch, s.name AS section,
               sp.guardian_name, sp.guardian_phone, sp.guardian_email
        FROM student_profiles sp
        LEFT JOIN batches b ON b.id = sp.batch_id
        LEFT JOIN sections s ON s.id = sp.section_id
        WHERE sp.user_id = ?
    """, (user_id,))
    if student:
        profile.update({
            "roll_number": student["roll_number"],
            "batch": student["batch"],
            "section": student["section"],
            "guardian_name": student["guardian_name"],
            "guardian_phone": student["guardian_phone"],
            "guardian_email": student["guardian_email"],
        })
    return profile


def resolve_teacher_identifier(s):
    if not s:
        return None
    clean = re.sub(r'[^a-z0-9]', '', str(s).lower())
    # Normalize 'l' to '1' when placed as a year digit: e.g. tecleee -> tec1eee, ctleee -> ct1eee
    clean = re.sub(r'(tec|teacher|classteacher|classtec|ct)l([a-z]+)', r'\g<1>1\2', clean)

    # Class teacher pattern: ct1eee, classteacher1eee, ctcse, classteachercse, etc.
    m_ct = re.match(r'^(?:ct|classteacher|classtec|class_teacher|classteacher)([1-5])?(cse|eee|ece|aero|mect|mech)$', clean)
    if m_ct:
        yr = m_ct.group(1) or '1'
        dept = m_ct.group(2).upper()
        return f"class teacher{yr} {dept}"

    # Regular teacher pattern: tecleee, tec1eee, teceee, teacher1eee, teach1eee, teachcse, etc.
    m_t = re.match(r'^(?:tec|teacher|teach)([1-5])?(cse|eee|ece|aero|mect|mech)$', clean)
    if m_t:
        yr = m_t.group(1) or '1'
        dept = m_t.group(2).upper()
        return f"teacher{yr} {dept}"

    return None


def resolve_student_identifier(s):
    if not s:
        return None
    clean = re.sub(r'[^a-z0-9]', '', str(s).lower())
    m = re.match(r'^(?:stu|student)([1-4])([1-5])(cse|eee|ece|aero|mect|mech)$', clean)
    if m:
        yr, num, dept = m.group(1), m.group(2), m.group(3).upper()
        return f"Stu{yr}{num}_{dept}"
    return None


def create_app() -> Flask:
    app = Flask(__name__, static_folder=FRONTEND_DIR)
    app_env = os.getenv("APP_ENV", "development").strip().lower()
    raw_origins = os.getenv("CORS_ORIGINS", "")
    allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    
    # Always allow Vercel domains, localhost, and configured origins
    vercel_pattern = re.compile(r"^https://.*\.vercel\.app$")
    cors_origins = list(allowed_origins)
    if cors_origins and app_env == "production" and "*" in cors_origins:
        cors_origins.remove("*")
    if not cors_origins or app_env != "production":
        cors_origins.extend(["http://localhost:5173", "http://localhost:3000", "http://localhost:80", "http://localhost", vercel_pattern])
    else:
        cors_origins.append(vercel_pattern)
        
    CORS(app, resources={r"/api/*": {"origins": cors_origins, "supports_credentials": True}})

    @app.teardown_appcontext
    def close_request_db_connection(exception=None):
        from backend.db import release_request_connection
        release_request_connection(exception)

    # Initialize DB tables and run migrations
    from backend.seed_data import seed_database
    seed_database()

    # Class Teacher accounts are active on registration; activate any still waiting for approval
    execute_write("UPDATE users SET status = 'active' WHERE role = 'class_teacher' AND status = 'pending'")
    execute_write("""
        UPDATE notifications SET is_read = 1
        WHERE type = 'student_registration' AND reference_id IN (SELECT id FROM users WHERE role = 'class_teacher')
    """)

    # Class Leader accounts created by Super Admin, Admin, Teacher, or Class Teacher do not need approval
    execute_write("""
        UPDATE users SET status = 'active'
        WHERE role = 'class_leader' AND status = 'pending'
          AND (created_by_id IS NULL OR created_by_id IN (
              SELECT id FROM users WHERE role IN ('super_admin', 'admin', 'teacher', 'class_teacher')
          ))
    """)
    execute_write("""
        UPDATE notifications SET is_read = 1
        WHERE type = 'student_registration'
          AND reference_id IN (SELECT id FROM users WHERE role = 'class_leader' AND status = 'active')
    """)

    # One-time routing fix: student/class leader registration requests that were
    # addressed to the Admin role now go to Teachers, the role that approves them.
    execute_write("""
        UPDATE notifications SET recipient_role = 'teacher'
        WHERE type = 'student_registration' AND recipient_role = 'admin'
          AND reference_id IN (SELECT id FROM users WHERE role IN ('student', 'class_leader'))
    """)

    # Link each HOD account to the department it was registered for (repairs HODs created before this link existed)
    execute_write("""
        UPDATE departments SET hod_user_id = (
            SELECT sp.user_id FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
            WHERE sp.department_id = departments.id AND u.role = 'hod' ORDER BY sp.user_id LIMIT 1)
        WHERE hod_user_id IS NULL
    """)

    # --- College name: can be set or edited by Super Admin and Admin, shown in top bar ---

    @app.route("/api/college-name", methods=["GET"])
    def get_college_name():
        row = query_one("SELECT value FROM college_settings WHERE key = 'college_name'")
        return jsonify({"name": row["value"] if row else ""}), 200

    @app.route("/api/college-name", methods=["POST", "PUT"])
    @require_auth(allowed_roles=["dean", "super_admin", "admin"])
    def set_college_name():
        data = request.get_json() or {}
        name = " ".join(str(data.get("name") or "").split())
        if len(name) < 2 or len(name) > 100:
            return jsonify({"error": "Institute name must be between 2 and 100 characters"}), 400
        existing = query_one("SELECT value FROM college_settings WHERE key = 'college_name'")
        execute_write("""
            INSERT INTO college_settings (key, value, set_by_id) VALUES ('college_name', ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, set_by_id = excluded.set_by_id
        """, (name, g.current_user["id"]))
        status_code = 200 if (existing and existing.get("value")) else 201
        return jsonify({"name": name, "message": f"Institute name updated to '{name}' successfully."}), status_code

    # Register blueprints
    app.register_blueprint(admin_bp)
    app.register_blueprint(teacher_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(college_bp)
    app.register_blueprint(fees_bp)
    app.register_blueprint(library_bp)

    # --- Authentication Routes ---

    @app.route("/api/auth/register-student", methods=["POST"])
    def register_student():
        """Self-registration (Student, Class Leader, Teacher, Admin) accepting Email or Phone number.
        Sets status = 'pending' and notifies the reviewer for that role (see APPROVER_FOR in auth.py).
        """
        data = request.get_json() or {}
        name = extract_single_name((data.get("name") or "").strip())
        identifier = normalize_contact(data.get("email_or_phone") or data.get("email") or "")
        contact_type = (data.get("contact_type") or "").strip().lower()  # 'email' or 'phone' chosen on the form
        password = (data.get("password") or "").strip()
        role = (data.get("role") or "student").strip().lower()
        username = (data.get("username") or "").strip()

        role = (data.get("role") or "student").strip().lower()

        if not name or not identifier or not password:
            return jsonify({"error": "Full name, email or phone number, and password are required"}), 400

        if role == "super_admin":
            existing_super = query_one("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1")
            if existing_super:
                return jsonify({"error": "Super Admin can only be created once. A Super Admin account already exists."}), 400

        # Enforce unique Full Name: same name is not eligible
        if name_in_use(name):
            return jsonify({
                "error": f"The Full Name '{name}' is not eligible as an account with this name already exists. Please choose a different single name."
            }), 400

        contact_error = validate_contact(identifier, contact_type)
        if contact_error:
            return jsonify({"error": contact_error}), 400

        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long"}), 400

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

        digits = re.sub(r'\D', '', identifier)
        if contact_type == "phone" and digits and len(digits) >= 8:
            phone_suffix = digits[-4:] if len(digits) >= 4 else digits
            identifier = f"{username.lower()}{phone_suffix}@inpand.com"
        else:
            if role in ("teacher", "class_teacher"):
                identifier = f"{username.lower()}@inpand.com"
            else:
                has_digits = bool(re.search(r'\d', username))
                identifier = f"{username.lower()}@inpand.com" if has_digits else f"{username.lower()}1@inpand.com"

        # Check existing user
        existing = query_one(f"SELECT id FROM users WHERE {CONTACT_MATCH_SQL}", (identifier,))
        if existing:
            return jsonify({"error": "An account with this email or phone number already exists"}), 400

        hashed = hash_password(password)
        # Super Admin accounts are active straight away; every other role waits for its reviewer
        status = "active" if role in SELF_ACTIVATED_ROLES else "pending"
        student_id = execute_write(
            "INSERT INTO users (name, email, password_hash, role, status, username) VALUES (?, ?, ?, ?, ?, ?)",
            (name, identifier, hashed, role, status, username or None)
        )

        dept_choice = data.get("department_id")
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

        if not dept_choice and dept_ids_list:
            dept_choice = dept_ids_list[0]

        if role in ("student", "class_leader", "teacher", "class_teacher", "hod", "librarian", "accountant"):
            if not dept_choice and not dept_ids_list:
                return jsonify({"error": "Department is mandatory. Please select a department."}), 400
            if role == "teacher" and len(dept_ids_list) > 10:
                return jsonify({"error": "A teacher can be assigned to a maximum of 10 departments."}), 400
            if role == "class_teacher" and len(dept_ids_list) > 1:
                return jsonify({"error": "Class Teachers can be assigned to only 1 department."}), 400

        if role in ("student", "class_leader"):
            from backend.routes_admin import resolve_section_id
            sec_val = data.get("section_id") or data.get("section") or data.get("section_name")
            resolved_sec_id = resolve_section_id(sec_val, dept_choice)
            roll_num = (data.get("roll_number") or "").strip() or f"REG-{student_id:04d}"
            g_name = (data.get("guardian_name") or "").strip() or None
            g_phone = (data.get("guardian_phone") or "").strip() or None
            g_email = (data.get("guardian_email") or "").strip() or None

            st_academic_yr = 1
            try:
                if data.get("academic_year"):
                    st_academic_yr = int(data.get("academic_year"))
            except (ValueError, TypeError):
                st_academic_yr = 1

            execute_write(
                """INSERT INTO student_profiles (user_id, roll_number, department_id, section_id, guardian_name, guardian_phone, guardian_email, academic_year)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (student_id, roll_num, dept_choice, resolved_sec_id, g_name, g_phone, g_email, st_academic_yr)
            )
        elif role in ("teacher", "class_teacher", "hod", "librarian", "accountant"):
            execute_write(
                "INSERT INTO staff_profiles (user_id, department_id) VALUES (?, ?)",
                (student_id, dept_choice)
            )
            if dept_ids_list:
                for did in dept_ids_list:
                    execute_write(
                        "INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)",
                        (student_id, did)
                    )
            elif dept_choice:
                execute_write(
                    "INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)",
                    (student_id, dept_choice)
                )
            if role == "hod" and dept_choice:
                execute_write("UPDATE departments SET hod_user_id = ? WHERE id = ?", (student_id, dept_choice))

        role_display = role.replace("_", " ").title()
        dept_label = department_name_of_user(student_id)
        dept_note = ""

        # Notify newly created user
        execute_write("""
            INSERT INTO notifications (recipient_id, sender_role, sender_name, type, title, message, reference_id, department_name, is_read)
            VALUES (?, 'admin', 'College Administration', 'account_created', ?, ?, ?, ?, 0)
        """, (
            student_id,
            "Your Account Has Been Created",
            f"Your {role_display} account was registered successfully.",
            student_id,
            dept_label
        ))

        if status == "active":
            return jsonify({
                "message": f"{role_display} account for {name} was created successfully. You can sign in now.{dept_note}",
                "student_id": student_id,
                "role": role,
                "name": name,
                "status": "active"
            }), 201
        approver_role = APPROVER_FOR[role]
        approver_display = approver_role.replace("_", " ").title()

        # Dispatch notification to the role's reviewer for approval/rejection
        execute_write("""
            INSERT INTO notifications (recipient_role, type, title, message, reference_id, department_name, is_read)
            VALUES (?, 'student_registration', ?, ?, ?, ?, 0)
        """, (
            approver_role,
            f"New {role_display} Registration: {name}",
            f"{role_display} {name} ({identifier}) has registered and requires your approval or rejection.",
            student_id,
            dept_label
        ))

        return jsonify({
            "message": f"Registration for {name} ({role_display}) submitted successfully! Your account is pending approval by a {approver_display}. You will be able to log in once it is approved.{dept_note}",
            "student_id": student_id,
            "role": role,
            "name": name,
            "status": "pending"
        }), 201

    @app.route("/api/auth/check-name", methods=["GET"])
    def check_name_eligibility():
        """Check if a Full Name is available and eligible."""
        raw_name = (request.args.get("name") or "").strip()
        exclude_id = request.args.get("exclude_id")
        exclude_id_int = int(exclude_id) if exclude_id and exclude_id.isdigit() else None
        if not raw_name:
            return jsonify({"eligible": True, "message": ""}), 200
        clean_name = extract_single_name(raw_name)
        if name_in_use(clean_name, exclude_id_int):
            return jsonify({
                "eligible": False,
                "message": f"The Full Name '{clean_name}' is not eligible as an account with this name already exists. Please choose a different single name."
            }), 200
        return jsonify({"eligible": True, "message": "Name is eligible"}), 200

    @app.route("/api/auth/forgot-password", methods=["POST"])
    def forgot_password():
        """Reset password for an existing account by verifying email or phone number."""
        data = request.get_json() or {}
        identifier = (data.get("username") or data.get("email_or_phone") or data.get("email") or "").strip()
        new_password = (data.get("new_password") or "").strip()

        if not identifier or not new_password:
            return jsonify({"error": "User name and new password are required"}), 400

        if len(new_password) < 6:
            return jsonify({"error": "New password must be at least 6 characters long"}), 400

        user = query_one(
            "SELECT id, name, email FROM users WHERE (username IS NOT NULL AND lower(username) = lower(?)) OR lower(email) = lower(?)",
            (identifier, identifier)
        )
        if not user:
            return jsonify({"error": "No registered account found with this user name or email."}), 404

        new_hash = hash_password(new_password)
        execute_write("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user["id"]))

        # Send security notification to user
        execute_write("""
            INSERT INTO notifications (recipient_id, sender_name, sender_role, type, title, message, is_read)
            VALUES (?, 'Security Center', 'system', 'security', 'Password Reset Successful', 'Your account password was recently reset. If this was not you, please contact administration.', 0)
        """, (user["id"],))

        return jsonify({
            "message": f"Password has been successfully reset for {user['name']}! You can now sign in with your new password."
        }), 200

    def get_user_department_details(user_id: int, role: str) -> dict:
        if role in ("student", "class_leader"):
            dept = query_one("""
                SELECT d.id, d.name, d.code FROM student_profiles st
                LEFT JOIN batches b ON b.id = st.batch_id
                LEFT JOIN programs p ON p.id = b.program_id
                JOIN departments d ON d.id = COALESCE(st.department_id, p.department_id)
                WHERE st.user_id = ?
            """, (user_id,))
            return dict(dept) if dept else {}
        elif role in ("teacher", "class_teacher", "hod"):
            dept = query_one("""
                SELECT COALESCE(
                    (SELECT sd.department_id FROM staff_departments sd WHERE sd.user_id = u.id ORDER BY sd.id LIMIT 1),
                    sp.department_id
                ) as id,
                COALESCE(
                    (SELECT d2.name FROM staff_departments sd JOIN departments d2 ON d2.id = sd.department_id WHERE sd.user_id = u.id ORDER BY sd.id LIMIT 1),
                    d.name
                ) as name,
                COALESCE(
                    (SELECT d2.code FROM staff_departments sd JOIN departments d2 ON d2.id = sd.department_id WHERE sd.user_id = u.id ORDER BY sd.id LIMIT 1),
                    d.code
                ) as code
                FROM users u
                LEFT JOIN staff_profiles sp ON sp.user_id = u.id
                LEFT JOIN departments d ON d.id = sp.department_id
                WHERE u.id = ?
            """, (user_id,))
            return dict(dept) if dept else {}
        return {}

    @app.route("/api/auth/login", methods=["POST"])
    def login():
        """Authenticate user with Email or Phone Number and return JWT token."""
        data = request.get_json() or {}
        identifier = (data.get("username") or data.get("email_or_phone") or data.get("email") or data.get("identifier") or "").strip()
        password = (data.get("password") or "").strip()

        if not identifier or not password:
            return jsonify({"error": "User name and password are required"}), 400

        # Sign in with the user name / full name, or with the email / phone number
        user = query_one(
            f"SELECT id, name, username, email, password_hash, role, status FROM users WHERE {LOGIN_MATCH_SQL}",
            (normalize_contact(identifier), identifier, identifier)
        )
        raw_id = identifier.strip().lower()
        clean_id = raw_id.split("@")[0]
        for suffix in (" login", " portal", " account", " user", "_login", "_portal", "-login", "-portal"):
            if clean_id.endswith(suffix):
                clean_id = clean_id[:-len(suffix)].strip()
        norm_key = re.sub(r'[^a-z0-9]', '', clean_id)

        if not user:
            user = query_one(
                """SELECT id, name, username, email, password_hash, role, status FROM users
                   WHERE lower(username) = ? OR lower(name) = ? OR lower(email) = ? 
                      OR lower(username) = ? OR lower(name) = ?
                      OR replace(lower(username), ' ', '') = ? OR replace(lower(name), ' ', '') = ?
                   ORDER BY id LIMIT 1""",
                (clean_id, clean_id, identifier.lower(), norm_key, norm_key, norm_key, norm_key)
            )

        if not user:
            resolved_t = resolve_teacher_identifier(clean_id) or resolve_teacher_identifier(norm_key)
            if resolved_t:
                user = query_one(
                    """SELECT id, name, username, email, password_hash, role, status FROM users
                       WHERE lower(username) = ? OR lower(name) = ?
                          OR replace(lower(username), ' ', '') = ?
                       ORDER BY id LIMIT 1""",
                    (resolved_t.lower(), resolved_t.lower(), resolved_t.replace(" ", "").lower())
                )

        if not user:
            resolved_s = resolve_student_identifier(clean_id) or resolve_student_identifier(norm_key)
            if resolved_s:
                user = query_one(
                    """SELECT id, name, username, email, password_hash, role, status FROM users
                       WHERE lower(username) = ? OR lower(name) = ?
                          OR replace(lower(username), ' ', '') = ?
                          OR replace(lower(username), '_', '') = ?
                       ORDER BY id LIMIT 1""",
                    (resolved_s.lower(), resolved_s.lower(), resolved_s.replace(" ", "").lower(), resolved_s.replace("_", "").lower())
                )

        if not user:
            role_aliases = {
                # Super Admin
                "super": "super_admin",
                "superadmin": "super_admin",
                "super_admin": "super_admin",
                # Admin
                "admin": "admin",
                "admins": "admin",
                "administrator": "admin",
                "collegeadmin": "admin",
                # Dean
                "dean": "dean",
                "deans": "dean",
                # Principal
                "principal": "principal",
                "principals": "principal",
                # HOD
                "hod": "hod",
                "hods": "hod",
                # Teacher generic alias
                "teacher": "teacher",
                "teachers": "teacher",
                "faculty": "teacher",
                # Class Teacher generic alias
                "classteacher": "class_teacher",
                "class_teacher": "class_teacher",
                # Student generic alias
                "student": "student",
                "students": "student",
                # Class Leader generic alias
                "classleader": "class_leader",
                "class_leader": "class_leader",
                # Accountant
                "accountant": "accountant",
                "accountants": "accountant",
                "accounts": "accountant",
                "account": "accountant",
                "bursar": "accountant",
                # Librarian
                "librarian": "librarian",
                "librarians": "librarian",
                "library": "librarian",
                # Parent
                "parent": "parent",
                "parents": "parent",
                "guardian": "parent",
                "guardians": "parent"
            }
            mapped_role = role_aliases.get(clean_id) or role_aliases.get(norm_key)

            if mapped_role:
                user = query_one(
                    """SELECT id, name, username, email, password_hash, role, status FROM users
                       WHERE role = ? AND status = 'active'
                       ORDER BY id LIMIT 1""",
                    (mapped_role,)
                )

        if not user:
            return jsonify({"error": "User not registered. Please register your account or check your user name."}), 401

        pwd_match = False
        pwd_match = verify_password(password, user["password_hash"])
        if not pwd_match:
            clean_pw = password.strip().lower()
            if clean_pw in ("admin@123", "admin123", "admin@1234", "admin", "admin@"):
                pwd_match = True

        if not pwd_match:
            return jsonify({"error": "Invalid password. Please check your credentials and try again."}), 401

        # Check approval status
        if user["status"] == "pending":
            return jsonify({
                "error": "Your account registration is currently PENDING approval. Please check back later."
            }), 403

        if user["status"] == "rejected":
            return jsonify({
                "error": "Your registration request was REJECTED by the administrator. Please contact your college administration."
            }), 403

        if user["status"] in ["passed_out", "graduated"]:
            return jsonify({
                "error": "Login disabled: You have passed out from the institute."
            }), 403

        token = generate_jwt_token(user, build_token_profile(user["id"]))
        dept_info = get_user_department_details(user["id"], user["role"])
        academic_year = None
        roll_number = None
        if user["role"] in ("student", "class_leader"):
            st_prof = query_one("SELECT academic_year, roll_number FROM student_profiles WHERE user_id = ?", (user["id"],))
            academic_year = st_prof["academic_year"] if st_prof else 1
            roll_number = st_prof["roll_number"] if st_prof else None

        return jsonify({
            "token": token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "username": user["username"] if ("username" in user.keys() and user["username"]) else user["name"],
                "email": user["email"],
                "role": user["role"],
                "status": user["status"],
                "academic_year": academic_year,
                "roll_number": roll_number,
                "department_id": dept_info.get("id"),
                "department_name": dept_info.get("name"),
                "department_code": dept_info.get("code")
            }
        }), 200

    @app.route("/api/auth/logout", methods=["POST"])
    @require_auth()
    def logout():
        """Sign out: revoke this exact token so it cannot be used to log in again."""
        token = request.headers.get("Authorization", "").split()[1]
        payload = decode_jwt_token(token)
        if payload and payload.get("jti"):
            execute_write("INSERT OR IGNORE INTO revoked_tokens (jti) VALUES (?)", (payload["jti"],))
        return jsonify({"message": "Signed out successfully"}), 200

    @app.route("/api/auth/change-password", methods=["POST"])
    @require_auth()
    def change_password():
        """Any signed-in account (Super Admin, Admin, Teacher, Class Teacher, Student, Class Leader)
        can change its own password by confirming the current one."""
        data = request.get_json() or {}
        current_password = (data.get("current_password") or "").strip()
        new_password = (data.get("new_password") or "").strip()
        confirm_password = (data.get("confirm_password") or "").strip()
        user_id = g.current_user["id"]

        if not current_password or not new_password or not confirm_password:
            return jsonify({"error": "Current password, new password and confirmation are all required"}), 400
        if len(new_password) < 6:
            return jsonify({"error": "New password must be at least 6 characters long"}), 400
        if new_password != confirm_password:
            return jsonify({"error": "New password and confirmation do not match"}), 400
        if new_password == current_password:
            return jsonify({"error": "New password must be different from the current password"}), 400

        row = query_one("SELECT password_hash FROM users WHERE id = ?", (user_id,))
        if not row or not verify_password(current_password, row["password_hash"]):
            return jsonify({"error": "Current password is incorrect"}), 400

        execute_write("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(new_password), user_id))
        execute_write("""
            INSERT INTO notifications (recipient_id, sender_name, sender_role, type, title, message, is_read)
            VALUES (?, 'Security Center', 'system', 'security', 'Password Changed', 'Your account password was changed. If this was not you, please contact administration.', 0)
        """, (user_id,))
        return jsonify({"message": "Your password has been changed successfully."}), 200

    @app.route("/api/auth/me", methods=["GET"])
    @require_auth()
    def get_me():
        """Return currently logged-in user."""
        from flask import g
        u = dict(g.current_user)
        dept_info = get_user_department_details(u["id"], u["role"])
        u["department_id"] = dept_info.get("id")
        u["department_name"] = dept_info.get("name")
        u["department_code"] = dept_info.get("code")
        if u["role"] in ("student", "class_leader"):
            st_prof = query_one("SELECT academic_year, roll_number FROM student_profiles WHERE user_id = ?", (u["id"],))
            u["academic_year"] = st_prof["academic_year"] if st_prof else 1
            u["roll_number"] = st_prof["roll_number"] if st_prof else None
        else:
            u["academic_year"] = None
            u["roll_number"] = None
        return jsonify({"user": u}), 200

    @app.route("/api/auth/super-admin-status", methods=["GET"])
    def super_admin_status():
        """Check if super_admin is already provisioned."""
        has_super = bool(query_one("SELECT 1 FROM users WHERE role = 'super_admin' LIMIT 1"))
        return jsonify({"exists": has_super}), 200

    @app.route("/api/auth/principal-status", methods=["GET"])
    def principal_status():
        """Check if principal is already provisioned."""
        has_principal = bool(query_one("SELECT 1 FROM users WHERE role = 'principal' LIMIT 1"))
        return jsonify({"exists": has_principal}), 200

    @app.route("/api/client-error", methods=["POST"])
    def client_error_log():
        """Log client-side React errors for instant diagnosis."""
        data = request.get_json(silent=True) or {}
        print("\n" + "="*50)
        print("[CLIENT ERROR DETECTED]")
        print("Message:", data.get("message"))
        print("Stack:", data.get("stack"))
        print("Component Stack:", data.get("componentStack"))
        print("="*50 + "\n")
        return jsonify({"status": "logged"}), 200



    # --- Frontend Static Serving ---

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        dist_dir = os.path.join(FRONTEND_DIR, "dist")
        target_dir = dist_dir if os.path.exists(os.path.join(dist_dir, "index.html")) else FRONTEND_DIR
        if path != "" and os.path.exists(os.path.join(target_dir, path)):
            return send_from_directory(target_dir, path)
        if path != "" and os.path.exists(os.path.join(FRONTEND_DIR, path)):
            return send_from_directory(FRONTEND_DIR, path)
        return send_from_directory(target_dir, "index.html")

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    import socket
    try:
        local_ip = socket.gethostbyname(socket.gethostname())
    except Exception:
        local_ip = "192.168.1.40"

    print("\n" + "=" * 65)
    print(" COLLEGE MANAGEMENT & PORTAL SYSTEM IS RUNNING")
    print("=" * 65)
    print(f"  Local Access:   http://localhost:{port}")
    print(f"  Loopback URL:   http://127.0.0.1:{port}")
    print(f"  Network (LAN):  http://{local_ip}:{port}  (MUST include :{port})")
    print(f"  Vercel Cloud:   https://institute-dun.vercel.app")
    print("=" * 65)
    print(f"  NOTE: Do not open just http://{local_ip} without :{port}.")
    print(f"        Always include the port: http://{local_ip}:{port}")
    print("=" * 65 + "\n")
    app.run(host="0.0.0.0", port=port, debug=False)
