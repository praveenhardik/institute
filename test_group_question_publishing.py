import requests
import sys

BASE_URL = "http://127.0.0.1:5000"

def test_group_question_publishing():
    print("=== Testing Group Question Publishing ===")

    # 1. Login as teacher (alan / Password@123)
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
    assert st_res.status_code == 200, f"Get students failed: {st_res.text}"
    students = st_res.json()["students"]
    print(f"[PASS] Retrieved {len(students)} students")
    
    # Alex is student user
    alex = next((s for s in students if s["username"] == "alex"), None)
    assert alex is not None, "Student 'alex' not found in student list"
    alex_id = alex["id"]

    # 3. Create a test group
    group_name = "Automated Group Test"
    grp_res = requests.post(f"{BASE_URL}/api/teacher/groups", headers=teacher_headers, json={
        "name": group_name,
        "description": "Group for testing question publishing",
        "student_ids": [alex_id]
    })
    if grp_res.status_code == 201:
        group_id = grp_res.json()["group_id"]
        print(f"[PASS] Created group '{group_name}' (ID: {group_id}) with student Alex (ID: {alex_id})")
    else:
        # Group might already exist
        get_grp_res = requests.get(f"{BASE_URL}/api/teacher/groups", headers=teacher_headers)
        groups = get_grp_res.json()["groups"]
        grp = next(g for g in groups if g["name"] == group_name)
        group_id = grp["id"]
        # re-assign alex
        requests.post(f"{BASE_URL}/api/teacher/groups/{group_id}/assign", headers=teacher_headers, json={
            "student_ids": [alex_id]
        })
        print(f"[PASS] Found existing group '{group_name}' (ID: {group_id}) and assigned Alex")

    # 4. Test question publishing with target_group_id
    q_data_1 = {
        "question_text": "What is the capital of France for Group?",
        "option_a": "Paris",
        "option_b": "London",
        "option_c": "Berlin",
        "option_d": "Rome",
        "correct_option": "A",
        "duration_seconds": 60,
        "target_type": "group",
        "target_group_id": group_id,
        "explanation": "Paris is the capital of France."
    }
    pub_res_1 = requests.post(f"{BASE_URL}/api/teacher/questions", headers=teacher_headers, json=q_data_1)
    assert pub_res_1.status_code == 201, f"Failed publishing with target_group_id: {pub_res_1.text}"
    q1_id = pub_res_1.json()["question_id"]
    print(f"[PASS] Published question 1 with target_group_id: ID {q1_id}")

    # 5. Test question publishing with group_id (legacy / frontend payload key)
    q_data_2 = {
        "question_text": "What is 10 + 20 for Group?",
        "option_a": "10",
        "option_b": "20",
        "option_c": "30",
        "option_d": "40",
        "correct_option": "C",
        "duration_seconds": 45,
        "target_type": "group",
        "group_id": group_id,
        "explanation": "10 + 20 = 30."
    }
    pub_res_2 = requests.post(f"{BASE_URL}/api/teacher/questions", headers=teacher_headers, json=q_data_2)
    assert pub_res_2.status_code == 201, f"Failed publishing with group_id: {pub_res_2.text}"
    q2_id = pub_res_2.json()["question_id"]
    print(f"[PASS] Published question 2 with group_id: ID {q2_id}")

    # 6. Test question publishing without group id fails with 400
    bad_q = {
        "question_text": "Missing group id test",
        "option_a": "A", "option_b": "B", "option_c": "C", "option_d": "D",
        "correct_option": "A",
        "duration_seconds": 60,
        "target_type": "group"
    }
    bad_res = requests.post(f"{BASE_URL}/api/teacher/questions", headers=teacher_headers, json=bad_q)
    assert bad_res.status_code == 400
    assert "target_group_id is required" in bad_res.json()["error"]
    print("[PASS] Validation correctly rejected group question without group ID")

    # 7. Login as Student Alex (in group)
    st_login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "alex",
        "password": "Admin@123"
    })
    assert st_login.status_code == 200
    st_token = st_login.json()["token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    # Student checks questions
    q_res = requests.get(f"{BASE_URL}/api/student/questions", headers=st_headers)
    assert q_res.status_code == 200
    st_questions = q_res.json()["questions"]
    q1_found = next((q for q in st_questions if q["id"] == q1_id), None)
    assert q1_found is not None, "Targeted question 1 not found in Alex's questions"
    assert q1_found["group_name"] == group_name, f"Expected group_name '{group_name}', got '{q1_found.get('group_name')}'"
    print(f"[PASS] Student Alex can view targeted question 1 with group_name '{q1_found['group_name']}'")

    # Student fetches single question
    single_res = requests.get(f"{BASE_URL}/api/student/questions/{q1_id}", headers=st_headers)
    assert single_res.status_code == 200
    assert single_res.json()["question"]["group_name"] == group_name
    print(f"[PASS] Student Alex single question endpoint returns group_name correctly")

    # Student submits answer
    sub_res = requests.post(f"{BASE_URL}/api/student/questions/{q1_id}/submit", headers=st_headers, json={
        "selected_option": "A",
        "time_taken_seconds": 12
    })
    assert sub_res.status_code == 200
    assert sub_res.json()["is_correct"] is True
    print(f"[PASS] Student Alex successfully submitted answer to group question")

    # 8. Verify Teacher Questions list displays the group name
    tq_res = requests.get(f"{BASE_URL}/api/teacher/questions", headers=teacher_headers)
    assert tq_res.status_code == 200
    teacher_questions = tq_res.json()["questions"]
    tq1 = next(q for q in teacher_questions if q["id"] == q1_id)
    assert tq1["group_name"] == group_name
    assert tq1["total_submissions"] == 1
    assert tq1["correct_count"] == 1
    print(f"[PASS] Teacher questions analytics shows group_name '{tq1['group_name']}' and 1 correct submission")

    print("\nALL GROUP QUESTION PUBLISHING TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_group_question_publishing()
