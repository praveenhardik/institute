import sys
sys.path.insert(0, r'd:/institute')
from backend.db import execute_write, query_all
from backend.routes_teacher import extract_dept_and_year

def run_migration():
    print("Adding columns if not exists...")
    execute_write("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS academic_year INTEGER;")
    execute_write("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS previous_year INTEGER;")
    execute_write("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS year_changed_at TIMESTAMP WITHOUT TIME ZONE;")
    execute_write("ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_year INTEGER;")
    execute_write("ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_year INTEGER;")
    print("Columns added successfully.")

    # Populate academic_year for existing students
    students = query_all("""
        SELECT u.id, u.name, u.username, u.email, sp.roll_number, b.name as batch_name
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN batches b ON b.id = sp.batch_id
        WHERE u.role IN ('student', 'class_leader')
    """)
    print(f"Populating academic_year for {len(students)} students...")
    updated = 0
    for s in students:
        s_dept, s_year = extract_dept_and_year(s)
        if s_year:
            execute_write("""
                UPDATE student_profiles SET academic_year = ? WHERE user_id = ? AND academic_year IS NULL
            """, (s_year, s['id']))
            execute_write("""
                UPDATE users SET academic_year = ? WHERE id = ? AND academic_year IS NULL
            """, (s_year, s['id']))
            updated += 1

    # Also populate academic_year for class teachers
    class_teachers = query_all("SELECT id, name, username, email FROM users WHERE role = 'class_teacher'")
    print(f"Populating academic_year for {len(class_teachers)} class teachers...")
    for ct in class_teachers:
        c_dept, c_year = extract_dept_and_year(ct)
        if c_year:
            execute_write("""
                UPDATE users SET academic_year = ? WHERE id = ? AND academic_year IS NULL
            """, (c_year, ct['id']))

    print(f"Migration completed! {updated} students updated with academic_year.")

if __name__ == '__main__':
    run_migration()

