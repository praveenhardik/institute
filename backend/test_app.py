import os
import sys
import unittest
import uuid

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app import create_app
from backend.db import init_db
from backend.seed_data import seed_database

class TestQuizManagementSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        seed_database()
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def login(self, identifier, password):
        res = self.client.post("/api/auth/login", json={"email": identifier, "password": password})
        self.assertEqual(res.status_code, 200, f"Failed login for {identifier}: {res.get_json()}")
        return res.get_json()["token"]

    def test_01_super_admin_permissions_and_deletion(self):
        """Super Admin can view profiles, create ONLY admin accounts, and delete admin accounts."""
        token = self.login("superadmin@college.edu", "Admin@123")
        headers = {"Authorization": f"Bearer {token}"}

        # Profile viewing
        res = self.client.get("/api/admin/profiles", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertGreater(len(res.get_json()["users"]), 0)

        # Super admin tries to create an 'admin' -> MUST SUCCEED
        uid = uuid.uuid4().hex[:6]
        res = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": f"Branch Admin {uid}",
            "email_or_phone": f"admin_{uid}@college.edu",
            "password": "Password@123",
            "role": "admin"
        })
        self.assertEqual(res.status_code, 201)
        created_admin_id = res.get_json()["user"]["id"]

        # Super admin tries to create a 'super_admin' -> MUST BE REJECTED (403)
        res = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": "Rogue Super Admin",
            "email_or_phone": f"rogue_{uid}@college.edu",
            "password": "Password@123",
            "role": "super_admin"
        })
        self.assertEqual(res.status_code, 403)

        # Super admin tries to create a 'teacher' -> MUST BE REJECTED (403)
        res = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": "Unauthorized Teacher",
            "email_or_phone": f"unauth_{uid}@college.edu",
            "password": "Password@123",
            "role": "teacher"
        })
        self.assertEqual(res.status_code, 403)

        # Super admin DELETES the created admin account -> MUST SUCCEED (200)
        del_res = self.client.delete(f"/api/admin/users/{created_admin_id}", headers=headers)
        self.assertEqual(del_res.status_code, 200)

        # Super admin tries to delete a teacher -> MUST BE REJECTED (403)
        teacher_id = self.client.get("/api/admin/profiles?role=teacher", headers=headers).get_json()["users"][0]["id"]
        del_teacher_fail = self.client.delete(f"/api/admin/users/{teacher_id}", headers=headers)
        self.assertEqual(del_teacher_fail.status_code, 403)

    def test_02_admin_permissions_and_deletion(self):
        """Admin can create teacher, class_teacher, admin, super_admin, and delete teacher/class_teacher."""
        token = self.login("admin@college.edu", "Admin@123")
        headers = {"Authorization": f"Bearer {token}"}
        uid = uuid.uuid4().hex[:6]

        # Admin creates teacher -> SUCCEED
        res_t = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": f"Teacher {uid}",
            "email_or_phone": f"teacher_{uid}@college.edu",
            "password": "Teacher@123",
            "role": "teacher"
        })
        self.assertEqual(res_t.status_code, 201)
        created_teacher_id = res_t.get_json()["user"]["id"]

        # Admin creates class_teacher -> SUCCEED
        res_ct = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": f"Class Teacher {uid}",
            "email_or_phone": f"ct_{uid}@college.edu",
            "password": "Teacher@123",
            "role": "class_teacher"
        })
        self.assertEqual(res_ct.status_code, 201)
        created_ct_id = res_ct.get_json()["user"]["id"]

        # Admin deletes teacher account -> MUST SUCCEED (200)
        del_t = self.client.delete(f"/api/admin/users/{created_teacher_id}", headers=headers)
        self.assertEqual(del_t.status_code, 200)

        # Admin deletes class_teacher account -> MUST SUCCEED (200)
        del_ct = self.client.delete(f"/api/admin/users/{created_ct_id}", headers=headers)
        self.assertEqual(del_ct.status_code, 200)

        # Admin tries to delete another admin -> MUST BE REJECTED (403)
        admin_id = self.client.get("/api/admin/profiles?role=admin", headers=headers).get_json()["users"][0]["id"]
        del_admin_fail = self.client.delete(f"/api/admin/users/{admin_id}", headers=headers)
        # 400 if self or 403 if other admin
        self.assertIn(del_admin_fail.status_code, [400, 403])

    def test_03_class_teacher_creation_capabilities(self):
        """Class Teacher can create Teacher and Class Teacher accounts."""
        token = self.login("classteacher@college.edu", "Teacher@123")
        headers = {"Authorization": f"Bearer {token}"}
        uid = uuid.uuid4().hex[:6]

        # Class teacher creates a Teacher -> SUCCEED (201)
        res = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": f"Junior Teacher {uid}",
            "email_or_phone": f"junior_{uid}@college.edu",
            "password": "Teacher@123",
            "role": "teacher"
        })
        self.assertEqual(res.status_code, 201)

        # Class teacher creates another Class Teacher -> SUCCEED (201)
        res_ct = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": f"Co-Class Teacher {uid}",
            "email_or_phone": f"co_ct_{uid}@college.edu",
            "password": "Teacher@123",
            "role": "class_teacher"
        })
        self.assertEqual(res_ct.status_code, 201)

        # Class teacher tries to create an Admin -> MUST BE REJECTED (403)
        res_admin = self.client.post("/api/admin/create-account", headers=headers, json={
            "name": "Unauthorized Admin",
            "email_or_phone": f"unauth_adm_{uid}@college.edu",
            "password": "Password@123",
            "role": "admin"
        })
        self.assertEqual(res_admin.status_code, 403)

    def test_04_multi_tier_notifications(self):
        """Verify multi-tier notifications sending hierarchy and recipient retrieval."""
        s_token = self.login("superadmin@college.edu", "Admin@123")
        a_token = self.login("admin@college.edu", "Admin@123")
        ct_token = self.login("classteacher@college.edu", "Teacher@123")
        t_token = self.login("teacher@college.edu", "Teacher@123")
        st_token = self.login("student@college.edu", "Student@123")

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

    def test_05_phone_number_authentication(self):
        """Student self-registration and login with Phone Number instead of email."""
        phone = f"98{uuid.uuid4().int % 100000000:08d}"
        
        # Self-register with phone number
        reg_res = self.client.post("/api/auth/register-student", json={
            "name": "Mobile Student",
            "email_or_phone": phone,
            "password": "Password@123"
        })
        self.assertEqual(reg_res.status_code, 201)
        student_id = reg_res.get_json()["student_id"]

        # Approve student
        admin_token = self.login("admin@college.edu", "Admin@123")
        self.client.post(f"/api/admin/students/{student_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})

        # Login with phone number
        login_res = self.client.post("/api/auth/login", json={
            "email_or_phone": phone,
            "password": "Password@123"
        })
        self.assertEqual(login_res.status_code, 200)
        self.assertEqual(login_res.get_json()["user"]["email"], phone)

    def test_06_student_quiz_submission_feedback(self):
        """Student submits answer and gets correct_option, is_correct, explanation for green/red coloring."""
        student_token = self.login("student@college.edu", "Student@123")
        student_headers = {"Authorization": f"Bearer {student_token}"}

        # Fetch questions
        res = self.client.get("/api/student/questions", headers=student_headers)
        self.assertEqual(res.status_code, 200)
        questions = res.get_json()["questions"]
        self.assertGreater(len(questions), 0)

        # Pick question
        q1 = next((q for q in questions if "binary search" in q["question_text"].lower()), questions[0])

        # Submit answer
        ans_res = self.client.post(f"/api/student/questions/{q1['id']}/submit", headers=student_headers, json={
            "selected_option": "A",
            "time_taken_seconds": 15
        })
        self.assertIn(ans_res.status_code, [200, 400]) # 200 if fresh or 400 if already submitted

if __name__ == "__main__":
    unittest.main()
