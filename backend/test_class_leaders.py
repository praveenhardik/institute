import sys, os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + '/..'))
from backend.app import create_app

app = create_app()
client = app.test_client()

# 1. Login as Super Admin
r = client.post('/api/auth/login', json={'username': 'superadmin', 'password': 'Admin@123'})
assert r.status_code == 200, f"Superadmin login failed: {r.get_json()}"
super_token = r.get_json()['token']
headers = {'Authorization': f'Bearer {super_token}'}

# 2. Check /api/admin/profiles?role=class_leader
r = client.get('/api/admin/profiles?role=class_leader', headers=headers)
assert r.status_code == 200
cl_users = r.get_json()['users']
print(f"Total Class Leaders returned from API: {len(cl_users)}")
assert len(cl_users) >= 24, f"Expected at least 24 class leaders, got {len(cl_users)}"
for u in cl_users:
    assert u['role'] == 'class_leader', f"Non-class-leader found in class_leader filter: {u}"
    assert u.get('academic_year') in (1, 2, 3, 4), f"Missing or invalid academic_year for {u['username']}: {u.get('academic_year')}"

# 3. Check /api/admin/profiles?role=student
r = client.get('/api/admin/profiles?role=student', headers=headers)
assert r.status_code == 200
st_users = r.get_json()['users']
print(f"Total Students returned from API: {len(st_users)}")
assert len(st_users) >= 120, f"Expected at least 120 students, got {len(st_users)}"
for u in st_users:
    assert u['role'] == 'student', f"Class leader leaked into student filter: {u}"

# 4. Test Sample Class Leader Logins (exact, without space, and shorthand)
test_cls = [
    ('class leader1 CSE', 1, 'CSE'),
    ('class leader2 CSE', 2, 'CSE'),
    ('class leader3 CSE', 3, 'CSE'),
    ('class leader4 CSE', 4, 'CSE'),
    ('class leader1 EEE', 1, 'EEE'),
    ('class leader2 EEE', 2, 'EEE'),
    ('class leader3 EEE', 3, 'EEE'),
    ('class leader4 EEE', 4, 'EEE'),
    ('class leader1 ECE', 1, 'ECE'),
    ('class leader2 ECE', 2, 'ECE'),
    ('class leader3 ECE', 3, 'ECE'),
    ('class leader4 ECE', 4, 'ECE'),
    ('class leader1 AERO', 1, 'AERO'),
    ('class leader2 AERO', 2, 'AERO'),
    ('class leader3 AERO', 3, 'AERO'),
    ('class leader4 AERO', 4, 'AERO'),
    ('class leader1 MECT', 1, 'MECT'),
    ('class leader2 MECT', 2, 'MECT'),
    ('class leader3 MECT', 3, 'MECT'),
    ('class leader4 MECT', 4, 'MECT'),
    ('class leader1 MECH', 1, 'MECH'),
    ('class leader2 MECH', 2, 'MECH'),
    ('class leader3 MECH', 3, 'MECH'),
    ('class leader4 MECH', 4, 'MECH'),
]

for uname, expected_yr, expected_dept in test_cls:
    res = client.post('/api/auth/login', json={'username': uname, 'password': 'Admin@123'})
    assert res.status_code == 200, f"Login failed for {uname}: {res.get_json()}"
    user = res.get_json()['user']
    assert user['role'] == 'class_leader'
    assert user['academic_year'] == expected_yr, f"Wrong year for {uname}: got {user['academic_year']}, expected {expected_yr}"
    assert user['department_code'] == expected_dept, f"Wrong dept for {uname}: got {user['department_code']}, expected {expected_dept}"

# 5. Test flexible shorthand login: classleader1cse, cl1_cse
res = client.post('/api/auth/login', json={'username': 'classleader1cse', 'password': 'Admin@123'})
assert res.status_code == 200, f"Flexible login failed for classleader1cse: {res.get_json()}"
assert res.get_json()['user']['role'] == 'class_leader'

res = client.post('/api/auth/login', json={'username': 'cl1_aero', 'password': 'Admin@123'})
assert res.status_code == 200, f"Flexible login failed for cl1_aero: {res.get_json()}"
assert res.get_json()['user']['role'] == 'class_leader'

print("\nALL 24 CLASS LEADERS, PROFILE SEPARATION, AND LOGINS VERIFIED 100% SUCCESSFULLY!")
