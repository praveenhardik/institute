import os
import sys

os.environ["USE_SQLITE"] = "1"

import unittest
import uuid

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app import create_app

class TestQuizManagementSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def login(self, identifier, password="Admin@123"):
        email_map = {
            "superadmin": "superadmin1@inpand.com",
            "admin": "admin1@inpand.com",
            "class teacher1 CSE": "classteacher1cse@inpand.com",
            "teacher1 CSE": "teacher1cse@inpand.com",
            "Stu11_CSE": "stu11_cse@inpand.com",
        }
        email = email_map.get(identifier, identifier)
        if "@" not in email:
            email = f"{email.replace(' ', '').lower()}@inpand.com"
        res = self.client.post("/api/auth/login", json={"email": email, "password": password})
        self.assertEqual(res.status_code, 200, f"Failed login for {email}: {res.get_json()}")
        return res.get_json()["token"]

    def test_01_super_admin_permissions_and_deletion(self):
        """Super Admin can view profiles, create admin accounts, and delete accounts."""
        token = self.login("superadmin", "Admin@123")
        headers = {"Authorization": f"Bearer {token}"}

        # Profile viewing
        res = self.client.get("/api/admin/profiles", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertGreater(len(res.get_json()["users"]), 0)

        # Super admin creates an 'admin' -> MUST SUCCEED
        uid = uuid.uuid4().hex[:6]
        res = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": f"BranchAdmin_{uid}",
            "email_or_phone": f"admin_{uid}@inpand.com",
            "password": "Password@123",
            "role": "admin"
        })
        self.assertEqual(res.status_code, 201)
        created_admin_id = res.get_json()["user"]["id"]

        # Super admin tries to create a duplicate 'super_admin' -> MUST BE REJECTED (400 or 403)
        res_super = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": f"RogueSuper_{uid}",
            "email_or_phone": f"rogue_{uid}@inpand.com",
            "password": "Password@123",
            "role": "super_admin"
        })
        self.assertIn(res_super.status_code, [400, 403])

        # Super admin DELETES the created admin account -> MUST SUCCEED (200)
        del_res = self.client.delete(f"/api/admin/users/{created_admin_id}", headers=headers)
        self.assertEqual(del_res.status_code, 200)

    def test_02_admin_permissions_and_deletion(self):
        """Admin can create teacher, class_teacher, and delete them."""
        token = self.login("admin", "Admin@123")
        headers = {"Authorization": f"Bearer {token}"}
        uid = uuid.uuid4().hex[:6]

        # Admin creates teacher -> SUCCEED
        res_t = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": f"Faculty_{uid}",
            "email_or_phone": f"teacher_{uid}@inpand.com",
            "password": "Admin@123",
            "role": "teacher",
            "department_id": 1
        })
        self.assertEqual(res_t.status_code, 201)
        created_teacher_id = res_t.get_json()["user"]["id"]

        # Admin creates class_teacher -> SUCCEED
        res_ct = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": f"ClassLeadTeacher_{uid}",
            "email_or_phone": f"ct_{uid}@inpand.com",
            "password": "Admin@123",
            "role": "class_teacher",
            "department_id": 1
        })
        self.assertEqual(res_ct.status_code, 201)
        created_ct_id = res_ct.get_json()["user"]["id"]

        # Admin deletes teacher account -> MUST SUCCEED (200)
        del_t = self.client.delete(f"/api/admin/users/{created_teacher_id}", headers=headers)
        self.assertEqual(del_t.status_code, 200)

        # Admin deletes class_teacher account -> MUST SUCCEED (200)
        del_ct = self.client.delete(f"/api/admin/users/{created_ct_id}", headers=headers)
        self.assertEqual(del_ct.status_code, 200)

    def test_03_class_teacher_creation_capabilities(self):
        """Class Teacher can create Teacher and Class Teacher accounts for their department."""
        token = self.login("class teacher1 CSE", "Admin@123")
        headers = {"Authorization": f"Bearer {token}"}
        uid = uuid.uuid4().hex[:6]

        # Class teacher creates a Teacher -> SUCCEED (201)
        res = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": f"JuniorTeacher_{uid}",
            "email_or_phone": f"junior_{uid}@inpand.com",
            "password": "Admin@123",
            "role": "teacher",
            "department_id": 1
        })
        self.assertEqual(res.status_code, 201)

        # Class teacher creates another Class Teacher -> SUCCEED (201)
        res_ct = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": f"CoClassTeacher_{uid}",
            "email_or_phone": f"co_ct_{uid}@inpand.com",
            "password": "Admin@123",
            "role": "class_teacher",
            "department_id": 1
        })
        self.assertEqual(res_ct.status_code, 201)

        # Class teacher tries to create an Admin -> MUST BE REJECTED (403)
        res_admin = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": f"UnauthAdmin_{uid}",
            "email_or_phone": f"unauth_{uid}@inpand.com",
            "password": "Password@123",
            "role": "admin"
        })
        self.assertEqual(res_admin.status_code, 403)

    def test_04_multi_tier_notifications(self):
        """Verify multi-tier notifications sending hierarchy and recipient retrieval."""
        s_token = self.login("superadmin", "Admin@123")
        a_token = self.login("admin", "Admin@123")
        ct_token = self.login("class teacher1 CSE", "Admin@123")
        t_token = self.login("teacher1 CSE", "Admin@123")
        st_token = self.login("Stu11_CSE", "Admin@123")

        # 1. Super Admin sends notification to admin -> SUCCEED
        res = self.client.post("/api/notifications/send", headers={"Authorization": f"Bearer {s_token}"}, json={
            "target_role": "admin",
            "title": "Super Admin Notice",
            "message": "Audit notice to admins"
        })
        self.assertEqual(res.status_code, 201)

        # 2. Admin sends notification to teacher -> SUCCEED
        res = self.client.post("/api/notifications/send", headers={"Authorization": f"Bearer {a_token}"}, json={
            "target_role": "teacher",
            "title": "Faculty Meeting",
            "message": "Meeting scheduled tomorrow"
        })
        self.assertEqual(res.status_code, 201)

        # 3. Class Teacher sends notification to students -> SUCCEED
        res = self.client.post("/api/notifications/send", headers={"Authorization": f"Bearer {ct_token}"}, json={
            "target_role": "student",
            "title": "Class Teacher Announcement",
            "message": "Homework submission deadline Monday"
        })
        self.assertEqual(res.status_code, 201)

        # 4. Teacher sends notification to student -> SUCCEED
        res = self.client.post("/api/notifications/send", headers={"Authorization": f"Bearer {t_token}"}, json={
            "target_role": "student",
            "title": "Quiz 2 Announcement",
            "message": "Practice quizzes are now live"
        })
        self.assertEqual(res.status_code, 201)

        # 5. Teacher tries to send notification to admin -> REJECTED (403)
        res_fail = self.client.post("/api/notifications/send", headers={"Authorization": f"Bearer {t_token}"}, json={
            "target_role": "admin",
            "title": "Unauthorized broadcast",
            "message": "Testing unauthorized send"
        })
        self.assertEqual(res_fail.status_code, 403)

        # 6. Student checks inbox -> sees student notifications!
        st_res = self.client.get("/api/notifications", headers={"Authorization": f"Bearer {st_token}"})
        self.assertEqual(st_res.status_code, 200)
        notifs = st_res.get_json()["notifications"]
        self.assertTrue(any(n["title"] == "Class Teacher Announcement" for n in notifs))
        self.assertTrue(any(n["title"] == "Quiz 2 Announcement" for n in notifs))

    def test_05_email_only_authentication_enforcement(self):
        """Strict enforcement: Full name, username, or phone number cannot be accepted for login. Only email is accepted."""
        # 1. Attempt login with username -> MUST RETURN 400
        res_u = self.client.post("/api/auth/login", json={
            "email": "superadmin",
            "password": "Admin@123"
        })
        self.assertEqual(res_u.status_code, 400)
        self.assertIn("Only email address is accepted", res_u.get_json()["error"])

        # 2. Attempt login with full name -> MUST RETURN 400
        res_n = self.client.post("/api/auth/login", json={
            "email": "Super Admin",
            "password": "Admin@123"
        })
        self.assertEqual(res_n.status_code, 400)
        self.assertIn("Only email address is accepted", res_n.get_json()["error"])

        # 3. Attempt login with phone number -> MUST RETURN 400
        res_p = self.client.post("/api/auth/login", json={
            "email": "9876543210",
            "password": "Admin@123"
        })
        self.assertEqual(res_p.status_code, 400)
        self.assertIn("Only email address is accepted", res_p.get_json()["error"])

        # 4. Valid email login -> MUST SUCCEED (200)
        res_ok = self.client.post("/api/auth/login", json={
            "email": "superadmin1@inpand.com",
            "password": "Admin@123"
        })
        self.assertEqual(res_ok.status_code, 200)
        self.assertIn("token", res_ok.get_json())
        self.assertEqual(res_ok.get_json()["user"]["email"], "superadmin1@inpand.com")

    def test_06_student_quiz_submission_feedback(self):
        """Student submits answer and gets feedback."""
        student_token = self.login("Stu11_CSE", "Admin@123")
        student_headers = {"Authorization": f"Bearer {student_token}"}

        # Fetch questions
        res = self.client.get("/api/student/questions", headers=student_headers)
        self.assertEqual(res.status_code, 200)
        questions = res.get_json().get("questions", [])
        if questions:
            q1 = questions[0]
            ans_res = self.client.post(f"/api/student/questions/{q1['id']}/submit", headers=student_headers, json={
                "selected_option": "A",
                "time_taken_seconds": 15
            })
            self.assertIn(ans_res.status_code, [200, 400])

if __name__ == "__main__":
    unittest.main()
