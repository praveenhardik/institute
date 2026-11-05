
import os
import sys
from flask import Blueprint, g, jsonify, request

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.db import department_name_of_user, execute_write, query_all, query_one
from backend.auth import require_auth

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")

@notifications_bp.route("", methods=["GET"])
@require_auth()
def get_user_notifications():
    """Retrieve notifications applicable to the authenticated user's role and account."""
    user = g.current_user
    user_role = user["role"]
    user_id = user["id"]

    # Role matching rules ensuring every role gets targeted and broadcast notices
    roles_to_match = list(set([user_role, "all"]))
    if user_role in ["dean", "super_admin", "admin", "principal"]:
        roles_to_match.extend(["dean", "admin", "super_admin", "principal"])
    if user_role in ["teacher", "class_teacher", "hod"]:
        roles_to_match.append("teacher")
    if user_role == "hod":
        roles_to_match.append("hod")
    if user_role == "class_teacher":
        roles_to_match.append("class_teacher")
    if user_role in ["student", "class_leader"]:
        roles_to_match.append("student")
    if user_role in ["accountant", "librarian"]:
        roles_to_match.extend(["staff", "accountant"])
    roles_to_match = list(set(roles_to_match))

    # Automatically synchronize registration notices in DB: if referenced user is already active or rejected, ensure is_read = 1
    execute_write("""
        UPDATE notifications 
        SET is_read = 1 
        WHERE is_read = 0 
          AND (
            reference_id IN (SELECT id FROM users WHERE status IN ('active', 'rejected', 'inactive'))
            OR (type IN ('student_registration', 'account_approval') AND reference_id IN (SELECT id FROM users WHERE status IN ('active', 'rejected', 'inactive')))
          )
    """)

    # For reviewers, automatically ensure notifications exist for pending account registrations
    if user_role in ("super_admin", "admin", "teacher"):
        pending_roles = ["student", "class_leader"]
        if user_role in ("super_admin", "admin"):
            pending_roles.extend(["teacher", "class_teacher", "hod", "accountant", "librarian"])
        if user_role == "super_admin":
            pending_roles.append("admin")

        p_placeholders = ",".join("?" for _ in pending_roles)
        pending_users = query_all(f"""
            SELECT u.id, u.name, u.email, u.username, u.role, u.created_at,
                   COALESCE(d.name, 'General') AS department_name
            FROM users u
            LEFT JOIN student_profiles sp ON sp.user_id = u.id
            LEFT JOIN departments d ON d.id = sp.department_id
            WHERE u.status = 'pending' AND u.role IN ({p_placeholders})
            AND NOT EXISTS (
                SELECT 1 FROM notifications n 
                WHERE n.reference_id = u.id AND n.type IN ('student_registration', 'account_approval')
            )
        """, tuple(pending_roles))

        for pu in pending_users:
            r_title = pu['role'].replace('_', ' ').title()
            execute_write("""
                INSERT INTO notifications (recipient_role, sender_id, sender_role, sender_name, type, title, message, reference_id, department_name, is_read)
                VALUES (?, ?, 'system', 'Admissions System', 'student_registration', ?, ?, ?, ?, 0)
            """, (
                user_role, user_id,
                f"New {r_title} Account Needs Approval: {pu['name']}",
                f"Account registration for {pu['name']} ({pu['username'] or pu['email']}) requires your review. Click Accept or Reject below.",
                pu["id"], pu["department_name"]
            ))

    placeholders = ",".join("?" for _ in roles_to_match)
    sql = f"""
        SELECT n.id, n.recipient_role, n.recipient_id, n.sender_id, n.sender_role, n.sender_name,
               n.type, n.title, n.message, n.reference_id, n.department_name,
               CASE 
                   WHEN (n.type IN ('student_registration', 'account_approval') OR n.reference_id IS NOT NULL) 
                        AND u.status IN ('active', 'rejected', 'inactive') THEN 1 
                   ELSE n.is_read 
               END AS is_read,
               n.created_at,
               u.status AS user_status, u.role AS target_user_role, u.name AS target_user_name
        FROM notifications n
        LEFT JOIN users u ON u.id = n.reference_id
        WHERE (n.recipient_role IN ({placeholders}) OR n.recipient_id = ?)
          AND NOT (n.type = 'student_registration' AND n.recipient_role <> ?)
        ORDER BY n.id DESC
    """
    # Registration requests go only to the one role that reviews them (e.g. Teacher -> Admin),
    # never to other roles that happen to share a broadcast role.
    params = roles_to_match + [user_id, user_role]
    notifications = query_all(sql, tuple(params))
    unread_count = sum(1 for n in notifications if n["is_read"] == 0)

    return jsonify({
        "notifications": notifications,
        "unread_count": unread_count
    }), 200

@notifications_bp.route("/send", methods=["POST"])
@require_auth(allowed_roles=["super_admin", "admin", "principal", "class_teacher", "teacher", "class_leader"])
def send_notification():
    """Multi-tier notification dispatching with strict hierarchy enforcement:
    - Principal: can dispatch notifications to Selected Students, Whole Department Students, Teachers, or Admin
    - Teachers & Class Teachers: can dispatch notifications to academic departments or roles
    - Admins: can send notifications to Teachers, Class Teachers, Students
    - Super Admins: can send notifications to Admins, Teachers, Class Teachers, Students
    - Class Leaders: can dispatch notifications to students in their own department only
    """
    sender = g.current_user
    data = request.get_json() or {}

    raw_target = str(data.get("department_id") or data.get("target_role") or "").strip()
    title = (data.get("title") or "").strip()
    message = (data.get("message") or "").strip()
    # Department notices: "all" = students + faculty of the department, "students" = students only
    scope = str(data.get("scope") or "all").strip().lower()
    # Teachers, class teachers, principal (for whole department students), and class leaders notify students only
    if g.current_user["role"] in ("teacher", "class_teacher", "principal", "class_leader"):
        scope = "students"

    # Enforce department restriction for class leaders
    if sender["role"] == "class_leader":
        cl_dept = query_one("""
            SELECT d.id, d.name, d.code FROM student_profiles st
            LEFT JOIN batches b ON b.id = st.batch_id
            LEFT JOIN programs p ON p.id = b.program_id
            JOIN departments d ON d.id = COALESCE(st.department_id, p.department_id)
            WHERE st.user_id = ?
        """, (sender["id"],))
        if not cl_dept:
            return jsonify({"error": "No assigned department found for this class leader."}), 403
        raw_target = str(cl_dept["id"])

    if not raw_target or not title or not message:
        return jsonify({"error": "Target department/role, title, and message are all required"}), 400
    if scope not in ("all", "students"):
        return jsonify({"error": "Scope must be 'all' or 'students'"}), 400

    # 1. Selected Students specific direct notification
    student_ids = data.get("student_ids") or data.get("recipient_ids") or []
    if isinstance(student_ids, (int, str)) and str(student_ids).isdigit():
        student_ids = [int(student_ids)]
    elif isinstance(student_ids, str) and student_ids:
        student_ids = [int(x.strip()) for x in student_ids.split(",") if x.strip().isdigit()]

    if raw_target == "selected_students" or (student_ids and len(student_ids) > 0 and raw_target not in ("admin", "teacher", "class_teacher")):
        if sender["role"] not in ("super_admin", "admin", "principal", "teacher", "class_teacher"):
            return jsonify({"error": "Permission denied: your role cannot send notifications to selected students."}), 403

        valid_ids = []
        for sid in student_ids:
            try:
                sid_int = int(sid)
                if query_one("SELECT id FROM users WHERE id = ? AND role IN ('student', 'class_leader')", (sid_int,)):
                    valid_ids.append(sid_int)
            except (ValueError, TypeError):
                pass

        if not valid_ids:
            return jsonify({"error": "Please select at least one student to send this notification to."}), 400

        for uid in valid_ids:
            execute_write("""
                INSERT INTO notifications (recipient_id, sender_id, sender_role, sender_name, type, title, message, is_read)
                VALUES (?, ?, ?, ?, 'direct_message', ?, ?, 0)
            """, (uid, sender["id"], sender["role"], sender["name"], title, message))

        notif_id = execute_write("""
            INSERT INTO notifications (recipient_role, sender_id, sender_role, sender_name, type, title, message, reference_id, is_read)
            VALUES ('audit', ?, ?, ?, 'direct_broadcast', ?, ?, ?, 0)
        """, (sender["id"], sender["role"], sender["name"], title, message, len(valid_ids)))

        return jsonify({
            "message": f"Notification successfully dispatched to {len(valid_ids)} selected student(s).",
            "notification_id": notif_id,
            "recipient_count": len(valid_ids)
        }), 201

    # 2. Check if target is a department (by ID or name)
    # For teachers and class teachers: automatically resolve their assigned department(s) to notify all their students
    if sender["role"] in ("teacher", "class_teacher") and (raw_target.lower() in ("department", "department-wise", "my_departments") or raw_target.isdigit()):
        user_depts = query_all("""
            SELECT DISTINCT d.id, d.name, d.code FROM departments d
            WHERE d.id IN (
                SELECT department_id FROM staff_departments WHERE user_id = ?
                UNION
                SELECT department_id FROM staff_profiles WHERE user_id = ?
            )
        """, (sender["id"], sender["id"]))
        if not user_depts:
            return jsonify({"error": "No assigned department found for your account."}), 403

        dept_ids = [d["id"] for d in user_depts]
        dept_names = ", ".join(d["name"] for d in user_depts)

        placeholders = ",".join("?" for _ in dept_ids)
        student_recipients = query_all(f"""
            SELECT u.id FROM users u
            LEFT JOIN student_profiles sp ON sp.user_id = u.id
            LEFT JOIN batches b ON b.id = sp.batch_id
            LEFT JOIN programs p ON p.id = b.program_id
            WHERE (sp.department_id IN ({placeholders}) OR p.department_id IN ({placeholders}))
              AND u.role IN ('student', 'class_leader')
              AND u.status = 'active'
        """, tuple(dept_ids + dept_ids))

        all_recipient_ids = sorted({r["id"] for r in student_recipients})
        for uid in all_recipient_ids:
            execute_write("""
                INSERT INTO notifications (recipient_id, sender_id, sender_role, sender_name, type, title, message, department_name, is_read)
                VALUES (?, ?, ?, ?, 'department_message', ?, ?, ?, 0)
            """, (uid, sender["id"], sender["role"], sender["name"], title, message, dept_names))

        notif_id = execute_write("""
            INSERT INTO notifications (recipient_role, sender_id, sender_role, sender_name, type, title, message, department_name, reference_id, is_read)
            VALUES ('audit', ?, ?, ?, 'department_broadcast', ?, ?, ?, ?, 0)
        """, (sender["id"], sender["role"], sender["name"], title, message, dept_names, dept_ids[0]))

        execute_write("""
            INSERT INTO notifications (recipient_role, sender_id, sender_role, sender_name, type, title, message, department_name, is_read)
            VALUES ('parent', ?, ?, ?, 'department_broadcast', ?, ?, ?, 0)
        """, (sender["id"], sender["role"], sender["name"], title, message, dept_names))

        return jsonify({
            "message": f"Notification sent to {len(all_recipient_ids)} student(s) in {dept_names}. Parents received it too.",
            "notification_id": notif_id,
            "department": dept_names
        }), 201

    dept = None
    if raw_target.isdigit():
        dept = query_one("SELECT id, name, code FROM departments WHERE id = ?", (int(raw_target),))
    else:
        dept = query_one("SELECT id, name, code FROM departments WHERE LOWER(name) = LOWER(?) OR LOWER(code) = LOWER(?)", (raw_target, raw_target))

    if dept:
        # Department announcement for students and faculty of this department
        student_recipients = query_all("""
            SELECT u.id FROM users u
            LEFT JOIN student_profiles sp ON sp.user_id = u.id
            LEFT JOIN batches b ON b.id = sp.batch_id
            LEFT JOIN programs p ON p.id = b.program_id
            WHERE (sp.department_id = ? OR p.department_id = ?)
              AND u.role IN ('student', 'class_leader')
              AND u.status = 'active'
        """, (dept["id"], dept["id"]))

        staff_recipients = query_all("""
            SELECT u.id FROM users u
            LEFT JOIN staff_profiles sp ON sp.user_id = u.id
            WHERE sp.department_id = ?
              AND u.role IN ('teacher', 'class_teacher')
              AND u.status = 'active'
        """, (dept["id"],))

        audience_rows = student_recipients if scope == "students" else (student_recipients + staff_recipients)
        all_recipient_ids = sorted({r["id"] for r in audience_rows})
        for uid in all_recipient_ids:
            execute_write("""
                INSERT INTO notifications (recipient_id, sender_id, sender_role, sender_name, type, title, message, department_name, is_read)
                VALUES (?, ?, ?, ?, 'department_message', ?, ?, ?, 0)
            """, (uid, sender["id"], sender["role"], sender["name"], title, message, dept["name"]))

        # Audit record only. recipient_role 'audit' matches no user role, so it is NOT shown to every campus user.
        notif_id = execute_write("""
            INSERT INTO notifications (recipient_role, sender_id, sender_role, sender_name, type, title, message, department_name, reference_id, is_read)
            VALUES ('audit', ?, ?, ?, 'department_broadcast', ?, ?, ?, ?, 0)
        """, (sender["id"], sender["role"], sender["name"], title, message, dept["name"], dept["id"]))

        parents_note = ""
        if sender["role"] in ("teacher", "class_teacher"):
            execute_write("""
                INSERT INTO notifications (recipient_role, sender_id, sender_role, sender_name, type, title, message, department_name, is_read)
                VALUES ('parent', ?, ?, ?, 'department_broadcast', ?, ?, ?, 0)
            """, (sender["id"], sender["role"], sender["name"], title, message, dept["name"]))
            parents_note = " Parents received it too."

        audience_text = "students only" if scope == "students" else "students and faculty"
        return jsonify({
            "message": f"Notification sent to {len(all_recipient_ids)} recipient(s) ({audience_text}) in {dept['name']}.{parents_note}",
            "notification_id": notif_id,
            "department": dept["name"]
        }), 201

    target_role = raw_target.lower()
    # Strict hierarchy validation for role-based broadcast
    allowed_targets = []
    if sender["role"] in ("super_admin", "principal"):
        allowed_targets = ["admin", "teacher", "class_teacher", "student", "selected_students"]
    elif sender["role"] == "admin":
        allowed_targets = ["teacher", "class_teacher", "student", "selected_students"]
    elif sender["role"] == "class_teacher":
        allowed_targets = ["teacher", "student", "selected_students"]
    elif sender["role"] == "teacher":
        allowed_targets = ["student", "selected_students"]

    if target_role not in allowed_targets:
        allowed_names = ", ".join(t.replace("_", " ").title() for t in allowed_targets)
        return jsonify({
            "error": f"Permission denied: As a {sender['role'].replace('_', ' ').title()}, you can only dispatch notifications to: {allowed_names} or choose an academic department"
        }), 403


    notif_id = execute_write("""
        INSERT INTO notifications (recipient_role, sender_id, sender_role, sender_name, type, title, message, department_name, is_read)
        VALUES (?, ?, ?, ?, 'broadcast', ?, ?, ?, 0)
    """, (target_role, sender["id"], sender["role"], sender["name"], title, message,
          department_name_of_user(sender["id"])))

    parents_note = ""
    if sender["role"] in ("teacher", "class_teacher"):
        execute_write("""
            INSERT INTO notifications (recipient_role, sender_id, sender_role, sender_name, type, title, message, department_name, is_read)
            VALUES ('parent', ?, ?, ?, 'broadcast', ?, ?, ?, 0)
        """, (sender["id"], sender["role"], sender["name"], title, message, department_name_of_user(sender["id"])))
        parents_note = " Parents received it too."

    return jsonify({
        "message": f"Notification successfully sent to all {target_role.replace('_', ' ').title()}s.{parents_note}",
        "notification_id": notif_id
    }), 201

@notifications_bp.route("/<int:notif_id>/read", methods=["POST"])
@require_auth()
def mark_notification_read(notif_id: int):
    """Mark a notification as read across all users/logins upon single click."""
    notif = query_one("SELECT * FROM notifications WHERE id = ?", (notif_id,))
    if not notif:
        return jsonify({"message": "Notification not found"}), 404

    # Mark this specific notification as read
    execute_write("UPDATE notifications SET is_read = 1 WHERE id = ?", (notif_id,))

    # If this notification has a reference_id, mark all notifications with that reference_id as read across ALL users/logins!
    if notif.get("reference_id"):
        execute_write("UPDATE notifications SET is_read = 1 WHERE reference_id = ?", (notif["reference_id"],))

    # If this notification is a broadcast or shared announcement, mark all matching notifications as read across ALL users!
    title = notif.get("title")
    message = notif.get("message")
    sender_id = notif.get("sender_id")
    if title:
        if sender_id and message:
            execute_write(
                "UPDATE notifications SET is_read = 1 WHERE title = ? AND sender_id = ? AND message = ?",
                (title, sender_id, message)
            )
        elif message:
            execute_write(
                "UPDATE notifications SET is_read = 1 WHERE title = ? AND message = ?",
                (title, message)
            )
        else:
            execute_write(
                "UPDATE notifications SET is_read = 1 WHERE title = ?",
                (title,)
            )

    return jsonify({"message": "Notification marked as read for all users"}), 200

@notifications_bp.route("/mark-all-read", methods=["POST"])
@require_auth()
def mark_all_read():
    """Mark all notifications for the user's role as read."""
    user = g.current_user
    roles_to_match = [user["role"], "all"]
    if user["role"] in ["super_admin", "admin"]:
        roles_to_match.append("admin")

    placeholders = ",".join("?" for _ in roles_to_match)
    execute_write(
        f"UPDATE notifications SET is_read = 1 WHERE recipient_role IN ({placeholders}) OR recipient_id = ?",
        tuple(roles_to_match + [user["id"]])
    )
    return jsonify({"message": "All notifications marked as read"}), 200


@notifications_bp.route("/department-message", methods=["POST"])
@require_auth(allowed_roles=["hod", "librarian"])
def send_department_message():
    """HOD: message the teachers and class teachers of the HOD's department.
    Librarian: message every admin, plus the teachers, class teachers, class leaders and students of the chosen department."""
    sender = g.current_user
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    message = (data.get("message") or "").strip()
    if not title or not message:
        return jsonify({"error": "Title and message are required"}), 400

    if sender["role"] == "hod":
        dept = query_one("SELECT id, name FROM departments WHERE hod_user_id = ?", (sender["id"],))
        if not dept:
            return jsonify({"error": "You are not assigned as HOD of any department yet"}), 403
        recipients = query_all("""
            SELECT u.id FROM users u JOIN staff_profiles sp ON sp.user_id = u.id
            WHERE sp.department_id = ? AND u.role IN ('teacher', 'class_teacher') AND u.status = 'active'
        """, (dept["id"],))
        audience = "the teachers and class teachers of your department"
    else:
        raw = str(data.get("department_id") or "").strip()
        dept = query_one("SELECT id, name FROM departments WHERE id = ?", (int(raw),)) if raw.isdigit() else None
        if not dept:
            return jsonify({"error": "Choose a department"}), 400

        student_ids = data.get("student_ids")
        target_mode = data.get("target_mode") or "all"

        staff_recipients = query_all("""
            SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND status = 'active'
            UNION
            SELECT u.id FROM users u JOIN staff_profiles sp ON sp.user_id = u.id
            WHERE sp.department_id = ? AND u.role IN ('teacher', 'class_teacher') AND u.status = 'active'
        """, (dept["id"],))

        if target_mode != "all" and student_ids is not None and isinstance(student_ids, list):
            if not student_ids:
                return jsonify({"error": "Please select at least one student or choose 'All Students'"}), 400
            placeholders = ",".join("?" for _ in student_ids)
            student_recipients = query_all(f"""
                SELECT id FROM users
                WHERE id IN ({placeholders}) AND role IN ('class_leader', 'student') AND status = 'active'
            """, tuple(student_ids))
            audience = f"faculty and {len(student_recipients)} selected student(s) of {dept['name']}"
        else:
            student_recipients = query_all("""
                SELECT u.id FROM users u JOIN student_profiles st ON st.user_id = u.id
                LEFT JOIN batches b ON b.id = st.batch_id LEFT JOIN programs p ON p.id = b.program_id
                WHERE COALESCE(st.department_id, p.department_id) = ? AND u.role IN ('class_leader', 'student') AND u.status = 'active'
            """, (dept["id"],))
            audience = f"all admins, faculty, and all {len(student_recipients)} student(s) of {dept['name']}"

        recipients = staff_recipients + student_recipients

    ids = sorted({r["id"] for r in recipients})
    for uid in ids:
        execute_write("""
            INSERT INTO notifications (recipient_id, sender_id, sender_role, sender_name, type, title, message, department_name, is_read)
            VALUES (?, ?, ?, ?, 'department_message', ?, ?, ?, 0)
        """, (uid, sender["id"], sender["role"], sender["name"], title, message, dept["name"]))
    return jsonify({"message": f"Notification sent to {len(ids)} people: {audience}.", "sent": len(ids)}), 201
