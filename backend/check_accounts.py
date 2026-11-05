"""List the sign-in details stored for every account (no passwords are shown).

Run from the project folder:
    python backend/check_accounts.py

Use it to compare the user name, email or phone of an account with what you typed on the
sign-in screen. Status must be 'active' for sign-in to work; 'pending' and 'rejected' are refused.
"""
import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.db import DB_PATH, init_db, query_all


def main() -> None:
    init_db()
    print(f"Database: {DB_PATH}")
    rows = query_all(
        "SELECT id, name, role, status, username, email FROM users ORDER BY role, id"
    )
    if not rows:
        print("No accounts found. Create accounts from the app first.")
        return
    header = f"{'ID':>4}  {'User name':<20} {'Email / phone':<28} {'Role':<14} {'Status':<9} Name"
    print(header)
    print("-" * len(header))
    for r in rows:
        print(f"{r['id']:>4}  {(r['username'] or '(none)'):<20} {r['email']:<28} "
              f"{r['role']:<14} {r['status']:<9} {r['name']}")


if __name__ == "__main__":
    main()
