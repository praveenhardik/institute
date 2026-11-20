import unittest
import json
from backend.app import create_app
from backend.db import get_db_connection

class KarurDistrictTheatersTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_get_theaters_and_owners(self):
        # 1. Test GET /api/theaters
        res = self.client.get('/api/theaters')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn('theaters', data)
        theaters = data['theaters']
        self.assertGreaterEqual(len(theaters), 6)
        ajantha = next((t for t in theaters if 'Ajantha' in t['name']), None)
        self.assertIsNotNone(ajantha)
        self.assertEqual(ajantha['phone'], '04324-260124')
        self.assertEqual(ajantha['district'], 'Karur')

        # 2. Test GET /api/theater-owners
        o_res = self.client.get('/api/theater-owners')
        self.assertEqual(o_res.status_code, 200)
        o_data = o_res.get_json()
        self.assertIn('owners', o_data)
        owners = o_data['owners']
        self.assertGreaterEqual(len(owners), 6)
        owner = next((o for o in owners if 'Shanmugam' in o['name']), None)
        self.assertIsNotNone(owner)
        self.assertIn('Ajantha Theatre Main Office Cabin', owner['contact_location'])

    def test_admin_karur_login(self):
        # Test admin login with "admin karur" and "Theatre@123"
        login_payload = {
            "identifier": "admin karur",
            "password": "Theatre@123"
        }
        res = self.client.post('/api/auth/login', data=json.dumps(login_payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn('token', data)
        self.assertEqual(data['user']['role'], 'admin')

    def test_add_edit_mute_delete_theater(self):
        # 1. Test POST /api/theaters
        new_th = {
            "name": "Test Sri Krishna Theatre",
            "location": "Jawahar Bazaar, Karur",
            "phone": "04324-229988",
            "email": "krishna@karurtheatre.com",
            "screens": 2,
            "capacity": 550,
            "sound_system": "Dolby Atmos 7.1",
            "projection_type": "4K RGB Laser",
            "owner_name": "K. Govindaraj"
        }
        res = self.client.post('/api/theaters', data=json.dumps(new_th), content_type='application/json')
        self.assertEqual(res.status_code, 201)
        th_data = res.get_json()
        self.assertIn('theater', th_data)
        tid = th_data['theater']['id']

        # 2. Test GET /api/theaters/<id>
        res_get = self.client.get(f'/api/theaters/{tid}')
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.get_json()['theater']['name'], "Test Sri Krishna Theatre")

        # 3. Test PUT /api/theaters/<id> (Admin edit theater details)
        updated_th = {
            "name": "Test Sri Krishna Theatre (Renovated)",
            "location": "15 Jawahar Bazaar Main Road, Karur",
            "phone": "04324-229999",
            "email": "krishna.renovated@karurtheatre.com",
            "screens": 3,
            "capacity": 720,
            "sound_system": "Dolby Atmos 64-Channel",
            "projection_type": "Barco 4K Laser",
            "owner_name": "K. Govindaraj & Sons",
            "status": "Active"
        }
        res_edit_th = self.client.put(f'/api/theaters/{tid}', data=json.dumps(updated_th), content_type='application/json')
        self.assertEqual(res_edit_th.status_code, 200)
        edited_th = res_edit_th.get_json()['theater']
        self.assertEqual(edited_th['name'], "Test Sri Krishna Theatre (Renovated)")
        self.assertEqual(edited_th['screens'], 3)
        self.assertEqual(edited_th['capacity'], 720)

        # 4. Test Muting the theater
        res_mute = self.client.put(f'/api/theaters/{tid}', data=json.dumps({"status": "Muted"}), content_type='application/json')
        self.assertEqual(res_mute.status_code, 200)
        self.assertEqual(res_mute.get_json()['theater']['status'], "Muted")

        # 5. Test Unmuting the theater
        res_unmute = self.client.put(f'/api/theaters/{tid}', data=json.dumps({"status": "Active"}), content_type='application/json')
        self.assertEqual(res_unmute.status_code, 200)
        self.assertEqual(res_unmute.get_json()['theater']['status'], "Active")

        # 6. Test Delete the theater
        res_del = self.client.delete(f'/api/theaters/{tid}')
        self.assertEqual(res_del.status_code, 200)

        # Verify deletion
        res_verify = self.client.get(f'/api/theaters/{tid}')
        self.assertEqual(res_verify.status_code, 404)

if __name__ == '__main__':
    unittest.main()
