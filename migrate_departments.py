import os
import sys
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database", "database.db")

OFFICIAL_DEPTS = [
    {"name": "Computer Science Engineering", "code": "CSE"},
    {"name": "Mechanical Engineering", "code": "MECH"},
    {"name": "Mechatronics Engineering", "code": "MECT"},
    {"name": "Aeronautical Engineering", "code": "AERO"},
    {"name": "Electrical and Electronics Engineering", "code": "EEE"},
    {"name": "Electrical and Communication Engineering", "code": "ECE"}
]

def migrate():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    print("Step 1: Create staff_departments table...")
    c.execute("""
        CREATE TABLE IF NOT EXISTS staff_departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            department_id INTEGER NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, department_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
        );
    """)
    c.execute("CREATE INDEX IF NOT EXISTS idx_staff_departments_user ON staff_departments(user_id);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_staff_departments_dept ON staff_departments(department_id);")
    conn.commit()

    print("Step 2: Ensure official 6 departments exist...")
    official_dept_ids = {}
    for d in OFFICIAL_DEPTS:
        # Check by code or by name
        row = c.execute("SELECT id FROM departments WHERE code = ? OR name = ?", (d["code"], d["name"])).fetchone()
        if row:
            dept_id = row["id"]
            c.execute("UPDATE departments SET name = ?, code = ? WHERE id = ?", (d["name"], d["code"], dept_id))
            official_dept_ids[d["code"]] = dept_id
        else:
            c.execute("INSERT INTO departments (name, code) VALUES (?, ?)", (d["name"], d["code"]))
            official_dept_ids[d["code"]] = c.lastrowid
    conn.commit()
    print("Official departments:", official_dept_ids)

    # Let's collect all valid official dept ID list
    valid_ids = list(official_dept_ids.values())
    cse_id = official_dept_ids["CSE"]
    mech_id = official_dept_ids["MECH"]
    mect_id = official_dept_ids["MECT"]
    aero_id = official_dept_ids["AERO"]
    eee_id = official_dept_ids["EEE"]
    ece_id = official_dept_ids["ECE"]

    print("Step 3: Map existing departments to official 6 departments...")
    all_depts = c.execute("SELECT id, name, code FROM departments").fetchall()
    dept_map = {}
    cycle_ids = [cse_id, mech_id, mect_id, aero_id, eee_id, ece_id]
    i = 0
    for d in all_depts:
        did = d["id"]
        if did in valid_ids:
            dept_map[did] = did
        else:
            # Check if name or code resembles any official dept
            name_upper = (d["name"] or "").upper()
            code_upper = (d["code"] or "").upper()
            if "MECT" in name_upper or "MECT" in code_upper or "MCE" in name_upper or "MCE" in code_upper:
                target = mect_id
            elif "COMP" in name_upper or "CSE" in code_upper:
                target = cse_id
            elif "MECH" in name_upper:
                target = mech_id
            elif "AERO" in name_upper:
                target = aero_id
            elif "EEE" in code_upper:
                target = eee_id
            elif "ECE" in code_upper:
                target = ece_id
            else:
                target = cycle_ids[i % len(cycle_ids)]
                i += 1
            dept_map[did] = target

    print("Dept remapping:", dept_map)

    # Update programs
    for old_id, new_id in dept_map.items():
        if old_id != new_id:
            c.execute("UPDATE programs SET department_id = ? WHERE department_id = ?", (new_id, old_id))
            c.execute("UPDATE subjects SET department_id = ? WHERE department_id = ?", (new_id, old_id))
            c.execute("UPDATE staff_profiles SET department_id = ? WHERE department_id = ?", (new_id, old_id))
            c.execute("UPDATE student_profiles SET department_id = ? WHERE department_id = ?", (new_id, old_id))
    conn.commit()

    # Delete non-official departments
    for old_id, new_id in dept_map.items():
        if old_id != new_id:
            c.execute("DELETE FROM departments WHERE id = ?", (old_id,))
    conn.commit()

    print("Step 4: Clean up admin and super_admin departments (must be NULL / -)...")
    admin_users = c.execute("SELECT id FROM users WHERE role IN ('admin', 'super_admin')").fetchall()
    for u in admin_users:
        uid = u["id"]
        c.execute("DELETE FROM staff_profiles WHERE user_id = ?", (uid,))
        c.execute("DELETE FROM staff_departments WHERE user_id = ?", (uid,))
        c.execute("DELETE FROM student_profiles WHERE user_id = ?", (uid,))
        c.execute("UPDATE departments SET hod_user_id = NULL WHERE hod_user_id = ?", (uid,))
    conn.commit()

    print("Step 5: Ensure non-admin users have valid departments and staff_departments populated...")
    non_admin_users = c.execute("SELECT id, name, role, email FROM users WHERE role NOT IN ('admin', 'super_admin')").fetchall()
    idx = 0
    for u in non_admin_users:
        uid = u["id"]
        role = u["role"]
        assigned_dept = cycle_ids[idx % len(cycle_ids)]
        idx += 1

        if role in ('teacher', 'class_teacher', 'hod', 'accountant', 'librarian'):
            sp = c.execute("SELECT department_id FROM staff_profiles WHERE user_id = ?", (uid,)).fetchone()
            if not sp or not sp["department_id"] or sp["department_id"] not in valid_ids:
                c.execute("""
                    INSERT INTO staff_profiles (user_id, department_id, designation) VALUES (?, ?, 'Faculty')
                    ON CONFLICT(user_id) DO UPDATE SET department_id = excluded.department_id
                """, (uid, assigned_dept))
                target_dept_id = assigned_dept
            else:
                target_dept_id = sp["department_id"]

            # Populate staff_departments
            c.execute("INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)", (uid, target_dept_id))

        elif role in ('student', 'class_leader'):
            st = c.execute("SELECT department_id, batch_id FROM student_profiles WHERE user_id = ?", (uid,)).fetchone()
            if not st:
                c.execute("INSERT INTO student_profiles (user_id, department_id) VALUES (?, ?)", (uid, assigned_dept))
            elif not st["department_id"] or st["department_id"] not in valid_ids:
                c.execute("UPDATE student_profiles SET department_id = ? WHERE user_id = ?", (assigned_dept, uid))

    # Demo accounts:
    # CSE HOD (Charles Xavier) -> CSE
    hod = c.execute("SELECT id FROM users WHERE username = 'hod'").fetchone()
    if hod:
        c.execute("UPDATE staff_profiles SET department_id = ? WHERE user_id = ?", (cse_id, hod["id"]))
        c.execute("INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)", (hod["id"], cse_id))
        c.execute("UPDATE departments SET hod_user_id = ? WHERE id = ?", (hod["id"], cse_id))

    # Teacher Alan Turing -> CSE (and also Mechanical Engineering as multi-dept demo!)
    teacher = c.execute("SELECT id FROM users WHERE username = 'teacher'").fetchone()
    if teacher:
        c.execute("UPDATE staff_profiles SET department_id = ? WHERE user_id = ?", (cse_id, teacher["id"]))
        c.execute("INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)", (teacher["id"], cse_id))
        c.execute("INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)", (teacher["id"], mech_id))

    # Class Teacher Ada Lovelace -> CSE
    ct = c.execute("SELECT id FROM users WHERE username = 'classteacher'").fetchone()
    if ct:
        c.execute("UPDATE staff_profiles SET department_id = ? WHERE user_id = ?", (cse_id, ct["id"]))
        c.execute("INSERT OR IGNORE INTO staff_departments (user_id, department_id) VALUES (?, ?)", (ct["id"], cse_id))

    conn.commit()

    print("\nVERIFICATION:")
    remaining_depts = c.execute("SELECT id, name, code FROM departments ORDER BY id").fetchall()
    print("Remaining departments count:", len(remaining_depts))
    for d in remaining_depts:
        print(f"  ID {d['id']}: {d['name']} ({d['code']})")

    users_check = c.execute("""
        SELECT u.id, u.name, u.role,
               CASE
                 WHEN u.role IN ('super_admin', 'admin') THEN '-'
                 WHEN u.role IN ('teacher', 'class_teacher', 'hod', 'accountant', 'librarian') THEN
                   COALESCE(
                     (SELECT GROUP_CONCAT(d.name, ', ') FROM staff_departments sd JOIN departments d ON d.id = sd.department_id WHERE sd.user_id = u.id),
                     (SELECT d.name FROM staff_profiles sp JOIN departments d ON d.id = sp.department_id WHERE sp.user_id = u.id),
                     '-'
                   )
                 ELSE
                   COALESCE(
                     (SELECT d.name FROM student_profiles st
                        LEFT JOIN batches b ON b.id = st.batch_id LEFT JOIN programs p ON p.id = b.program_id
                        JOIN departments d ON d.id = COALESCE(p.department_id, st.department_id)
                        WHERE st.user_id = u.id),
                     '-'
                   )
               END AS department_display
        FROM users u ORDER BY u.id DESC LIMIT 25
    """).fetchall()

    print("\nRecent 25 Users in table:")
    for u in users_check:
        print(f"  [{u['role']:15}] {u['name']:35} -> {u['department_display']}")

    conn.close()

if __name__ == "__main__":
    migrate()
