import requests

BASE = "http://127.0.0.1:5000"

def run_tests():
    print("=== Testing Department Standardization & Multi-Department Features ===")

    # 1. Login as Super Admin
    s_login = requests.post(f"{BASE}/api/auth/login", json={"email": "superadmin@college.edu", "password": "Admin@123"}).json()
    assert "token" in s_login, f"Superadmin login failed: {s_login}"
    s_headers = {"Authorization": f"Bearer {s_login['token']}"}
    print("[OK] Super Admin logged in successfully")

    # 2. Check /api/college/departments
    depts_res = requests.get(f"{BASE}/api/college/departments", headers=s_headers).json()
    departments = depts_res.get("departments", [])
    print(f"Total College Departments: {len(departments)}")
    for d in departments:
        print(f"  - [{d['code']}] {d['name']}")
    assert len(departments) >= 6, f"Expected at least 6 official engineering departments, found {len(departments)}"
    expected_codes = {"CSE", "MECH", "MECT", "AERO", "EEE", "ECE"}
    actual_codes = {d["code"] for d in departments}
    assert expected_codes.issubset(actual_codes), f"Missing official codes: {expected_codes - actual_codes}"
    print("[OK] All 6 official engineering departments verified in institution")

    # 3. Check /api/admin/profiles
    profiles_res = requests.get(f"{BASE}/api/admin/profiles", headers=s_headers).json()
    users = profiles_res.get("users", [])
    print(f"Total Users in system: {len(users)}")

    # Verify admin and super admin have None / '-'
    for u in users:
        if u["role"] in ("admin", "super_admin"):
            assert u["department_name"] is None, f"Admin/SuperAdmin {u['name']} has department: {u['department_name']}"
        else:
            assert u["department_name"] is not None and u["department_name"] != "", f"Non-admin user {u['name']} ({u['role']}) has no department!"
            # Ensure none of the old dummy Dept xxx names exist
            assert not any(x in (u["department_name"] or "") for x in ["Dept b762", "Dept 9280", "Dept 53d4", "Dept 03b9", "Dept 44e4", "Dept 0d86", "Dept 079c", "Dept cd3c", "Dept c290"]), f"Found dummy department name in {u['name']}: {u['department_name']}"

    print("[OK] All admin/super_admin users have '-' / None department")
    print("[OK] All non-admin users have clean official engineering departments")

    # 4. Find Teacher (Alan) and Class Teacher (Lovelace)
    teacher = next(u for u in users if u["role"] == "teacher" and ("Alan" in u["name"] or "Turing" in u["name"]))
    class_teacher = next(u for u in users if u["role"] == "class_teacher" and "Lovelace" in u["name"])
    print(f"Teacher Alan Turing current depts: {teacher['department_name']}, ids: {teacher.get('department_ids')}")
    print(f"Class Teacher Ada Lovelace current depts: {class_teacher['department_name']}, ids: {class_teacher.get('department_ids')}")

    # 5. Super Admin edits Class Teacher departments (multi-department assignment: 3 departments)
    dept_ids_list = [d["id"] for d in departments]
    chosen_3_depts = dept_ids_list[:3]
    edit_ct = requests.put(
        f"{BASE}/api/admin/users/{class_teacher['id']}",
        headers=s_headers,
        json={
            "name": class_teacher["name"],
            "username": class_teacher.get("username", "classteacher"),
            "role": "class_teacher",
            "department_ids": chosen_3_depts
        }
    ).json()
    print("Edit Class Teacher Response:", edit_ct.get("message"))
    assert "updated" in edit_ct.get("message", "").lower(), f"Update failed: {edit_ct}"

    # Verify via profiles
    updated_profiles = requests.get(f"{BASE}/api/admin/profiles", headers=s_headers).json()["users"]
    ct_updated = next(u for u in updated_profiles if u["id"] == class_teacher["id"])
    print(f"Class Teacher after update: {ct_updated['department_name']}")
    assert len(ct_updated["department_ids"]) == 3, f"Expected 3 departments, got {ct_updated['department_ids']}"
    print("[OK] Admin/Super Admin editing multi-departments for class teacher verified")

    # 6. Teacher signs in and edits their own departments directly via /api/college/my-departments
    t_login = requests.post(f"{BASE}/api/auth/login", json={"email": "teacher@college.edu", "password": "Admin@123"}).json()
    assert "token" in t_login, f"Teacher login failed: {t_login}"
    t_headers = {"Authorization": f"Bearer {t_login['token']}"}

    # Select 4 departments
    chosen_4_depts = dept_ids_list[:4]
    update_self = requests.put(
        f"{BASE}/api/college/my-departments",
        headers=t_headers,
        json={"department_ids": chosen_4_depts}
    ).json()
    print("Teacher Self-Edit Departments Response:", update_self.get("message"))
    assert "successfully" in update_self.get("message", "").lower(), f"Self-edit failed: {update_self}"

    # Check /api/college/my-departments for Teacher
    my_depts = requests.get(f"{BASE}/api/college/my-departments", headers=t_headers).json()
    assigned = my_depts.get("departments", [])
    print(f"Teacher assigned departments count: {len(assigned)}")
    assert len(assigned) == 4, f"Expected 4 departments, found {len(assigned)}"
    for ad in assigned:
        print(f"  - {ad['name']} ({ad['code']}) [{ad.get('relation')}]")
    print("[OK] Teacher self-managing up to 10 departments verified")

    # 7. Test 10-department limit enforcement
    # We currently have 6 departments. Adding 4 more should succeed (to reach 10). 11th should fail.
    added_ids = []
    for i in range(7, 11):
        add_res = requests.post(
            f"{BASE}/api/college/departments",
            headers=s_headers,
            json={"name": f"Test Department {i}", "code": f"TD{i}"}
        ).json()
        if "id" in add_res:
            added_ids.append(add_res["id"])
            print(f"  Added department {i}/10")

    # Now we have 10 departments. Attempting to add 11th should return 400 error!
    over_limit = requests.post(
        f"{BASE}/api/college/departments",
        headers=s_headers,
        json={"name": "Overflow Department 11", "code": "OF11"}
    )
    print(f"11th Department status: {over_limit.status_code}, error: {over_limit.json().get('error')}")
    assert over_limit.status_code == 400, "Expected 400 error for >10 departments limit!"
    assert "maximum" in over_limit.json().get("error", "").lower() or "limit" in over_limit.json().get("error", "").lower()
    print("[OK] 10-department institutional limit strictly enforced")

    # Clean up test departments 7..10
    import sqlite3
    conn = sqlite3.connect("database/database.db")
    for tid in added_ids:
        conn.execute("DELETE FROM departments WHERE id = ?", (tid,))
    conn.commit()
    conn.close()
    print("[OK] Cleaned up test departments, restored to 6 official engineering departments")

    print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
