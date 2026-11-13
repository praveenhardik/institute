import datetime
import os
import re
import sqlite3
from typing import Any, Dict, List, Optional
try:
    import psycopg2
    from psycopg2 import IntegrityError, pool
    from psycopg2.extensions import connection as _PGConnection
except ImportError:
    psycopg2 = None
    IntegrityError = Exception
    pool = None
    _PGConnection = None

def _resolve_host(host: str) -> str:
    import socket
    try:
        socket.gethostbyname(host)
        return host
    except Exception:
        # If running on local machine outside Docker, fall back to localhost
        return "localhost"

DB_HOST_RAW = os.getenv("PGHOST", "localhost")
DB_HOST = _resolve_host(DB_HOST_RAW)
DB_PORT = int(os.getenv("PGPORT", "5432"))
DB_USER = os.getenv("PGUSER", "postgres")
DB_PASSWORD = os.getenv("PGPASSWORD", "postgres")
DB_NAME = os.getenv("PGDATABASE", "college_live")
DATABASE_URL = os.getenv("DATABASE_URL", f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

SQLITE_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "college.db")
DB_PATH = f"PostgreSQL: {DB_NAME} on {DB_HOST}:{DB_PORT}"

USERNAME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9._]{2,29}$")

_db_mode: Optional[str] = None  # 'pg' or 'sqlite'
_pg_pool = None


def detect_db_mode() -> str:
    """Detect whether PostgreSQL is running and accessible; fall back cleanly to SQLite if not."""
    global _db_mode
    if _db_mode is not None:
        return _db_mode

    if os.getenv("USE_SQLITE", "").lower() in ("1", "true", "yes"):
        _db_mode = "sqlite"
        print(f"[DB] Using local SQLite database: {SQLITE_DB_PATH}")
        return _db_mode

    if psycopg2 is None:
        _db_mode = "sqlite"
        print(f"[DB] psycopg2 not installed. Using local SQLite database: {SQLITE_DB_PATH}")
        return _db_mode

    try:
        test_conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            connect_timeout=2
        )
        test_conn.close()
        _db_mode = "pg"
        print(f"[DB] Connected to PostgreSQL on {DB_HOST}:{DB_PORT} ({DB_NAME})")
    except Exception as e:
        _db_mode = "sqlite"
        print(f"[DB] PostgreSQL unavailable on {DB_HOST}:{DB_PORT} ({e}).")
        print(f"[DB] Auto-switched to local SQLite database: {SQLITE_DB_PATH}")

    return _db_mode


class Row(dict):
    """Row object that supports both dict key access (row['name']) and tuple index access (row[0])."""
    def __init__(self, keys: List[str], values: tuple):
        super().__init__()
        converted_values = []
        for v in values:
            if isinstance(v, (datetime.datetime, datetime.date)):
                converted_values.append(v.strftime("%Y-%m-%d %H:%M:%S") if isinstance(v, datetime.datetime) else v.strftime("%Y-%m-%d"))
            else:
                converted_values.append(v)
        self._keys = list(keys)
        self._values = converted_values
        for k, v in zip(keys, converted_values):
            self[k] = v

    def __getitem__(self, item):
        if isinstance(item, int):
            return self._values[item]
        return super().__getitem__(item)


def _transform_query(query: str) -> str:
    """Translate SQLite-specific SQL syntax into PostgreSQL syntax."""
    q = query.strip()

    # 1. PRAGMA statements -> no-op or empty query
    if q.upper().startswith("PRAGMA "):
        return "SELECT 1"

    # 2. SQLite INSERT OR IGNORE -> PostgreSQL INSERT ... ON CONFLICT DO NOTHING
    if re.match(r"^INSERT\s+OR\s+IGNORE\s+INTO\s+", q, re.IGNORECASE):
        q = re.sub(r"^INSERT\s+OR\s+IGNORE\s+INTO\s+", "INSERT INTO ", q, flags=re.IGNORECASE)
        if " ON CONFLICT " not in q.upper():
            q = q + " ON CONFLICT DO NOTHING"

    # 3. SQLite INSERT OR REPLACE INTO student_profiles
    if re.match(r"^INSERT\s+OR\s+REPLACE\s+INTO\s+student_profiles\b", q, re.IGNORECASE):
        q = re.sub(r"^INSERT\s+OR\s+REPLACE\s+INTO\s+student_profiles\b", "INSERT INTO student_profiles", q, flags=re.IGNORECASE)
        if " ON CONFLICT " not in q.upper():
            q = q + """ ON CONFLICT (user_id) DO UPDATE SET
                roll_number = EXCLUDED.roll_number,
                batch_id = EXCLUDED.batch_id,
                section_id = EXCLUDED.section_id,
                department_id = EXCLUDED.department_id,
                guardian_name = EXCLUDED.guardian_name,
                guardian_phone = EXCLUDED.guardian_phone,
                guardian_email = EXCLUDED.guardian_email"""

    # 4. SQLite datetime(created_at, '+24 hours') > datetime('now')
    q = re.sub(
        r"datetime\(\s*created_at\s*,\s*'\+24 hours?'\s*\)\s*>\s*datetime\(\s*'now'\s*\)",
        "created_at + INTERVAL '24 hours' > CURRENT_TIMESTAMP",
        q,
        flags=re.IGNORECASE
    )

    # 5. SQLite instr(str, substr) -> PostgreSQL POSITION(substr IN str) (skip function definition)
    q = re.sub(r"(?<!FUNCTION\s)\binstr\(([^,]+),\s*([^)]+)\)", r"POSITION(\2 IN \1)", q, flags=re.IGNORECASE)

    # 6. Translate ? parameter placeholders to %s for psycopg2
    q = q.replace("?", "%s")

    return q


class PGCursorWrapper:
    """Cursor wrapper that executes transformed queries and returns Row objects with lastrowid support."""
    def __init__(self, raw_cursor):
        self._cur = raw_cursor
        self.lastrowid = None

    def execute(self, query: str, args: tuple = ()):
        sql = _transform_query(query)
        is_insert = sql.lstrip().upper().startswith("INSERT INTO")
        has_returning = " RETURNING " in sql.upper()

        if is_insert and not has_returning:
            # Append RETURNING id to capture the auto-generated primary key
            sql_with_returning = sql.rstrip().rstrip(";") + " RETURNING id"
            try:
                self._cur.execute(sql_with_returning, args)
                if self._cur.description:
                    row = self._cur.fetchone()
                    if row:
                        self.lastrowid = row[0]
                return self
            except Exception:
                # If table doesn't have 'id' column or RETURNING failed, rollback and retry without RETURNING
                self._cur.connection.rollback()
                self._cur.execute(sql, args)
                self.lastrowid = None
                return self

        self._cur.execute(sql, args)
        if has_returning and self._cur.description:
            try:
                row = self._cur.fetchone()
                if row:
                    self.lastrowid = row[0]
            except Exception:
                pass
        return self

    def fetchone(self) -> Optional[Row]:
        row = self._cur.fetchone()
        if row is None or not self._cur.description:
            return None
        keys = [d[0] for d in self._cur.description]
        return Row(keys, row)

    def fetchall(self) -> List[Row]:
        if not self._cur.description:
            return []
        keys = [d[0] for d in self._cur.description]
        return [Row(keys, r) for r in self._cur.fetchall()]

    @property
    def rowcount(self) -> int:
        return self._cur.rowcount

    def close(self):
        self._cur.close()


class SQLiteCursorWrapper:
    """Cursor wrapper for SQLite that returns Row objects with index/key access and lastrowid support."""
    def __init__(self, raw_cur):
        self._cur = raw_cur
        self.lastrowid = None

    def execute(self, query: str, args: tuple = ()):
        sql = query.strip()
        # Convert %s placeholders to ?
        sql = re.sub(r'(?<!%)(?:%%)*%s', '?', sql)
        # Skip Postgres advisory locks
        if "pg_advisory_lock" in sql or "pg_advisory_unlock" in sql:
            return self
        # Strip Postgres type casts like ::text
        sql = re.sub(r'::[a-zA-Z0-9_]+', '', sql)

        # Strip RETURNING id on older SQLite engines
        has_returning = " RETURNING " in sql.upper()
        if has_returning and sqlite3.sqlite_version_info < (3, 35, 0):
            sql = re.sub(r'\s+RETURNING\s+id\b', '', sql, flags=re.IGNORECASE)

        self._cur.execute(sql, args)
        self.lastrowid = self._cur.lastrowid
        return self

    def fetchone(self) -> Optional[Row]:
        row = self._cur.fetchone()
        if row is None or not self._cur.description:
            return None
        keys = [d[0] for d in self._cur.description]
        return Row(keys, tuple(row))

    def fetchall(self) -> List[Row]:
        if not self._cur.description:
            return []
        keys = [d[0] for d in self._cur.description]
        return [Row(keys, tuple(r)) for r in self._cur.fetchall()]

    @property
    def rowcount(self) -> int:
        return self._cur.rowcount

    def close(self):
        try:
            self._cur.close()
        except Exception:
            pass


class SQLiteConnectionWrapper:
    """Connection wrapper for SQLite that mimics PGConnectionWrapper."""
    def __init__(self, raw_conn: sqlite3.Connection, should_close: bool = False):
        self._conn = raw_conn
        self._should_close = should_close

    def cursor(self) -> SQLiteCursorWrapper:
        return SQLiteCursorWrapper(self._conn.cursor())

    def execute(self, query: str, args: tuple = ()) -> SQLiteCursorWrapper:
        cur = self.cursor()
        cur.execute(query, args)
        return cur

    def commit(self):
        if self._conn:
            self._conn.commit()

    def rollback(self):
        if self._conn:
            self._conn.rollback()

    def close(self):
        if self._should_close and self._conn:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None


_pg_pool = None

def get_connection_pool():
    global _pg_pool
    if _pg_pool is None:
        _pg_pool = pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=25,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
    return _pg_pool


class PGConnectionWrapper:
    """Connection wrapper that returns PGCursorWrapper and provides conn.execute()."""
    def __init__(self, raw_conn: _PGConnection, is_pooled: bool = False, pool_ref=None):
        self._conn = raw_conn
        self._is_pooled = is_pooled
        self._pool_ref = pool_ref

    def cursor(self) -> PGCursorWrapper:
        return PGCursorWrapper(self._conn.cursor())

    def execute(self, query: str, args: tuple = ()) -> PGCursorWrapper:
        cur = self.cursor()
        cur.execute(query, args)
        return cur

    def commit(self):
        if self._conn:
            self._conn.commit()

    def rollback(self):
        if self._conn:
            self._conn.rollback()

    def close(self):
        if self._pool_ref and self._conn:
            try:
                self._pool_ref.putconn(self._conn)
            except Exception:
                pass
            self._conn = None
        elif not self._is_pooled and self._conn:
            self._conn.close()
            self._conn = None


def get_db_connection():
    """Return a database connection (PostgreSQL if available, SQLite fallback for local dev)."""
    mode = detect_db_mode()
    if mode == "sqlite":
        try:
            from flask import g, has_request_context
            if has_request_context():
                if not hasattr(g, '_sqlite_conn') or g._sqlite_conn is None:
                    c = sqlite3.connect(SQLITE_DB_PATH, check_same_thread=False, timeout=30.0)
                    c.execute("PRAGMA foreign_keys = ON;")
                    g._sqlite_conn = c
                return SQLiteConnectionWrapper(g._sqlite_conn, should_close=False)
        except Exception:
            pass

        c = sqlite3.connect(SQLITE_DB_PATH, check_same_thread=False, timeout=30.0)
        c.execute("PRAGMA foreign_keys = ON;")
        return SQLiteConnectionWrapper(c, should_close=True)

    try:
        from flask import g, has_request_context
        if has_request_context():
            if not hasattr(g, '_db_conn') or g._db_conn is None or g._db_conn.closed:
                p = get_connection_pool()
                g._db_conn = p.getconn()
            return PGConnectionWrapper(g._db_conn, is_pooled=True, pool_ref=None)
    except Exception:
        pass

    p = get_connection_pool()
    raw = p.getconn()
    return PGConnectionWrapper(raw, is_pooled=True, pool_ref=p)


def release_request_connection(exception=None):
    """Release per-request connection back to pool on teardown."""
    try:
        from flask import g
        # Release SQLite
        raw_sqlite = getattr(g, '_sqlite_conn', None)
        if raw_sqlite is not None:
            try:
                if exception:
                    raw_sqlite.rollback()
                else:
                    raw_sqlite.commit()
            except Exception:
                pass
            finally:
                try:
                    raw_sqlite.close()
                except Exception:
                    pass
                g._sqlite_conn = None

        # Release PostgreSQL
        raw_conn = getattr(g, '_db_conn', None)
        if raw_conn is not None:
            try:
                if exception:
                    raw_conn.rollback()
                else:
                    raw_conn.commit()
            except Exception:
                pass
            finally:
                try:
                    get_connection_pool().putconn(raw_conn)
                except Exception:
                    pass
                g._db_conn = None
    except Exception:
        pass


def _init_sqlite_db() -> None:
    """Initialize local SQLite database tables, views, and seed default departments."""
    conn = sqlite3.connect(SQLITE_DB_PATH, timeout=30.0)
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                username TEXT,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('dean', 'super_admin', 'admin', 'principal', 'hod', 'teacher', 'class_teacher', 'student', 'class_leader', 'accountant', 'librarian', 'parent')),
                status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'pending', 'rejected', 'reject', 'deleted', 'delete', 'passed_out', 'graduated')),
                created_by_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_edited_by_id INTEGER,
                last_edited_at TIMESTAMP,
                academic_year INTEGER,
                previous_year INTEGER
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipient_role TEXT,
                recipient_id INTEGER,
                sender_id INTEGER,
                sender_role TEXT,
                sender_name TEXT,
                type TEXT NOT NULL DEFAULT 'broadcast',
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                reference_id INTEGER,
                department_name TEXT,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_by_teacher_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by_teacher_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS group_students (
                group_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (group_id, student_id),
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                option_a TEXT NOT NULL,
                option_b TEXT NOT NULL,
                option_c TEXT NOT NULL,
                option_d TEXT NOT NULL,
                correct_option TEXT NOT NULL CHECK(correct_option IN ('A', 'B', 'C', 'D')),
                explanation TEXT,
                duration_seconds INTEGER NOT NULL CHECK(duration_seconds >= 30 AND duration_seconds <= 3600),
                target_type TEXT NOT NULL CHECK(target_type IN ('all', 'group')),
                target_group_id INTEGER,
                target_department_id INTEGER,
                target_year INTEGER,
                task_number TEXT DEFAULT 'Task 1',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (target_group_id) REFERENCES groups(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                selected_option TEXT NOT NULL CHECK(selected_option IN ('A', 'B', 'C', 'D')),
                is_correct INTEGER NOT NULL CHECK(is_correct IN (0, 1)),
                time_taken_seconds INTEGER NOT NULL DEFAULT 0,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(question_id, student_id),
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS revoked_tokens (
                jti TEXT PRIMARY KEY,
                revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS academic_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_number TEXT UNIQUE NOT NULL,
                created_by_id INTEGER,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS college_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                set_by_id INTEGER,
                set_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS academic_years (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS semesters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                academic_year_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                UNIQUE (academic_year_id, name),
                FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS departments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                code TEXT UNIQUE NOT NULL,
                hod_user_id INTEGER,
                FOREIGN KEY (hod_user_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS programs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                department_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                degree TEXT NOT NULL,
                duration_years INTEGER NOT NULL DEFAULT 4,
                UNIQUE (department_id, name),
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                program_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                UNIQUE (program_id, name),
                FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS sections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                UNIQUE (batch_id, name),
                FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS holidays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                holiday_date TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS staff_profiles (
                user_id INTEGER PRIMARY KEY,
                department_id INTEGER,
                designation TEXT,
                qualification TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS staff_departments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                department_id INTEGER NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, department_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS student_profiles (
                user_id INTEGER PRIMARY KEY,
                roll_number TEXT UNIQUE,
                batch_id INTEGER,
                section_id INTEGER,
                department_id INTEGER,
                guardian_name TEXT,
                guardian_phone TEXT,
                guardian_email TEXT,
                academic_year INTEGER,
                previous_year INTEGER,
                year_changed_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
                FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS subjects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT UNIQUE NOT NULL,
                department_id INTEGER NOT NULL,
                batch_id INTEGER NOT NULL,
                faculty_user_id INTEGER,
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
                FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
                FOREIGN KEY (faculty_user_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS attendance_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject_id INTEGER NOT NULL,
                session_date TEXT NOT NULL,
                period INTEGER NOT NULL CHECK(period BETWEEN 1 AND 8),
                marked_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (subject_id, session_date, period),
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS attendance_records (
                session_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('P', 'A', 'OD', 'L')),
                PRIMARY KEY (session_id, student_id),
                FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS student_daily_attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                attendance_date TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('P', 'A', 'OD', 'L')),
                marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (student_id, attendance_date)
            );

            CREATE TABLE IF NOT EXISTS department_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT NOT NULL,
                requested_user_id INTEGER,
                requested_by_id INTEGER,
                status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
                decided_by_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                decided_at TIMESTAMP,
                FOREIGN KEY (requested_user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (requested_by_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (decided_by_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS removed_users (
                id INTEGER,
                name TEXT NOT NULL,
                email TEXT,
                username TEXT,
                role TEXT DEFAULT 'student',
                department TEXT,
                deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS student_fees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL UNIQUE,
                fee_amount INTEGER NOT NULL DEFAULT 10000 CHECK(fee_amount >= 10000),
                paid_amount INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('paid', 'unpaid', 'partial')),
                academic_year TEXT DEFAULT '2025-2026',
                due_date TEXT,
                paid_at TIMESTAMP,
                updated_by_id INTEGER,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                remarks TEXT,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (updated_by_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS student_library_books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                book_name TEXT NOT NULL,
                validity_date DATE NOT NULL,
                status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued', 'returned')),
                issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                returned_at TIMESTAMP,
                issued_by_id INTEGER,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (issued_by_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_questions_target ON questions(target_type, target_group_id);
            CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_role, recipient_id);
            CREATE INDEX IF NOT EXISTS idx_staff_departments_user ON staff_departments(user_id);
            CREATE INDEX IF NOT EXISTS idx_staff_departments_dept ON staff_departments(department_id);
            CREATE INDEX IF NOT EXISTS idx_student_fees_student ON student_fees(student_id);
            CREATE INDEX IF NOT EXISTS idx_student_fees_status ON student_fees(status);
            CREATE INDEX IF NOT EXISTS idx_student_lib_books_student ON student_library_books(student_id);
            CREATE INDEX IF NOT EXISTS idx_student_lib_books_status ON student_library_books(status);
            CREATE INDEX IF NOT EXISTS idx_sda_student ON student_daily_attendance(student_id);
            CREATE INDEX IF NOT EXISTS idx_sda_date ON student_daily_attendance(attendance_date);
        """)

        # Report view
        conn.executescript("""
            DROP VIEW IF EXISTS registered_users_report;
            CREATE VIEW registered_users_report AS
            SELECT * FROM (
              SELECT u.id AS id, u.name AS name, COALESCE(u.username, '(none)') AS username, u.email AS email_or_phone,
                     u.role AS role, u.status AS status,
                     CASE WHEN u.status = 'active' THEN 'Yes' ELSE 'No' END AS can_sign_in,
                     CASE WHEN u.created_at >= datetime(CURRENT_TIMESTAMP, '-1 day') THEN 'Newly Registered' ELSE 'Registered' END AS registration_type,
                     COALESCE((
                         SELECT group_concat(d.name, ', ')
                         FROM departments d
                         WHERE d.id IN (SELECT sd.department_id FROM staff_departments sd WHERE sd.user_id = u.id)
                            OR d.id = stp.department_id
                            OR d.id = sp.department_id
                            OR d.id = p.department_id
                     ), '-') AS department,
                     COALESCE(sp.roll_number, stp.designation, '-') AS roll_or_designation,
                     COALESCE(b.name, '-') AS batch, COALESCE(sec.name, '-') AS section,
                     COALESCE(cb.name, '-') AS created_by, u.created_at AS created_at,
                     CASE WHEN u.created_at >= datetime(CURRENT_TIMESTAMP, '-1 day') THEN 1 ELSE 2 END AS sort_priority
              FROM users u
              LEFT JOIN student_profiles sp ON sp.user_id = u.id
              LEFT JOIN staff_profiles stp ON stp.user_id = u.id
              LEFT JOIN sections sec ON sec.id = sp.section_id
              LEFT JOIN batches b ON b.id = COALESCE(sp.batch_id, sec.batch_id)
              LEFT JOIN programs p ON p.id = b.program_id
              LEFT JOIN users cb ON cb.id = u.created_by_id
              UNION ALL
              SELECT rem.id, rem.name, COALESCE(rem.username, '(none)'), COALESCE(rem.email, '-'), COALESCE(rem.role, '-'),
                     'deleted', 'No', 'Deleted', COALESCE(rem.department, '-'), '-', '-', '-', '-', rem.deleted_at, 3
              FROM removed_users rem
            ) ORDER BY sort_priority, created_at DESC, id DESC;
        """)

        # Seed 6 official departments
        official_depts = [
            ("Computer Science Engineering", "CSE"),
            ("Mechanical Engineering", "MECH"),
            ("Mechatronics Engineering", "MECT"),
            ("Aeronautical Engineering", "AERO"),
            ("Electrical and Electronics Engineering", "EEE"),
            ("Electrical and Communication Engineering", "ECE")
        ]
        for dname, dcode in official_depts:
            cur = conn.execute("SELECT id FROM departments WHERE code = ? OR name = ?", (dcode, dname))
            exists = cur.fetchone()
            if not exists:
                conn.execute("INSERT INTO departments (name, code) VALUES (?, ?)", (dname, dcode))
            else:
                conn.execute("UPDATE departments SET name = ?, code = ? WHERE id = ?", (dname, dcode, exists[0]))
        conn.commit()

        # Seed official B.Tech programs
        for dname, dcode in official_depts:
            dept = conn.execute("SELECT id FROM departments WHERE code = ?", (dcode,)).fetchone()
            if dept:
                dept_id = dept[0]
                prog_name = f"B.Tech {dname}"
                p_exists = conn.execute("SELECT id FROM programs WHERE department_id = ?", (dept_id,)).fetchone()
                if not p_exists:
                    conn.execute("INSERT INTO programs (department_id, name, degree, duration_years) VALUES (?, ?, ?, ?)", (dept_id, prog_name, "B.Tech", 4))
                else:
                    conn.execute("UPDATE programs SET name = ?, degree = ?, duration_years = 4 WHERE id = ?", (prog_name, "B.Tech", p_exists[0]))
        conn.commit()
        print("[DB] SQLite schema & official departments initialized.")
    finally:
        conn.close()


def init_db() -> None:
    """Initialize database tables, aggregates, views, and official departments."""
    mode = detect_db_mode()
    if mode == "sqlite":
        _init_sqlite_db()
        return

    conn = get_db_connection()
    try:
        try:
            conn.execute("SELECT pg_advisory_lock(987654321);")
            conn.commit()
        except Exception:
            pass
        # 1. Custom aggregate group_concat for PostgreSQL compatibility
        conn.execute("""
            CREATE OR REPLACE FUNCTION group_concat_state_2(state text, val text, delim text)
            RETURNS text AS $$
                SELECT CASE WHEN state IS NULL THEN val ELSE state || delim || val END;
            $$ LANGUAGE sql IMMUTABLE;

            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'group_concat' AND pronargs = 2) THEN
                    CREATE AGGREGATE group_concat(text, text) (
                        SFUNC = group_concat_state_2,
                        STYPE = text
                    );
                END IF;
            END $$;

            CREATE OR REPLACE FUNCTION group_concat_state_1(state text, val text)
            RETURNS text AS $$
                SELECT CASE WHEN state IS NULL THEN val ELSE state || ', ' || val END;
            $$ LANGUAGE sql IMMUTABLE;

            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'group_concat' AND pronargs = 1) THEN
                    CREATE AGGREGATE group_concat(text) (
                        SFUNC = group_concat_state_1,
                        STYPE = text
                    );
                END IF;
            END $$;

            CREATE OR REPLACE FUNCTION instr(str text, sub text)
            RETURNS integer AS $$
                SELECT POSITION(sub IN str);
            $$ LANGUAGE sql IMMUTABLE;
        """)
        conn.commit()

        # 2. Schema tables
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                username TEXT,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('dean', 'super_admin', 'admin', 'principal', 'hod', 'teacher', 'class_teacher', 'student', 'class_leader', 'accountant', 'librarian', 'parent')),
                status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'pending', 'rejected', 'reject', 'deleted', 'delete', 'passed_out', 'graduated')),
                created_by_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_edited_by_id INTEGER,
                last_edited_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                recipient_role TEXT,
                recipient_id INTEGER,
                sender_id INTEGER,
                sender_role TEXT,
                sender_name TEXT,
                type TEXT NOT NULL DEFAULT 'broadcast',
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                reference_id INTEGER,
                department_name TEXT,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS groups (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_by_teacher_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by_teacher_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS group_students (
                group_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (group_id, student_id),
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS questions (
                id SERIAL PRIMARY KEY,
                teacher_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                option_a TEXT NOT NULL,
                option_b TEXT NOT NULL,
                option_c TEXT NOT NULL,
                option_d TEXT NOT NULL,
                correct_option TEXT NOT NULL CHECK(correct_option IN ('A', 'B', 'C', 'D')),
                explanation TEXT,
                duration_seconds INTEGER NOT NULL CHECK(duration_seconds >= 30 AND duration_seconds <= 3600),
                target_type TEXT NOT NULL CHECK(target_type IN ('all', 'group')),
                target_group_id INTEGER,
                target_department_id INTEGER,
                target_year INTEGER,
                task_number TEXT DEFAULT 'Task 1',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (target_group_id) REFERENCES groups(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS submissions (
                id SERIAL PRIMARY KEY,
                question_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                selected_option TEXT NOT NULL CHECK(selected_option IN ('A', 'B', 'C', 'D')),
                is_correct INTEGER NOT NULL CHECK(is_correct IN (0, 1)),
                time_taken_seconds INTEGER NOT NULL DEFAULT 0,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(question_id, student_id),
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS revoked_tokens (
                jti TEXT PRIMARY KEY,
                revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS academic_tasks (
                id SERIAL PRIMARY KEY,
                task_number TEXT UNIQUE NOT NULL,
                created_by_id INTEGER,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS college_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                set_by_id INTEGER,
                set_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS academic_years (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS semesters (
                id SERIAL PRIMARY KEY,
                academic_year_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                UNIQUE (academic_year_id, name),
                FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS departments (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                code TEXT UNIQUE NOT NULL,
                hod_user_id INTEGER,
                FOREIGN KEY (hod_user_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS programs (
                id SERIAL PRIMARY KEY,
                department_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                degree TEXT NOT NULL,
                duration_years INTEGER NOT NULL DEFAULT 4,
                UNIQUE (department_id, name),
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS batches (
                id SERIAL PRIMARY KEY,
                program_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                UNIQUE (program_id, name),
                FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS sections (
                id SERIAL PRIMARY KEY,
                batch_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                UNIQUE (batch_id, name),
                FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS holidays (
                id SERIAL PRIMARY KEY,
                holiday_date TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS staff_profiles (
                user_id INTEGER PRIMARY KEY,
                department_id INTEGER,
                designation TEXT,
                qualification TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS staff_departments (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                department_id INTEGER NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, department_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS student_profiles (
                user_id INTEGER PRIMARY KEY,
                roll_number TEXT UNIQUE,
                batch_id INTEGER,
                section_id INTEGER,
                department_id INTEGER,
                guardian_name TEXT,
                guardian_phone TEXT,
                guardian_email TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
                FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS subjects (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT UNIQUE NOT NULL,
                department_id INTEGER NOT NULL,
                batch_id INTEGER NOT NULL,
                faculty_user_id INTEGER,
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
                FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
                FOREIGN KEY (faculty_user_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS attendance_sessions (
                id SERIAL PRIMARY KEY,
                subject_id INTEGER NOT NULL,
                session_date TEXT NOT NULL,
                period INTEGER NOT NULL CHECK(period BETWEEN 1 AND 8),
                marked_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (subject_id, session_date, period),
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS attendance_records (
                session_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('P', 'A', 'OD', 'L')),
                PRIMARY KEY (session_id, student_id),
                FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS student_daily_attendance (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                attendance_date TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('P', 'A', 'OD', 'L')),
                marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (student_id, attendance_date)
            );

            CREATE TABLE IF NOT EXISTS department_requests (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT NOT NULL,
                requested_user_id INTEGER,
                requested_by_id INTEGER,
                status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
                decided_by_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                decided_at TIMESTAMP,
                FOREIGN KEY (requested_user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (requested_by_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (decided_by_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS removed_users (
                id INTEGER,
                name TEXT NOT NULL,
                email TEXT,
                username TEXT,
                role TEXT DEFAULT 'student',
                department TEXT,
                deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS student_fees (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL UNIQUE,
                fee_amount INTEGER NOT NULL DEFAULT 10000 CHECK(fee_amount >= 10000),
                paid_amount INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('paid', 'unpaid', 'partial')),
                academic_year TEXT DEFAULT '2025-2026',
                due_date TEXT,
                paid_at TIMESTAMP,
                updated_by_id INTEGER,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                remarks TEXT,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (updated_by_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS student_library_books (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL,
                book_name TEXT NOT NULL,
                validity_date DATE NOT NULL,
                status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued', 'returned')),
                issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                returned_at TIMESTAMP,
                issued_by_id INTEGER,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (issued_by_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_questions_target ON questions(target_type, target_group_id);
            CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_role, recipient_id);
            CREATE INDEX IF NOT EXISTS idx_staff_departments_user ON staff_departments(user_id);
            CREATE INDEX IF NOT EXISTS idx_staff_departments_dept ON staff_departments(department_id);
            CREATE INDEX IF NOT EXISTS idx_student_fees_student ON student_fees(student_id);
            CREATE INDEX IF NOT EXISTS idx_student_fees_status ON student_fees(status);
            CREATE INDEX IF NOT EXISTS idx_student_lib_books_student ON student_library_books(student_id);
            CREATE INDEX IF NOT EXISTS idx_student_lib_books_status ON student_library_books(status);
            CREATE INDEX IF NOT EXISTS idx_sda_student ON student_daily_attendance(student_id);
            CREATE INDEX IF NOT EXISTS idx_sda_date ON student_daily_attendance(attendance_date);
        """)
        conn.commit()

        # 3. Report view for live inspection (e.g. pgAdmin / SQL queries)
        conn.execute("""
            CREATE OR REPLACE VIEW registered_users_report AS
            SELECT * FROM (
              SELECT u.id AS id, u.name AS name, COALESCE(u.username, '(none)') AS username, u.email AS email_or_phone,
                     u.role AS role, u.status AS status,
                     CASE WHEN u.status = 'active' THEN 'Yes' ELSE 'No' END AS can_sign_in,
                     CASE WHEN u.created_at >= (CURRENT_TIMESTAMP - INTERVAL '1 day') THEN 'Newly Registered' ELSE 'Registered' END AS registration_type,
                     COALESCE((
                         SELECT string_agg(DISTINCT d.name, ', ' ORDER BY d.name)
                         FROM departments d
                         WHERE d.id IN (SELECT sd.department_id FROM staff_departments sd WHERE sd.user_id = u.id)
                            OR d.id = stp.department_id
                            OR d.id = sp.department_id
                            OR d.id = p.department_id
                     ), '-') AS department,
                     COALESCE(sp.roll_number, stp.designation, '-') AS roll_or_designation,
                     COALESCE(b.name, '-') AS batch, COALESCE(sec.name, '-') AS section,
                     COALESCE(cb.name, '-') AS created_by, u.created_at AS created_at,
                     CASE WHEN u.created_at >= (CURRENT_TIMESTAMP - INTERVAL '1 day') THEN 1 ELSE 2 END AS sort_priority
              FROM users u
              LEFT JOIN student_profiles sp ON sp.user_id = u.id
              LEFT JOIN staff_profiles stp ON stp.user_id = u.id
              LEFT JOIN sections sec ON sec.id = sp.section_id
              LEFT JOIN batches b ON b.id = COALESCE(sp.batch_id, sec.batch_id)
              LEFT JOIN programs p ON p.id = b.program_id
              LEFT JOIN users cb ON cb.id = u.created_by_id
              UNION ALL
              SELECT rem.id, rem.name, COALESCE(rem.username, '(none)'), COALESCE(rem.email, '-'), COALESCE(rem.role, '-'),
                     'deleted', 'No', 'Deleted', COALESCE(rem.department, '-'), '-', '-', '-', '-', rem.deleted_at, 3
              FROM removed_users rem
            ) sub ORDER BY sort_priority, created_at DESC, id DESC;
        """)
        conn.commit()

        # 4. Seed 6 official engineering departments
        conn.execute("UPDATE departments SET code = 'MECT' WHERE name = 'Mechatronics Engineering' OR code = 'MCE'")
        official_depts = [
            ("Computer Science Engineering", "CSE"),
            ("Mechanical Engineering", "MECH"),
            ("Mechatronics Engineering", "MECT"),
            ("Aeronautical Engineering", "AERO"),
            ("Electrical and Electronics Engineering", "EEE"),
            ("Electrical and Communication Engineering", "ECE")
        ]
        for dname, dcode in official_depts:
            exists = conn.execute("SELECT id FROM departments WHERE code = %s OR name = %s", (dcode, dname)).fetchone()
            if not exists:
                conn.execute("INSERT INTO departments (name, code) VALUES (%s, %s)", (dname, dcode))
            else:
                conn.execute("UPDATE departments SET name = %s, code = %s WHERE id = %s", (dname, dcode, exists[0]))
        conn.commit()

        # Seed official B.Tech programs for all 6 departments
        for dname, dcode in official_depts:
            dept = conn.execute("SELECT id FROM departments WHERE code = %s", (dcode,)).fetchone()
            if dept:
                dept_id = dept[0]
                prog_name = f"B.Tech {dname}"
                p_exists = conn.execute("SELECT id FROM programs WHERE department_id = %s", (dept_id,)).fetchone()
                if not p_exists:
                    conn.execute("INSERT INTO programs (department_id, name, degree, duration_years) VALUES (%s, %s, %s, %s)", (dept_id, prog_name, "B.Tech", 4))
                else:
                    conn.execute("UPDATE programs SET name = %s, degree = %s, duration_years = 4 WHERE id = %s", (prog_name, "B.Tech", p_exists[0]))
        conn.commit()


        try:
            conn.execute("""
                ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
                ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('dean', 'super_admin', 'admin', 'principal', 'hod', 'teacher', 'class_teacher', 'student', 'class_leader', 'accountant', 'librarian', 'parent'));
            """)
            conn.commit()
        except Exception as e:
            conn.rollback()
            print("Note: users_role_check constraint migration:", e)

        try:
            conn.execute("ALTER TABLE questions ADD COLUMN IF NOT EXISTS target_department_id INTEGER;")
            conn.execute("ALTER TABLE questions ADD COLUMN IF NOT EXISTS target_year INTEGER;")
            conn.execute("ALTER TABLE questions ADD COLUMN IF NOT EXISTS task_number TEXT DEFAULT 'Task 1';")
            conn.execute("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS academic_year INTEGER;")
            conn.execute("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS previous_year INTEGER;")
            conn.execute("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS year_changed_at TIMESTAMP WITHOUT TIME ZONE;")
            conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_year INTEGER;")
            conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_year INTEGER;")
            conn.execute("UPDATE questions SET task_number = 'Task 1' WHERE task_number IS NULL OR task_number = '';")
            conn.commit()
        except Exception as e:
            conn.rollback()
            print("Note: questions column migration:", e)

        try:
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
                CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by_id);
                CREATE INDEX IF NOT EXISTS idx_staff_profiles_user_id ON staff_profiles(user_id);
                CREATE INDEX IF NOT EXISTS idx_staff_profiles_dept_id ON staff_profiles(department_id);
                CREATE INDEX IF NOT EXISTS idx_staff_depts_user_id ON staff_departments(user_id);
                CREATE INDEX IF NOT EXISTS idx_staff_depts_dept_id ON staff_departments(department_id);
                CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
                CREATE INDEX IF NOT EXISTS idx_student_profiles_batch_id ON student_profiles(batch_id);
                CREATE INDEX IF NOT EXISTS idx_student_profiles_dept_id ON student_profiles(department_id);
                CREATE INDEX IF NOT EXISTS idx_questions_teacher_id ON questions(teacher_id);
                CREATE INDEX IF NOT EXISTS idx_questions_target_group ON questions(target_group_id);
                CREATE INDEX IF NOT EXISTS idx_questions_target_dept ON questions(target_department_id);
                CREATE INDEX IF NOT EXISTS idx_questions_target_year ON questions(target_year);
                CREATE INDEX IF NOT EXISTS idx_submissions_q_student ON submissions(question_id, student_id);
                CREATE INDEX IF NOT EXISTS idx_group_students_group ON group_students(group_id);
                CREATE INDEX IF NOT EXISTS idx_group_students_student ON group_students(student_id);
                CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_role, is_read);
            """)
            conn.commit()
        except Exception as e:
            conn.rollback()
            print("Note: performance index creation migration:", e)


    finally:
        try:
            conn.execute("SELECT pg_advisory_unlock(987654321);")
            conn.commit()
        except Exception:
            pass
        conn.close()


def query_all(query: str, args: tuple = ()) -> List[Dict[str, Any]]:
    """Execute a query and return all rows as list of dicts."""
    conn = get_db_connection()
    try:
        cur = conn.execute(query, args)
        rows = [dict(r) for r in cur.fetchall()]
        return rows
    finally:
        conn.close()


def query_one(query: str, args: tuple = ()) -> Optional[Dict[str, Any]]:
    """Execute a query and return a single row as dict or None."""
    conn = get_db_connection()
    try:
        cur = conn.execute(query, args)
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def execute_write(query: str, args: tuple = ()) -> int:
    """Execute insert/update/delete and return lastrowid or affected rows."""
    conn = get_db_connection()
    try:
        cur = conn.execute(query, args)
        conn.commit()
        return cur.lastrowid if cur.lastrowid is not None else cur.rowcount
    finally:
        conn.close()


def ensure_default_super_admin() -> None:
    """Default login for the Super Admin portal: user name 'superadmin', password 'Admin@123'."""
    from werkzeug.security import generate_password_hash
    exists = query_one("SELECT id FROM users WHERE username = 'superadmin' OR email = 'superadmin1@inpand.com' OR email = 'superadmin@inpand.in'")
    if exists is None:
        execute_write(
            "INSERT INTO users (name, email, password_hash, role, status, username) VALUES (?, ?, ?, 'super_admin', 'active', 'superadmin')",
            ("Super Admin", "superadmin1@inpand.com", generate_password_hash("Admin@123")))


def department_name_of_user(user_id) -> Optional[str]:
    """Name of the department a staff member belongs to (comma-separated if multiple), or a student's department, or None for admin/super_admin."""
    if not user_id:
        return None
    user = query_one("SELECT role FROM users WHERE id = ?", (user_id,))
    if not user or user["role"] in ("super_admin", "admin"):
        return None

    # Check multi-department staff assignments first
    multi = query_one("""
        SELECT group_concat(d.name, ', ') AS names
        FROM (
            SELECT DISTINCT d2.name FROM staff_departments sd
            JOIN departments d2 ON d2.id = sd.department_id
            WHERE sd.user_id = ?
            ORDER BY d2.name
        ) d
    """, (user_id,))
    if multi and multi["names"]:
        return multi["names"]

    # Fallback to single staff_profile or student_profile
    row = query_one("""
        SELECT COALESCE(
            (SELECT d.name FROM staff_profiles sp JOIN departments d ON d.id = sp.department_id WHERE sp.user_id = ?),
            (SELECT d.name FROM student_profiles st
               LEFT JOIN batches b ON b.id = st.batch_id LEFT JOIN programs p ON p.id = b.program_id
               JOIN departments d ON d.id = COALESCE(st.department_id, p.department_id)
              WHERE st.user_id = ?)
        ) AS name
    """, (user_id, user_id))
    return row["name"] if row and row["name"] else None
