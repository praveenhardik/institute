import requests

BASE = "http://127.0.0.1:5000"

def test_edit_multi_department():
    print("=== Testing Edit User Multi-Department Update for Class Leader & Students ===")

    # 1. Login as Admin
    adm_login = requests.post(f"{BASE}/api/auth/login", json={"username": "admin1@inpand.com", "password": "Admin@123"}).json()
    assert "token" in adm_login, f"Admin login failed: {adm_login}"
    headers = {"Authorization": f"Bearer {adm_login['token']}"}

    # 2. Get departments
    depts = requests.get(f"{BASE}/api/college/departments", headers=headers).json()["departments"]
    dept_map = {d["code"]: d["id"] for d in depts}
    print("Available canonical departments:", dept_map)
    assert len(depts) == 6, f"Expected 6 departments, found {len(depts)}"

    # 3. Get profiles and find a Class Leader (e.g. TeacherLeader or any class_leader)
    profiles = requests.get(f"{BASE}/api/admin/profiles", headers=headers).json()["users"]
    class_leader = next((u for u in profiles if u["role"] == "class_leader"), None)
    assert class_leader is not None, "No class leader found!"
    print(f"Found Class Leader: {class_leader['name']} (ID: {class_leader['id']})")
    print(f"Current departments: {class_leader.get('department_name')}, IDs: {class_leader.get('department_ids')}")

    # 4. Assign multiple departments to this Class Leader (e.g. AERO and MECT and CSE)
    target_dept_ids = [dept_map["AERO"], dept_map["MECT"], dept_map["CSE"]]
    update_res = requests.put(
        f"{BASE}/api/admin/users/{class_leader['id']}",
        headers=headers,
        json={
            "name": class_leader["name"],
            "username": class_leader["username"],
            "department_ids": target_dept_ids
        }
    )
    assert update_res.status_code == 200, f"Update failed: {update_res.text}"
    print("Update response:", update_res.json()["message"])

    # 5. Verify the updated Class Leader profile
    profiles_after = requests.get(f"{BASE}/api/admin/profiles", headers=headers).json()["users"]
    updated_cl = next(u for u in profiles_after if u["id"] == class_leader["id"])
    print(f"Updated Class Leader department_name: {updated_cl['department_name']}")
    print(f"Updated Class Leader department_ids: {updated_cl['department_ids']}")

    assert set(updated_cl["department_ids"]) == set(target_dept_ids), f"Expected {target_dept_ids}, got {updated_cl['department_ids']}"
    assert "Aeronautical Engineering" in updated_cl["department_name"]
    assert "Mechatronics Engineering" in updated_cl["department_name"]
    assert "Computer Science Engineering" in updated_cl["department_name"]
    print(" -> PASS: Class Leader successfully assigned multiple departments!")

    # 6. Test updating with 1 department, and adding/removing departments
    new_dept_ids = [dept_map["MECH"], dept_map["EEE"]]
    update_res2 = requests.put(
        f"{BASE}/api/admin/users/{class_leader['id']}",
        headers=headers,
        json={
            "name": class_leader["name"],
            "username": class_leader["username"],
            "department_ids": new_dept_ids
        }
    )
    assert update_res2.status_code == 200
    profiles_after2 = requests.get(f"{BASE}/api/admin/profiles", headers=headers).json()["users"]
    updated_cl2 = next(u for u in profiles_after2 if u["id"] == class_leader["id"])
    assert set(updated_cl2["department_ids"]) == set(new_dept_ids)
    print(" -> PASS: Multiple department re-assignment verified!")

    print("\nALL MULTI-DEPARTMENT EDIT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_edit_multi_department()
