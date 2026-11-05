import functools
import os
import re
import sys
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional
from flask import g, jsonify, request
import jwt
from werkzeug.security import check_password_hash, generate_password_hash

# Ensure root path is accessible
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.db import query_one

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "super_secret_quiz_portal_jwt_key_2026")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 24

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_PATTERN = re.compile(r"^\+?\d{8,15}$")

# Who approves or rejects a self-registration: registering role -> reviewing role
#   Admin registration    -> Super Admin
#   Teacher / Class Teacher / Student / Class Leader registration -> College Admin
APPROVER_FOR = {
    "admin": "super_admin",
    "hod": "admin",
    "teacher": "admin",
    "class_teacher": "admin",
    "student": "admin",
    "class_leader": "admin",
    "accountant": "admin",
    "librarian": "admin",
    "parent": "admin",
}

# Roles that are active as soon as they register (no approval)
SELF_ACTIVATED_ROLES = ("super_admin", "dean", "class_leader")

def roles_reviewable_by(reviewer_role: str) -> List[str]:
    """Registration roles that this reviewer can approve or reject."""
    return [role for role, approver in APPROVER_FOR.items() if approver == reviewer_role]

def normalize_contact(value: str) -> str:
    """Trim input. Emails are kept as typed; phone numbers lose spaces, dashes and brackets
    so '98765 43210' and '98765-43210' match the stored '9876543210'."""
    value = (value or "").strip()
    if "@" in value:
        return value
    return re.sub(r"[\s\-()]", "", value)

# SQL condition that compares a STORED email/phone the same way normalize_contact() treats typed input.
# Accounts saved with spaces or dashes (e.g. '98765 43210') then still match '9876543210' or '98765-43210'.
# Use as:  WHERE {CONTACT_MATCH_SQL}  with the normalized identifier as the only parameter.
CONTACT_MATCH_SQL = (
    "(CASE WHEN instr(email, '@') > 0 THEN lower(email) "
    "ELSE lower(replace(replace(replace(replace(email, ' ', ''), '-', ''), '(', ''), ')', '')) END) = lower(?)"
)

def validate_contact(value: str, contact_type: Optional[str] = None) -> Optional[str]:
    """Return an error message, or None if the value is a valid email or phone number."""
    contact_type = (contact_type or "").strip().lower()
    if not contact_type:
        contact_type = "email" if "@" in value else "phone"

    if contact_type == "email":
        if not EMAIL_PATTERN.match(value):
            return "Please enter a valid email address (e.g. name1@inpand.com)"
        if not (value.lower().endswith("@inpand.com") or value.lower().endswith("@inpand.in")):
            return "Email address must end with @inpand.com (e.g. username1@inpand.com)"
    elif contact_type == "phone":
        if not PHONE_PATTERN.match(value):
            return "Please enter a valid phone number (8 to 15 digits, optional + at the start)"
    else:
        return "Contact type must be either 'email' or 'phone'"
    return None

USERNAME_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9._]{2,29}$")

# Find an account by user name / full name (case-insensitive) OR by stored email/phone.
LOGIN_MATCH_SQL = f"({CONTACT_MATCH_SQL} OR (username IS NOT NULL AND lower(username) = lower(?)) OR (name IS NOT NULL AND lower(name) = lower(?)))"


def validate_username(value: str) -> Optional[str]:
    """Return an error message, or None if the user name is valid."""
    if not USERNAME_PATTERN.match(value):
        return "User name must be 3 to 30 characters, start with a letter, and use only letters, numbers, dots or underscores"
    return None

def extract_single_name(raw_name: str) -> str:
    """Ensure the user's full name is stored cleanly without mutating or truncating the entered name."""
    if not raw_name:
        return ""
    tokens = str(raw_name).strip().split()
    if not tokens:
        return ""
    return " ".join(tokens)

def name_in_use(raw_name: str, exclude_user_id: Optional[int] = None) -> bool:
    """Check if a Full Name is already registered (case-insensitive, trimmed)."""
    if not raw_name:
        return False
    clean = " ".join(raw_name.split()).lower()
    if not clean:
        return False
    if exclude_user_id is not None:
        row = query_one(
            "SELECT id FROM users WHERE lower(trim(name)) = ? AND id != ?",
            (clean, exclude_user_id)
        )
    else:
        row = query_one(
            "SELECT id FROM users WHERE lower(trim(name)) = ?",
            (clean,)
        )
    return row is not None

def username_in_use(value: str) -> bool:
    return query_one(
        "SELECT id FROM users WHERE username IS NOT NULL AND lower(username) = lower(?)", (value,)
    ) is not None

def hash_password(password: str) -> str:
    """Hash password using werkzeug PBKDF2."""
    return generate_password_hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    return check_password_hash(hashed_password, plain_password)

def generate_jwt_token(user: Dict[str, Any], profile: Optional[Dict[str, Any]] = None) -> str:
    """Generate a JWT token containing user id, email, role, name and the registration profile."""
    payload = {
        "user_id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "name": user["name"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
        "jti": uuid.uuid4().hex  # unique id so this exact token can be revoked on sign-out
    }
    if profile:
        payload["profile"] = profile  # registration details; the password is never included
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT token."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def require_auth(allowed_roles: Optional[List[str]] = None) -> Callable:
    """Decorator to require authentication and optionally check roles."""
    def decorator(f: Callable) -> Callable:
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization")
            if not auth_header:
                return jsonify({"error": "Authorization token required"}), 401
            
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != "bearer":
                return jsonify({"error": "Invalid authorization header format (Bearer token expected)"}), 401
            
            payload = decode_jwt_token(parts[1])
            if not payload:
                return jsonify({"error": "Token is invalid or has expired"}), 401

            # A signed-out token must never be accepted again, even before it expires
            if payload.get("jti") and query_one("SELECT jti FROM revoked_tokens WHERE jti = ?", (payload["jti"],)):
                return jsonify({"error": "You have been signed out. Please sign in again."}), 401

            # Fetch fresh user data from DB to verify user is active
            user = query_one("SELECT id, name, email, role, status FROM users WHERE id = ?", (payload["user_id"],))
            if not user:
                return jsonify({"error": "User account no longer exists"}), 401
            
            if user["status"] != "active":
                return jsonify({"error": f"Account is {user['status']}. Access denied."}), 403
            
            if allowed_roles and user["role"] not in allowed_roles:
                return jsonify({
                    "error": f"Access denied. Requires one of roles: {', '.join(allowed_roles)}"
                }), 403
            
            g.current_user = user
            return f(*args, **kwargs)
        return wrapper
    return decorator
