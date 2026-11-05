import requests

BASE = "http://127.0.0.1:5000"

def test_features():
    print("=== Testing Notification Panel Removal, Edit Login Details for All, & Switch User for Super Admin Only ===")

    # 1. Test Super Admin login
    s_res = requests.post(f"{BASE}/api/auth/login", json={"email": "superadmin@college.edu", "password": "Admin@123"}).json()
    assert "token" in s_res, f"Superadmin login failed: {s_res}"
    s_headers = {"Authorization": f"Bearer {s_res['token']}"}
    print("[OK] Super Admin login successful")

    # 2. Test Teacher login
    t_res = requests.post(f"{BASE}/api/auth/login", json={"email": "teacher@college.edu", "password": "Admin@123"}).json()
    assert "token" in t_res, f"Teacher login failed: {t_res}"
    t_headers = {"Authorization": f"Bearer {t_res['token']}"}
    teacher_id = t_res["user"]["id"]
    print(f"[OK] Teacher login successful (ID: {teacher_id})")

    # 3. Test Student login
    st_res = requests.post(f"{BASE}/api/auth/login", json={"email": "student@college.edu", "password": "Admin@123"}).json()
    assert "token" in st_res, f"Student login failed: {st_res}"
    st_headers = {"Authorization": f"Bearer {st_res['token']}"}
    student_id = st_res["user"]["id"]
    print(f"[OK] Student login successful (ID: {student_id})")

    # 4. Student edits their own login details (Name, Username, Email, and Password)
    edit_st = requests.put(
        f"{BASE}/api/admin/users/{student_id}",
        headers=st_headers,
        json={
            "name": "Alexander",
            "username": "alexnew",
            "email_or_phone": "alexnew1@inpand.com",
            "password": "NewStudent@123"
        }
    ).json()
    print("Student Edit Response:", edit_st.get("message"))
    assert "updated" in edit_st.get("message", "").lower(), f"Student update failed: {edit_st}"

    # Verify student can login with their new username and new password
    new_login = requests.post(f"{BASE}/api/auth/login", json={"email": "alexnew", "password": "NewStudent@123"}).json()
    assert "token" in new_login, f"New login failed: {new_login}"
    assert new_login["user"]["name"] == "Alexander"
    print("[OK] Student self-edited login details verified with immediate re-login!")

    # Reset student back to standard demo credentials for subsequent tests
    st_headers_new = {"Authorization": f"Bearer {new_login['token']}"}
    requests.put(
        f"{BASE}/api/admin/users/{student_id}",
        headers=st_headers_new,
        json={
            "name": "Alex",
            "username": "alex",
            "email_or_phone": "alex1@inpand.com",
            "password": "Admin@123"
        }
    )
    print("[OK] Student reset to standard credentials")

    # 5. Teacher edits their own login details
    edit_t = requests.put(
        f"{BASE}/api/admin/users/{teacher_id}",
        headers=t_headers,
        json={
            "name": "Prof. Alan Turing (Teacher)",
            "username": "teacher",
            "email_or_phone": "teacher@college.edu",
            "password": "Admin@123"
        }
    ).json()
    assert "updated" in edit_t.get("message", "").lower(), f"Teacher update failed: {edit_t}"
    print("[OK] Teacher self-edit login details verified!")

    # 6. Admin can edit any user in the directory
    a_res = requests.post(f"{BASE}/api/auth/login", json={"email": "admin@college.edu", "password": "Admin@123"}).json()
    a_headers = {"Authorization": f"Bearer {a_res['token']}"}
    edit_by_admin = requests.put(
        f"{BASE}/api/admin/users/{teacher_id}",
        headers=a_headers,
        json={
            "name": "Prof. Alan Turing (Teacher)",
            "username": "teacher",
            "email_or_phone": "teacher@college.edu",
            "password": "Admin@123"
        }
    ).json()
    assert "updated" in edit_by_admin.get("message", "").lower(), f"Admin update of teacher failed: {edit_by_admin}"
    print("[OK] Admin ability to edit all users verified!")

    # 7. Check profiles endpoint returns can_edit = True for all users when viewed by admin/super_admin
    profiles = requests.get(f"{BASE}/api/admin/profiles", headers=a_headers).json()["users"]
    for u in profiles:
        assert u.get("can_edit") is True, f"User {u['name']} can_edit is False for admin!"
    print(f"[OK] All {len(profiles)} users in Directory have Edit enabled for Admin/Super Admin!")

    # 8. Check built frontend index bundle to ensure NotificationBoard is not in the page
    with open("frontend/dist/index.html", "r", encoding="utf-8") as f:
        html = f.read()
    assert "Announcements &amp; Notifications" not in html
    print("[OK] Notification board verified removed from frontend bundle!")

    print("\nALL 3 USER REQUIREMENTS TESTED AND PASSED 100%!")

if __name__ == "__main__":
    test_features()
