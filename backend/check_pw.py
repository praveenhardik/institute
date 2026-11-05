from backend.db import query_one, query_all
from werkzeug.security import check_password_hash

users = query_all("SELECT id, username, email, role, password_hash FROM users WHERE role IN ('super_admin', 'admin', 'principal')")
passwords = ['super', 'admin', 'password', 'superadmin', 'Admin@123', 'admin123', 'super123', '123456', '12345678', 'college', 'super@inpand.com', 'admin@inpand.com', 'principal', 'principal123']

for u in users:
    matched = None
    for p in passwords:
        if check_password_hash(u['password_hash'], p):
            matched = p
            break
    print(f"ID: {u['id']} | Username: {u['username']} | Role: {u['role']} | Password: {matched}")

