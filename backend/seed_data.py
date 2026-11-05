import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.db import execute_write, init_db, query_one, query_all

# Demo accounts disabled: Only user-registered accounts are shown across all portals.
DEMO_ACCOUNTS = []

def seed_database():
    """Initialize system infrastructure (tables, official departments, settings) without creating any AI accounts."""
    print("Initializing database tables...")
    init_db()

    # 1. Ensure College Name setting exists
    college_setting = query_one("SELECT value FROM college_settings WHERE key = 'college_name'")
    if not college_setting or college_setting["value"] in ("niet", "Apex Institute of Technology", "INPAND College of Engineering and Technology"):
        execute_write("INSERT INTO college_settings (key, value) VALUES ('college_name', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", ("INPAND institute of Engineering and Technology",))
        print("Set default college name: INPAND institute of Engineering and Technology")

    # 2. Academic Year: 2026-2027
    year = query_one("SELECT id FROM academic_years WHERE name = '2026-2027'")
    if not year:
        execute_write("INSERT INTO academic_years (name, start_date, end_date) VALUES ('2026-2027', '2026-07-01', '2027-06-30')")

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
    for dname, dcode in official_depts:
        dept = query_one("SELECT id FROM departments WHERE code = ? OR name = ?", (dcode, dname))
        if not dept:
            execute_write("INSERT INTO departments (name, code) VALUES (?, ?)", (dname, dcode))
        else:
            execute_write("UPDATE departments SET name = ?, code = ? WHERE id = ?", (dname, dcode, dept["id"]))

    # Clean up any leftover demo / AI test accounts
    demo_usernames = ('eleanor', 'xavier', 'alan', 'lovelace', 'alex', 'arthur', 'mobilestudent', 'roguesuperadmin')
    for u in demo_usernames:
        row = query_one("SELECT id FROM users WHERE LOWER(username) = ?", (u,))
        if row:
            uid = row["id"]
            execute_write("DELETE FROM student_fees WHERE student_id = ?", (uid,))
            execute_write("DELETE FROM student_profiles WHERE user_id = ?", (uid,))
            execute_write("DELETE FROM student_daily_attendance WHERE student_id = ?", (uid,))
            execute_write("DELETE FROM student_library_books WHERE student_id = ?", (uid,))
            execute_write("DELETE FROM submissions WHERE student_id = ?", (uid,))
            execute_write("DELETE FROM group_students WHERE student_id = ?", (uid,))
            execute_write("DELETE FROM attendance_records WHERE student_id = ?", (uid,))
            execute_write("DELETE FROM staff_profiles WHERE user_id = ?", (uid,))
            execute_write("DELETE FROM staff_departments WHERE user_id = ?", (uid,))
            execute_write("DELETE FROM notifications WHERE recipient_id = ? OR sender_id = ?", (uid, uid))
            execute_write("UPDATE departments SET hod_user_id = NULL WHERE hod_user_id = ?", (uid,))
            execute_write("UPDATE subjects SET faculty_user_id = NULL WHERE faculty_user_id = ?", (uid,))
            execute_write("DELETE FROM users WHERE id = ?", (uid,))

    print("Database infrastructure initialized. All portals show exclusively user-registered accounts.")

if __name__ == "__main__":
    seed_database()
