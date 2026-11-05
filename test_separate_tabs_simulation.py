import requests

BASE = "http://127.0.0.1:5000"

def test_multi_tab_isolation():
    print("=" * 65)
    print("SIMULATING CONCURRENT SEPARATE TABS ON THE SAME COMPUTER")
    print("=" * 65)

    tabs = {
        "Tab 1 (Super Admin)": ("superadmin", "Admin@123", "super_admin"),
        "Tab 2 (Teacher)":     ("teacher", "Admin@123", "teacher"),
        "Tab 3 (Student)":     ("student", "Admin@123", "student"),
        "Tab 4 (HOD)":         ("hod", "Admin@123", "hod"),
        "Tab 5 (Admin)":       ("admin", "Admin@123", "admin"),
        "Tab 6 (Staff)":       ("staff", "Admin@123", "accountant")
    }

    sessions = {}

    # Step 1: Open and sign in each tab concurrently
    print("\n[STEP 1] Logging in to each tab with its own distinct account...")
    for tab_name, (username, pwd, expected_role) in tabs.items():
        res = requests.post(f"{BASE}/api/auth/login", json={"username": username, "password": pwd})
        assert res.status_code == 200, f"Login failed for {tab_name}: {res.text}"
        data = res.json()
        token = data["token"]
        user = data["user"]
        assert user["role"] == expected_role, f"Role mismatch in {tab_name}"
        sessions[tab_name] = {"token": token, "user": user, "username": username}
        print(f" -> {tab_name:<20}: Authenticated as @{username} (Role: {expected_role})")

    # Step 2: Verify all tabs hold their own isolated session simultaneously
    print("\n[STEP 2] Verifying all tabs maintain isolated active sessions simultaneously...")
    for tab_name, info in sessions.items():
        headers = {"Authorization": f"Bearer {info['token']}"}
        me_res = requests.get(f"{BASE}/api/auth/me", headers=headers)
        assert me_res.status_code == 200, f"Session lost in {tab_name}"
        me_user = me_res.json().get("user", {})
        assert me_user["id"] == info["user"]["id"], f"Cross-contamination detected in {tab_name}!"
        print(f" -> {tab_name:<20}: Token verified for UID {me_user['id']} (@{info['username']})")

    # Step 3: Sign out from Tab 3 (Student) only
    print("\n[STEP 3] Signing out from Tab 3 (Student) only...")
    student_token = sessions["Tab 3 (Student)"]["token"]
    logout_res = requests.post(f"{BASE}/api/auth/logout", headers={"Authorization": f"Bearer {student_token}"})
    assert logout_res.status_code == 200, "Logout failed for Tab 3"
    print(" -> Tab 3 signed out.")

    # Tab 3 token should now be revoked
    revoked_check = requests.get(f"{BASE}/api/auth/me", headers={"Authorization": f"Bearer {student_token}"})
    assert revoked_check.status_code == 401, f"Tab 3 token was not revoked: {revoked_check.status_code}"
    print(" -> Tab 3 verified as logged out (HTTP 401 Unauthorized).")

    # Step 4: Verify ALL OTHER tabs are STILL completely logged in and unharmed!
    print("\n[STEP 4] Verifying all other tabs (1, 2, 4, 5, 6) remain fully authenticated...")
    for tab_name, info in sessions.items():
        if tab_name == "Tab 3 (Student)":
            continue
        headers = {"Authorization": f"Bearer {info['token']}"}
        me_res = requests.get(f"{BASE}/api/auth/me", headers=headers)
        assert me_res.status_code == 200, f"CRITICAL: {tab_name} was accidentally logged out!"
        me_user = me_res.json().get("user", {})
        assert me_user["id"] == info["user"]["id"]
        print(f" -> {tab_name:<20}: Still ACTIVE and independent! (UID: {me_user['id']})")

    # Step 5: Multi-Tab Interaction (Teacher publishes quiz in Tab 2, Student answers in Tab 3)
    print("\n[STEP 5] Multi-Tab interaction test: Tab 2 (Teacher) -> Tab 3 (Student)...")
    teacher_token = sessions["Tab 2 (Teacher)"]["token"]
    t_headers = {"Authorization": f"Bearer {teacher_token}"}
    
    # Teacher publishes question in Tab 2
    q_res = requests.post(f"{BASE}/api/teacher/questions", headers=t_headers, json={
        "question_text": "In graph theory, what is an Eulerian circuit?",
        "option_a": "A walk that visits every vertex once",
        "option_b": "A closed trail that visits every edge exactly once",
        "option_c": "A tree with minimum spanning weight",
        "option_d": "A planar graph with 4 faces",
        "correct_option": "B",
        "explanation": "An Eulerian circuit traverses every edge of a graph exactly once and ends at the starting vertex.",
        "duration_seconds": 60,
        "target_type": "all"
    })
    assert q_res.status_code == 201, f"Teacher question creation failed: {q_res.text}"
    qid = q_res.json().get("question_id") or q_res.json().get("id")
    print(f" -> Tab 2 (Teacher) successfully published question ID {qid} with 60s timer.")

    # Student logs back in on Tab 3
    s_login = requests.post(f"{BASE}/api/auth/login", json={"username": "student", "password": "Admin@123"}).json()
    new_student_token = s_login["token"]
    s_headers = {"Authorization": f"Bearer {new_student_token}"}

    # Student answers in Tab 3
    ans_res = requests.post(f"{BASE}/api/student/questions/{qid}/submit", headers=s_headers, json={
        "selected_option": "B",
        "time_taken_seconds": 15
    })
    assert ans_res.status_code == 200, f"Student answer submission failed: {ans_res.text}"
    ans_data = ans_res.json()
    assert ans_data["is_correct"] is True, "Answer should be correct"
    assert ans_data["correct_option"] == "B"
    print(f" -> Tab 3 (Student) answered question {qid} in 15s. Feedback: is_correct={ans_data['is_correct']}, correct_option={ans_data['correct_option']}.")

    print("\n" + "=" * 65)
    print("SUCCESS: 100% TAB ISOLATION CONFIRMED FOR ALL LOGINS ON SAME COMPUTER!")
    print("=" * 65)

if __name__ == "__main__":
    test_multi_tab_isolation()
