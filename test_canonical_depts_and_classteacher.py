import requests
import time

BASE = "http://127.0.0.1:5000"

def test_all():
    print("=== Testing Class Teacher Creating Class Leader & 6 Canonical Departments ===")
    ts = int(time.time())

    # 1. Login as Admin
    adm_login = requests.post(f"{BASE}/api/auth/login", json={"username": "admin1@inpand.com", "password": "Admin@123"}).json()
    assert "token" in adm_login, f"Admin login failed: {adm_login}"
    adm_headers = {"Authorization": f"Bearer {adm_login['token']}"}

    # 2. Check departments -> MUST ONLY BE EXACTLY THE 6 CANONICAL DEPARTMENTS
    depts_res = requests.get(f"{BASE}/api/college/departments", headers=adm_headers).json()
    departments = depts_res.get("departments", [])
    print(f"\n[PART 1] Total Departments: {len(departments)}")
    for d in departments:
        print(f"  - [{d['code']}] {d['name']}")

    expected_codes = {"AERO", "CSE", "MECT", "MECH", "EEE", "ECE"}
    actual_codes = {d["code"] for d in departments}

    assert len(departments) == 6, f"Expected exactly 6 departments, found {len(departments)}"
    assert actual_codes == expected_codes, f"Mismatch in codes! Expected {expected_codes}, got {actual_codes}"
    print(" -> PASS: Only the 6 canonical departments exist: AERO, CSE, MECT, MECH, EEE, ECE! All remaining departments removed.")

    # 3. Login as Class Teacher (Lovelace)
    ct_login = requests.post(f"{BASE}/api/auth/login", json={"username": "lovelace1@inpand.com", "password": "Admin@123"}).json()
    if "token" not in ct_login:
        ct_login = requests.post(f"{BASE}/api/auth/login", json={"username": "classteacher_mct1@inpand.com", "password": "Admin@123"}).json()
    assert "token" in ct_login, f"Class Teacher login failed: {ct_login}"
    ct_headers = {"Authorization": f"Bearer {ct_login['token']}"}
    print(f"\n[PART 2] Class Teacher logged in successfully")

    # 4. Class Teacher creates a Class Leader
    cl_uname = f"leader_ct_{ts % 10000}"
    cse_dept_id = next(d["id"] for d in departments if d["code"] == "CSE")

    cl_res = requests.post(f"{BASE}/api/admin/create-account", headers=ct_headers, json={
        "name": "ClassLeaderCT",
        "email_or_phone": "9876543299",
        "username": cl_uname,
        "password": "Password@123",
        "role": "class_leader",
        "department_id": cse_dept_id
    })
    assert cl_res.status_code == 201, f"Failed to create class leader: {cl_res.text}"
    cl_data = cl_res.json()
    print("Create Class Leader Response:", cl_data)

    assert cl_data["user"]["status"] == "active", f"Expected active status, got {cl_data['user']['status']}"
    assert "pending approval" not in cl_data["message"].lower()
    print(f" -> PASS: Class Teacher created Class Leader '{cl_uname}' with status: ACTIVE (No approval needed)!")

    # 5. Immediate Login by Class Leader
    login_cl = requests.post(f"{BASE}/api/auth/login", json={
        "username": cl_uname,
        "password": "Password@123"
    })
    assert login_cl.status_code == 200, f"Class leader login failed: {login_cl.text}"
    assert login_cl.json().get("user", {}).get("role") == "class_leader"
    print(f" -> PASS: Class Leader '{cl_uname}' logged in successfully immediately!")

    # 6. Verify not in pending students queue
    pending_adm = requests.get(f"{BASE}/api/admin/pending-students", headers=adm_headers).json()["pending_students"]
    pending_names = [p["name"] for p in pending_adm]
    assert "ClassLeaderCT" not in pending_names, "Class Leader should NOT be in pending students queue!"
    print(f" -> PASS: Class Leader is NOT in pending approval queue")

    print("\nALL VERIFICATIONS PASSED 100% SUCCESSFULLY!")

if __name__ == "__main__":
    test_all()
