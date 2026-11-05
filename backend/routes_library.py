"""Library book circulation routes for Librarian, Admin, and Super Admin."""
import datetime
from flask import Blueprint, g, jsonify, request
from backend.db import execute_write, query_all, query_one
from backend.auth import require_auth

library_bp = Blueprint("library", __name__, url_prefix="/api/library")

def get_today_date():
    return datetime.date.today()

@library_bp.route("/books", methods=["GET"])
@require_auth(allowed_roles=["librarian", "admin", "super_admin"])
def get_library_students():
    """Return all students with their current library book status (or 'no books')."""
    search_q = (request.args.get("search") or request.args.get("q") or "").strip().lower()
    dept_id = request.args.get("department_id")
    status_filter = (request.args.get("status") or "").strip().lower()  # 'all' | 'issued' | 'nobooks'

    sql = """
        SELECT 
            u.id AS student_id,
            u.name AS student_name,
            u.email,
            u.username,
            st.roll_number,
            COALESCE(d.id, st.department_id) AS department_id,
            COALESCE(d.name, 'General Engineering') AS department_name
        FROM users u
        LEFT JOIN student_profiles st ON st.user_id = u.id
        LEFT JOIN departments d ON d.id = st.department_id
        WHERE u.role IN ('student', 'class_leader') AND u.status = 'active'
    """
    params = []

    if dept_id and dept_id.isdigit():
        sql += " AND (st.department_id = ? OR d.id = ?)"
        params.extend([int(dept_id), int(dept_id)])

    if search_q:
        sql += """ AND (
            LOWER(u.name) LIKE ? OR
            LOWER(u.email) LIKE ? OR
            LOWER(COALESCE(u.username, '')) LIKE ? OR
            LOWER(COALESCE(st.roll_number, '')) LIKE ? OR
            LOWER(COALESCE(d.name, '')) LIKE ? OR
            EXISTS (
                SELECT 1 FROM student_library_books slb 
                WHERE slb.student_id = u.id AND LOWER(slb.book_name) LIKE ?
            )
        )"""
        s_term = f"%{search_q}%"
        params.extend([s_term, s_term, s_term, s_term, s_term, s_term])

    sql += " ORDER BY u.id ASC"
    rows = query_all(sql, tuple(params))

    # Fetch all book circulation records (both active and previous/returned)
    all_books_sql = """
        SELECT 
            id, 
            student_id, 
            book_name, 
            TO_CHAR(validity_date, 'YYYY-MM-DD') AS validity_date, 
            status, 
            TO_CHAR(issued_at, 'YYYY-MM-DD HH24:MI') AS issued_at,
            TO_CHAR(returned_at, 'YYYY-MM-DD HH24:MI') AS returned_at
        FROM student_library_books
        ORDER BY id DESC
    """
    all_books_rows = query_all(all_books_sql)

    books_by_student = {}
    for b in all_books_rows:
        sid = b["student_id"]
        if sid not in books_by_student:
            books_by_student[sid] = {"active": [], "previous": []}
        book_info = {
            "id": b["id"],
            "book_name": b["book_name"],
            "validity_date": b["validity_date"],
            "status": b["status"],
            "issued_at": b["issued_at"],
            "returned_at": b["returned_at"]
        }
        if b["status"] == "issued":
            books_by_student[sid]["active"].append(book_info)
        else:
            books_by_student[sid]["previous"].append(book_info)

    today = get_today_date()
    students = []
    total_count = len(rows)
    issued_count = 0
    no_books_count = 0

    for r in rows:
        sid = r["student_id"]
        stu_books = books_by_student.get(sid, {"active": [], "previous": []})
        active_list = stu_books["active"]
        previous_list = stu_books["previous"]
        has_book = len(active_list) > 0

        latest_active = active_list[0] if active_list else None
        val_date_str = latest_active["validity_date"] if latest_active else None
        is_overdue = False

        if has_book:
            for ab in active_list:
                ab["is_overdue"] = False
                ab_val = ab.get("validity_date")
                if ab_val:
                    try:
                        v_date = datetime.datetime.strptime(ab_val, "%Y-%m-%d").date()
                        if v_date < today:
                            ab["is_overdue"] = True
                            is_overdue = True
                    except Exception:
                        pass
            issued_count += 1
        else:
            no_books_count += 1

        # Check status filter
        if status_filter == "issued" and not has_book:
            continue
        if status_filter in ("nobooks", "no_books", "unissued") and has_book:
            continue

        students.append({
            "student_id": sid,
            "student_name": r["student_name"],
            "email": r["email"],
            "username": r["username"],
            "roll_number": r["roll_number"] or f"REG-{sid}",
            "department_id": r["department_id"],
            "department_name": r["department_name"],
            "has_book": has_book,
            "book_name": latest_active["book_name"] if latest_active else None,
            "validity_date": val_date_str,
            "issued_at": latest_active["issued_at"] if latest_active else None,
            "is_overdue": is_overdue,
            "active_books": active_list,
            "previous_books": previous_list
        })

    return jsonify({
        "students": students,
        "total_students": total_count,
        "issued_count": issued_count,
        "no_books_count": max(0, 1000 - issued_count),
        "today": str(today)
    }), 200

@library_bp.route("/issue", methods=["POST"])
@require_auth(allowed_roles=["librarian", "admin", "super_admin"])
def issue_book():
    """Issue a library book to a student with book name and validity period (present or future date only)."""
    data = request.get_json(silent=True) or {}
    raw_sid = data.get("student_id")
    book_name = (data.get("book_name") or "").strip()
    validity_date_str = (data.get("validity_date") or "").strip()

    if not raw_sid:
        return jsonify({"error": "Student ID is required"}), 400
    try:
        student_id = int(raw_sid)
    except (ValueError, TypeError):
        return jsonify({"error": "Student ID must be an integer"}), 400

    if not book_name:
        return jsonify({"error": "Book name is required"}), 400

    if not validity_date_str:
        return jsonify({"error": "Validity period date is required"}), 400

    # Parse and validate validity date
    try:
        val_date = datetime.datetime.strptime(validity_date_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return jsonify({"error": "Validity date must be a valid date in YYYY-MM-DD format"}), 400

    # Rule: Validity date must be present date (today) or future date. Past date CANNOT be entered.
    today = get_today_date()
    if val_date < today:
        return jsonify({
            "error": f"Invalid validity period. Validity date cannot be in the past ({val_date}). Please select present date ({today}) or a future date."
        }), 400

    # Verify student exists
    student = query_one("SELECT id, name FROM users WHERE id = ? AND role IN ('student', 'class_leader')", (student_id,))
    if not student:
        return jsonify({"error": "Student account not found"}), 404

    # Insert new active book issue (allows multiple books to be issued to a student)
    execute_write("""
        INSERT INTO student_library_books (student_id, book_name, validity_date, status, issued_by_id)
        VALUES (?, ?, ?, 'issued', ?)
    """, (student_id, book_name, str(val_date), g.current_user["id"]))

    return jsonify({
        "message": f"Book '{book_name}' issued to {student['name']} successfully (Valid until {val_date}).",
        "student_id": student_id,
        "book_name": book_name,
        "validity_date": str(val_date),
        "has_book": True
    }), 200

@library_bp.route("/return/<int:student_id>", methods=["POST"])
@require_auth(allowed_roles=["librarian", "admin", "super_admin"])
def return_book(student_id: int):
    """Mark a student's currently issued library book as returned. Can return a specific book_id or all books."""
    student = query_one("SELECT id, name FROM users WHERE id = ? AND role IN ('student', 'class_leader')", (student_id,))
    if not student:
        return jsonify({"error": "Student account not found"}), 404

    data = request.get_json(silent=True) or {}
    book_id = data.get("book_id")

    if book_id and str(book_id).lower() != "all":
        try:
            bid = int(book_id)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid book ID"}), 400

        target_book = query_one("""
            SELECT id, book_name FROM student_library_books 
            WHERE id = ? AND student_id = ? AND status = 'issued'
        """, (bid, student_id))

        if not target_book:
            return jsonify({"error": "Selected book was not found or has already been returned."}), 400

        book_title = target_book["book_name"]
        execute_write("""
            UPDATE student_library_books
            SET status = 'returned', returned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND student_id = ? AND status = 'issued'
        """, (bid, student_id))
    else:
        # Return all currently issued books for this student
        active_books = query_all("""
            SELECT id, book_name FROM student_library_books 
            WHERE student_id = ? AND status = 'issued'
        """, (student_id,))
        if not active_books:
            return jsonify({"message": f"Student '{student['name']}' already has no books issued.", "has_book": False}), 200

        book_title = ", ".join(b["book_name"] for b in active_books)
        execute_write("""
            UPDATE student_library_books
            SET status = 'returned', returned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE student_id = ? AND status = 'issued'
        """, (student_id,))

    # Check remaining active issued books for this student
    rem_row = query_one("""
        SELECT COUNT(*) as cnt FROM student_library_books 
        WHERE student_id = ? AND status = 'issued'
    """, (student_id,))
    remaining_count = rem_row["cnt"] if rem_row else 0

    return jsonify({
        "message": f"Book '{book_title}' returned successfully for {student['name']}.",
        "student_id": student_id,
        "book_name": book_title,
        "remaining_count": remaining_count,
        "has_book": remaining_count > 0
    }), 200

@library_bp.route("/my-book", methods=["GET"])
@require_auth(allowed_roles=["student", "class_leader"])
def get_my_book():
    """Return currently issued library book for the logged in student."""
    sid = g.current_user["id"]
    book = query_one("""
        SELECT book_name, TO_CHAR(validity_date, 'YYYY-MM-DD') AS validity_date, issued_at
        FROM student_library_books
        WHERE student_id = ? AND status = 'issued'
        ORDER BY id DESC LIMIT 1
    """, (sid,))
    if not book:
        return jsonify({"has_book": False, "book": None, "message": "No books"}), 200
    return jsonify({"has_book": True, "book": book}), 200
