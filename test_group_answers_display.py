import requests
import sys

BASE_URL = "http://127.0.0.1:5000"

def test_group_answers_display():
    print("=== Testing Created Groups Correct Answer and Submitted Answer Display ===")

    # 1. Login as teacher (alan / Admin@123)
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "alan",
        "password": "Admin@123"
    })
    assert login_res.status_code == 200, f"Teacher login failed: {login_res.text}"
    teacher_token = login_res.json()["token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
    print("[PASS] Teacher logged in successfully")

    # 2. Get students so we can assign to a group
    st_res = requests.get(f"{BASE_URL}/api/teacher/students", headers=teacher_headers)
    assert st_res.status_code == 200
    students = st_res.json()["students"]
    alex = next((s for s in students if s["username"] == "alex"), None)
    assert alex is not None
    alex_id = alex["id"]

    # 3. Create or find group
    group_name = "Cohort Alpha Quiz"
    grp_res = requests.post(f"{BASE_URL}/api/teacher/groups", headers=teacher_headers, json={
        "name": group_name,
        "description": "Group for testing answers display",
        "student_ids": [alex_id]
    })
    if grp_res.status_code == 201:
        group_id = grp_res.json()["group_id"]
        print(f"[PASS] Created group '{group_name}' (ID: {group_id})")
    else:
        get_grp_res = requests.get(f"{BASE_URL}/api/teacher/groups", headers=teacher_headers)
        groups = get_grp_res.json()["groups"]
        grp = next(g for g in groups if g["name"] == group_name)
        group_id = grp["id"]
        requests.post(f"{BASE_URL}/api/teacher/groups/{group_id}/assign", headers=teacher_headers, json={
            "student_ids": [alex_id]
        })
        print(f"[PASS] Reusing group '{group_name}' (ID: {group_id})")

    # 4. Publish a question to this group
    pub_res = requests.post(f"{BASE_URL}/api/teacher/questions", headers=teacher_headers, json={
        "question_text": "What is the capital of Japan?",
        "option_a": "Tokyo",
        "option_b": "Kyoto",
        "option_c": "Osaka",
        "option_d": "Hiroshima",
        "correct_option": "A",
        "duration_seconds": 60,
        "target_type": "group",
        "target_group_id": group_id,
        "explanation": "Tokyo is the current capital of Japan."
    })
    assert pub_res.status_code == 201, f"Publish question failed: {pub_res.text}"
    q_id = pub_res.json()["question_id"]
    print(f"[PASS] Published question ID {q_id} to group {group_id}")

    # 5. Student Alex logs in and submits answer
    st_login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "alex",
        "password": "Admin@123"
    })
    assert st_login.status_code == 200
    alex_token = st_login.json()["token"]
    alex_headers = {"Authorization": f"Bearer {alex_token}"}

    sub_res = requests.post(f"{BASE_URL}/api/student/questions/{q_id}/submit", headers=alex_headers, json={
        "selected_option": "A",
        "time_taken_seconds": 15
    })
    assert sub_res.status_code == 200
    assert sub_res.json()["is_correct"] is True
    print("[PASS] Student Alex submitted answer 'A' (Tokyo) -> evaluated is_correct=True")

    # 6. Fetch groups via teacher endpoint
    groups_res = requests.get(f"{BASE_URL}/api/teacher/groups", headers=teacher_headers)
    assert groups_res.status_code == 200
    groups_data = groups_res.json()["groups"]
    target_group = next((g for g in groups_data if g["id"] == group_id), None)
    assert target_group is not None, f"Group {group_id} not found in teacher groups"

    # Check questions in group
    assert "questions" in target_group, "Group missing 'questions' key"
    assert len(target_group["questions"]) > 0, "No questions found in target group"
    q_obj = next((q for q in target_group["questions"] if q["id"] == q_id), None)
    assert q_obj is not None, f"Question {q_id} not found in group questions"

    # Verify Correct Answer fields
    assert q_obj["correct_option"] == "A"
    assert q_obj["correct_answer_text"] == "Tokyo"
    print(f"[PASS] Group Question displays Correct Option: {q_obj['correct_option']}, Text: {q_obj['correct_answer_text']}")

    # Verify Student Results (Submitted Answer)
    assert "student_results" in q_obj, "Question missing 'student_results' breakdown"
    alex_result = next((r for r in q_obj["student_results"] if r["student_id"] == alex_id), None)
    assert alex_result is not None, "Alex result not found in student_results"

    assert alex_result["status"] == "submitted"
    assert alex_result["selected_option"] == "A"
    assert alex_result["selected_answer_text"] == "Tokyo"
    assert alex_result["correct_option"] == "A"
    assert alex_result["correct_answer_text"] == "Tokyo"
    assert alex_result["is_correct"] is True
    print(f"[PASS] Alex's Submitted Answer: Option {alex_result['selected_option']} ({alex_result['selected_answer_text']})")
    print(f"[PASS] Correct Answer in Alex's Result: Option {alex_result['correct_option']} ({alex_result['correct_answer_text']})")

    # 7. Also test dedicated group submissions endpoint
    sub_endpoint_res = requests.get(f"{BASE_URL}/api/teacher/groups/{group_id}/submissions", headers=teacher_headers)
    assert sub_endpoint_res.status_code == 200
    endpoint_data = sub_endpoint_res.json()
    assert len(endpoint_data["questions"]) > 0
    print("[PASS] Dedicated group submissions endpoint returned valid questions and submissions")

    print("\nALL CREATED GROUP ANSWERS DISPLAY TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_group_answers_display()
