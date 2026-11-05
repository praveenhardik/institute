"""
Test user profiles search and selection verification
"""
import requests

BASE_URL = 'http://127.0.0.1:5000'

def test_search():
    print("Testing User Profiles Search API & Directory Selection...")
    
    # 1. Login as Super Admin
    s = requests.Session()
    res = s.post(f"{BASE_URL}/api/auth/login", json={
        "username": "superadmin1@inpand.com",
        "password": "Admin@123"
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get all profiles
    res = requests.get(f"{BASE_URL}/api/admin/profiles", headers=headers)
    assert res.status_code == 200, f"Profiles failed: {res.text}"
    all_profiles = res.json()["users"]
    print(f"Total Profiles in system: {len(all_profiles)}")
    assert len(all_profiles) > 0
    
    # 3. Test backend search filter query
    res = requests.get(f"{BASE_URL}/api/admin/profiles?q=teacher", headers=headers)
    assert res.status_code == 200
    teacher_matches = res.json()["users"]
    print(f"Searched 'teacher': found {len(teacher_matches)} matching profiles")
    assert any("teacher" in u["role"].lower() or "teacher" in u["email"].lower() for u in teacher_matches)
    
    # 4. Search by specific username / email
    res = requests.get(f"{BASE_URL}/api/admin/profiles?q=alan", headers=headers)
    assert res.status_code == 200
    alan_matches = res.json()["users"]
    print(f"Searched 'alan': found {len(alan_matches)} match(es)")
    assert len(alan_matches) >= 1
    user = alan_matches[0]
    print(f"User Gotten: #{user['id']} {user['name']} | Email: {user['email']} | Role: {user['role']}")
    assert "alan" in user["name"].lower() or "alan" in user["email"].lower()
    
    # 5. Verify email ends with @inpand.com
    assert user["email"].endswith("@inpand.com")
    
    print("\nALL BACKEND SEARCH API TESTS PASSED!")

if __name__ == '__main__':
    test_search()
