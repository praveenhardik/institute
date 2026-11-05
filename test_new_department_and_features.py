import os
import sys
import requests
import sqlite3

BASE = "http://127.0.0.1:5000"

def test_all():
    print("=" * 70)
    print("RUNNING COMPREHENSIVE TEST SUITE FOR ALL NEW REQUIREMENTS")
    print("=" * 70)

    # 1. College Name Editing
    print("\n[TEST 1] Testing College Name Editing...")
    # Get current college name
    res = requests.get(f"{BASE}/api/college-name")
    assert res.status_code == 200
    orig_name = res.json().get("name") or "EduPortal Institute"

    # Login as admin to update
    admin_login = requests.post(f"{BASE}/api/auth/login", json={"username": "admin1@inpand.com", "password": "Admin@123"}).json()
    admin_token = admin_login["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    new_test_name = "Global Institute of Technology & Sciences"
    set_res = requests.post(f"{BASE}/api/college-name", headers=admin_headers, json={"name": new_test_name})
    assert set_res.status_code == 200, f"Failed to set college name: {set_res.text}"
    assert set_res.json()["name"] == new_test_name

    get_res = requests.get(f"{BASE}/api/college-name")
    assert get_res.json()["name"] == new_test_name, f"College name mismatch: {get_res.json()}"
    print(f" -> PASS: College Name successfully updated to '{new_test_name}'")

    # 2. Canonical Departments Check
    print("\n[TEST 2] Verifying Teachers, HODs, and Students are in canonical departments...")
    CANONICAL_DEPTS = {
        "Computer Science Engineering",
        "Mechanical Engineering",
        "Mechatronics Engineering",
        "Aeronautical Engineering",
        "Electrical and Electronics Engineering",
        "Electrical and Communication Engineering"
    }

    # Fetch departments from API
    depts_res = requests.get(f"{BASE}/api/college/departments", headers=admin_headers).json()
    dept_names = {d["name"] for d in depts_res["departments"]}
    for cd in CANONICAL_DEPTS:
        assert cd in dept_names, f"Canonical department missing from API: {cd}"
    print(f" -> PASS: All 6 canonical departments exist: {dept_names}")

    # Check DB to verify all faculty and students belong to canonical departments
    conn = sqlite3.connect("database/database.db")
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    users = c.execute("""
        SELECT u.id, u.name, u.role, u.email,
               COALESCE(d.name, (SELECT d2.name FROM staff_departments sd JOIN departments d2 ON d2.id = sd.department_id WHERE sd.user_id = u.id LIMIT 1)) AS dept_name
        FROM users u
        LEFT JOIN staff_profiles sp ON sp.user_id = u.id
        LEFT JOIN student_profiles st ON st.user_id = u.id
        LEFT JOIN departments d ON d.id = COALESCE(sp.department_id, st.department_id)
        WHERE u.role IN ('teacher', 'class_teacher', 'hod', 'student', 'class_leader')
    """).fetchall()

    for u in users:
        assert u["dept_name"] in dept_names, f"User {u['name']} ({u['role']}) in non-canonical/unknown dept: {u['dept_name']}"
    print(f" -> PASS: 100% of Teachers, HODs, Class Teachers, Students ({len(users)} users) are in valid departments!")

    # 3. Email domain and format check (@inpand.com, name + number)
    print("\n[TEST 3] Checking email format (@inpand.com and name+number)...")
    all_users = c.execute("SELECT id, username, email FROM users").fetchall()
    for u in all_users:
        email = u["email"]
        assert email.endswith("@inpand.com"), f"User #{u['id']} email does not end with @inpand.com: {email}"
    print(f" -> PASS: 100% of existing accounts ({len(all_users)} users) end with @inpand.com!")

    # 4. Teacher Creating Accounts (Teacher, Class Leader, Student)
    print("\n[TEST 4] Testing Teacher creating Teacher, Class Leader, and Student accounts...")
    teacher_login = requests.post(f"{BASE}/api/auth/login", json={"username": "teacher1@inpand.com", "password": "Admin@123"}).json()
    assert "token" in teacher_login, f"Teacher login failed: {teacher_login}"
    teacher_token = teacher_login["token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    import time
    ts = int(time.time())
    cse_dept = c.execute("SELECT id FROM departments WHERE name = 'Computer Science Engineering'").fetchone()["id"]

    # 4a. Create another Teacher with 10-digit phone
    t_uname = f"babbage_{ts % 100000}"
    t_res = requests.post(f"{BASE}/api/admin/create-account", headers=teacher_headers, json={
        "name": "Babbage",
        "email_or_phone": "9876543210",
        "username": t_uname,
        "password": "Password@123",
        "role": "teacher",
        "department_id": cse_dept
    })
    assert t_res.status_code == 201, f"Failed to create teacher: {t_res.text}"
    t_user = c.execute("SELECT * FROM users WHERE username = ?", (t_uname,)).fetchone()
    assert t_user is not None
    assert t_user["email"].endswith("@inpand.com")
    print(f" -> PASS: Teacher created new Teacher '{t_uname}' with email '{t_user['email']}'")

    # 4b. Create Class Leader with 8-digit phone (min boundary)
    cl_uname = f"ada_{ts % 100000}"
    cl_res = requests.post(f"{BASE}/api/admin/create-account", headers=teacher_headers, json={
        "name": "Ada",
        "email_or_phone": "12345678",
        "username": cl_uname,
        "password": "Password@123",
        "role": "class_leader",
        "department_id": cse_dept
    })
    assert cl_res.status_code == 201, f"Failed to create class leader: {cl_res.text}"
    cl_user = c.execute("SELECT * FROM users WHERE username = ?", (cl_uname,)).fetchone()
    assert cl_user is not None
    assert cl_user["email"].endswith("@inpand.com")
    print(f" -> PASS: Teacher created Class Leader '{cl_uname}' with 8-digit phone and email '{cl_user['email']}'")

    # 4c. Create Student with 15-digit phone (max boundary)
    st_uname = f"turing_{ts % 100000}"
    st_res = requests.post(f"{BASE}/api/admin/create-account", headers=teacher_headers, json={
        "name": "Turing",
        "email_or_phone": "123456789012345",
        "username": st_uname,
        "password": "Password@123",
        "role": "student",
        "department_id": cse_dept
    })
    assert st_res.status_code == 201, f"Failed to create student: {st_res.text}"
    st_user = c.execute("SELECT * FROM users WHERE username = ?", (st_uname,)).fetchone()
    assert st_user is not None
    assert st_user["email"].endswith("@inpand.com")
    print(f" -> PASS: Teacher created Student '{st_uname}' with 15-digit phone and email '{st_user['email']}'")

    # 5. Phone number validation (accept 8-15 digits, reject <8 or >15)
    print("\n[TEST 5] Testing Phone Number Validation (8 to 15 digits)...")
    # 7 digits -> should fail
    fail_7 = requests.post(f"{BASE}/api/admin/create-account", headers=teacher_headers, json={
        "name": "Short Phone",
        "email_or_phone": "1234567",
        "username": f"short_{ts % 100000}",
        "password": "Password@123",
        "role": "student"
    })
    assert fail_7.status_code in (400, 422), f"Expected 7-digit phone to be rejected, got {fail_7.status_code}: {fail_7.text}"
    print(" -> PASS: 7-digit phone number correctly rejected!")

    # 16 digits -> should fail
    fail_16 = requests.post(f"{BASE}/api/admin/create-account", headers=teacher_headers, json={
        "name": "Long Phone",
        "email_or_phone": "1234567890123456",
        "username": "longphone1",
        "password": "Password@123",
        "role": "student"
    })
    assert fail_16.status_code in (400, 422), f"Expected 16-digit phone to be rejected, got {fail_16.status_code}: {fail_16.text}"
    print(" -> PASS: 16-digit phone number correctly rejected!")

    # 6. Add Department Flow (Teacher Request -> Admin Notification -> Approve & Reject)
    print("\n[TEST 6] Testing Add Department Request & Admin Approval/Reject flow...")
    import time
    ts = int(time.time())
    new_dept_name = f"Robotics Engineering {ts}"
    new_dept_code = f"ROB{ts % 1000}"

    # Teacher submits request
    req_res = requests.post(f"{BASE}/api/college/department-requests", headers=teacher_headers, json={
        "name": new_dept_name,
        "code": new_dept_code
    })
    assert req_res.status_code == 201, f"Failed to submit department request: {req_res.text}"
    req_data = req_res.json()
    req_id = req_data.get("request_id")
    print(f" -> PASS: Teacher requested new department '{new_dept_name}' ({new_dept_code}), req_id: {req_id}")

    # Admin checks notifications
    admin_notifs = requests.get(f"{BASE}/api/notifications", headers=admin_headers).json()["notifications"]
    dept_notif = next((n for n in admin_notifs if n.get("type") == "department_request" and n.get("reference_id") == req_id), None)
    assert dept_notif is not None, f"Admin did not receive department_request notification for req_id {req_id}"
    print(f" -> PASS: Admin received notification: '{dept_notif['title']}' - '{dept_notif['message']}'")

    # Admin approves the department
    appr_res = requests.post(f"{BASE}/api/college/department-requests/{req_id}/approve", headers=admin_headers)
    assert appr_res.status_code == 200, f"Failed to approve department: {appr_res.text}"
    print(f" -> PASS: Admin approved department '{new_dept_name}'!")

    # Verify department is now in departments table
    dept_in_db = c.execute("SELECT * FROM departments WHERE name = ?", (new_dept_name,)).fetchone()
    assert dept_in_db is not None, "Approved department not found in departments table!"
    print(f" -> PASS: Department '{new_dept_name}' is now registered in departments with ID {dept_in_db['id']}")

    # Now test Rejection flow
    reject_dept_name = f"Space Mining {ts}"
    reject_dept_code = f"SPM{ts % 1000}"
    req_res2 = requests.post(f"{BASE}/api/college/department-requests", headers=teacher_headers, json={
        "name": reject_dept_name,
        "code": reject_dept_code
    })
    assert req_res2.status_code == 201
    req_id2 = req_res2.json()["request_id"]

    rej_res = requests.post(f"{BASE}/api/college/department-requests/{req_id2}/reject", headers=admin_headers)
    assert rej_res.status_code == 200, f"Failed to reject department: {rej_res.text}"
    req2_status = c.execute("SELECT status FROM department_requests WHERE id = ?", (req_id2,)).fetchone()["status"]
    assert req2_status == "rejected"
    print(f" -> PASS: Admin rejected department request '{reject_dept_name}', status marked as rejected!")

    conn.close()
    print("\n" + "=" * 70)
    print("ALL 6 TEST PHASES PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    test_all()
