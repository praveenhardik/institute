import os
import sys
from werkzeug.security import generate_password_hash

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.db import execute_write, init_db, query_one, query_all

# Standard accounts for all portions / portals with password 'Admin@123'
DEFAULT_PASSWORD = "Admin@123"

ALL_PORTIONS_ACCOUNTS = [
    {
        "role": "super_admin",
        "name": "Super Admin",
        "username": "superadmin",
        "email": "superadmin1@inpand.com",
        "designation": "Chief Institutional Administrator",
        "qualification": "Ph.D Educational Administration",
        "portal": "Super Admin Portal"
    },
    {
        "role": "dean",
        "name": "Dean",
        "username": "dean",
        "email": "dean1@inpand.com",
        "designation": "Dean of Academic Affairs",
        "qualification": "Ph.D",
        "portal": "Dean Portal"
    },
    {
        "role": "admin",
        "name": "Admin",
        "username": "admin",
        "email": "admin1@inpand.com",
        "designation": "College Administrator",
        "qualification": "M.Tech / MBA",
        "portal": "College Admin Portal"
    },
    {
        "role": "principal",
        "name": "Principal",
        "username": "principal",
        "email": "principal1@inpand.com",
        "designation": "College Principal",
        "qualification": "Ph.D",
        "portal": "Principal Portal"
    },
    {
        "role": "hod",
        "name": "HOD",
        "username": "hod",
        "email": "hod1@inpand.com",
        "dept_code": "CSE",
        "designation": "Head of Department (CSE)",
        "qualification": "Ph.D in Computer Science",
        "portal": "HOD Portal"
    },
    {
        "role": "teacher",
        "name": "Teacher",
        "username": "teacher",
        "email": "teacher1@inpand.com",
        "dept_code": "CSE",
        "designation": "Associate Professor",
        "qualification": "M.Tech in CSE",
        "portal": "Teacher / Faculty Portal"
    },
    {
        "role": "class_teacher",
        "name": "Class Teacher",
        "username": "classteacher",
        "email": "classteacher1@inpand.com",
        "dept_code": "CSE",
        "designation": "Class Teacher (CSE Year 1)",
        "qualification": "M.Tech in CSE",
        "portal": "Class Teacher Portal"
    },
    {
        "role": "student",
        "name": "Student",
        "username": "student",
        "email": "student1@inpand.com",
        "dept_code": "CSE",
        "roll_number": "CSE2026001",
        "academic_year": 1,
        "guardian_name": "Parent",
        "guardian_phone": "9876543210",
        "guardian_email": "parent1@inpand.com",
        "portal": "Student Portal"
    },
    {
        "role": "class_leader",
        "name": "Class Leader",
        "username": "classleader",
        "email": "classleader1@inpand.com",
        "dept_code": "CSE",
        "roll_number": "CSE2026002",
        "academic_year": 1,
        "guardian_name": "Parent",
        "guardian_phone": "9876543211",
        "guardian_email": "parent1@inpand.com",
        "portal": "Class Leader Portal"
    },
    {
        "role": "accountant",
        "name": "Accountant",
        "username": "accountant",
        "email": "accountant1@inpand.com",
        "designation": "Senior Accountant / Bursar",
        "qualification": "Chartered Accountant (CA)",
        "portal": "Accountant & Fees Portal"
    },
    {
        "role": "librarian",
        "name": "Librarian",
        "username": "librarian",
        "email": "librarian1@inpand.com",
        "designation": "Chief Librarian",
        "qualification": "M.Lib.Sc",
        "portal": "Librarian Portal"
    },
    {
        "role": "parent",
        "name": "Parent",
        "username": "parent",
        "email": "parent1@inpand.com",
        "designation": "Guardian / Parent",
        "portal": "Parent Portal"
    }
]


def upsert_user(acc: dict, hashed_pw: str) -> int:
    """Ensure account exists, has status=active, and password is set to default."""
    role = acc["role"]
    username = acc["username"]
    email = acc["email"]
    name = acc["name"]

    existing = query_one(
        "SELECT id, role, username, email FROM users WHERE role = ? OR lower(username) = lower(?) OR lower(email) = lower(?) OR lower(name) = lower(?)",
        (role, username, email, name)
    )

    if existing:
        user_id = existing["id"]
        execute_write(
            "UPDATE users SET name = ?, username = ?, email = ?, password_hash = ?, role = ?, status = 'active' WHERE id = ?",
            (name, username, email, hashed_pw, role, user_id)
        )
        print(f" -> Updated existing account #{user_id}: @{username} ({name}) - {role}")
    else:
        user_id = execute_write(
            "INSERT INTO users (name, username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'active')",
            (name, username, email, hashed_pw, role)
        )
        print(f" -> Created new account #{user_id}: @{username} ({name}) - {role}")

    return user_id


def seed_database():
    """Initialize system infrastructure (tables, official departments, settings) and seed accounts for all portions."""
    print("=" * 60)
    print("INITIALIZING DATABASE & SEEDING ALL PORTAL PORTIONS")
    print("=" * 60)
    init_db()

    # Ensure all legacy personal name accounts are completely removed or cleaned
    execute_write("DELETE FROM users WHERE lower(name) IN ('eleanor', 'alan', 'xavier', 'lovelace', 'alex', 'arthur') OR lower(email) IN ('eleanor1@inpand.com', 'alan1@inpand.com', 'xavier1@inpand.com', 'lovelace1@inpand.com', 'alex1@inpand.com', 'arthur1@inpand.com')")

    # 1. College Name setting
    college_setting = query_one("SELECT value FROM college_settings WHERE key = 'college_name'")
    if not college_setting or college_setting["value"] in ("niet", "Apex Institute of Technology", "INPAND College of Engineering and Technology"):
        execute_write(
            "INSERT INTO college_settings (key, value) VALUES ('college_name', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
            ("INPAND institute of Engineering and Technology",)
        )
        print("[OK] College Name set: INPAND institute of Engineering and Technology")

    # 2. Academic Year: 2026-2027
    year = query_one("SELECT id FROM academic_years WHERE name = '2026-2027'")
    if not year:
        year_id = execute_write("INSERT INTO academic_years (name, start_date, end_date) VALUES ('2026-2027', '2026-07-01', '2027-06-30')")
    else:
        year_id = year["id"]
    print(f"[OK] Academic Year: 2026-2027 (ID #{year_id})")

    # 3. Official Departments
    execute_write("UPDATE departments SET code = 'MECT' WHERE name = 'Mechatronics Engineering' OR code = 'MCE'")
    official_depts = [
        ("Computer Science Engineering", "CSE"),
        ("Mechanical Engineering", "MECH"),
        ("Mechatronics Engineering", "MECT"),
        ("Aeronautical Engineering", "AERO"),
        ("Electrical and Electronics Engineering", "EEE"),
        ("Electrical and Communication Engineering", "ECE")
    ]
    dept_ids = {}
    for dname, dcode in official_depts:
        dept = query_one("SELECT id FROM departments WHERE code = ? OR name = ?", (dcode, dname))
        if not dept:
            d_id = execute_write("INSERT INTO departments (name, code) VALUES (?, ?)", (dname, dcode))
        else:
            execute_write("UPDATE departments SET name = ?, code = ? WHERE id = ?", (dname, dcode, dept["id"]))
            d_id = dept["id"]
        dept_ids[dcode] = d_id
    print(f"[OK] 6 Official Departments configured: {list(dept_ids.keys())}")

    cse_dept_id = dept_ids.get("CSE")

    # 4. Program, Batch, Section
    prog = query_one("SELECT id FROM programs WHERE department_id = ? AND name = ?", (cse_dept_id, "B.Tech Computer Science Engineering"))
    if not prog:
        prog_id = execute_write("INSERT INTO programs (department_id, name, degree, duration_years) VALUES (?, ?, 'B.Tech', 4)",
                                (cse_dept_id, "B.Tech Computer Science Engineering"))
    else:
        prog_id = prog["id"]

    batch = query_one("SELECT id FROM batches WHERE program_id = ? AND name = ?", (prog_id, "Batch 2026-2030"))
    if not batch:
        batch_id = execute_write("INSERT INTO batches (program_id, name) VALUES (?, ?)", (prog_id, "Batch 2026-2030"))
    else:
        batch_id = batch["id"]

    section = query_one("SELECT id FROM sections WHERE batch_id = ? AND name = ?", (batch_id, "A"))
    if not section:
        section_id = execute_write("INSERT INTO sections (batch_id, name) VALUES (?, ?)", (batch_id, "A"))
    else:
        section_id = section["id"]
    print(f"[OK] Program (#{prog_id}), Batch (#{batch_id}), Section (#{section_id}) ready")

    # 5. Seed Accounts across all portions
    hashed_pw = generate_password_hash(DEFAULT_PASSWORD)
    seeded_users = {}

    for acc in ALL_PORTIONS_ACCOUNTS:
        uid = upsert_user(acc, hashed_pw)
        seeded_users[acc["role"]] = uid

        # Staff Profiles & Departments
        if acc["role"] in ("dean", "super_admin", "admin", "principal", "hod", "teacher", "class_teacher", "accountant", "librarian"):
            target_dept = dept_ids.get(acc.get("dept_code")) if acc.get("dept_code") else None
            execute_write("""
                INSERT INTO staff_profiles (user_id, department_id, designation, qualification)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (user_id) DO UPDATE SET
                    department_id = COALESCE(excluded.department_id, staff_profiles.department_id),
                    designation = excluded.designation,
                    qualification = excluded.qualification
            """, (uid, target_dept, acc.get("designation", "Faculty"), acc.get("qualification", "")))

            if target_dept:
                execute_write("INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)", (uid, target_dept))

        # Special HOD linking on department table
        if acc["role"] == "hod" and cse_dept_id:
            execute_write("UPDATE departments SET hod_user_id = ? WHERE id = ?", (uid, cse_dept_id))

        # Student Profiles & Fees
        if acc["role"] in ("student", "class_leader"):
            target_dept = dept_ids.get(acc.get("dept_code"), cse_dept_id)
            execute_write("""
                INSERT INTO student_profiles (user_id, roll_number, batch_id, section_id, department_id, academic_year, guardian_name, guardian_phone, guardian_email)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (user_id) DO UPDATE SET
                    roll_number = excluded.roll_number,
                    batch_id = excluded.batch_id,
                    section_id = excluded.section_id,
                    department_id = excluded.department_id,
                    academic_year = excluded.academic_year,
                    guardian_name = excluded.guardian_name,
                    guardian_phone = excluded.guardian_phone,
                    guardian_email = excluded.guardian_email
            """, (uid, acc.get("roll_number"), batch_id, section_id, target_dept, acc.get("academic_year", 1),
                  acc.get("guardian_name"), acc.get("guardian_phone"), acc.get("guardian_email")))

            execute_write("""
                INSERT INTO student_fees (student_id, fee_amount, paid_amount, status, academic_year, remarks)
                VALUES (?, 50000, 50000, 'paid', '2026-2027', 'Annual Tuition Fee Paid in Full')
                ON CONFLICT (student_id) DO UPDATE SET
                    fee_amount = excluded.fee_amount,
                    paid_amount = excluded.paid_amount,
                    status = excluded.status,
                    academic_year = excluded.academic_year
            """, (uid,))

    # 6. Seed Subjects & Questions so Teacher & Student have interactive data
    teacher_id = seeded_users.get("teacher")
    student_id = seeded_users.get("student")
    librarian_id = seeded_users.get("librarian")

    if teacher_id and cse_dept_id and batch_id:
        sub = query_one("SELECT id FROM subjects WHERE code = 'CS201'")
        if not sub:
            sub_id = execute_write(
                "INSERT INTO subjects (name, code, department_id, batch_id, faculty_user_id) VALUES (?, ?, ?, ?, ?)",
                ("Data Structures and Algorithms", "CS201", cse_dept_id, batch_id, teacher_id)
            )
        else:
            execute_write("UPDATE subjects SET faculty_user_id = ? WHERE id = ?", (teacher_id, sub["id"]))
            sub_id = sub["id"]

        # Ensure sample quiz question
        q = query_one("SELECT id FROM questions WHERE teacher_id = ?", (teacher_id,))
        if not q:
            execute_write("""
                INSERT INTO questions (
                    teacher_id, question_text, option_a, option_b, option_c, option_d,
                    correct_option, explanation, duration_seconds, target_type, target_department_id, target_year, task_number
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'all', ?, 1, 'Task 1')
            """, (
                teacher_id,
                "What is the average time complexity of searching an element in a balanced Binary Search Tree (BST)?",
                "O(1)",
                "O(log n)",
                "O(n)",
                "O(n log n)",
                "B",
                "In a balanced binary search tree, the height is logarithmic (log n), resulting in O(log n) search time.",
                60,
                cse_dept_id
            ))
            print("[OK] Sample quiz question created for Teacher portal.")

    # 7. Librarian book sample
    if librarian_id and student_id:
        book = query_one("SELECT id FROM student_library_books WHERE student_id = ?", (student_id,))
        if not book:
            execute_write("""
                INSERT INTO student_library_books (student_id, book_name, validity_date, status, issued_by_id)
                VALUES (?, 'Introduction to Algorithms (CLRS 4th Edition)', '2027-05-31', 'issued', ?)
            """, (student_id, librarian_id))
            print("[OK] Sample library circulation book recorded.")

    print("=" * 60)
    print("SUCCESS: ALL PORTIONS SEEDED & FULLY OPERATIONAL!")
    print(f"Universal Login Password: {DEFAULT_PASSWORD}")
    print("=" * 60)


if __name__ == "__main__":
    seed_database()
