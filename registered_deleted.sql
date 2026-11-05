-- =====================================================================
--  INPAND College Management System - Registered & Deleted Users
--  File: registered_deleted.sql
-- =====================================================================
--  IMPORTANT PGADMIN / DATABASE NOTE:
--  The live college application connects to the database: "college_live".
--  All current registered users and all newly registering users
--  are saved into "college_live".
--
--  HOW TO RUN:
--  Option A (Recommended):
--    1. In pgAdmin, right-click "college_live" -> Query Tool.
--    2. Press F5 (or Execute).
--
--  Option B (If you are connected to "show_registered_users"):
--    This script automatically syncs newly registered users from
--    "college_live" every time you press F5!
-- =====================================================================

SET client_min_messages = WARNING;
BEGIN;

-- ---------------------------------------------------------------------
-- 0. Auto-Sync from college_live if running in another database
-- ---------------------------------------------------------------------
-- The college application registers new users into "college_live".
-- If you run this script inside "show_registered_users", this block
-- automatically pulls any newly registered users from "college_live".
DO $sync$
BEGIN
    IF current_database() <> 'college_live' THEN
        CREATE EXTENSION IF NOT EXISTS dblink;

        -- 1. Sync users table (including newly registered users)
        INSERT INTO users (id, name, email, username, password_hash, role, status, created_at, created_by_id)
        SELECT id, name, email, username, password_hash, role, status, created_at, created_by_id
        FROM dblink('dbname=college_live user=postgres password=postgres host=localhost',
                    'SELECT id, name, email, username, password_hash, role, status, created_at, created_by_id FROM users')
        AS t(id int, name text, email text, username text, password_hash text, role text, status text, created_at timestamp, created_by_id int)
        ON CONFLICT (id) DO UPDATE 
        SET name = EXCLUDED.name,
            email = EXCLUDED.email,
            username = EXCLUDED.username,
            role = EXCLUDED.role,
            status = EXCLUDED.status;

        -- 2. Remove any users deleted in college_live
        DELETE FROM users 
        WHERE id NOT IN (
            SELECT id FROM dblink('dbname=college_live user=postgres password=postgres host=localhost',
                                 'SELECT id FROM users') AS t(id int)
        );

        -- 3. Sync student_profiles
        INSERT INTO student_profiles (user_id, roll_number, batch_id, section_id, department_id, guardian_name, guardian_phone, guardian_email)
        SELECT user_id, roll_number, batch_id, section_id, department_id, guardian_name, guardian_phone, guardian_email
        FROM dblink('dbname=college_live user=postgres password=postgres host=localhost',
                    'SELECT user_id, roll_number, batch_id, section_id, department_id, guardian_name, guardian_phone, guardian_email FROM student_profiles')
        AS t(user_id int, roll_number text, batch_id int, section_id int, department_id int, guardian_name text, guardian_phone text, guardian_email text)
        ON CONFLICT (user_id) DO UPDATE 
        SET roll_number = EXCLUDED.roll_number,
            department_id = EXCLUDED.department_id;

        -- 4. Sync staff_profiles
        INSERT INTO staff_profiles (user_id, department_id, designation, qualification)
        SELECT user_id, department_id, designation, qualification
        FROM dblink('dbname=college_live user=postgres password=postgres host=localhost',
                    'SELECT user_id, department_id, designation, qualification FROM staff_profiles')
        AS t(user_id int, department_id int, designation text, qualification text)
        ON CONFLICT (user_id) DO UPDATE 
        SET department_id = EXCLUDED.department_id,
            designation = EXCLUDED.designation;

        -- 5. Sync staff_departments
        INSERT INTO staff_departments (id, user_id, department_id, assigned_at)
        SELECT id, user_id, department_id, assigned_at
        FROM dblink('dbname=college_live user=postgres password=postgres host=localhost',
                    'SELECT id, user_id, department_id, assigned_at FROM staff_departments')
        AS t(id int, user_id int, department_id int, assigned_at timestamp)
        ON CONFLICT (user_id, department_id) DO NOTHING;

        -- 6. Sync removed_users (unique by user id to prevent duplicates)
        INSERT INTO removed_users (id, name, email, username, role, status, department, registered_at, deleted_at)
        SELECT id, name, email, username, role, status, department, registered_at, deleted_at
        FROM dblink('dbname=college_live user=postgres password=postgres host=localhost',
                    'SELECT id, name, email, username, role, status, department, registered_at, deleted_at FROM removed_users')
        AS t(id int, name text, email text, username text, role text, status text, department text, registered_at timestamp, deleted_at timestamp)
        ON CONFLICT (id) DO UPDATE 
        SET deleted_at = EXCLUDED.deleted_at,
            status = EXCLUDED.status,
            department = EXCLUDED.department;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $sync$;

-- ---------------------------------------------------------------------
-- Set College Name to "INPAND institute of Engineering and Technology"
-- ---------------------------------------------------------------------
INSERT INTO college_settings (key, value)
VALUES ('college_name', 'INPAND institute of Engineering and Technology')
ON CONFLICT (key) DO UPDATE SET value = 'INPAND institute of Engineering and Technology';

-- ---------------------------------------------------------------------
-- 1. Archive Table for Deleted Users (Permanent SQL Storage)
-- ---------------------------------------------------------------------
-- Deleted users are NEVER permanently removed from SQL.
-- Each deleted user is kept EXACTLY ONCE (guaranteed by UNIQUE constraint on id).
CREATE TABLE IF NOT EXISTS removed_users (
    archive_id     SERIAL PRIMARY KEY,
    id             INTEGER UNIQUE,
    name           TEXT NOT NULL,
    email          TEXT,
    username       TEXT,
    role           TEXT DEFAULT 'student',
    status         TEXT NOT NULL DEFAULT 'deleted',
    department     TEXT,
    registered_at  TIMESTAMP,
    deleted_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE removed_users ADD COLUMN IF NOT EXISTS archive_id SERIAL PRIMARY KEY;
ALTER TABLE removed_users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'deleted';
ALTER TABLE removed_users ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP;
ALTER TABLE removed_users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Remove any existing duplicate rows in removed_users (keeping latest record)
DELETE FROM removed_users a
USING removed_users b
WHERE a.id = b.id AND a.archive_id < b.archive_id;

-- Ensure UNIQUE constraint on id so duplicates can NEVER be inserted
ALTER TABLE removed_users DROP CONSTRAINT IF EXISTS removed_users_user_id_unique;
ALTER TABLE removed_users ADD CONSTRAINT removed_users_user_id_unique UNIQUE (id);

-- Ensure all records in removed_users have status set to 'deleted'
UPDATE removed_users SET status = 'deleted' WHERE status IS NULL OR status <> 'deleted';

-- ---------------------------------------------------------------------
-- 2. Allow 'deleted' in users table status constraint
-- ---------------------------------------------------------------------
-- This ensures users can also be soft-deleted directly in the users table
-- without constraint violation errors.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check 
    CHECK (status IN ('active', 'pending', 'rejected', 'deleted'));

-- ---------------------------------------------------------------------
-- 3. Department Snapshot Table
-- ---------------------------------------------------------------------
-- When an admin deletes a user, the application deletes child profiles
-- (student_profiles / staff_departments) first.
-- This snapshot ensures the user's department is NEVER lost on deletion.
CREATE TABLE IF NOT EXISTS user_department_snapshot (
    user_id     INTEGER PRIMARY KEY,
    department  TEXT,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 4. Function: Resolve Department Names for a User
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION user_department_names(p_user_id INTEGER)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(string_agg(DISTINCT d.name, ', ' ORDER BY d.name), '-')
    FROM departments d
    WHERE d.id IN (SELECT sd.department_id FROM staff_departments sd WHERE sd.user_id = p_user_id)
       OR d.id IN (SELECT stp.department_id FROM staff_profiles stp WHERE stp.user_id = p_user_id)
       OR d.id IN (SELECT sp.department_id FROM student_profiles sp WHERE sp.user_id = p_user_id)
       OR d.id IN (
            SELECT pr.department_id
            FROM student_profiles sp2
            LEFT JOIN sections sec ON sec.id = sp2.section_id
            JOIN batches b ON b.id = COALESCE(sp2.batch_id, sec.batch_id)
            JOIN programs pr ON pr.id = b.program_id
            WHERE sp2.user_id = p_user_id
       );
$$;

-- Populate/refresh department snapshot for all existing users
INSERT INTO user_department_snapshot (user_id, department, updated_at)
SELECT u.id, user_department_names(u.id), CURRENT_TIMESTAMP
FROM users u
ON CONFLICT (user_id) DO UPDATE 
SET department = EXCLUDED.department, 
    updated_at = CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------
-- 5. Function: Archive User into removed_users (Visible Only Once)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION archive_removed_user(p_user_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_dept TEXT;
BEGIN
    -- Retrieve department: live first, then snapshot backup, fallback to '-'
    v_dept := user_department_names(p_user_id);
    IF v_dept IS NULL OR v_dept = '-' THEN
        SELECT department INTO v_dept FROM user_department_snapshot WHERE user_id = p_user_id;
    END IF;
    v_dept := COALESCE(v_dept, '-');

    -- Insert or update single unique archive record per user
    INSERT INTO removed_users (id, name, email, username, role, status, department, registered_at, deleted_at)
    SELECT u.id, u.name, u.email, u.username, u.role,
           'deleted',
           v_dept,
           u.created_at,
           CURRENT_TIMESTAMP
    FROM users u
    WHERE u.id = p_user_id
    ON CONFLICT (id) DO UPDATE 
    SET status = 'deleted',
        deleted_at = CURRENT_TIMESTAMP,
        department = EXCLUDED.department;
END;
$$;

-- Helper function to mark a user as deleted without removing from users
CREATE OR REPLACE FUNCTION mark_user_deleted(p_user_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE users 
    SET status = 'deleted', 
        last_edited_at = CURRENT_TIMESTAMP 
    WHERE id = p_user_id;

    PERFORM archive_removed_user(p_user_id);
END;
$$;

-- ---------------------------------------------------------------------
-- 6. Triggers: Automatically Archive and Set Status to 'deleted'
-- ---------------------------------------------------------------------
-- Trigger 6a: Before permanent DELETE from users table
CREATE OR REPLACE FUNCTION trg_archive_user_before_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM archive_removed_user(OLD.id);
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_keep_deleted_users ON users;
DROP TRIGGER IF EXISTS trg_users_before_delete ON users;
DROP TRIGGER IF EXISTS users_archive_before_delete ON users;
CREATE TRIGGER users_archive_before_delete
BEFORE DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION trg_archive_user_before_delete();

-- Trigger 6b: When users.status is updated to 'deleted'
CREATE OR REPLACE FUNCTION trg_archive_user_on_status_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'deleted' AND (OLD.status IS NULL OR OLD.status <> 'deleted') THEN
        PERFORM archive_removed_user(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_archive_on_status_deleted ON users;
CREATE TRIGGER users_archive_on_status_deleted
AFTER UPDATE OF status ON users
FOR EACH ROW
EXECUTE FUNCTION trg_archive_user_on_status_deleted();

-- ---------------------------------------------------------------------
-- 7. Report View: registered_users_report (Each User Visible Only Once)
-- ---------------------------------------------------------------------
-- Fully compatible with the web app and init_db()
DROP VIEW IF EXISTS registered_users_report;
CREATE VIEW registered_users_report AS
SELECT * FROM (
  -- Registered users (active / pending / rejected)
  SELECT u.id AS id, 
         u.name AS name, 
         COALESCE(u.username, '(none)') AS username, 
         u.email AS email_or_phone,
         u.role AS role, 
         u.status AS status,
         CASE WHEN u.status = 'active' THEN 'Yes' ELSE 'No' END AS can_sign_in,
         CASE WHEN u.created_at >= (CURRENT_TIMESTAMP - INTERVAL '1 day') THEN 'Newly Registered' ELSE 'Registered' END AS registration_type,
         COALESCE(NULLIF(user_department_names(u.id), '-'), (SELECT uds.department FROM user_department_snapshot uds WHERE uds.user_id = u.id), '-') AS department,
         COALESCE(sp.roll_number, stp.designation, '-') AS roll_or_designation,
         COALESCE(b.name, '-') AS batch, 
         COALESCE(sec.name, '-') AS section,
         COALESCE(cb.name, '-') AS created_by, 
         u.created_at AS created_at,
         CASE WHEN u.created_at >= (CURRENT_TIMESTAMP - INTERVAL '1 day') THEN 1 ELSE 2 END AS sort_priority
  FROM users u
  LEFT JOIN student_profiles sp ON sp.user_id = u.id
  LEFT JOIN staff_profiles stp ON stp.user_id = u.id
  LEFT JOIN sections sec ON sec.id = sp.section_id
  LEFT JOIN batches b ON b.id = COALESCE(sp.batch_id, sec.batch_id)
  LEFT JOIN users cb ON cb.id = u.created_by_id
  WHERE u.status <> 'deleted'

  UNION ALL

  -- Deleted users from removed_users archive (Visible only once per account)
  SELECT rem.id, 
         rem.name, 
         COALESCE(rem.username, '(none)'), 
         COALESCE(rem.email, '-'), 
         COALESCE(rem.role, '-'),
         'deleted' AS status, 
         'No' AS can_sign_in, 
         'Deleted' AS registration_type, 
         COALESCE(rem.department, '-'), 
         '-', '-', '-', '-', 
         rem.deleted_at AS created_at, 
         3 AS sort_priority
  FROM removed_users rem

  UNION ALL

  -- Deleted users marked directly with status = 'deleted' in users table
  SELECT u2.id, 
         u2.name, 
         COALESCE(u2.username, '(none)'), 
         COALESCE(u2.email, '-'), 
         COALESCE(u2.role, '-'),
         'deleted' AS status, 
         'No' AS can_sign_in, 
         'Deleted' AS registration_type, 
         COALESCE(NULLIF(user_department_names(u2.id), '-'), (SELECT uds.department FROM user_department_snapshot uds WHERE uds.user_id = u2.id), '-'), 
         '-', '-', '-', '-', 
         COALESCE(u2.last_edited_at, u2.created_at) AS created_at, 
         3 AS sort_priority
  FROM users u2
  WHERE u2.status = 'deleted'
    AND u2.id NOT IN (SELECT COALESCE(id, -1) FROM removed_users)
) sub
ORDER BY sort_priority, created_at DESC, id DESC;

COMMIT;
RESET client_min_messages;

-- =====================================================================
-- 8. Main Output Function: show_all_users()
-- =====================================================================
-- Returns:
--   0. SUMMARY    : Total counts of registered & deleted users in database
--   1. REGISTERED : All active/pending users (including newly registered)
--   2. DELETED    : Each deleted user displayed EXACTLY ONCE
-- =====================================================================
CREATE OR REPLACE FUNCTION show_all_users()
RETURNS TABLE (
    list_name      TEXT,
    user_id        INTEGER,
    full_name      TEXT,
    login_username TEXT,
    email_or_phone TEXT,
    user_role      TEXT,
    user_status    TEXT,
    department     TEXT,
    registered_on  TEXT,
    deleted_on     TEXT
)
LANGUAGE sql
STABLE
AS $$
    -- 0. SUMMARY ROW
    SELECT '0. SUMMARY'::text AS list_name,
           NULL::integer AS user_id,
           ('Database: ' || current_database() ||
            ' | Registered users: ' || (SELECT COUNT(DISTINCT id) FROM users WHERE status <> 'deleted') ||
            ' | Deleted users: ' || (
                (SELECT COUNT(DISTINCT id) FROM removed_users) + 
                (SELECT COUNT(DISTINCT id) FROM users WHERE status = 'deleted' AND id NOT IN (SELECT COALESCE(id, -1) FROM removed_users))
            ))::text AS full_name,
           '-'::text AS login_username, 
           '-'::text AS email_or_phone, 
           '-'::text AS user_role, 
           '-'::text AS user_status, 
           '-'::text AS department, 
           '-'::text AS registered_on, 
           '-'::text AS deleted_on

    UNION ALL

    -- 1. REGISTERED USERS (Shows all active/pending/newly registered users)
    SELECT '1. REGISTERED'::text AS list_name,
           u.id AS user_id,
           u.name::text AS full_name,
           COALESCE(u.username, '(none)')::text AS login_username,
           u.email::text AS email_or_phone,
           u.role::text AS user_role,
           u.status::text AS user_status,
           COALESCE(NULLIF(user_department_names(u.id), '-'), (SELECT uds.department FROM user_department_snapshot uds WHERE uds.user_id = u.id), '-')::text AS department,
           COALESCE(TO_CHAR(u.created_at, 'YYYY-MM-DD HH24:MI:SS'), '-')::text AS registered_on,
           '-'::text AS deleted_on
    FROM users u
    WHERE u.status <> 'deleted'

    UNION ALL

    -- 2. DELETED USERS (Visible EXACTLY ONCE per account, status is 'deleted')
    SELECT '2. DELETED'::text AS list_name,
           del.user_id,
           del.full_name,
           del.login_username,
           del.email_or_phone,
           del.user_role,
           del.user_status,
           del.department,
           del.registered_on,
           del.deleted_on
    FROM (
        SELECT DISTINCT ON (user_id)
               user_id,
               full_name,
               login_username,
               email_or_phone,
               user_role,
               user_status,
               department,
               registered_on,
               deleted_on,
               deleted_at
        FROM (
            -- Archived users from removed_users (status is 'deleted')
            SELECT rem.id AS user_id,
                   rem.name::text AS full_name,
                   COALESCE(rem.username, '(none)')::text AS login_username,
                   COALESCE(rem.email, '-')::text AS email_or_phone,
                   COALESCE(rem.role, '-')::text AS user_role,
                   COALESCE(rem.status, 'deleted')::text AS user_status,
                   COALESCE(rem.department, '-')::text AS department,
                   COALESCE(TO_CHAR(rem.registered_at, 'YYYY-MM-DD HH24:MI:SS'), '-')::text AS registered_on,
                   COALESCE(TO_CHAR(rem.deleted_at, 'YYYY-MM-DD HH24:MI:SS'), '-')::text AS deleted_on,
                   rem.deleted_at AS deleted_at
            FROM removed_users rem

            UNION ALL

            -- Users marked status = 'deleted' in users table
            SELECT u2.id AS user_id,
                   u2.name::text AS full_name,
                   COALESCE(u2.username, '(none)')::text AS login_username,
                   COALESCE(u2.email, '-')::text AS email_or_phone,
                   u2.role::text AS user_role,
                   'deleted'::text AS user_status,
                   COALESCE(NULLIF(user_department_names(u2.id), '-'), (SELECT uds.department FROM user_department_snapshot uds WHERE uds.user_id = u2.id), '-')::text AS department,
                   COALESCE(TO_CHAR(u2.created_at, 'YYYY-MM-DD HH24:MI:SS'), '-')::text AS registered_on,
                   COALESCE(TO_CHAR(u2.last_edited_at, 'YYYY-MM-DD HH24:MI:SS'), '-')::text AS deleted_on,
                   COALESCE(u2.last_edited_at, u2.created_at) AS deleted_at
            FROM users u2
            WHERE u2.status = 'deleted'
              AND u2.id NOT IN (SELECT COALESCE(id, -1) FROM removed_users)
        ) raw_del
        ORDER BY user_id, deleted_at DESC
    ) del

    ORDER BY list_name ASC, user_id DESC NULLS LAST;
$$;

-- =====================================================================
-- 9. EXECUTE AND SHOW ALL USERS
-- =====================================================================
SELECT * FROM show_all_users();
