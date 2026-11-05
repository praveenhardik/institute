import requests
import time

BASE = "http://127.0.0.1:5000"

def test_class_leader_no_approval():
    print("=== Testing Class Leader Creation without Approval ===")
    ts = int(time.time())

    # 1. Super Admin login
    sa_login = requests.post(f"{BASE}/api/auth/login", json={"email": "superadmin@college.edu", "password": "Admin@123"}).json()
    assert "token" in sa_login, f"SuperAdmin login failed: {sa_login}"
    sa_headers = {"Authorization": f"Bearer {sa_login['token']}"}

    # 2. Admin login
    adm_login = requests.post(f"{BASE}/api/auth/login", json={"email": "admin1@inpand.com", "password": "Admin@123"}).json()
    assert "token" in adm_login, f"Admin login failed: {adm_login}"
    adm_headers = {"Authorization": f"Bearer {adm_login['token']}"}

    # 3. Teacher login
    teacher_login = requests.post(f"{BASE}/api/auth/login", json={"username": "teacher1@inpand.com", "password": "Admin@123"}).json()
    assert "token" in teacher_login, f"Teacher login failed: {teacher_login}"
    teacher_headers = {"Authorization": f"Bearer {teacher_login['token']}"}

    # Get a department ID
    depts = requests.get(f"{BASE}/api/college/departments", headers=adm_headers).json()["departments"]
    dept_id = depts[0]["id"]

    # Test A: Super Admin creates Class Leader -> must be active immediately
    cl_sa_name = f"cl_sa_{ts % 10000}"
    res_sa = requests.post(f"{BASE}/api/admin/create-account", headers=sa_headers, json={
        "name": "SuperLeader",
        "email_or_phone": "9876543210",
        "username": cl_sa_name,
        "password": "Password@123",
        "role": "class_leader",
        "department_id": dept_id
    })
    assert res_sa.status_code == 201, f"SuperAdmin create CL failed: {res_sa.text}"
    data_sa = res_sa.json()
    assert data_sa["user"]["status"] == "active", f"Expected active but got {data_sa['user']['status']}"
    assert "pending approval" not in data_sa["message"].lower()
    print(f" -> PASS: Super Admin created Class Leader '{cl_sa_name}' (Status: {data_sa['user']['status']})")

    # Test B: Admin creates Class Leader -> must be active immediately
    cl_adm_name = f"cl_adm_{ts % 10000}"
    res_adm = requests.post(f"{BASE}/api/admin/create-account", headers=adm_headers, json={
        "name": "AdminLeader",
        "email_or_phone": "9876543211",
        "username": cl_adm_name,
        "password": "Password@123",
        "role": "class_leader",
        "department_id": dept_id
    })
    assert res_adm.status_code == 201, f"Admin create CL failed: {res_adm.text}"
    data_adm = res_adm.json()
    assert data_adm["user"]["status"] == "active", f"Expected active but got {data_adm['user']['status']}"
    assert "pending approval" not in data_adm["message"].lower()
    print(f" -> PASS: Admin created Class Leader '{cl_adm_name}' (Status: {data_adm['user']['status']})")

    # Test C: Teacher creates Class Leader -> must be active immediately (NO APPROVAL NEEDED!)
    cl_t_name = f"cl_tea_{ts % 10000}"
    res_t = requests.post(f"{BASE}/api/admin/create-account", headers=teacher_headers, json={
        "name": "TeacherLeader",
        "email_or_phone": "9876543212",
        "username": cl_t_name,
        "password": "Password@123",
        "role": "class_leader",
        "department_id": dept_id
    })
    assert res_t.status_code == 201, f"Teacher create CL failed: {res_t.text}"
    data_t = res_t.json()
    assert data_t["user"]["status"] == "active", f"Expected active but got {data_t['user']['status']}"
    assert "pending approval" not in data_t["message"].lower(), f"Unexpected pending message: {data_t['message']}"
    assert "created successfully" in data_t["message"].lower()
    print(f" -> PASS: Teacher created Class Leader '{cl_t_name}' (Status: {data_t['user']['status']}, Message: {data_t['message']})")

    # Test D: Verify the Teacher-created Class Leader can log in immediately
    login_cl = requests.post(f"{BASE}/api/auth/login", json={
        "username": cl_t_name,
        "password": "Password@123"
    })
    assert login_cl.status_code == 200, f"Class leader immediate login failed: {login_cl.text}"
    assert login_cl.json().get("user", {}).get("role") == "class_leader"
    print(f" -> PASS: Class Leader '{cl_t_name}' logged in successfully immediately without approval!")

    # Test E: Check pending approvals list for Admin and Teacher -> should NOT contain cl_t_name
    pending_adm = requests.get(f"{BASE}/api/admin/pending-students", headers=adm_headers).json()["pending_students"]
    pending_tea = requests.get(f"{BASE}/api/admin/pending-students", headers=teacher_headers).json()["pending_students"]
    all_pending_names = [p["name"] for p in pending_adm + pending_tea]
    assert "TeacherLeader" not in all_pending_names, "TeacherLeader should not be in pending approvals!"
    print(" -> PASS: Class Leader is not present in pending approvals queue!")

    print("\nALL CLASS LEADER CREATION & INSTANT ACTIVATION TESTS PASSED 100%!")

if __name__ == "__main__":
    test_class_leader_no_approval()
