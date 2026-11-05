import sqlite3

def migrate():
    conn = sqlite3.connect('database/database.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    users = c.execute("SELECT id, username, name, email FROM users").fetchall()
    print(f"Total users to check: {len(users)}")
    
    for u in users:
        uid = u["id"]
        uname = (u["username"] or "").strip()
        if not uname:
            uname = f"user_{uid}"
            c.execute("UPDATE users SET username = ? WHERE id = ?", (uname, uid))
        new_email = f"{uname.lower()}@inpand.in"
        c.execute("UPDATE users SET email = ? WHERE id = ?", (new_email, uid))
        print(f"User #{uid}: username={uname} => email={new_email}")
        
    conn.commit()
    
    # Verify all emails end with @inpand.in and prefix is username
    invalid = c.execute("SELECT id, username, email FROM users WHERE email NOT LIKE '%@inpand.in'").fetchall()
    print(f"Users without @inpand.in: {len(invalid)}")
    
    # Check all students
    students = c.execute("SELECT id, username, name, email, role, status FROM users WHERE role IN ('student', 'class_leader')").fetchall()
    print(f"\nTotal students in system: {len(students)}")
    for s in students:
        print(f"Student #{s['id']}: {s['name']} | email={s['email']} | status={s['status']}")
        
    conn.close()

if __name__ == "__main__":
    migrate()
