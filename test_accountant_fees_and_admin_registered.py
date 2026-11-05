import requests
import uuid

BASE = "http://127.0.0.1:5000"

def run_tests():
    print("=" * 70)
    print("STARTING TEST SUITE: ADMIN REGISTERED ACCOUNTS & ACCOUNTANT FEES PORTAL")
    print("=" * 70)

    # -------------------------------------------------------------
    # PART 1: Accountant Portal & Fees Verification
    # -------------------------------------------------------------
    print("\n[TEST 1] Logging in as Accountant (Arthur Pendelton / @staff)...")
    login_res = requests.post(f"{BASE}/api/auth/login", json={"username": "staff", "password": "Admin@123"})
    assert login_res.status_code == 200, f"Accountant login failed: {login_res.text}"
    acc_data = login_res.json()
    acc_token = acc_data["token"]
    acc_headers = {"Authorization": f"Bearer {acc_token}"}
    print(f" -> Logged in as: {acc_data['user']['name']} (Role: {acc_data['user']['role']})")

    print("\n[TEST 2] Verifying Accountant Fees Summary (Overall, Pending, Collected)...")
    sum_res = requests.get(f"{BASE}/api/fees/summary", headers=acc_headers)
    assert sum_res.status_code == 200, f"Summary request failed: {sum_res.text}"
    summary = sum_res.json()
    print(" -> Fees Summary:", summary)

    overall = summary["overall_fees"]
    collected = summary["collected_fees"]
    pending = summary["pending_fees"]
    total_stus = summary["total_students"]
    paid_stus = summary["paid_students"]
    unpaid_stus = summary["unpaid_students"]

    assert overall > 0, "Overall fees should be greater than 0"
    assert collected >= 0, "Collected fees should be non-negative"
    assert pending >= 0, "Pending fees should be non-negative"
    assert overall == collected + pending, f"Overall fees ({overall}) must equal collected ({collected}) + pending ({pending})!"
    assert total_stus == paid_stus + unpaid_stus, f"Total students ({total_stus}) must equal paid ({paid_stus}) + unpaid ({unpaid_stus})!"
    print(f" -> SUCCESS: Overall Fees (Rs {overall:,}) = Collected (Rs {collected:,}) + Pending (Rs {pending:,})")

    print("\n[TEST 3] Fetching Student Fees List...")
    stus_res = requests.get(f"{BASE}/api/fees/students", headers=acc_headers)
    assert stus_res.status_code == 200, f"Students request failed: {stus_res.text}"
    students = stus_res.json()["students"]
    assert len(students) > 0, "Expected at least 1 student in fee ledger"
    first_stu = students[0]
    sid = first_stu["student_id"]
    print(f" -> Found {len(students)} students. Testing on student: {first_stu['student_name']} (ID #{sid})")

    # Verify every student has fee >= 10,000
    for s in students:
        assert s["fee_amount"] >= 10000, f"Student {s['student_name']} fee {s['fee_amount']} is less than 10,000!"
    print(" -> Verified: 100% of student fee records have fee_amount >= 10,000!")

    print("\n[TEST 4] Testing Paid / Not Paid Toggle Button...")
    initial_status = first_stu["status"]
    # Toggle 1
    t1_res = requests.post(f"{BASE}/api/fees/students/{sid}/toggle-status", headers=acc_headers)
    assert t1_res.status_code == 200, f"Toggle failed: {t1_res.text}"
    new_status_1 = t1_res.json()["status"]
    expected_status_1 = "unpaid" if initial_status == "paid" else "paid"
    assert new_status_1 == expected_status_1, f"Expected {expected_status_1}, got {new_status_1}"
    print(f" -> Toggle 1: {initial_status} -> {new_status_1} [SUCCESS]")

    # Toggle 2 (Back to initial)
    t2_res = requests.post(f"{BASE}/api/fees/students/{sid}/toggle-status", headers=acc_headers)
    assert t2_res.status_code == 200, f"Toggle back failed: {t2_res.text}"
    new_status_2 = t2_res.json()["status"]
    assert new_status_2 == initial_status, f"Expected {initial_status}, got {new_status_2}"
    print(f" -> Toggle 2: {new_status_1} -> {new_status_2} (Restored initial) [SUCCESS]")

    print("\n[TEST 5] Testing Fee Entry Validation (Must be at least 10,000)...")
    # 5.1 Test rejection of < 10,000 (e.g. 5,000)
    fail_5000 = requests.post(f"{BASE}/api/fees/students/{sid}/update-fee", headers=acc_headers, json={"fee_amount": 5000})
    assert fail_5000.status_code == 400, f"Expected 400 for fee=5000, got: {fail_5000.status_code} {fail_5000.text}"
    print(" -> Correctly rejected fee of Rs 5,000 (HTTP 400):", fail_5000.json()["error"].encode('ascii', 'ignore').decode())

    # 5.2 Test rejection of 9,999
    fail_9999 = requests.post(f"{BASE}/api/fees/students/{sid}/update-fee", headers=acc_headers, json={"fee_amount": 9999})
    assert fail_9999.status_code == 400, f"Expected 400 for fee=9999, got: {fail_9999.status_code} {fail_9999.text}"
    print(" -> Correctly rejected fee of Rs 9,999 (HTTP 400):", fail_9999.json()["error"].encode('ascii', 'ignore').decode())

    # 5.3 Test rejection of bulk fee < 10,000
    fail_bulk = requests.post(f"{BASE}/api/fees/set-bulk-fee", headers=acc_headers, json={"fee_amount": 7500})
    assert fail_bulk.status_code == 400, f"Expected 400 for bulk fee=7500, got: {fail_bulk.status_code} {fail_bulk.text}"
    print(" -> Correctly rejected bulk fee of Rs 7,500 (HTTP 400):", fail_bulk.json()["error"].encode('ascii', 'ignore').decode())

    # 5.4 Test acceptance of >= 10,000 (e.g. 10,000 exact)
    succ_10000 = requests.post(f"{BASE}/api/fees/students/{sid}/update-fee", headers=acc_headers, json={"fee_amount": 10000})
    assert succ_10000.status_code == 200, f"Expected 200 for fee=10000, got: {succ_10000.status_code} {succ_10000.text}"
    assert succ_10000.json()["fee_amount"] == 10000
    print(" -> Successfully accepted minimum boundary fee of Rs 10,000 (HTTP 200)")

    # 5.5 Test acceptance of custom higher fee (e.g. 18,500)
    succ_18500 = requests.post(f"{BASE}/api/fees/students/{sid}/update-fee", headers=acc_headers, json={"fee_amount": 18500})
    assert succ_18500.status_code == 200, f"Expected 200 for fee=18500, got: {succ_18500.status_code} {succ_18500.text}"
    assert succ_18500.json()["fee_amount"] == 18500
    print(" -> Successfully updated student fee to Rs 18,500 (HTTP 200)")

    # -------------------------------------------------------------
    # PART 2: All Registered Accounts in All Users in Admin Only
    # -------------------------------------------------------------
    print("\n[TEST 6] Logging in as College Admin (@admin)...")
    admin_login = requests.post(f"{BASE}/api/auth/login", json={"username": "admin", "password": "Admin@123"})
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(" -> Logged in as College Admin.")

    print("\n[TEST 7] Registering a New Student Account via Self-Registration...")
    uid_suffix = uuid.uuid4().hex[:6]
    test_reg_name = f"RegStudent{uid_suffix}"
    test_reg_username = f"reg_{uid_suffix}"
    reg_payload = {
        "name": test_reg_name,
        "username": test_reg_username,
        "email_or_phone": f"98{uuid.uuid4().int % 100000000:08d}",
        "password": "Password@123",
        "role": "student"
    }
    reg_res = requests.post(f"{BASE}/api/auth/register-student", json=reg_payload)
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    registered_student_id = reg_res.json()["student_id"]
    print(f" -> New self-registered account created: '{test_reg_name}' (ID #{registered_student_id}, status: pending)")

    print("\n[TEST 8] Verifying Registered Account Appears in Admin's Profiles ('All Users')...")
    admin_profiles = requests.get(f"{BASE}/api/admin/profiles", headers=admin_headers)
    assert admin_profiles.status_code == 200, f"Admin profiles request failed: {admin_profiles.text}"
    users_list = admin_profiles.json()["users"]
    user_ids = [u["id"] for u in users_list]
    assert registered_student_id in user_ids, f"Self-registered account #{registered_student_id} was NOT found in Admin's All Users profile list!"
    
    found_user = next(u for u in users_list if u["id"] == registered_student_id)
    print(f" -> Found registered account in Admin's All Users: #{found_user['id']} '{found_user['name']}' (Status: {found_user['status']})")

    print("\n[TEST 9] Testing Admin Approving the Registered Account...")
    app_res = requests.post(f"{BASE}/api/admin/students/{registered_student_id}/approve", headers=admin_headers)
    assert app_res.status_code == 200, f"Approval failed: {app_res.text}"
    print(f" -> Registered account #{registered_student_id} successfully approved by Admin: status = {app_res.json()['status']}")

    # Verify status changed to active in Admin profiles
    admin_profiles_after = requests.get(f"{BASE}/api/admin/profiles", headers=admin_headers)
    active_user = next(u for u in admin_profiles_after.json()["users"] if u["id"] == registered_student_id)
    assert active_user["status"] == "active", f"Expected active status, got {active_user['status']}"
    print(f" -> Confirmed in Admin All Users: #{active_user['id']} '{active_user['name']}' is now ACTIVE!")

    print("\n" + "=" * 70)
    print("ALL TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
