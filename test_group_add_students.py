import sys
from backend.app import create_app
from backend.db import execute_write, query_all, query_one

def test_group_add_students_feature():
    print("==================================================")
    print("Testing Group Add Students & Membership Constraints")
    print("==================================================")

    app = create_app()
    client = app.test_client()

    # 1. Login as teacher (alan)
    res = client.post('/api/auth/login', json={'username': 'alan', 'password': 'Admin@123'})
    assert res.status_code == 200, f"Teacher login failed: {res.get_json()}"
    token = res.get_json()['token']
    headers = {'Authorization': f'Bearer {token}'}
    print("[PASS] Teacher authenticated successfully")

    # 2. Get available students
    s_res = client.get('/api/teacher/students', headers=headers)
    assert s_res.status_code == 200, f"Get students failed: {s_res.get_json()}"
    all_students = s_res.get_json().get('students', [])
    assert len(all_students) >= 3, f"Expected at least 3 students, found {len(all_students)}"
    st1, st2, st3 = all_students[0], all_students[1], all_students[2]
    print(f"[PASS] Available students retrieved: {len(all_students)} total")

    # 3. Create a test group with st1 initial member
    grp_name = "Unit Test Cohort Students"
    create_res = client.post('/api/teacher/groups', headers=headers, json={
        'name': grp_name,
        'description': 'Testing Add Students feature',
        'student_ids': [st1['id']]
    })
    if create_res.status_code == 201:
        group_id = create_res.get_json()['group_id']
    else:
        # If already exists, fetch its ID
        g_res = client.get('/api/teacher/groups', headers=headers)
        grp = next(g for g in g_res.get_json()['groups'] if g['name'] == grp_name)
        group_id = grp['id']
        # Reset to only st1
        client.post(f'/api/teacher/groups/{group_id}/assign', headers=headers, json={
            'student_ids': [st1['id']]
        })
    print(f"[PASS] Group created/found (ID: {group_id}) with initial member: {st1['name']} (ID: {st1['id']})")

    # 4. Fetch group and verify st1 is a member
    g_res = client.get('/api/teacher/groups', headers=headers)
    groups = g_res.get_json()['groups']
    current_grp = next(g for g in groups if g['id'] == group_id)
    member_ids = [m['id'] for m in current_grp['members']]
    assert st1['id'] in member_ids, "st1 should be in group members"
    assert st2['id'] not in member_ids, "st2 should NOT be in group members yet"
    print(f"[PASS] Verified group has initial member {st1['name']}")

    # 5. Add available students (st2, st3) to this group
    # Added students must not be selected again; available students are [st2, st3]
    combined_ids = [st1['id'], st2['id'], st3['id']]
    assign_res = client.post(f'/api/teacher/groups/{group_id}/assign', headers=headers, json={
        'student_ids': combined_ids
    })
    assert assign_res.status_code == 200, f"Assign students failed: {assign_res.get_json()}"
    print(f"[PASS] Successfully added available students (st2: {st2['name']}, st3: {st3['name']}) to group")

    # 6. Verify group now has 3 members
    g_res = client.get('/api/teacher/groups', headers=headers)
    current_grp = next(g for g in g_res.get_json()['groups'] if g['id'] == group_id)
    updated_ids = set(m['id'] for m in current_grp['members'])
    assert updated_ids == {st1['id'], st2['id'], st3['id']}, f"Expected 3 members, got {updated_ids}"
    print(f"[PASS] Group membership verified with 3 students: {[m['name'] for m in current_grp['members']]}")

    # 7. Test removing st2 from the group
    remaining_ids = [st1['id'], st3['id']]
    remove_res = client.post(f'/api/teacher/groups/{group_id}/assign', headers=headers, json={
        'student_ids': remaining_ids
    })
    assert remove_res.status_code == 200, f"Remove student failed: {remove_res.get_json()}"
    
    g_res = client.get('/api/teacher/groups', headers=headers)
    current_grp = next(g for g in g_res.get_json()['groups'] if g['id'] == group_id)
    remaining_set = set(m['id'] for m in current_grp['members'])
    assert remaining_set == {st1['id'], st3['id']}, f"Expected {remaining_ids}, got {remaining_set}"
    assert st2['id'] not in remaining_set, "st2 should have been removed from group"
    print(f"[PASS] Successfully removed student {st2['name']} from group, leaving {len(remaining_set)} members")

    # 8. Clean up
    del_res = client.delete(f'/api/teacher/groups/{group_id}', headers=headers)
    assert del_res.status_code == 200, f"Delete group failed: {del_res.get_json()}"
    print("[PASS] Test group cleaned up successfully")

    print("==================================================")
    print("ALL GROUP ADD STUDENTS TESTS PASSED (100% SUCCESS)!")
    print("==================================================")

if __name__ == "__main__":
    test_group_add_students_feature()
