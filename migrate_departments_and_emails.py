"""
Migration script:
1. Ensure all Teachers, HODs, and Students are in the 6 provided departments only.
2. Remove any test/non-canonical departments.
3. Update all user emails to have their name + number + @inpand.com.
"""
import sqlite3
import re

CANONICAL_DEPTS = [
    ("Computer Science Engineering", "CSE"),
    ("Mechanical Engineering", "MECH"),
    ("Mechatronics Engineering", "MECT"),
    ("Aeronautical Engineering", "AERO"),
    ("Electrical and Electronics Engineering", "EEE"),
    ("Electrical and Communication Engineering", "ECE")
]

def migrate():
    conn = sqlite3.connect('database/database.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    print("--- STEP 1: Ensuring 6 Canonical Provided Departments ---")
    dept_map = {}
    for name, code in CANONICAL_DEPTS:
        row = c.execute("SELECT id FROM departments WHERE name = ?", (name,)).fetchone()
        if not row:
            row = c.execute("SELECT id FROM departments WHERE code = ?", (code,)).fetchone()
            if row:
                c.execute("UPDATE departments SET name = ?, code = ? WHERE id = ?", (name, code, row["id"]))
            else:
                c.execute("INSERT INTO departments (name, code) VALUES (?, ?)", (name, code))
                row = c.execute("SELECT id FROM departments WHERE name = ?", (name,)).fetchone()
        else:
            c.execute("UPDATE departments SET code = ? WHERE id = ?", (code, row["id"]))
        dept_map[name] = row["id"]
        print(f" -> Dept: {name} ({code}) -> ID {row['id']}")
    
    valid_dept_ids = list(dept_map.values())
    default_dept_id = dept_map["Computer Science Engineering"]
    
    # Clean up non-canonical departments
    non_canonical = c.execute(
        f"SELECT id, name FROM departments WHERE id NOT IN ({','.join('?' for _ in valid_dept_ids)})",
        valid_dept_ids
    ).fetchall()
    print(f"Found {len(non_canonical)} non-canonical departments to clean up:")
    for d in non_canonical:
        print(f"   Deleting Dept #{d['id']}: {d['name']}")
        c.execute("DELETE FROM departments WHERE id = ?", (d["id"],))
        c.execute("DELETE FROM staff_departments WHERE department_id = ?", (d["id"],))
        c.execute("DELETE FROM programs WHERE department_id = ?", (d["id"],))
    
    print("\n--- STEP 2: Reassigning Staff & Students to Provided Departments Only ---")
    # Reassign staff profiles
    staff_rows = c.execute("SELECT user_id, department_id FROM staff_profiles").fetchall()
    for s in staff_rows:
        if s["department_id"] not in valid_dept_ids:
            c.execute("UPDATE staff_profiles SET department_id = ? WHERE user_id = ?", (default_dept_id, s["user_id"]))
            print(f"Updated staff #{s['user_id']} department to #{default_dept_id}")
    
    # Reassign staff_departments
    c.execute(f"DELETE FROM staff_departments WHERE department_id NOT IN ({','.join('?' for _ in valid_dept_ids)})", valid_dept_ids)
    
    # Ensure all staff have an entry in staff_departments
    all_staff = c.execute("SELECT id, role FROM users WHERE role IN ('teacher', 'class_teacher', 'hod', 'accountant', 'librarian')").fetchall()
    for stf in all_staff:
        sp = c.execute("SELECT department_id FROM staff_profiles WHERE user_id = ?", (stf["id"],)).fetchone()
        cur_dept = sp["department_id"] if (sp and sp["department_id"] in valid_dept_ids) else default_dept_id
        if not sp:
            c.execute("INSERT INTO staff_profiles (user_id, department_id, designation) VALUES (?, ?, 'Faculty')", (stf["id"], cur_dept))
        else:
            c.execute("UPDATE staff_profiles SET department_id = ? WHERE user_id = ?", (cur_dept, stf["id"]))
        c.execute("INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)", (stf["id"], cur_dept))
    
    # Reassign student profiles
    all_students = c.execute("SELECT id, name, username FROM users WHERE role IN ('student', 'class_leader')").fetchall()
    for idx, stu in enumerate(all_students):
        # Distribute students across canonical departments
        target_dept = valid_dept_ids[idx % len(valid_dept_ids)]
        sp = c.execute("SELECT user_id, department_id FROM student_profiles WHERE user_id = ?", (stu["id"],)).fetchone()
        if not sp:
            c.execute("INSERT INTO student_profiles (user_id, department_id, roll_number) VALUES (?, ?, ?)",
                      (stu["id"], target_dept, f"ROLL_{stu['id']:04d}"))
        elif sp["department_id"] not in valid_dept_ids:
            c.execute("UPDATE student_profiles SET department_id = ? WHERE user_id = ?", (target_dept, stu["id"]))
        print(f"Student #{stu['id']} ({stu['name']}) -> Dept #{target_dept}")
    
    print("\n--- STEP 3: Updating Emails to Name + Number + @inpand.com ---")
    users = c.execute("SELECT id, username, name, email FROM users ORDER BY id").fetchall()
    used_emails = set()
    
    # Map special demo usernames to clean primary emails
    demo_clean = {
        "superadmin": "superadmin1@inpand.com",
        "admin": "admin1@inpand.com",
        "hod": "hod1@inpand.com",
        "teacher": "teacher1@inpand.com",
        "classteacher": "classteacher1@inpand.com",
        "student": "student1@inpand.com",
        "staff": "staff1@inpand.com"
    }
    
    for u in users:
        uid = u["id"]
        uname = (u["username"] or "").strip().lower()
        if not uname:
            uname = f"user_{uid}"
            c.execute("UPDATE users SET username = ? WHERE id = ?", (uname, uid))
            
        if uname in demo_clean and demo_clean[uname] not in used_emails:
            new_email = demo_clean[uname]
        else:
            # Check if uname already has digits
            has_digits = bool(re.search(r'\d', uname))
            if has_digits:
                candidate = f"{uname}@inpand.com"
            else:
                candidate = f"{uname}{uid}@inpand.com"
            
            # Ensure unique
            counter = 1
            while candidate in used_emails:
                candidate = f"{uname}{uid}_{counter}@inpand.com"
                counter += 1
            new_email = candidate
            
        used_emails.add(new_email)
        c.execute("UPDATE users SET email = ? WHERE id = ?", (new_email, uid))
        print(f"User #{uid} ({uname}) => {new_email}")
        
    conn.commit()
    
    # Verifications
    print("\n--- VERIFICATION ---")
    depts_now = c.execute("SELECT id, name, code FROM departments").fetchall()
    print("Active Departments:", [(d["id"], d["name"], d["code"]) for d in depts_now])
    
    non_inpand_com = c.execute("SELECT COUNT(*) as c FROM users WHERE email NOT LIKE '%@inpand.com'").fetchone()["c"]
    print("Users without @inpand.com:", non_inpand_com)
    assert non_inpand_com == 0, "Some users do not have @inpand.com email!"
    
    # Check no users have invalid department
    invalid_staff_count = c.execute(
        f"SELECT COUNT(*) as c FROM staff_profiles WHERE department_id NOT IN ({','.join('?' for _ in valid_dept_ids)})",
        valid_dept_ids
    ).fetchone()["c"]
    invalid_student_count = c.execute(
        f"SELECT COUNT(*) as c FROM student_profiles WHERE department_id NOT IN ({','.join('?' for _ in valid_dept_ids)})",
        valid_dept_ids
    ).fetchone()["c"]
    print("Invalid staff department count:", invalid_staff_count)
    print("Invalid student department count:", invalid_student_count)
    assert invalid_staff_count == 0
    assert invalid_student_count == 0
    
    conn.close()
    print("\nMigration Completed Successfully!")

if __name__ == "__main__":
    migrate()
