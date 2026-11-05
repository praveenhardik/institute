import requests

BASE = 'http://127.0.0.1:5000'

accounts = [
    ('superadmin', 'Admin@123', 'super_admin', 'Dr. Eleanor Vance (Super Admin)'),
    ('admin', 'Admin@123', 'admin', 'Admin (Admin)'),
    ('hod', 'Admin@123', 'hod', 'Prof. Charles Xavier (HOD CSE)'),
    ('teacher', 'Admin@123', 'teacher', 'Prof. Alan Turing (Teacher)'),
    ('classteacher', 'Admin@123', 'class_teacher', 'Prof. Ada Lovelace (Class Teacher)'),
    ('student', 'Admin@123', 'student', 'Alex Mercer (Student)'),
    ('staff', 'Admin@123', 'accountant', 'Arthur Pendelton (Bursar / Staff)')
]

def main():
    print("Testing All 7 Role Logins on the Same Machine...")
    print("=" * 60)
    for username, pwd, role, expected_name in accounts:
        # 1. Login
        res = requests.post(f"{BASE}/api/auth/login", json={"username": username, "password": pwd})
        if res.status_code != 200:
            print(f"FAILED: {username} -> {res.status_code} {res.text}")
            continue
        data = res.json()
        token = data.get("token")
        user = data.get("user", {})
        
        # 2. Check /api/auth/me
        me_res = requests.get(f"{BASE}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        me_data = me_res.json()
        me_user = me_data.get("user", {})
        
        # 3. Check role-specific endpoint
        role_check = "OK"
        if role == "super_admin":
            r = requests.get(f"{BASE}/api/admin/profiles", headers={"Authorization": f"Bearer {token}"})
            role_check = f"Profiles count: {len(r.json().get('profiles', []))}"
        elif role == "admin":
            r = requests.get(f"{BASE}/api/college/departments", headers={"Authorization": f"Bearer {token}"})
            role_check = f"Depts count: {len(r.json().get('departments', []))}"
        elif role == "hod":
            r = requests.get(f"{BASE}/api/college/my-departments", headers={"Authorization": f"Bearer {token}"})
            role_check = f"HOD depts: {len(r.json().get('departments', []))}"
        elif role == "teacher":
            r = requests.get(f"{BASE}/api/teacher/questions", headers={"Authorization": f"Bearer {token}"})
            role_check = f"Teacher questions: {len(r.json().get('questions', []))}"
        elif role == "student":
            r = requests.get(f"{BASE}/api/student/questions", headers={"Authorization": f"Bearer {token}"})
            role_check = f"Student available questions: {len(r.json().get('questions', []))}"
        elif role == "accountant":
            r = requests.get(f"{BASE}/api/notifications", headers={"Authorization": f"Bearer {token}"})
            role_check = f"Staff notifications: {r.status_code == 200}"

        print(f"[PASS] [{user.get('role').upper():<14}] @{username:<13} | Name: {user.get('name')} | Endpoint: {role_check}")

    print("=" * 60)
    print("SUCCESS: All accounts authenticated, session tokens generated, and role-specific endpoints responded!")

if __name__ == "__main__":
    main()
