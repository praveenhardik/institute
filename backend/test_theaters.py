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

    def test_add_theater_and_edit_owner(self):
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

        # 3. Test POST /api/theater-owners
        new_owner = {
            "name": "K. Govindaraj",
            "phone": "+91 98425 66778",
            "email": "govindaraj.krishna@gmail.com",
            "contact_location": "Krishna Cinema Director Cabin 1, Karur",
            "theater_name": "Test Sri Krishna Theatre"
        }
        res_o = self.client.post('/api/theater-owners', data=json.dumps(new_owner), content_type='application/json')
        self.assertEqual(res_o.status_code, 201)
        oid = res_o.get_json()['owner']['id']

        # 4. Test PUT /api/theater-owners/<id> (Admin edit owner details)
        updated_owner = {
            "name": "K. Govindaraj (Managing Partner)",
            "phone": "+91 98425 99999",
            "email": "govind.managing@gmail.com",
            "contact_location": "Krishna Cinema Executive Cabin A, Karur",
            "theater_name": "Test Sri Krishna Theatre"
        }
        res_edit = self.client.put(f'/api/theater-owners/{oid}', data=json.dumps(updated_owner), content_type='application/json')
        self.assertEqual(res_edit.status_code, 200)
        edited = res_edit.get_json()['owner']
        self.assertEqual(edited['name'], "K. Govindaraj (Managing Partner)")
        self.assertEqual(edited['phone'], "+91 98425 99999")
        self.assertEqual(edited['email'], "govind.managing@gmail.com")
        self.assertEqual(edited['contact_location'], "Krishna Cinema Executive Cabin A, Karur")

        # Clean up
        self.client.delete(f'/api/theaters/{tid}')
        self.client.delete(f'/api/theater-owners/{oid}')

if __name__ == '__main__':
    unittest.main()
