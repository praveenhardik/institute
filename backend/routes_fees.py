"""Fee management routes for Accountant, Admin, and Super Admin."""
import datetime
from flask import Blueprint, g, jsonify, request
from backend.db import execute_write, query_all, query_one
from backend.auth import require_auth

fees_bp = Blueprint("fees", __name__, url_prefix="/api/fees")

MINIMUM_FEE = 10000

def ensure_fee_records():
    """Ensure every active student has a record in student_fees table."""
    students = query_all("SELECT id FROM users WHERE role IN ('student', 'class_leader') AND status = 'active'")
    for st in students:
        sid = st["id"]
        row = query_one("SELECT id FROM student_fees WHERE student_id = ?", (sid,))
        if not row:
            # Seed with standard tuition fee (>= 10,000), alternate paid / unpaid for realistic demo state
            is_paid = (sid % 2 == 0)
            fee_amt = 12000
            paid_amt = fee_amt if is_paid else 0
            status = "paid" if is_paid else "unpaid"
            execute_write("""
                INSERT INTO student_fees (student_id, fee_amount, paid_amount, status, academic_year, paid_at)
                VALUES (?, ?, ?, ?, '2025-2026', CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE NULL END)
                ON CONFLICT (student_id) DO NOTHING
            """, (sid, fee_amt, paid_amt, status, status))

@fees_bp.route("/summary", methods=["GET"])
@require_auth(allowed_roles=["accountant", "admin", "super_admin", "dean"])
def get_fees_summary():
    """Return overall financial fees summary: overall fees, collected fees, and pending fees."""
    ensure_fee_records()

    row = query_one("""
        SELECT 
            COUNT(sf.id) AS total_students,
            COALESCE(SUM(sf.fee_amount), 0) AS overall_fees,
            COALESCE(SUM(sf.paid_amount), 0) AS collected_fees,
            COALESCE(SUM(CASE WHEN sf.fee_amount > sf.paid_amount THEN sf.fee_amount - sf.paid_amount ELSE 0 END), 0) AS pending_fees,
            COALESCE(SUM(CASE WHEN sf.status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_students,
            COALESCE(SUM(CASE WHEN sf.status = 'unpaid' THEN 1 ELSE 0 END), 0) AS unpaid_students,
            COALESCE(SUM(CASE WHEN sf.status = 'partial' THEN 1 ELSE 0 END), 0) AS partial_students
        FROM student_fees sf
        JOIN users u ON u.id = sf.student_id
        WHERE u.role IN ('student', 'class_leader')
    """)

    total = int(row["total_students"] or 0)
    overall = int(row["overall_fees"] or 0)
    collected = int(row["collected_fees"] or 0)
    pending = int(row["pending_fees"] or 0)
    paid_cnt = int(row["paid_students"] or 0)
    unpaid_cnt = int(row["unpaid_students"] or 0)
    partial_cnt = int(row["partial_students"] or 0)
    rate = round((collected / overall * 100), 1) if overall > 0 else 0.0

    return jsonify({
        "overall_fees": overall,
        "collected_fees": collected,
        "pending_fees": pending,
        "total_students": total,
        "paid_students": paid_cnt,
        "unpaid_students": unpaid_cnt,
        "partial_students": partial_cnt,
        "collection_rate": rate,
        "minimum_fee": MINIMUM_FEE
    }), 200

@fees_bp.route("/students", methods=["GET"])
@require_auth(allowed_roles=["accountant", "admin", "super_admin", "dean"])
def get_student_fees():
    """List students with their fees, department info, and payment status."""
    ensure_fee_records()

    search_q = (request.args.get("q") or request.args.get("search") or "").strip().lower()
    status_filter = (request.args.get("status") or "").strip().lower()
    dept_filter = request.args.get("department_id")

    sql = """
        SELECT 
            u.id AS student_id,
            u.name AS student_name,
            u.email,
            u.username,
            st.roll_number,
            COALESCE(d.id, st.department_id) AS department_id,
            COALESCE(d.name, 'General Engineering') AS department_name,
            COALESCE(sf.fee_amount, 10000) AS fee_amount,
            COALESCE(sf.paid_amount, 0) AS paid_amount,
            COALESCE(sf.status, 'unpaid') AS status,
            sf.academic_year,
            sf.paid_at,
            sf.updated_at
        FROM users u
        LEFT JOIN student_profiles st ON st.user_id = u.id
        LEFT JOIN departments d ON d.id = st.department_id
        LEFT JOIN student_fees sf ON sf.student_id = u.id
        WHERE u.role IN ('student', 'class_leader') AND u.status = 'active'
    """
    params = []

    if status_filter in ("paid", "unpaid", "partial"):
        sql += " AND sf.status = ?"
        params.append(status_filter)

    if dept_filter and dept_filter.isdigit():
        sql += " AND (st.department_id = ? OR d.id = ?)"
        params.extend([int(dept_filter), int(dept_filter)])

    if search_q:
        sql += """ AND (
            LOWER(u.name) LIKE ? OR
            LOWER(u.email) LIKE ? OR
            LOWER(COALESCE(u.username, '')) LIKE ? OR
            LOWER(COALESCE(st.roll_number, '')) LIKE ? OR
            LOWER(COALESCE(d.name, '')) LIKE ?
        )"""
        s_term = f"%{search_q}%"
        params.extend([s_term, s_term, s_term, s_term, s_term])

    sql += " ORDER BY u.id ASC"
    students = query_all(sql, tuple(params))

    # Format numbers and dates
    for s in students:
        s["fee_amount"] = int(s["fee_amount"] or 10000)
        s["paid_amount"] = int(s["paid_amount"] or 0)
        s["pending_amount"] = max(0, s["fee_amount"] - s["paid_amount"]) if s["status"] != "paid" else 0

    return jsonify({"students": students}), 200

@fees_bp.route("/students/<int:student_id>/toggle-status", methods=["POST"])
@require_auth(allowed_roles=["accountant", "admin", "super_admin"])
def toggle_fee_status(student_id: int):
    """Toggle or set student fee status between 'paid' and 'unpaid'."""
    data = request.get_json(silent=True) or {}
    explicit_status = (data.get("status") or "").strip().lower()

    fee_row = query_one("SELECT fee_amount, status FROM student_fees WHERE student_id = ?", (student_id,))
    if not fee_row:
        student = query_one("SELECT id, name FROM users WHERE id = ? AND role IN ('student', 'class_leader')", (student_id,))
        if not student:
            return jsonify({"error": "Student account not found"}), 404
        fee_amt = 10000
        cur_status = "unpaid"
        execute_write("INSERT INTO student_fees (student_id, fee_amount, paid_amount, status) VALUES (?, ?, 0, 'unpaid')", (student_id, fee_amt))
    else:
        fee_amt = int(fee_row["fee_amount"])
        cur_status = fee_row["status"]

    new_status = explicit_status if explicit_status in ("paid", "unpaid") else ("unpaid" if cur_status == "paid" else "paid")
    new_paid_amt = fee_amt if new_status == "paid" else 0

    execute_write("""
        UPDATE student_fees
        SET status = ?,
            paid_amount = ?,
            paid_at = CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE NULL END,
            updated_by_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE student_id = ?
    """, (new_status, new_paid_amt, new_status, g.current_user["id"], student_id))

    student_user = query_one("SELECT name FROM users WHERE id = ?", (student_id,))
    student_name = student_user["name"] if student_user else f"Student #{student_id}"

    # Also calculate updated summary
    summary_row = query_one("""
        SELECT 
            COALESCE(SUM(fee_amount), 0) AS overall_fees,
            COALESCE(SUM(paid_amount), 0) AS collected_fees,
            COALESCE(SUM(CASE WHEN fee_amount > paid_amount THEN fee_amount - paid_amount ELSE 0 END), 0) AS pending_fees,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_students,
            COALESCE(SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END), 0) AS unpaid_students,
            COALESCE(SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END), 0) AS partial_students
        FROM student_fees
    """)

    return jsonify({
        "message": f"Fee status for '{student_name}' updated to {new_status.title()}.",
        "student_id": student_id,
        "status": new_status,
        "fee_amount": fee_amt,
        "paid_amount": new_paid_amt,
        "pending_amount": 0 if new_status == "paid" else fee_amt,
        "summary": {
            "overall_fees": int(summary_row["overall_fees"] or 0),
            "collected_fees": int(summary_row["collected_fees"] or 0),
            "pending_fees": int(summary_row["pending_fees"] or 0),
            "paid_students": int(summary_row["paid_students"] or 0),
            "unpaid_students": int(summary_row["unpaid_students"] or 0),
            "partial_students": int(summary_row["partial_students"] or 0)
        }
    }), 200

@fees_bp.route("/students/<int:student_id>/partial-payment", methods=["POST"])
@require_auth(allowed_roles=["accountant", "admin", "super_admin"])
def record_partial_payment(student_id: int):
    """Record a partial fee payment for a specific student."""
    data = request.get_json(silent=True) or {}
    raw_amount = data.get("partial_amount")

    if raw_amount is None:
        return jsonify({"error": "Partial payment amount is required"}), 400

    try:
        partial_amount = int(raw_amount)
    except (ValueError, TypeError):
        return jsonify({"error": "Partial payment amount must be a valid integer number"}), 400

    if partial_amount < 0:
        return jsonify({"error": "Partial payment amount cannot be negative"}), 400

    student = query_one("SELECT id, name FROM users WHERE id = ? AND role IN ('student', 'class_leader')", (student_id,))
    if not student:
        return jsonify({"error": "Student account not found"}), 404

    fee_row = query_one("SELECT fee_amount, status FROM student_fees WHERE student_id = ?", (student_id,))
    if not fee_row:
        fee_amt = 10000
        execute_write("INSERT INTO student_fees (student_id, fee_amount, paid_amount, status) VALUES (?, ?, 0, 'unpaid')", (student_id, fee_amt))
    else:
        fee_amt = int(fee_row["fee_amount"])

    # Determine status based on partial amount vs fee_amount
    if partial_amount >= fee_amt:
        new_status = "paid"
        new_paid_amt = fee_amt
    elif partial_amount == 0:
        new_status = "unpaid"
        new_paid_amt = 0
    else:
        new_status = "partial"
        new_paid_amt = partial_amount

    execute_write("""
        UPDATE student_fees
        SET paid_amount = ?,
            status = ?,
            paid_at = CASE WHEN ? != 'unpaid' THEN CURRENT_TIMESTAMP ELSE NULL END,
            updated_by_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE student_id = ?
    """, (new_paid_amt, new_status, new_status, g.current_user["id"], student_id))

    student_name = student["name"] if student else f"Student #{student_id}"

    # Recalculate summary metrics
    summary_row = query_one("""
        SELECT 
            COALESCE(SUM(fee_amount), 0) AS overall_fees,
            COALESCE(SUM(paid_amount), 0) AS collected_fees,
            COALESCE(SUM(CASE WHEN fee_amount > paid_amount THEN fee_amount - paid_amount ELSE 0 END), 0) AS pending_fees,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_students,
            COALESCE(SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END), 0) AS unpaid_students,
            COALESCE(SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END), 0) AS partial_students
        FROM student_fees
    """)

    return jsonify({
        "message": f"Partial fee payment of ₹{new_paid_amt:,} recorded for '{student_name}'.",
        "student_id": student_id,
        "fee_amount": fee_amt,
        "paid_amount": new_paid_amt,
        "pending_amount": max(0, fee_amt - new_paid_amt),
        "status": new_status,
        "paid_at": datetime.datetime.now().isoformat() if new_status != "unpaid" else None,
        "summary": {
            "overall_fees": int(summary_row["overall_fees"] or 0),
            "collected_fees": int(summary_row["collected_fees"] or 0),
            "pending_fees": int(summary_row["pending_fees"] or 0),
            "paid_students": int(summary_row["paid_students"] or 0),
            "unpaid_students": int(summary_row["unpaid_students"] or 0),
            "partial_students": int(summary_row["partial_students"] or 0)
        }
    }), 200

@fees_bp.route("/students/<int:student_id>/update-fee", methods=["POST"])
@require_auth(allowed_roles=["accountant", "admin", "super_admin"])
def update_student_fee(student_id: int):
    """Enter or update custom fee amount for a specific student. Fee amount must be at least 10,000."""
    data = request.get_json(silent=True) or {}
    raw_amount = data.get("fee_amount")

    if raw_amount is None:
        return jsonify({"error": "Fee amount is required"}), 400

    try:
        fee_amount = int(raw_amount)
    except (ValueError, TypeError):
        return jsonify({"error": "Fee amount must be a valid integer number"}), 400

    # Rule: Fee must be at least 10,000
    if fee_amount < MINIMUM_FEE:
        return jsonify({
            "error": f"Fee amount must be at least ₹{MINIMUM_FEE:,}. Value entered: ₹{fee_amount:,}"
        }), 400

    student = query_one("SELECT id, name FROM users WHERE id = ? AND role IN ('student', 'class_leader')", (student_id,))
    if not student:
        return jsonify({"error": "Student account not found"}), 404

    fee_row = query_one("SELECT status FROM student_fees WHERE student_id = ?", (student_id,))
    cur_status = fee_row["status"] if fee_row else "unpaid"
    new_paid_amt = fee_amount if cur_status == "paid" else 0

    execute_write("""
        INSERT INTO student_fees (student_id, fee_amount, paid_amount, status, updated_by_id, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id) DO UPDATE SET
            fee_amount = EXCLUDED.fee_amount,
            paid_amount = CASE WHEN student_fees.status = 'paid' THEN EXCLUDED.fee_amount ELSE 0 END,
            updated_by_id = EXCLUDED.updated_by_id,
            updated_at = CURRENT_TIMESTAMP
    """, (student_id, fee_amount, new_paid_amt, cur_status, g.current_user["id"]))

    return jsonify({
        "message": f"Tuition fee for '{student['name']}' set to ₹{fee_amount:,} successfully.",
        "student_id": student_id,
        "fee_amount": fee_amount,
        "paid_amount": new_paid_amt,
        "status": cur_status
    }), 200

@fees_bp.route("/set-bulk-fee", methods=["POST"])
@require_auth(allowed_roles=["accountant", "admin", "super_admin"])
def set_bulk_fee():
    """Enter tuition fee for all students or students of a department. Fee must be at least 10,000."""
    data = request.get_json(silent=True) or {}
    raw_amount = data.get("fee_amount")
    dept_id = data.get("department_id")

    if raw_amount is None:
        return jsonify({"error": "Fee amount is required"}), 400

    try:
        fee_amount = int(raw_amount)
    except (ValueError, TypeError):
        return jsonify({"error": "Fee amount must be a valid integer number"}), 400

    # Rule: Fee must be at least 10,000
    if fee_amount < MINIMUM_FEE:
        return jsonify({
            "error": f"Fee amount must be at least ₹{MINIMUM_FEE:,}. Value entered: ₹{fee_amount:,}"
        }), 400

    dept_clause = ""
    dept_params = []
    if dept_id and str(dept_id).isdigit():
        dept_clause = " AND sp.department_id = ?"
        dept_params.append(int(dept_id))

    students = query_all(f"""
        SELECT u.id FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        WHERE u.role IN ('student', 'class_leader') AND u.status = 'active' {dept_clause}
    """, tuple(dept_params))

    updated_count = 0
    for st in students:
        sid = st["id"]
        fee_row = query_one("SELECT status FROM student_fees WHERE student_id = ?", (sid,))
        cur_status = fee_row["status"] if fee_row else "unpaid"
        new_paid_amt = fee_amount if cur_status == "paid" else 0

        execute_write("""
            INSERT INTO student_fees (student_id, fee_amount, paid_amount, status, updated_by_id, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (student_id) DO UPDATE SET
                fee_amount = EXCLUDED.fee_amount,
                paid_amount = CASE WHEN student_fees.status = 'paid' THEN EXCLUDED.fee_amount ELSE 0 END,
                updated_by_id = EXCLUDED.updated_by_id,
                updated_at = CURRENT_TIMESTAMP
        """, (sid, fee_amount, new_paid_amt, cur_status, g.current_user["id"]))
        updated_count += 1

    dept_text = f"department #{dept_id}" if dept_id else "all students"
    return jsonify({
        "message": f"Successfully updated tuition fee to ₹{fee_amount:,} for {updated_count} students across {dept_text}.",
        "updated_count": updated_count,
        "fee_amount": fee_amount
    }), 200

@fees_bp.route("/my-fee", methods=["GET"])
@require_auth(allowed_roles=["student", "class_leader", "parent"])
def get_my_fee():
    """Return fee details for the currently logged in student."""
    sid = g.current_user["id"]
    ensure_fee_records()
    fee_row = query_one("""
        SELECT 
            u.name AS student_name,
            u.email,
            st.roll_number,
            d.name AS department_name,
            COALESCE(sf.fee_amount, 10000) AS fee_amount,
            COALESCE(sf.paid_amount, 0) AS paid_amount,
            COALESCE(sf.status, 'unpaid') AS status,
            sf.paid_at,
            sf.academic_year
        FROM users u
        LEFT JOIN student_profiles st ON st.user_id = u.id
        LEFT JOIN departments d ON d.id = st.department_id
        LEFT JOIN student_fees sf ON sf.student_id = u.id
        WHERE u.id = ?
    """, (sid,))
    if not fee_row:
        return jsonify({"error": "No fee record found"}), 404
    return jsonify({"fee": fee_row}), 200
