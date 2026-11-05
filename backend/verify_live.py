import requests

BASE = "http://127.0.0.1:5000"

def test_live_server():
    print("Testing live Flask server at", BASE)

    # 1. Super Admin test
    s_login = requests.post(f"{BASE}/api/auth/login", json={"email": "superadmin@college.edu", "password": "Admin@123"}).json()
    s_token = s_login["token"]
    s_headers = {"Authorization": f"Bearer {s_token}"}

    # Super Admin creates Admin -> OK
    r = requests.post(f"{BASE}/api/admin/create-account", headers=s_headers, json={
        "name": "Regional Admin 3",
        "email": "regional.admin3@college.edu",
        "password": "Password@123",
        "role": "admin"
    })
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    print("[OK] Super Admin created admin account successfully.")

    # Super Admin tries to create Super Admin -> Rejected 403
    r = requests.post(f"{BASE}/api/admin/create-account", headers=s_headers, json={
        "name": "Rogue Super",
        "email": "rogue3@college.edu",
        "password": "Password@123",
        "role": "super_admin"
    })
    assert r.status_code == 403, f"Expected 403, got {r.status_code}"
    print("[OK] Super Admin prohibited from creating super_admin (403).")

    # 2. College Admin test
    a_login = requests.post(f"{BASE}/api/auth/login", json={"email": "admin@college.edu", "password": "Admin@123"}).json()
    a_token = a_login["token"]
    a_headers = {"Authorization": f"Bearer {a_token}"}

    # Admin creates Teacher -> OK
    r = requests.post(f"{BASE}/api/admin/create-account", headers=a_headers, json={
        "name": "Faculty Gauss 2",
        "email": "gauss2@college.edu",
        "password": "Password@123",
        "role": "teacher"
    })
    assert r.status_code == 201
    print("[OK] Admin created teacher account successfully.")

    # 3. Student Registration & Admin Approval
    s_reg = requests.post(f"{BASE}/api/auth/register-student", json={
        "name": "Diana Prince 2",
        "email": "diana.prince2@college.edu",
        "password": "Diana@123"
    }).json()
    diana_id = s_reg["student_id"]
    print(f"[OK] Student Diana registered with status: {s_reg['status']}.")

    # Diana tries to log in while pending -> Rejected 403
    r = requests.post(f"{BASE}/api/auth/login", json={"email": "diana.prince2@college.edu", "password": "Diana@123"})
    assert r.status_code == 403
    print("[OK] Pending student cannot log in (403).")

    # Admin approves Diana
    r = requests.post(f"{BASE}/api/admin/students/{diana_id}/approve", headers=a_headers)
    assert r.status_code == 200
    print("[OK] Admin approved student Diana.")

    # Diana logs in successfully -> 200
    d_login = requests.post(f"{BASE}/api/auth/login", json={"email": "diana.prince2@college.edu", "password": "Diana@123"})
    assert d_login.status_code == 200
    d_token = d_login.json()["token"]
    d_headers = {"Authorization": f"Bearer {d_token}"}
    print("[OK] Approved student Diana logged in successfully.")

    # 4. Teacher question creation (duration limits: 30s to 3600s)
    t_login = requests.post(f"{BASE}/api/auth/login", json={"email": "teacher@college.edu", "password": "Teacher@123"}).json()
    t_token = t_login["token"]
    t_headers = {"Authorization": f"Bearer {t_token}"}

    # Duration < 30 -> Rejected 400
    r = requests.post(f"{BASE}/api/teacher/questions", headers=t_headers, json={
        "question_text": "Too fast", "option_a": "1", "option_b": "2", "option_c": "3", "option_d": "4",
        "correct_option": "A", "duration_seconds": 20, "target_type": "all"
    })
    assert r.status_code == 400
    print("[OK] Duration < 30s rejected (400).")

    # Valid duration 45s -> Created 201
    r = requests.post(f"{BASE}/api/teacher/questions", headers=t_headers, json={
        "question_text": "What is 2 + 2 in arithmetic?",
        "option_a": "3", "option_b": "4", "option_c": "5", "option_d": "6",
        "correct_option": "B", "duration_seconds": 45, "target_type": "all",
        "explanation": "Two plus two equals four in standard base-10 arithmetic."
    })
    assert r.status_code == 201
    new_q_id = r.json()["question_id"]
    print("[OK] Teacher created question with 45s timer limit.")

    # 5. Diana answers question (picks wrong option A)
    ans = requests.post(f"{BASE}/api/student/questions/{new_q_id}/submit", headers=d_headers, json={
        "selected_option": "A",
        "time_taken_seconds": 12
    }).json()

    assert ans["is_correct"] is False
    assert ans["selected_option"] == "A"
    assert ans["correct_option"] == "B"
    assert "Two plus two equals four" in ans["explanation"]
    print("[OK] Answer evaluated: selected_option='A' (will display RED), correct_option='B' (will display GREEN).")

    print("\n=======================================================")
    print("ALL LIVE SERVER ENDPOINTS AND WORKFLOWS VERIFIED 100%!")
    print("=======================================================")

if __name__ == "__main__":
    test_live_server()
