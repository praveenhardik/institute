import requests
from backend.db import query_one

BASE = "http://127.0.0.1:5000"

def test_all():
    print("=" * 70)
    print("TESTING FULL NAME LOGIN, PERMANENT USER DELETION, AND NOTICE BANNER")
    print("=" * 70)

    # 1. Login with Full Name
    print("\n[TEST 1] Testing login using Full Name...")
    for full_name in ["Eleanor", "Admin", "Xavier", "Alan", "Alex"]:
        res = requests.post(f"{BASE}/api/auth/login", json={"username": full_name, "password": "Admin@123"})
        assert res.status_code == 200, f"Login failed for Full Name '{full_name}': {res.text}"
        user_data = res.json()["user"]
        assert user_data["name"] == full_name, f"Expected name {full_name}, got {user_data['name']}"
        print(f" -> PASS: Successfully logged in with Full Name '{full_name}' (Role: {user_data['role']})")

    # 2. Get Admin & Super Admin tokens
    admin_login = requests.post(f"{BASE}/api/auth/login", json={"username": "Admin", "password": "Admin@123"}).json()
    admin_token = admin_login["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    super_login = requests.post(f"{BASE}/api/auth/login", json={"username": "Eleanor", "password": "Admin@123"}).json()
    super_token = super_login["token"]
    super_headers = {"Authorization": f"Bearer {super_token}"}

    import time
    ts = int(time.time())

    # 3. Create a test student account to delete via Admin
    print("\n[TEST 2] Testing permanent account deletion by College Admin (Admin)...")
    u1_name = f"deltest_{ts % 100000}"
    create_res = requests.post(f"{BASE}/api/admin/create-account", headers=admin_headers, json={
        "name": "TempToDelete",
        "email_or_phone": f"987654{ts % 100000}",
        "username": u1_name,
        "password": "Password@123",
        "role": "student"
    })
    assert create_res.status_code == 201, f"Failed to create test user: {create_res.text}"
    temp_user_id = create_res.json()["user"]["id"]
    print(f" -> Created temporary student account ID #{temp_user_id} ({u1_name})")

    # Delete via Admin
    del_res = requests.delete(f"{BASE}/api/admin/users/{temp_user_id}", headers=admin_headers)
    assert del_res.status_code == 200, f"Admin failed to delete user: {del_res.text}"
    print(f" -> PASS: Admin successfully deleted user #{temp_user_id}: {del_res.json()['message']}")

    # Verify user is completely removed from DB
    check = query_one("SELECT id FROM users WHERE id = ?", (temp_user_id,))
    assert check is None, f"User #{temp_user_id} still exists in users table!"
    sp_check = query_one("SELECT user_id FROM student_profiles WHERE user_id = ?", (temp_user_id,))
    assert sp_check is None, f"User #{temp_user_id} still exists in student_profiles!"
    print(" -> PASS: Verified permanent deletion in database (users and student_profiles rows deleted)")

    # 4. Create another test teacher account to delete via Super Admin
    print("\n[TEST 3] Testing permanent account deletion by Super Admin (Eleanor)...")
    u2_name = f"superdel_{ts % 100000}"
    create_res2 = requests.post(f"{BASE}/api/admin/create-account", headers=super_headers, json={
        "name": "SuperTemp",
        "email_or_phone": f"987655{ts % 100000}",
        "username": u2_name,
        "password": "Password@123",
        "role": "teacher"
    })
    assert create_res2.status_code == 201, f"Failed to create test user 2: {create_res2.text}"
    temp_user_id2 = create_res2.json()["user"]["id"]
    print(f" -> Created temporary teacher account ID #{temp_user_id2}")

    # Delete via Super Admin
    del_res2 = requests.delete(f"{BASE}/api/admin/users/{temp_user_id2}", headers=super_headers)
    assert del_res2.status_code == 200, f"Super Admin failed to delete user: {del_res2.text}"
    print(f" -> PASS: Super Admin successfully deleted user #{temp_user_id2}: {del_res2.json()['message']}")

    check2 = query_one("SELECT id FROM users WHERE id = ?", (temp_user_id2,))
    assert check2 is None, f"User #{temp_user_id2} still exists in users table!"
    print(" -> PASS: Verified permanent deletion in database")

    super_id = super_login["user"]["id"]
    admin_id = admin_login["user"]["id"]

    # 5. Security constraints: Admin cannot delete Super Admin or themselves
    print("\n[TEST 4] Testing security constraints for deletion...")
    # Admin attempting to delete Super Admin
    fail_super = requests.delete(f"{BASE}/api/admin/users/{super_id}", headers=admin_headers)
    assert fail_super.status_code == 403, f"Expected 403 when Admin tries to delete Super Admin, got: {fail_super.status_code}"
    print(" -> PASS: Admin correctly prevented from deleting Super Admin (HTTP 403)")

    # Admin attempting to delete themselves
    fail_self = requests.delete(f"{BASE}/api/admin/users/{admin_id}", headers=admin_headers)
    assert fail_self.status_code == 400, f"Expected 400 when Admin tries to delete own account, got: {fail_self.status_code}"
    print(" -> PASS: Admin correctly prevented from deleting own account (HTTP 400)")

    # 6. Notice Banner data check
    print("\n[TEST 5] Testing Notice Banner notifications API...")
    notifs_res = requests.get(f"{BASE}/api/notifications", headers=admin_headers)
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()["notifications"]
    assert len(notifs) > 0, "No notifications found for banner!"
    latest = notifs[0]
    print(f" -> PASS: Notifications API loaded {len(notifs)} notices for banner. Latest: '{latest['title']}'")

    print("\n" + "=" * 70)
    print("ALL TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    test_all()
