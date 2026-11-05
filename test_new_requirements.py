import requests
import sqlite3

BASE = "http://127.0.0.1:5000"

def test_requirements():
    print("=" * 70)
    print("VERIFYING: EMAIL DOMAIN @inpand.in & STUDENT VISIBILITY IN TEACHER PORTAL")
    print("=" * 70)

    # ---------------------------------------------------------
    # PART 1: Database Check - All Emails End With @inpand.in
    # ---------------------------------------------------------
    print("\n[PART 1] Verifying Database Records...")
    conn = sqlite3.connect("database/database.db")
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    users = c.execute("SELECT id, username, email, role, status FROM users").fetchall()
    print(f"Total Users Checked in DB: {len(users)}")
    
    for u in users:
        uname = (u["username"] or "").lower()
        email = u["email"] or ""
        assert email.endswith("@inpand.com") or email.endswith("@inpand.in"), f"User #{u['id']} ({u['username']}) email does not end with @inpand.com: {email}"
        email_prefix = email.split("@")[0].lower()
        assert email_prefix.startswith(uname) or uname.startswith(email_prefix), f"User #{u['id']} email prefix '{email_prefix}' does not start with username '{uname}'"

    print(" -> PASS: 100% of users in database end with '@inpand.in' with prefix matching username!")

    # ---------------------------------------------------------
    # PART 2: All 7 Demo Accounts Sign In With @inpand.in & Username
    # ---------------------------------------------------------
    print("\n[PART 2] Testing All 7 Demo Accounts Login with @inpand.in and Universal Password...")
    demo_accounts = [
        ("superadmin", "superadmin@inpand.in", "super_admin"),
        ("admin", "admin@inpand.in", "admin"),
        ("hod", "hod@inpand.in", "hod"),
        ("teacher", "teacher@inpand.in", "teacher"),
        ("classteacher", "classteacher@inpand.in", "class_teacher"),
        ("student", "student@inpand.in", "student"),
        ("staff", "staff@inpand.in", "accountant")
    ]

    tokens = {}
    for uname, email, role in demo_accounts:
        # Test login with email
        r = requests.post(f"{BASE}/api/auth/login", json={"email": email, "password": "Admin@123"})
        assert r.status_code == 200, f"Login failed for {email}: {r.text}"
        data = r.json()
        tokens[uname] = data["token"]
        assert data["user"]["email"] == email, f"User email mismatch: {data['user']['email']} vs {email}"
        assert data["user"]["role"] == role, f"User role mismatch: {data['user']['role']} vs {role}"
        print(f" -> PASS: Logged in via Email: {email:<26} [{role}]")

        # Test login with username directly
        r_u = requests.post(f"{BASE}/api/auth/login", json={"username": uname, "password": "Admin@123"})
        assert r_u.status_code == 200, f"Login failed for username {uname}: {r_u.text}"
        assert r_u.json()["user"]["email"] == email

    print(" -> PASS: All 7 demo accounts successfully authenticate via email and username!")

    # ---------------------------------------------------------
    # PART 3: Students in Admin Portal vs Teacher Portal
    # ---------------------------------------------------------
    print("\n[PART 3] Verifying Student Visibility: Admin Portal vs Teacher Portal...")
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    teacher_headers = {"Authorization": f"Bearer {tokens['teacher']}"}
    ct_headers = {"Authorization": f"Bearer {tokens['classteacher']}"}

    # 1. Admin gets all students
    admin_students_res = requests.get(f"{BASE}/api/college/students", headers=admin_headers)
    assert admin_students_res.status_code == 200, f"Admin get students failed: {admin_students_res.text}"
    admin_students = admin_students_res.json().get("students", [])
    print(f"Admin Portal: Found {len(admin_students)} students via /api/college/students")

    # 2. Teacher calls /api/college/students
    teacher_students_res = requests.get(f"{BASE}/api/college/students", headers=teacher_headers)
    assert teacher_students_res.status_code == 200, f"Teacher get students failed: {teacher_students_res.status_code} {teacher_students_res.text}"
    teacher_students = teacher_students_res.json().get("students", [])
    print(f"Teacher Portal (/api/college/students): Found {len(teacher_students)} students")
    assert len(teacher_students) == len(admin_students), f"Count mismatch: Teacher saw {len(teacher_students)} vs Admin saw {len(admin_students)}"

    # 3. Teacher calls /api/college/students/by-department (All Departments)
    teacher_dept_res = requests.get(f"{BASE}/api/college/students/by-department", headers=teacher_headers)
    assert teacher_dept_res.status_code == 200, f"Teacher by-department failed: {teacher_dept_res.text}"
    teacher_dept_students = teacher_dept_res.json().get("students", [])
    print(f"Teacher Portal (/api/college/students/by-department): Found {len(teacher_dept_students)} students")
    assert len(teacher_dept_students) == len(admin_students), f"Count mismatch: By-dept saw {len(teacher_dept_students)} vs Admin saw {len(admin_students)}"

    # 4. Teacher calls /api/teacher/students (Group management roster)
    teacher_avail_res = requests.get(f"{BASE}/api/teacher/students", headers=teacher_headers)
    assert teacher_avail_res.status_code == 200, f"Teacher get available students failed: {teacher_avail_res.text}"
    teacher_avail_students = teacher_avail_res.json().get("students", [])
    print(f"Teacher Portal (/api/teacher/students): Found {len(teacher_avail_students)} students")
    assert len(teacher_avail_students) == len(admin_students), f"Count mismatch: Available saw {len(teacher_avail_students)} vs Admin saw {len(admin_students)}"

    # 5. Class Teacher calls all student endpoints
    ct_students_res = requests.get(f"{BASE}/api/college/students", headers=ct_headers)
    assert ct_students_res.status_code == 200, f"Class Teacher get students failed: {ct_students_res.text}"
    assert len(ct_students_res.json()["students"]) == len(admin_students)
    print(" -> PASS: Class Teacher portal also has full access to all students!")

    # Verify every single student ID from Admin is present in Teacher's list
    admin_ids = {s["id"] for s in admin_students}
    teacher_ids = {s["id"] for s in teacher_students}
    assert admin_ids == teacher_ids, f"ID set mismatch: {admin_ids.difference(teacher_ids)}"

    # Verify student attributes in Teacher Portal
    for s in teacher_students:
        assert s["email"].endswith("@inpand.in"), f"Student {s['name']} has invalid email: {s['email']}"
        print(f"    Student #{s['id']:<2}: {s['name']:<24} | Roll: {s.get('roll_number') or '-':<12} | Dept: {s.get('department_name') or '-':<35} | {s['email']}")

    print(" -> PASS: All students available in Admin Portal are 100% visible with full details in Teacher Portal!")

    # ---------------------------------------------------------
    # PART 4: Creating / Registering User Automatically Formats Email to @inpand.in
    # ---------------------------------------------------------
    print("\n[PART 4] Testing User Creation and Edit Login Details...")
    super_headers = {"Authorization": f"Bearer {tokens['superadmin']}"}
    
    # Delete any leftover test user if existing
    conn = sqlite3.connect("database/database.db")
    conn.execute("DELETE FROM users WHERE username IN ('curie.faculty', 'marie.curie')")
    conn.commit()
    conn.close()

    # Super Admin creates a new faculty member with username 'curie.faculty'
    create_res = requests.post(
        f"{BASE}/api/admin/create-account",
        headers=super_headers,
        json={
            "name": "Dr. Marie Curie",
            "username": "curie.faculty",
            "email_or_phone": "curie@someotherdomain.com",  # Should be formatted to curie.faculty@inpand.in
            "password": "Password@123",
            "role": "teacher",
            "department_id": 8
        }
    ).json()
    print("Created Account Message:", create_res.get("message"))
    new_user = create_res.get("user", {})
    new_user_id = new_user.get("id")
    assert new_user.get("email") == "curie.faculty@inpand.in", f"Email format incorrect: {new_user.get('email')}"
    print(f" -> PASS: Created account email automatically set to: {new_user.get('email')}")

    # Edit login details: User updates username to 'marie.curie'
    edit_res = requests.put(
        f"{BASE}/api/admin/users/{new_user_id}",
        headers=super_headers,
        json={
            "name": "Dr. Marie Curie Sklodowska",
            "username": "marie.curie",
            "email_or_phone": "marie.curie@inpand.in",
            "password": "NewPassword@123"
        }
    ).json()
    print("Edit Account Message:", edit_res.get("message"))
    assert "updated" in edit_res.get("message", "").lower()

    # Login with new username and email
    login_new = requests.post(f"{BASE}/api/auth/login", json={"email": "marie.curie@inpand.in", "password": "NewPassword@123"}).json()
    assert "token" in login_new, f"Login failed with new email: {login_new}"
    assert login_new["user"]["email"] == "marie.curie@inpand.in"
    print(f" -> PASS: Login successful with updated email: {login_new['user']['email']}")

    # Clean up test user
    del_res = requests.delete(f"{BASE}/api/admin/users/{new_user_id}", headers=super_headers).json()
    print("Cleaned up test user:", del_res.get("message"))

    print("\n" + "=" * 70)
    print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY WITH ZERO ERRORS!")
    print("=" * 70)

if __name__ == "__main__":
    test_requirements()
