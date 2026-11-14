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

# 2. Check /api/college/departments
r = client.get('/api/college/departments', headers=headers)
assert r.status_code == 200
depts = r.get_json()['departments']
print(f"Total departments: {len(depts)}")
for d in depts:
    print(f"Department: {d['code']} ({d['name']}) -> HOD: {d.get('hod_name')}")
    # Verify each department has its OWN HOD
    if d['code'] == 'CSE':
        assert 'CSE' in d.get('hod_name', ''), f"Unexpected HOD for CSE: {d.get('hod_name')}"
    elif d['code'] == 'MECH':
        assert 'MECH' in d.get('hod_name', ''), f"Unexpected HOD for MECH: {d.get('hod_name')}"
    elif d['code'] == 'MECT':
        assert 'MECT' in d.get('hod_name', ''), f"Unexpected HOD for MECT: {d.get('hod_name')}"
    elif d['code'] == 'AERO':
        assert 'AERO' in d.get('hod_name', ''), f"Unexpected HOD for AERO: {d.get('hod_name')}"
    elif d['code'] == 'EEE':
        assert 'EEE' in d.get('hod_name', ''), f"Unexpected HOD for EEE: {d.get('hod_name')}"
    elif d['code'] == 'ECE':
        assert 'ECE' in d.get('hod_name', ''), f"Unexpected HOD for ECE: {d.get('hod_name')}"

# 3. Test Student accounts across departments & years
sample_students = [
    ('Stu11_CSE', 1, 'CSE'),
    ('Stu15_CSE', 1, 'CSE'),
    ('Stu23_CSE', 2, 'CSE'),
    ('Stu34_CSE', 3, 'CSE'),
    ('Stu45_CSE', 4, 'CSE'),
    ('Stu11_EEE', 1, 'EEE'),
    ('Stu24_EEE', 2, 'EEE'),
    ('Stu32_EEE', 3, 'EEE'),
    ('Stu45_EEE', 4, 'EEE'),
    ('Stu13_ECE', 1, 'ECE'),
    ('Stu25_ECE', 2, 'ECE'),
    ('Stu31_ECE', 3, 'ECE'),
    ('Stu44_ECE', 4, 'ECE'),
    ('Stu12_MECH', 1, 'MECH'),
    ('Stu21_MECH', 2, 'MECH'),
    ('Stu35_MECH', 3, 'MECH'),
    ('Stu43_MECH', 4, 'MECH'),
    ('Stu14_MECT', 1, 'MECT'),
    ('Stu22_MECT', 2, 'MECT'),
    ('Stu33_MECT', 3, 'MECT'),
    ('Stu45_MECT', 4, 'MECT'),
    ('Stu15_AERO', 1, 'AERO'),
    ('Stu23_AERO', 2, 'AERO'),
    ('Stu31_AERO', 3, 'AERO'),
    ('Stu42_AERO', 4, 'AERO'),
]

for uname, expected_yr, expected_dept in sample_students:
    r = client.post('/api/auth/login', json={'username': uname, 'password': 'Admin@123'})
    assert r.status_code == 200, f"Login failed for {uname}: {r.get_json()}"
    u = r.get_json()['user']
    assert u['role'] == 'student'
    assert u['academic_year'] == expected_yr, f"Wrong year for {uname}: got {u['academic_year']}, expected {expected_yr}"
    assert u['department_code'] == expected_dept, f"Wrong dept for {uname}: got {u['department_code']}, expected {expected_dept}"

# 4. Test lowercase / flexible format without underscore (e.g. stu11cse)
r = client.post('/api/auth/login', json={'username': 'stu11cse', 'password': 'Admin@123'})
assert r.status_code == 200, f"Flexible login failed for stu11cse: {r.get_json()}"
u = r.get_json()['user']
assert u['username'] == 'Stu11_CSE'
assert u['academic_year'] == 1

print("\nALL 25 SAMPLE STUDENTS & HODS VERIFIED SUCCESSFULLY!")
