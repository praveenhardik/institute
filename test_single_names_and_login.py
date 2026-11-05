import requests

BASE = 'http://127.0.0.1:5000'

test_cases = [
    # Full Name (Single Name, Title Case)
    ('Eleanor', 205, 'super_admin'),
    ('Admin', 230, 'admin'),
    ('Xavier', 206, 'hod'),
    ('Alan', 207, 'teacher'),
    ('Lovelace', 208, 'class_teacher'),
    ('Alex', 209, 'student'),
    ('Arthur', 210, 'accountant'),

    # Username (Lowercase Single Name)
    ('eleanor', 205, 'super_admin'),
    ('admin', 230, 'admin'),
    ('xavier', 206, 'hod'),
    ('alan', 207, 'teacher'),
    ('lovelace', 208, 'class_teacher'),
    ('alex', 209, 'student'),
    ('arthur', 210, 'accountant'),

    # Legacy demo aliases
    ('superadmin', 205, 'super_admin'),
    ('admin', 230, 'admin'),
    ('hod', 206, 'hod'),
    ('teacher', 207, 'teacher'),
    ('classteacher', 208, 'class_teacher'),
    ('student', 209, 'student'),
    ('staff', 210, 'accountant'),

    # Emails
    ('eleanor1@inpand.com', 205, 'super_admin'),
    ('admin1@inpand.com', 230, 'admin'),
    ('xavier1@inpand.com', 206, 'hod'),
    ('alan1@inpand.com', 207, 'teacher'),
    ('lovelace1@inpand.com', 208, 'class_teacher'),
    ('alex1@inpand.com', 209, 'student'),
    ('arthur1@inpand.com', 210, 'accountant'),
]

print("Running test_single_names_and_login...")
for ident, expected_id, expected_role in test_cases:
    res = requests.post(f'{BASE}/api/auth/login', json={'username': ident, 'password': 'Admin@123'}).json()
    assert 'token' in res, f"Login failed for identifier '{ident}': {res}"
    user = res['user']
    assert user['id'] == expected_id, f"Wrong ID for '{ident}': got {user['id']}, expected {expected_id}"
    assert user['role'] == expected_role, f"Wrong role for '{ident}': got {user['role']}, expected {expected_role}"
    # Verify that user['name'] is indeed a single name!
    assert ' ' not in user['name'], f"Full name is not a single name! Got: '{user['name']}'"
    print(f"[PASS] identifier='{ident:<20}' -> Logged in as Single Name '{user['name']}' (ID #{user['id']}, Role: {user['role']})")

print("\nALL 28 LOGIN COMBINATIONS PASSED PERFECTLY!")
