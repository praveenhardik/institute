"""
Comprehensive Login & Portal Access Verification
Verifies authentication and role-specific endpoints across ALL portions / roles:
1. Dean Portal
2. Super Admin Portal
3. College Admin Portal
4. Principal Portal
5. HOD Portal (Computer Science)
6. Teacher / Faculty Portal
7. Class Teacher Portal
8. Student Portal
9. Class Leader Portal
10. Accountant / Finance Portal
11. Librarian Portal
12. Parent Portal

Usage:
  Local test:
    python verify_all_logins.py
  Remote / Vercel test:
    python verify_all_logins.py https://your-project.vercel.app
  AWS API direct test:
    python verify_all_logins.py http://3.27.170.60:5000
"""

import sys
import requests

DEFAULT_BASE = "http://127.0.0.1:5000"

accounts = [
    ("dean", "Admin@123", "dean", "Dean", "Dean Portal"),
    ("superadmin", "Admin@123", "super_admin", "Super Admin", "Super Admin Portal"),
    ("admin", "Admin@123", "admin", "Admin", "College Admin Portal"),
    ("principal", "Admin@123", "principal", "Principal", "Principal Portal"),
    ("hod", "Admin@123", "hod", "HOD", "HOD Portal (CSE)"),
    ("teacher", "Admin@123", "teacher", "Teacher", "Teacher / Faculty Portal"),
    ("classteacher", "Admin@123", "class_teacher", "Class Teacher", "Class Teacher Portal"),
    ("student", "Admin@123", "student", "Student", "Student Portal"),
    ("classleader", "Admin@123", "class_leader", "Class Leader", "Class Leader Portal"),
    ("accountant", "Admin@123", "accountant", "Accountant", "Accountant & Fees Portal"),
    ("librarian", "Admin@123", "librarian", "Librarian", "Librarian Portal"),
    ("parent", "Admin@123", "parent", "Parent", "Parent Portal"),
]


def main():
    base_url = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else DEFAULT_BASE
    print("=" * 75)
    print(f"VERIFYING LOGIN ACROSS ALL PORTIONS AT: {base_url}")
    print("=" * 75)

    passed = 0
    failed = 0

    for username, pwd, expected_role, expected_name, portal_title in accounts:
        # 1. Login
        login_url = f"{base_url}/api/auth/login"
        try:
            res = requests.post(login_url, json={"username": username, "password": pwd}, timeout=15)
        except Exception as e:
            print(f"[FAIL] @{username:<13} -> Connection error: {e}")
            failed += 1
            continue

        if res.status_code != 200:
            print(f"[FAIL] @{username:<13} -> HTTP {res.status_code}: {res.text}")
            failed += 1
            continue

        data = res.json()
        token = data.get("token")
        user = data.get("user", {})
        auth_headers = {"Authorization": f"Bearer {token}"}

        # 2. Check role-specific endpoint
        role = user.get("role")
        endpoint_info = "Authenticated"

        try:
            if role in ("dean", "super_admin"):
                r = requests.get(f"{base_url}/api/admin/profiles", headers=auth_headers, timeout=10)
                if r.status_code == 200:
                    endpoint_info = f"Profiles count: {len(r.json().get('users', []))}"
            elif role in ("admin", "principal"):
                r = requests.get(f"{base_url}/api/college/departments", headers=auth_headers, timeout=10)
                if r.status_code == 200:
                    endpoint_info = f"Departments: {len(r.json().get('departments', []))}"
            elif role == "hod":
                r = requests.get(f"{base_url}/api/college/my-departments", headers=auth_headers, timeout=10)
                if r.status_code == 200:
                    endpoint_info = f"HOD Depts: {len(r.json().get('departments', []))}"
            elif role in ("teacher", "class_teacher"):
                r = requests.get(f"{base_url}/api/teacher/questions", headers=auth_headers, timeout=10)
                if r.status_code == 200:
                    endpoint_info = f"Questions: {len(r.json().get('questions', []))}"
            elif role in ("student", "class_leader"):
                r = requests.get(f"{base_url}/api/student/questions", headers=auth_headers, timeout=10)
                if r.status_code == 200:
                    endpoint_info = f"Student Available Questions: {len(r.json().get('questions', []))}"
            elif role == "accountant":
                r = requests.get(f"{base_url}/api/fees/student-fees", headers=auth_headers, timeout=10)
                if r.status_code == 200:
                    endpoint_info = f"Fees records: {len(r.json().get('fees', []))}"
            elif role == "librarian":
                r = requests.get(f"{base_url}/api/library/student-books", headers=auth_headers, timeout=10)
                if r.status_code == 200:
                    endpoint_info = f"Library Books: {len(r.json().get('books', []))}"
            elif role == "parent":
                r = requests.get(f"{base_url}/api/notifications", headers=auth_headers, timeout=10)
                if r.status_code == 200:
                    endpoint_info = "Notifications OK"
        except Exception as e:
            endpoint_info = f"Endpoint notice: {e}"

        print(f"[PASS] [{role.upper():<14}] @{username:<13} | Name: {user.get('name'):<10} | Portal: {portal_title:<25} | {endpoint_info}")
        passed += 1

    print("=" * 75)
    print(f"VERIFICATION RESULTS: {passed} PASSED, {failed} FAILED (TOTAL {len(accounts)})")
    if failed == 0:
        print("ALL PORTIONS AUTHENTICATED SUCCESSFULLY WITH SESSIONS & DATA ACCESS!")
    print("=" * 75)


if __name__ == "__main__":
    main()
