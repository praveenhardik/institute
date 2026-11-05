import sys
from backend.app import create_app
from backend.db import execute_write

def test_dean():
    print("==================================================")
    print("Testing DEAN Role, Monitoring & Account Creation Constraints")
    print("==================================================")

    app = create_app()
    client = app.test_client()

    # 1. Test Dean Login
    res = client.post('/api/auth/login', json={'username': 'dean', 'password': 'Admin@123'})
    assert res.status_code == 200, f"Dean login failed: {res.status_code} {res.get_json()}"
    login_data = res.get_json()
    token = login_data['token']
    user = login_data['user']
    assert user['role'] == 'dean', f"Expected role 'dean', got '{user['role']}'"
    assert user['status'] == 'active', f"Expected status 'active', got '{user['status']}'"
    print(f"[PASS] Dean login successful: {user['name']} (@{user.get('username')}) - Role: {user['role']}")

    headers = {'Authorization': f'Bearer {token}'}

    # 2. Test Dean Super Admin Monitor Endpoint
    mon_res = client.get('/api/admin/dean/super-admin-monitor', headers=headers)
    assert mon_res.status_code == 200, f"Monitor endpoint failed: {mon_res.status_code} {mon_res.get_json()}"
    mon_data = mon_res.get_json()
    assert 'super_admins' in mon_data, "Missing 'super_admins' in monitor response"
    assert 'created_by_super_admins' in mon_data, "Missing 'created_by_super_admins' in monitor response"
    assert 'system_stats' in mon_data, "Missing 'system_stats' in monitor response"
    print(f"[PASS] Dean Super Admin Monitor responded with {len(mon_data['super_admins'])} Super Admins and {len(mon_data['created_by_super_admins'])} created accounts")

    # 3. Test Dean Profiles Directory access
    prof_res = client.get('/api/admin/profiles', headers=headers)
    assert prof_res.status_code == 200, f"Profiles endpoint failed: {prof_res.status_code} {prof_res.get_json()}"
    prof_data = prof_res.get_json()
    print(f"[PASS] Dean directory access verified with {len(prof_data.get('users', []))} profiles")

    # 4. Strict Constraint: Dean CANNOT create Admin account
    ar = client.post('/api/admin/create-account', headers=headers, json={
        'name': 'TestAdminBlocked',
        'email_or_phone': 'testadminblocked1@inpand.com',
        'password': 'Password@123',
        'role': 'admin'
    })
    assert ar.status_code == 403, f"Expected 403 when creating admin, got {ar.status_code}: {ar.get_json()}"
    print(f"[PASS] Dean blocked from creating Admin account: {ar.get_json()['error']}")

    # 5. Strict Constraint: Dean CANNOT create Teacher account
    tr = client.post('/api/admin/create-account', headers=headers, json={
        'name': 'TestTeacherBlocked',
        'email_or_phone': 'testteacherblocked1@inpand.com',
        'password': 'Password@123',
        'role': 'teacher'
    })
    assert tr.status_code == 403, f"Expected 403 when creating teacher, got {tr.status_code}: {tr.get_json()}"
    print(f"[PASS] Dean blocked from creating Teacher account: {tr.get_json()['error']}")

    # 6. Strict Constraint: Dean CANNOT create Student account
    sr = client.post('/api/admin/create-account', headers=headers, json={
        'name': 'TestStudentBlocked',
        'email_or_phone': 'teststudentblocked1@inpand.com',
        'password': 'Password@123',
        'role': 'student'
    })
    assert sr.status_code == 403, f"Expected 403 when creating student, got {sr.status_code}: {sr.get_json()}"
    print(f"[PASS] Dean blocked from creating Student account: {sr.get_json()['error']}")

    # 7. Strict Constraint: Dean CANNOT create HOD account
    hr = client.post('/api/admin/create-account', headers=headers, json={
        'name': 'TestHodBlocked',
        'email_or_phone': 'testhodblocked1@inpand.com',
        'password': 'Password@123',
        'role': 'hod'
    })
    assert hr.status_code == 403, f"Expected 403 when creating hod, got {hr.status_code}: {hr.get_json()}"
    print(f"[PASS] Dean blocked from creating HOD account: {hr.get_json()['error']}")

    # 8. Allowed: Dean CAN create Super Admin account
    import random
    code = random.randint(10000, 99999)
    sa_name = f"VanceSuper{code}"
    sa_email = f"vancesuper{code}1@inpand.com"
    sa_user = f"vance_{code}"

    create_sa_res = client.post('/api/admin/create-account', headers=headers, json={
        'name': sa_name,
        'email_or_phone': sa_email,
        'username': sa_user,
        'password': 'SuperPassword@123',
        'role': 'super_admin'
    })
    assert create_sa_res.status_code in (200, 201), f"Creating super_admin failed: {create_sa_res.status_code} {create_sa_res.get_json()}"
    print(f"[PASS] Dean successfully created Super Admin: {sa_name} (@{sa_user})")

    # 9. Verify the new Super Admin can log in immediately
    sa_login = client.post('/api/auth/login', json={'username': sa_user, 'password': 'SuperPassword@123'})
    assert sa_login.status_code == 200, f"New super admin login failed: {sa_login.status_code} {sa_login.get_json()}"
    new_sa = sa_login.get_json()['user']
    assert new_sa['role'] == 'super_admin'
    assert new_sa['status'] == 'active'
    print(f"[PASS] Newly created Super Admin authenticated successfully with active status")

    # 10. Verify new Super Admin is visible in Dean's monitor
    mon_res2 = client.get('/api/admin/dean/super-admin-monitor', headers=headers)
    sa_list = mon_res2.get_json()['super_admins']
    found = any(s['name'] == sa_name for s in sa_list)
    assert found, f"New Super Admin {sa_name} not found in Dean's monitor list"
    print(f"[PASS] New Super Admin successfully visible in Dean's live monitoring table")

    # 11. Test Dean editing the institute name
    cur_c_res = client.get('/api/college-name')
    orig_college_name = cur_c_res.get_json().get('name') or 'Apex Institute of Technology'
    test_college_name = "Imperial Tech University"

    update_c_res = client.post('/api/college-name', headers=headers, json={'name': test_college_name})
    assert update_c_res.status_code in (200, 201), f"Dean updating institute name failed: {update_c_res.get_json()}"
    assert update_c_res.get_json().get('name') == test_college_name

    verify_c_res = client.get('/api/college-name')
    assert verify_c_res.get_json().get('name') == test_college_name
    print(f"[PASS] Dean successfully edited Institute Name to: '{test_college_name}'")

    # Restore institute name
    client.post('/api/college-name', headers=headers, json={'name': orig_college_name})
    print(f"[PASS] Restored Institute Name to: '{orig_college_name}'")

    # Cleanup test account
    execute_write("DELETE FROM users WHERE name = ?", (sa_name,))
    print("[PASS] Test account cleaned up")

    print("==================================================")
    print("ALL DEAN REQUIREMENTS VERIFIED SUCCESSFULLY (100% PASS)!")
    print("==================================================")

if __name__ == "__main__":
    test_dean()
