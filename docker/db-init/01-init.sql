--
-- PostgreSQL database dump
--


-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS submissions_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS submissions_question_id_fkey;
ALTER TABLE IF EXISTS ONLY public.subjects DROP CONSTRAINT IF EXISTS subjects_faculty_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.subjects DROP CONSTRAINT IF EXISTS subjects_department_id_fkey;
ALTER TABLE IF EXISTS ONLY public.subjects DROP CONSTRAINT IF EXISTS subjects_batch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_section_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_batch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_library_books DROP CONSTRAINT IF EXISTS student_library_books_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_library_books DROP CONSTRAINT IF EXISTS student_library_books_issued_by_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_fees DROP CONSTRAINT IF EXISTS student_fees_updated_by_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_fees DROP CONSTRAINT IF EXISTS student_fees_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_daily_attendance DROP CONSTRAINT IF EXISTS student_daily_attendance_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_daily_attendance DROP CONSTRAINT IF EXISTS student_daily_attendance_marked_by_fkey;
ALTER TABLE IF EXISTS ONLY public.staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_department_id_fkey;
ALTER TABLE IF EXISTS ONLY public.staff_departments DROP CONSTRAINT IF EXISTS staff_departments_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.staff_departments DROP CONSTRAINT IF EXISTS staff_departments_department_id_fkey;
ALTER TABLE IF EXISTS ONLY public.semesters DROP CONSTRAINT IF EXISTS semesters_academic_year_id_fkey;
ALTER TABLE IF EXISTS ONLY public.sections DROP CONSTRAINT IF EXISTS sections_batch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.questions DROP CONSTRAINT IF EXISTS questions_teacher_id_fkey;
ALTER TABLE IF EXISTS ONLY public.questions DROP CONSTRAINT IF EXISTS questions_target_group_id_fkey;
ALTER TABLE IF EXISTS ONLY public.programs DROP CONSTRAINT IF EXISTS programs_department_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_sender_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.groups DROP CONSTRAINT IF EXISTS groups_created_by_teacher_id_fkey;
ALTER TABLE IF EXISTS ONLY public.group_students DROP CONSTRAINT IF EXISTS group_students_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.group_students DROP CONSTRAINT IF EXISTS group_students_group_id_fkey;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_hod_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.department_requests DROP CONSTRAINT IF EXISTS department_requests_requested_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.department_requests DROP CONSTRAINT IF EXISTS department_requests_requested_by_id_fkey;
ALTER TABLE IF EXISTS ONLY public.department_requests DROP CONSTRAINT IF EXISTS department_requests_decided_by_id_fkey;
ALTER TABLE IF EXISTS ONLY public.batches DROP CONSTRAINT IF EXISTS batches_program_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance_sessions DROP CONSTRAINT IF EXISTS attendance_sessions_subject_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance_sessions DROP CONSTRAINT IF EXISTS attendance_sessions_marked_by_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_session_id_fkey;
ALTER TABLE IF EXISTS ONLY public.academic_tasks DROP CONSTRAINT IF EXISTS academic_tasks_created_by_id_fkey;
DROP TRIGGER IF EXISTS users_archive_on_status_deleted ON public.users;
DROP TRIGGER IF EXISTS users_archive_before_delete ON public.users;
DROP INDEX IF EXISTS public.idx_users_username;
DROP INDEX IF EXISTS public.idx_users_role_status;
DROP INDEX IF EXISTS public.idx_users_role;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_users_created_by;
DROP INDEX IF EXISTS public.idx_submissions_student;
DROP INDEX IF EXISTS public.idx_submissions_q_student;
DROP INDEX IF EXISTS public.idx_student_profiles_user_id;
DROP INDEX IF EXISTS public.idx_student_profiles_dept_id;
DROP INDEX IF EXISTS public.idx_student_profiles_batch_id;
DROP INDEX IF EXISTS public.idx_student_lib_books_student;
DROP INDEX IF EXISTS public.idx_student_lib_books_status;
DROP INDEX IF EXISTS public.idx_student_fees_student;
DROP INDEX IF EXISTS public.idx_student_fees_status;
DROP INDEX IF EXISTS public.idx_staff_profiles_user_id;
DROP INDEX IF EXISTS public.idx_staff_profiles_dept_id;
DROP INDEX IF EXISTS public.idx_staff_depts_user_id;
DROP INDEX IF EXISTS public.idx_staff_depts_dept_id;
DROP INDEX IF EXISTS public.idx_staff_departments_user;
DROP INDEX IF EXISTS public.idx_staff_departments_dept;
DROP INDEX IF EXISTS public.idx_sda_student;
DROP INDEX IF EXISTS public.idx_sda_date;
DROP INDEX IF EXISTS public.idx_questions_teacher_id;
DROP INDEX IF EXISTS public.idx_questions_target_year;
DROP INDEX IF EXISTS public.idx_questions_target_group;
DROP INDEX IF EXISTS public.idx_questions_target_dept;
DROP INDEX IF EXISTS public.idx_questions_target;
DROP INDEX IF EXISTS public.idx_notifications_recipient;
DROP INDEX IF EXISTS public.idx_group_students_student;
DROP INDEX IF EXISTS public.idx_group_students_group;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.user_department_snapshot DROP CONSTRAINT IF EXISTS user_department_snapshot_pkey;
ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS submissions_question_id_student_id_key;
ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS submissions_pkey;
ALTER TABLE IF EXISTS ONLY public.subjects DROP CONSTRAINT IF EXISTS subjects_pkey;
ALTER TABLE IF EXISTS ONLY public.subjects DROP CONSTRAINT IF EXISTS subjects_code_key;
ALTER TABLE IF EXISTS ONLY public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_roll_number_key;
ALTER TABLE IF EXISTS ONLY public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_pkey;
ALTER TABLE IF EXISTS ONLY public.student_library_books DROP CONSTRAINT IF EXISTS student_library_books_pkey;
ALTER TABLE IF EXISTS ONLY public.student_fees DROP CONSTRAINT IF EXISTS student_fees_student_id_key;
ALTER TABLE IF EXISTS ONLY public.student_fees DROP CONSTRAINT IF EXISTS student_fees_pkey;
ALTER TABLE IF EXISTS ONLY public.student_daily_attendance DROP CONSTRAINT IF EXISTS student_daily_attendance_student_id_attendance_date_key;
ALTER TABLE IF EXISTS ONLY public.student_daily_attendance DROP CONSTRAINT IF EXISTS student_daily_attendance_pkey;
ALTER TABLE IF EXISTS ONLY public.staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_pkey;
ALTER TABLE IF EXISTS ONLY public.staff_departments DROP CONSTRAINT IF EXISTS staff_departments_user_id_department_id_key;
ALTER TABLE IF EXISTS ONLY public.staff_departments DROP CONSTRAINT IF EXISTS staff_departments_pkey;
ALTER TABLE IF EXISTS ONLY public.semesters DROP CONSTRAINT IF EXISTS semesters_pkey;
ALTER TABLE IF EXISTS ONLY public.semesters DROP CONSTRAINT IF EXISTS semesters_academic_year_id_name_key;
ALTER TABLE IF EXISTS ONLY public.sections DROP CONSTRAINT IF EXISTS sections_pkey;
ALTER TABLE IF EXISTS ONLY public.sections DROP CONSTRAINT IF EXISTS sections_batch_id_name_key;
ALTER TABLE IF EXISTS ONLY public.revoked_tokens DROP CONSTRAINT IF EXISTS revoked_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.removed_users DROP CONSTRAINT IF EXISTS removed_users_user_id_unique;
ALTER TABLE IF EXISTS ONLY public.removed_users DROP CONSTRAINT IF EXISTS removed_users_pkey;
ALTER TABLE IF EXISTS ONLY public.questions DROP CONSTRAINT IF EXISTS questions_pkey;
ALTER TABLE IF EXISTS ONLY public.programs DROP CONSTRAINT IF EXISTS programs_pkey;
ALTER TABLE IF EXISTS ONLY public.programs DROP CONSTRAINT IF EXISTS programs_department_id_name_key;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.holidays DROP CONSTRAINT IF EXISTS holidays_pkey;
ALTER TABLE IF EXISTS ONLY public.holidays DROP CONSTRAINT IF EXISTS holidays_holiday_date_key;
ALTER TABLE IF EXISTS ONLY public.groups DROP CONSTRAINT IF EXISTS groups_pkey;
ALTER TABLE IF EXISTS ONLY public.groups DROP CONSTRAINT IF EXISTS groups_name_key;
ALTER TABLE IF EXISTS ONLY public.group_students DROP CONSTRAINT IF EXISTS group_students_pkey;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_pkey;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_name_key;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_code_key;
ALTER TABLE IF EXISTS ONLY public.department_requests DROP CONSTRAINT IF EXISTS department_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.college_settings DROP CONSTRAINT IF EXISTS college_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.batches DROP CONSTRAINT IF EXISTS batches_program_id_name_key;
ALTER TABLE IF EXISTS ONLY public.batches DROP CONSTRAINT IF EXISTS batches_pkey;
ALTER TABLE IF EXISTS ONLY public.attendance_sessions DROP CONSTRAINT IF EXISTS attendance_sessions_subject_id_session_date_period_key;
ALTER TABLE IF EXISTS ONLY public.attendance_sessions DROP CONSTRAINT IF EXISTS attendance_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_pkey;
ALTER TABLE IF EXISTS ONLY public.academic_years DROP CONSTRAINT IF EXISTS academic_years_pkey;
ALTER TABLE IF EXISTS ONLY public.academic_years DROP CONSTRAINT IF EXISTS academic_years_name_key;
ALTER TABLE IF EXISTS ONLY public.academic_tasks DROP CONSTRAINT IF EXISTS academic_tasks_task_number_key;
ALTER TABLE IF EXISTS ONLY public.academic_tasks DROP CONSTRAINT IF EXISTS academic_tasks_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.submissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.subjects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.student_library_books ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.student_fees ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.student_daily_attendance ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.staff_departments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.semesters ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sections ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.removed_users ALTER COLUMN archive_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.questions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.programs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.holidays ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.groups ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.departments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.department_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.batches ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.attendance_sessions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.academic_years ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.academic_tasks ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.user_department_snapshot;
DROP SEQUENCE IF EXISTS public.submissions_id_seq;
DROP TABLE IF EXISTS public.submissions;
DROP SEQUENCE IF EXISTS public.subjects_id_seq;
DROP TABLE IF EXISTS public.subjects;
DROP SEQUENCE IF EXISTS public.student_library_books_id_seq;
DROP TABLE IF EXISTS public.student_library_books;
DROP SEQUENCE IF EXISTS public.student_fees_id_seq;
DROP TABLE IF EXISTS public.student_fees;
DROP SEQUENCE IF EXISTS public.student_daily_attendance_id_seq;
DROP TABLE IF EXISTS public.student_daily_attendance;
DROP SEQUENCE IF EXISTS public.staff_departments_id_seq;
DROP SEQUENCE IF EXISTS public.semesters_id_seq;
DROP TABLE IF EXISTS public.semesters;
DROP SEQUENCE IF EXISTS public.sections_id_seq;
DROP TABLE IF EXISTS public.revoked_tokens;
DROP SEQUENCE IF EXISTS public.removed_users_archive_id_seq;
DROP VIEW IF EXISTS public.registered_users_report;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.student_profiles;
DROP TABLE IF EXISTS public.staff_profiles;
DROP TABLE IF EXISTS public.staff_departments;
DROP TABLE IF EXISTS public.sections;
DROP TABLE IF EXISTS public.removed_users;
DROP SEQUENCE IF EXISTS public.questions_id_seq;
DROP TABLE IF EXISTS public.questions;
DROP SEQUENCE IF EXISTS public.programs_id_seq;
DROP TABLE IF EXISTS public.programs;
DROP SEQUENCE IF EXISTS public.notifications_id_seq;
DROP TABLE IF EXISTS public.notifications;
DROP SEQUENCE IF EXISTS public.holidays_id_seq;
DROP TABLE IF EXISTS public.holidays;
DROP SEQUENCE IF EXISTS public.groups_id_seq;
DROP TABLE IF EXISTS public.groups;
DROP TABLE IF EXISTS public.group_students;
DROP SEQUENCE IF EXISTS public.departments_id_seq;
DROP TABLE IF EXISTS public.departments;
DROP SEQUENCE IF EXISTS public.department_requests_id_seq;
DROP TABLE IF EXISTS public.department_requests;
DROP TABLE IF EXISTS public.college_settings;
DROP SEQUENCE IF EXISTS public.batches_id_seq;
DROP TABLE IF EXISTS public.batches;
DROP SEQUENCE IF EXISTS public.attendance_sessions_id_seq;
DROP TABLE IF EXISTS public.attendance_sessions;
DROP TABLE IF EXISTS public.attendance_records;
DROP SEQUENCE IF EXISTS public.academic_years_id_seq;
DROP TABLE IF EXISTS public.academic_years;
DROP SEQUENCE IF EXISTS public.academic_tasks_id_seq;
DROP TABLE IF EXISTS public.academic_tasks;
DROP AGGREGATE IF EXISTS public.group_concat(text, text);
DROP AGGREGATE IF EXISTS public.group_concat(text);
DROP FUNCTION IF EXISTS public.user_department_names(p_user_id integer);
DROP FUNCTION IF EXISTS public.trg_archive_user_on_status_deleted();
DROP FUNCTION IF EXISTS public.trg_archive_user_before_delete();
DROP FUNCTION IF EXISTS public.show_all_users();
DROP FUNCTION IF EXISTS public.mark_user_deleted(p_user_id integer);
DROP FUNCTION IF EXISTS public.instr(str text, sub text);
DROP FUNCTION IF EXISTS public.group_concat_state_2(state text, val text, delim text);
DROP FUNCTION IF EXISTS public.group_concat_state_1(state text, val text);
DROP FUNCTION IF EXISTS public.datetime(val timestamp without time zone, modifier text);
DROP FUNCTION IF EXISTS public.datetime(val text);
DROP FUNCTION IF EXISTS public.archive_removed_user(p_user_id integer);
--
-- Name: archive_removed_user(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.archive_removed_user(p_user_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_dept TEXT;
BEGIN
    v_dept := user_department_names(p_user_id);
    IF v_dept IS NULL OR v_dept = '-' THEN
        SELECT department INTO v_dept FROM user_department_snapshot WHERE user_id = p_user_id;
    END IF;
    v_dept := COALESCE(v_dept, '-');

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


ALTER FUNCTION public.archive_removed_user(p_user_id integer) OWNER TO postgres;

--
-- Name: datetime(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.datetime(val text) RETURNS timestamp without time zone
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    IF val = 'now' THEN
        RETURN CURRENT_TIMESTAMP;
    END IF;
    RETURN val::timestamp;
END;
$$;


ALTER FUNCTION public.datetime(val text) OWNER TO postgres;

--
-- Name: datetime(timestamp without time zone, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.datetime(val timestamp without time zone, modifier text) RETURNS timestamp without time zone
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    IF modifier = '+24 hours' OR modifier = '+24 hour' THEN
        RETURN val + INTERVAL '24 hours';
    END IF;
    RETURN val;
END;
$$;


ALTER FUNCTION public.datetime(val timestamp without time zone, modifier text) OWNER TO postgres;

--
-- Name: group_concat_state_1(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.group_concat_state_1(state text, val text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
                SELECT CASE WHEN state IS NULL THEN val ELSE state || ', ' || val END;
            $$;


ALTER FUNCTION public.group_concat_state_1(state text, val text) OWNER TO postgres;

--
-- Name: group_concat_state_2(text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.group_concat_state_2(state text, val text, delim text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
                SELECT CASE WHEN state IS NULL THEN val ELSE state || delim || val END;
            $$;


ALTER FUNCTION public.group_concat_state_2(state text, val text, delim text) OWNER TO postgres;

--
-- Name: instr(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.instr(str text, sub text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
                SELECT POSITION(sub IN str);
            $$;


ALTER FUNCTION public.instr(str text, sub text) OWNER TO postgres;

--
-- Name: mark_user_deleted(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.mark_user_deleted(p_user_id integer) RETURNS void
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


ALTER FUNCTION public.mark_user_deleted(p_user_id integer) OWNER TO postgres;

--
-- Name: show_all_users(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.show_all_users() RETURNS TABLE(list_name text, user_id integer, full_name text, login_username text, email_or_phone text, user_role text, user_status text, department text, registered_on text, deleted_on text)
    LANGUAGE sql STABLE
    AS $$
    -- 0. SUMMARY ROW
    SELECT '0. SUMMARY'::text AS list_name,
           NULL::integer AS user_id,
           ('Database: ' || current_database() ||
            ' | Registered: ' || (
                SELECT COUNT(DISTINCT id) FROM users 
                WHERE status NOT IN ('deleted', 'delete', 'rejected', 'reject')
                  AND id NOT IN (SELECT COALESCE(id, -1) FROM removed_users)
            ) ||
            ' | Rejected: ' || (
                SELECT COUNT(DISTINCT id) FROM users 
                WHERE status IN ('rejected', 'reject')
                  AND id NOT IN (SELECT COALESCE(id, -1) FROM removed_users)
            ) ||
            ' | Deleted: ' || (
                (SELECT COUNT(DISTINCT id) FROM removed_users) + 
                (SELECT COUNT(DISTINCT id) FROM users WHERE status IN ('deleted', 'delete') AND id NOT IN (SELECT COALESCE(id, -1) FROM removed_users))
            ) ||
            ' | Total Records: ' || (
                (SELECT COUNT(DISTINCT id) FROM users WHERE id NOT IN (SELECT COALESCE(id, -1) FROM removed_users) AND status NOT IN ('deleted', 'delete')) +
                (SELECT COUNT(DISTINCT id) FROM removed_users)
            ))::text AS full_name,
           '-'::text AS login_username, 
           '-'::text AS email_or_phone, 
           '-'::text AS user_role, 
           '-'::text AS user_status, 
           '-'::text AS department, 
           '-'::text AS registered_on, 
           '-'::text AS deleted_on

    UNION ALL

    -- 1. REGISTERED USERS (Active / pending registered users)
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
    WHERE u.status NOT IN ('deleted', 'delete', 'rejected', 'reject')
      AND u.id NOT IN (SELECT COALESCE(id, -1) FROM removed_users)

    UNION ALL

    -- 2. REJECTED USERS (Shown with user_status = 'rejected')
    SELECT '2. REJECTED'::text AS list_name,
           u_rej.id AS user_id,
           u_rej.name::text AS full_name,
           COALESCE(u_rej.username, '(none)')::text AS login_username,
           u_rej.email::text AS email_or_phone,
           u_rej.role::text AS user_role,
           'rejected'::text AS user_status,
           COALESCE(NULLIF(user_department_names(u_rej.id), '-'), (SELECT uds.department FROM user_department_snapshot uds WHERE uds.user_id = u_rej.id), '-')::text AS department,
           COALESCE(TO_CHAR(u_rej.created_at, 'YYYY-MM-DD HH24:MI:SS'), '-')::text AS registered_on,
           COALESCE(TO_CHAR(u_rej.last_edited_at, 'YYYY-MM-DD HH24:MI:SS'), '-')::text AS deleted_on
    FROM users u_rej
    WHERE u_rej.status IN ('rejected', 'reject')
      AND u_rej.id NOT IN (SELECT COALESCE(id, -1) FROM removed_users)

    UNION ALL

    -- 3. DELETED USERS (Shown with user_status = 'deleted', visible EXACTLY ONCE per account)
    SELECT '3. DELETED'::text AS list_name,
           del.user_id,
           del.full_name,
           del.login_username,
           del.email_or_phone,
           del.user_role,
           'deleted'::text AS user_status,
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
               department,
               registered_on,
               deleted_on,
               deleted_at
        FROM (
            -- Archived users from removed_users (shown as 'deleted')
            SELECT rem.id AS user_id,
                   rem.name::text AS full_name,
                   COALESCE(rem.username, '(none)')::text AS login_username,
                   COALESCE(rem.email, '-')::text AS email_or_phone,
                   COALESCE(rem.role, '-')::text AS user_role,
                   COALESCE(rem.department, '-')::text AS department,
                   COALESCE(TO_CHAR(rem.registered_at, 'YYYY-MM-DD HH24:MI:SS'), '-')::text AS registered_on,
                   COALESCE(TO_CHAR(rem.deleted_at, 'YYYY-MM-DD HH24:MI:SS'), '-')::text AS deleted_on,
                   rem.deleted_at AS deleted_at
            FROM removed_users rem

            UNION ALL

            -- Users marked directly in users table (shown as 'deleted')
            SELECT u2.id AS user_id,
                   u2.name::text AS full_name,
                   COALESCE(u2.username, '(none)')::text AS login_username,
                   COALESCE(u2.email, '-')::text AS email_or_phone,
                   u2.role::text AS user_role,
                   COALESCE(NULLIF(user_department_names(u2.id), '-'), (SELECT uds.department FROM user_department_snapshot uds WHERE uds.user_id = u2.id), '-')::text AS department,
                   COALESCE(TO_CHAR(u2.created_at, 'YYYY-MM-DD HH24:MI:SS'), '-')::text AS registered_on,
                   COALESCE(TO_CHAR(u2.last_edited_at, 'YYYY-MM-DD HH24:MI:SS'), '-')::text AS deleted_on,
                   COALESCE(u2.last_edited_at, u2.created_at) AS deleted_at
            FROM users u2
            WHERE u2.status IN ('deleted', 'delete')
              AND u2.id NOT IN (SELECT COALESCE(id, -1) FROM removed_users)
        ) raw_del
        ORDER BY user_id, deleted_at DESC
    ) del

    ORDER BY list_name ASC, user_id DESC NULLS LAST;
$$;


ALTER FUNCTION public.show_all_users() OWNER TO postgres;

--
-- Name: trg_archive_user_before_delete(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_archive_user_before_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM archive_removed_user(OLD.id);
    RETURN OLD;
END;
$$;


ALTER FUNCTION public.trg_archive_user_before_delete() OWNER TO postgres;

--
-- Name: trg_archive_user_on_status_deleted(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_archive_user_on_status_deleted() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status IN ('deleted', 'delete') AND (OLD.status IS NULL OR OLD.status NOT IN ('deleted', 'delete')) THEN
        PERFORM archive_removed_user(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trg_archive_user_on_status_deleted() OWNER TO postgres;

--
-- Name: user_department_names(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_department_names(p_user_id integer) RETURNS text
    LANGUAGE sql STABLE
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


ALTER FUNCTION public.user_department_names(p_user_id integer) OWNER TO postgres;

--
-- Name: group_concat(text); Type: AGGREGATE; Schema: public; Owner: postgres
--

CREATE AGGREGATE public.group_concat(text) (
    SFUNC = public.group_concat_state_1,
    STYPE = text
);


ALTER AGGREGATE public.group_concat(text) OWNER TO postgres;

--
-- Name: group_concat(text, text); Type: AGGREGATE; Schema: public; Owner: postgres
--

CREATE AGGREGATE public.group_concat(text, text) (
    SFUNC = public.group_concat_state_2,
    STYPE = text
);


ALTER AGGREGATE public.group_concat(text, text) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: academic_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.academic_tasks (
    id integer NOT NULL,
    task_number text NOT NULL,
    created_by_id integer,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.academic_tasks OWNER TO postgres;

--
-- Name: academic_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.academic_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.academic_tasks_id_seq OWNER TO postgres;

--
-- Name: academic_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.academic_tasks_id_seq OWNED BY public.academic_tasks.id;


--
-- Name: academic_years; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.academic_years (
    id integer NOT NULL,
    name text NOT NULL,
    start_date text NOT NULL,
    end_date text NOT NULL
);


ALTER TABLE public.academic_years OWNER TO postgres;

--
-- Name: academic_years_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.academic_years_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.academic_years_id_seq OWNER TO postgres;

--
-- Name: academic_years_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.academic_years_id_seq OWNED BY public.academic_years.id;


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_records (
    session_id integer NOT NULL,
    student_id integer NOT NULL,
    status text NOT NULL,
    CONSTRAINT attendance_records_status_check CHECK ((status = ANY (ARRAY['P'::text, 'A'::text, 'OD'::text, 'L'::text])))
);


ALTER TABLE public.attendance_records OWNER TO postgres;

--
-- Name: attendance_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_sessions (
    id integer NOT NULL,
    subject_id integer NOT NULL,
    session_date text NOT NULL,
    period integer NOT NULL,
    marked_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT attendance_sessions_period_check CHECK (((period >= 1) AND (period <= 8)))
);


ALTER TABLE public.attendance_sessions OWNER TO postgres;

--
-- Name: attendance_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_sessions_id_seq OWNER TO postgres;

--
-- Name: attendance_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_sessions_id_seq OWNED BY public.attendance_sessions.id;


--
-- Name: batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.batches (
    id integer NOT NULL,
    program_id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.batches OWNER TO postgres;

--
-- Name: batches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batches_id_seq OWNER TO postgres;

--
-- Name: batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.batches_id_seq OWNED BY public.batches.id;


--
-- Name: college_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.college_settings (
    key text NOT NULL,
    value text NOT NULL,
    set_by_id integer,
    set_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.college_settings OWNER TO postgres;

--
-- Name: department_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.department_requests (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    requested_user_id integer,
    requested_by_id integer,
    status text DEFAULT 'pending'::text NOT NULL,
    decided_by_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    decided_at timestamp without time zone,
    CONSTRAINT department_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.department_requests OWNER TO postgres;

--
-- Name: department_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.department_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.department_requests_id_seq OWNER TO postgres;

--
-- Name: department_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.department_requests_id_seq OWNED BY public.department_requests.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    hod_user_id integer
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: group_students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_students (
    group_id integer NOT NULL,
    student_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.group_students OWNER TO postgres;

--
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_by_teacher_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.groups OWNER TO postgres;

--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.groups_id_seq OWNER TO postgres;

--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.holidays (
    id integer NOT NULL,
    holiday_date text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.holidays OWNER TO postgres;

--
-- Name: holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.holidays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.holidays_id_seq OWNER TO postgres;

--
-- Name: holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.holidays_id_seq OWNED BY public.holidays.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    recipient_role text,
    recipient_id integer,
    sender_id integer,
    sender_role text,
    sender_name text,
    type text DEFAULT 'broadcast'::text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    reference_id integer,
    department_name text,
    is_read integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: programs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.programs (
    id integer NOT NULL,
    department_id integer NOT NULL,
    name text NOT NULL,
    degree text NOT NULL,
    duration_years integer DEFAULT 4 NOT NULL
);


ALTER TABLE public.programs OWNER TO postgres;

--
-- Name: programs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.programs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.programs_id_seq OWNER TO postgres;

--
-- Name: programs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.programs_id_seq OWNED BY public.programs.id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.questions (
    id integer NOT NULL,
    teacher_id integer NOT NULL,
    question_text text NOT NULL,
    option_a text NOT NULL,
    option_b text NOT NULL,
    option_c text NOT NULL,
    option_d text NOT NULL,
    correct_option text NOT NULL,
    explanation text,
    duration_seconds integer NOT NULL,
    target_type text NOT NULL,
    target_group_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    target_department_id integer,
    target_year integer,
    task_number text DEFAULT 'Task 1'::text,
    CONSTRAINT questions_correct_option_check CHECK ((correct_option = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text]))),
    CONSTRAINT questions_duration_seconds_check CHECK (((duration_seconds >= 30) AND (duration_seconds <= 3600))),
    CONSTRAINT questions_target_type_check CHECK ((target_type = ANY (ARRAY['all'::text, 'group'::text])))
);


ALTER TABLE public.questions OWNER TO postgres;

--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questions_id_seq OWNER TO postgres;

--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: removed_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.removed_users (
    id integer,
    name text NOT NULL,
    email text,
    username text,
    role text DEFAULT 'student'::text,
    department text,
    deleted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    archive_id integer NOT NULL,
    registered_at timestamp without time zone,
    status text DEFAULT 'deleted'::text NOT NULL
);


ALTER TABLE public.removed_users OWNER TO postgres;

--
-- Name: sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sections (
    id integer NOT NULL,
    batch_id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.sections OWNER TO postgres;

--
-- Name: staff_departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_departments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    department_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.staff_departments OWNER TO postgres;

--
-- Name: staff_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_profiles (
    user_id integer NOT NULL,
    department_id integer,
    designation text,
    qualification text
);


ALTER TABLE public.staff_profiles OWNER TO postgres;

--
-- Name: student_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_profiles (
    user_id integer NOT NULL,
    roll_number text,
    batch_id integer,
    section_id integer,
    department_id integer,
    guardian_name text,
    guardian_phone text,
    guardian_email text,
    academic_year integer,
    previous_year integer,
    year_changed_at timestamp without time zone
);


ALTER TABLE public.student_profiles OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    username text,
    password_hash text NOT NULL,
    role text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_by_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_edited_by_id integer,
    last_edited_at timestamp without time zone,
    academic_year integer,
    previous_year integer,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['dean'::text, 'super_admin'::text, 'admin'::text, 'principal'::text, 'hod'::text, 'teacher'::text, 'class_teacher'::text, 'student'::text, 'class_leader'::text, 'accountant'::text, 'librarian'::text, 'parent'::text]))),
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'pending'::text, 'rejected'::text, 'reject'::text, 'deleted'::text, 'delete'::text, 'passed_out'::text, 'graduated'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: registered_users_report; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.registered_users_report AS
 SELECT id,
    name,
    username,
    email_or_phone,
    role,
    status,
    can_sign_in,
    registration_type,
    department,
    roll_or_designation,
    batch,
    section,
    created_by,
    created_at,
    sort_priority
   FROM ( SELECT u.id,
            u.name,
            COALESCE(u.username, '(none)'::text) AS username,
            u.email AS email_or_phone,
            u.role,
            u.status,
                CASE
                    WHEN (u.status = 'active'::text) THEN 'Yes'::text
                    ELSE 'No'::text
                END AS can_sign_in,
                CASE
                    WHEN (u.created_at >= (CURRENT_TIMESTAMP - '1 day'::interval)) THEN 'Newly Registered'::text
                    ELSE 'Registered'::text
                END AS registration_type,
            COALESCE(( SELECT string_agg(DISTINCT d.name, ', '::text ORDER BY d.name) AS string_agg
                   FROM public.departments d
                  WHERE ((d.id IN ( SELECT sd.department_id
                           FROM public.staff_departments sd
                          WHERE (sd.user_id = u.id))) OR (d.id = stp.department_id) OR (d.id = sp.department_id) OR (d.id = p.department_id))), '-'::text) AS department,
            COALESCE(sp.roll_number, stp.designation, '-'::text) AS roll_or_designation,
            COALESCE(b.name, '-'::text) AS batch,
            COALESCE(sec.name, '-'::text) AS section,
            COALESCE(cb.name, '-'::text) AS created_by,
            u.created_at,
                CASE
                    WHEN (u.created_at >= (CURRENT_TIMESTAMP - '1 day'::interval)) THEN 1
                    ELSE 2
                END AS sort_priority
           FROM ((((((public.users u
             LEFT JOIN public.student_profiles sp ON ((sp.user_id = u.id)))
             LEFT JOIN public.staff_profiles stp ON ((stp.user_id = u.id)))
             LEFT JOIN public.sections sec ON ((sec.id = sp.section_id)))
             LEFT JOIN public.batches b ON ((b.id = COALESCE(sp.batch_id, sec.batch_id))))
             LEFT JOIN public.programs p ON ((p.id = b.program_id)))
             LEFT JOIN public.users cb ON ((cb.id = u.created_by_id)))
        UNION ALL
         SELECT rem.id,
            rem.name,
            COALESCE(rem.username, '(none)'::text) AS "coalesce",
            COALESCE(rem.email, '-'::text) AS "coalesce",
            COALESCE(rem.role, '-'::text) AS "coalesce",
            'deleted'::text,
            'No'::text,
            'Deleted'::text,
            COALESCE(rem.department, '-'::text) AS "coalesce",
            '-'::text,
            '-'::text,
            '-'::text,
            '-'::text,
            rem.deleted_at,
            3
           FROM public.removed_users rem) sub
  ORDER BY sort_priority, created_at DESC, id DESC;


ALTER VIEW public.registered_users_report OWNER TO postgres;

--
-- Name: removed_users_archive_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.removed_users_archive_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.removed_users_archive_id_seq OWNER TO postgres;

--
-- Name: removed_users_archive_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.removed_users_archive_id_seq OWNED BY public.removed_users.archive_id;


--
-- Name: revoked_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.revoked_tokens (
    jti text NOT NULL,
    revoked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.revoked_tokens OWNER TO postgres;

--
-- Name: sections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sections_id_seq OWNER TO postgres;

--
-- Name: sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sections_id_seq OWNED BY public.sections.id;


--
-- Name: semesters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.semesters (
    id integer NOT NULL,
    academic_year_id integer NOT NULL,
    name text NOT NULL,
    start_date text NOT NULL,
    end_date text NOT NULL
);


ALTER TABLE public.semesters OWNER TO postgres;

--
-- Name: semesters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.semesters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.semesters_id_seq OWNER TO postgres;

--
-- Name: semesters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.semesters_id_seq OWNED BY public.semesters.id;


--
-- Name: staff_departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.staff_departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staff_departments_id_seq OWNER TO postgres;

--
-- Name: staff_departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staff_departments_id_seq OWNED BY public.staff_departments.id;


--
-- Name: student_daily_attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_daily_attendance (
    id integer NOT NULL,
    student_id integer NOT NULL,
    attendance_date text NOT NULL,
    status text NOT NULL,
    marked_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT student_daily_attendance_status_check CHECK ((status = ANY (ARRAY['P'::text, 'A'::text, 'OD'::text, 'L'::text])))
);


ALTER TABLE public.student_daily_attendance OWNER TO postgres;

--
-- Name: student_daily_attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_daily_attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_daily_attendance_id_seq OWNER TO postgres;

--
-- Name: student_daily_attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_daily_attendance_id_seq OWNED BY public.student_daily_attendance.id;


--
-- Name: student_fees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_fees (
    id integer NOT NULL,
    student_id integer NOT NULL,
    fee_amount integer DEFAULT 10000 NOT NULL,
    paid_amount integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'unpaid'::text NOT NULL,
    academic_year text DEFAULT '2025-2026'::text,
    due_date text,
    paid_at timestamp without time zone,
    updated_by_id integer,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    remarks text,
    CONSTRAINT student_fees_fee_amount_check CHECK ((fee_amount >= 10000)),
    CONSTRAINT student_fees_status_check CHECK ((status = ANY (ARRAY['paid'::text, 'unpaid'::text, 'partial'::text])))
);


ALTER TABLE public.student_fees OWNER TO postgres;

--
-- Name: student_fees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_fees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_fees_id_seq OWNER TO postgres;

--
-- Name: student_fees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_fees_id_seq OWNED BY public.student_fees.id;


--
-- Name: student_library_books; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_library_books (
    id integer NOT NULL,
    student_id integer NOT NULL,
    book_name text NOT NULL,
    validity_date date NOT NULL,
    status text DEFAULT 'issued'::text NOT NULL,
    issued_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    returned_at timestamp without time zone,
    issued_by_id integer,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT student_library_books_status_check CHECK ((status = ANY (ARRAY['issued'::text, 'returned'::text])))
);


ALTER TABLE public.student_library_books OWNER TO postgres;

--
-- Name: student_library_books_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_library_books_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_library_books_id_seq OWNER TO postgres;

--
-- Name: student_library_books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_library_books_id_seq OWNED BY public.student_library_books.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    department_id integer NOT NULL,
    batch_id integer NOT NULL,
    faculty_user_id integer
);


ALTER TABLE public.subjects OWNER TO postgres;

--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subjects_id_seq OWNER TO postgres;

--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.submissions (
    id integer NOT NULL,
    question_id integer NOT NULL,
    student_id integer NOT NULL,
    selected_option text NOT NULL,
    is_correct integer NOT NULL,
    time_taken_seconds integer DEFAULT 0 NOT NULL,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT submissions_is_correct_check CHECK ((is_correct = ANY (ARRAY[0, 1]))),
    CONSTRAINT submissions_selected_option_check CHECK ((selected_option = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text])))
);


ALTER TABLE public.submissions OWNER TO postgres;

--
-- Name: submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.submissions_id_seq OWNER TO postgres;

--
-- Name: submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.submissions_id_seq OWNED BY public.submissions.id;


--
-- Name: user_department_snapshot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_department_snapshot (
    user_id integer NOT NULL,
    department text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_department_snapshot OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: academic_tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_tasks ALTER COLUMN id SET DEFAULT nextval('public.academic_tasks_id_seq'::regclass);


--
-- Name: academic_years id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_years ALTER COLUMN id SET DEFAULT nextval('public.academic_years_id_seq'::regclass);


--
-- Name: attendance_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions ALTER COLUMN id SET DEFAULT nextval('public.attendance_sessions_id_seq'::regclass);


--
-- Name: batches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches ALTER COLUMN id SET DEFAULT nextval('public.batches_id_seq'::regclass);


--
-- Name: department_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_requests ALTER COLUMN id SET DEFAULT nextval('public.department_requests_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: holidays id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays ALTER COLUMN id SET DEFAULT nextval('public.holidays_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: programs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programs ALTER COLUMN id SET DEFAULT nextval('public.programs_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: removed_users archive_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.removed_users ALTER COLUMN archive_id SET DEFAULT nextval('public.removed_users_archive_id_seq'::regclass);


--
-- Name: sections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sections ALTER COLUMN id SET DEFAULT nextval('public.sections_id_seq'::regclass);


--
-- Name: semesters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semesters ALTER COLUMN id SET DEFAULT nextval('public.semesters_id_seq'::regclass);


--
-- Name: staff_departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_departments ALTER COLUMN id SET DEFAULT nextval('public.staff_departments_id_seq'::regclass);


--
-- Name: student_daily_attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_daily_attendance ALTER COLUMN id SET DEFAULT nextval('public.student_daily_attendance_id_seq'::regclass);


--
-- Name: student_fees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_fees ALTER COLUMN id SET DEFAULT nextval('public.student_fees_id_seq'::regclass);


--
-- Name: student_library_books id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_library_books ALTER COLUMN id SET DEFAULT nextval('public.student_library_books_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- Name: submissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions ALTER COLUMN id SET DEFAULT nextval('public.submissions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: academic_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.academic_tasks (id, task_number, created_by_id, description, created_at) FROM stdin;
\.


--
-- Data for Name: academic_years; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.academic_years (id, name, start_date, end_date) FROM stdin;
1	2026-2027	2026-07-01	2027-06-30
2	2026f-2f	2026-08-01	2027-05-31
3	2020f-2d	2026-08-01	2027-05-31
\.


--
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_records (session_id, student_id, status) FROM stdin;
\.


--
-- Data for Name: attendance_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_sessions (id, subject_id, session_date, period, marked_by, created_at) FROM stdin;
\.


--
-- Data for Name: batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.batches (id, program_id, name) FROM stdin;
14	5	2017-2021
\.


--
-- Data for Name: college_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.college_settings (key, value, set_by_id, set_at) FROM stdin;
college_name	INPAND institute of Engineering and Technology	95	2026-10-21 17:34:33.773062
\.


--
-- Data for Name: department_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.department_requests (id, name, code, requested_user_id, requested_by_id, status, decided_by_id, created_at, decided_at) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, name, code, hod_user_id) FROM stdin;
1	Computer Science Engineering	CSE	186
2	Mechanical Engineering	MECH	183
3	Mechatronics Engineering	MECT	182
4	Aeronautical Engineering	AERO	187
5	Electrical and Electronics Engineering	EEE	184
6	Electrical and Communication Engineering	ECE	185
\.


--
-- Data for Name: group_students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_students (group_id, student_id, assigned_at) FROM stdin;
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.groups (id, name, description, created_by_teacher_id, created_at) FROM stdin;
\.


--
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.holidays (id, holiday_date, name) FROM stdin;
1	2064-09-14	Festival 6ffbdf
2	2081-05-24	Festival 0fd375
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, recipient_role, recipient_id, sender_id, sender_role, sender_name, type, title, message, reference_id, department_name, is_read, created_at) FROM stdin;
923	super_admin	\N	1	super_admin	super	system	Student Academic Year Transition	1 students were transitioned from Year 4 to Passed Out (Graduated).	\N	\N	0	2026-10-31 09:54:12.523355
924	super_admin	\N	1	super_admin	super	system	Student Academic Year Transition	1 students were transitioned from Year 1 to Year 2.	\N	\N	1	2026-10-31 09:54:31.499024
925	\N	188	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'principaliiet'.	188	\N	1	2026-10-31 09:54:50.062932
354	teacher	\N	\N	\N	\N	student_registration	New Student Registration: RegStudentedf46b	Student RegStudentedf46b (reg_edf46b@inpand.com) has registered and requires your approval or rejection.	1000242	Computer Science Engineering	1	2026-10-23 10:38:08.861927
351	teacher	\N	\N	\N	\N	student_registration	New Student Registration: RegStudent0fc250	Student RegStudent0fc250 (reg_0fc250@inpand.com) has registered and requires your approval or rejection.	1000239	Computer Science Engineering	1	2026-10-23 10:18:18.513832
512	admin	\N	\N	\N	\N	student_registration	New Teacher Registration: Regprof	Teacher Regprof (regprof@inpand.com) has registered and requires your approval or rejection.	1000291	Computer Science Engineering	1	2026-10-24 13:25:43.890311
352	teacher	\N	\N	\N	\N	student_registration	New Student Registration: RegStudentf5b59c	Student RegStudentf5b59c (reg_f5b59c@inpand.com) has registered and requires your approval or rejection.	1000240	Computer Science Engineering	1	2026-10-23 10:19:35.802161
350	teacher	\N	\N	\N	\N	student_registration	New Student Registration: Mobile Student	Student Mobile Student (mobilestudent1@inpand.com) has registered and requires your approval or rejection.	1000238	Computer Science Engineering	1	2026-10-23 10:02:56.112459
425	admin	\N	\N	\N	\N	student_registration	New Student Registration: Mobile Student	Student Mobile Student (mobilestudent1@inpand.com) has registered and requires your approval or rejection.	1000251	Computer Science Engineering	1	2026-10-24 10:14:27.329775
514	admin	\N	\N	\N	\N	student_registration	New Student Registration: Regstudent	Student Regstudent (regstudent1@inpand.com) has registered and requires your approval or rejection.	1000292	Computer Science Engineering	1	2026-10-24 13:25:44.830468
500	admin	\N	\N	\N	\N	student_registration	New Teacher Registration: Regprof	Teacher Regprof (regprof@inpand.com) has registered and requires your approval or rejection.	1000285	Computer Science Engineering	1	2026-10-24 13:25:18.011932
502	admin	\N	\N	\N	\N	student_registration	New Student Registration: Regstudent	Student Regstudent (regstudent1@inpand.com) has registered and requires your approval or rejection.	1000286	Computer Science Engineering	1	2026-10-24 13:25:18.632868
921	super_admin	\N	1	super_admin	super	system	Student Academic Year Transition	1 students were transitioned from Year 1 to Year 2.	\N	\N	1	2026-10-31 09:30:31.909739
908	super_admin	\N	1	super_admin	super	system	Student Academic Year Transition	1 students were transitioned from Year 1 to Year 2.	\N	\N	1	2026-10-29 16:11:14.127972
907	super_admin	\N	1	super_admin	super	system	Student Academic Year Transition	1 students were transitioned from Year 4 to Passed Out (Graduated).	\N	\N	1	2026-10-29 16:10:29.851818
912	super_admin	\N	1	super_admin	super	system	Student Academic Year Transition	1 students were transitioned from Year 4 to Passed Out (Graduated).	\N	\N	1	2026-10-29 17:27:24.304894
920	super_admin	\N	1	super_admin	super	system	Student Academic Year Transition	1 students were transitioned from Year 4 to Passed Out (Graduated).	\N	\N	0	2026-10-31 09:30:21.444794
910	super_admin	\N	1	super_admin	super	system	Student Academic Year Transition	1 students were transitioned from Year 4 to Passed Out (Graduated).	\N	\N	1	2026-10-29 16:20:20.387491
911	super_admin	\N	1	super_admin	super	system	Student Academic Year Transition	2 students were transitioned from Year 1 to Year 2.	\N	\N	1	2026-10-29 17:10:24.925506
875	super_admin	\N	1	system	Admissions	student_registration	Approval Needed: Notify Test Student	Click Accept or Reject	1000403	\N	1	2026-10-28 16:20:56.684241
876	teacher	\N	1	system	Admissions	student_registration	Approval Needed: Notify Test Student	Click Accept or Reject	1000403	\N	1	2026-10-28 16:20:56.690997
467	\N	1	1	super_admin	super	account_created	Account Created: Test Class Leader One	Class Leader account for Test Class Leader One (testcl102@inpand.com) was created successfully.	1000271	Computer Science Engineering	1	2026-10-24 12:42:27.706856
459	\N	1	1	super_admin	super	account_created	Account Created: Test Student One	Student account for Test Student One (teststudent101@inpand.com) was created successfully.	1000268	Computer Science Engineering	1	2026-10-24 12:28:47.444186
451	\N	1	1	super_admin	super	account_created	Account Created: Newton	Teacher account for Newton (newton1@inpand.com) was created successfully.	1000264	\N	1	2026-10-24 11:46:08.680993
257	\N	1	1	super_admin	super	account_created	Account Created: stu24_ece	Student account for stu24_ece (stu24_ece@inpand.com) was created successfully.	71	\N	1	2026-10-22 14:46:25.908499
473	\N	1	1	super_admin	super	account_created	Account Created: Test Class Leader One	Class Leader account for Test Class Leader One (testcl102@inpand.com) was created successfully.	1000273	Computer Science Engineering	1	2026-10-24 12:55:44.944774
471	\N	1	1	super_admin	super	account_created	Account Created: Test Student One	Student account for Test Student One (teststudent101@inpand.com) was created successfully.	1000272	Computer Science Engineering	1	2026-10-24 12:55:43.777523
465	\N	1	1	super_admin	super	account_created	Account Created: Test Student One	Student account for Test Student One (teststudent101@inpand.com) was created successfully.	1000270	Computer Science Engineering	1	2026-10-24 12:42:26.726637
714	\N	1	1	super_admin	super	account_created	Account Created: PrincipalOne	Principal account for PrincipalOne (principal_official@inpand.com) was created successfully.	1000390	\N	1	2026-10-28 09:59:57.078316
445	\N	1	1	super_admin	super	account_created	Account Created: Newton	Teacher account for Newton (newton1@inpand.com) was created successfully.	1000261	\N	1	2026-10-24 11:44:17.435307
461	\N	1	1	super_admin	super	account_created	Account Created: Test Class Leader One	Class Leader account for Test Class Leader One (testcl102@inpand.com) was created successfully.	1000269	Computer Science Engineering	1	2026-10-24 12:28:48.569397
170	\N	1	1	super_admin	super	account_created	Account Created: dean1	Dean account for dean1 (dean1@inpand.com) was created successfully.	2	\N	1	2026-10-22 13:09:15.194446
918	\N	3	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'stu11_mect'.	3	Mechatronics Engineering	1	2026-10-29 17:32:24.346745
188	\N	1	1	super_admin	super	account_created	Account Created: stu12	Student account for stu12 (stu12@inpand.com) was created successfully.	4	Mechatronics Engineering	1	2026-10-22 14:13:42.98393
902	\N	4	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'stu12_mect'.	4	Mechatronics Engineering	1	2026-10-29 12:39:43.849118
917	\N	4	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'stu12_mect'.	4	Mechatronics Engineering	1	2026-10-29 17:32:16.140108
189	\N	4	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'stu12_mect'.	4	Mechatronics Engineering	1	2026-10-22 14:14:01.970767
190	\N	1	1	super_admin	super	account_created	Account Created: stu13_mect	Student account for stu13_mect (stu13_mect@inpand.com) was created successfully.	5	Mechatronics Engineering	1	2026-10-22 14:14:33.205356
916	\N	5	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'stu13_mect'.	5	Mechatronics Engineering	1	2026-10-29 17:32:08.510404
191	\N	1	1	super_admin	super	account_created	Account Created: stu14_mect	Student account for stu14_mect (stu14_mect@inpand.com) was created successfully.	6	Mechatronics Engineering	1	2026-10-22 14:15:01.60822
915	\N	6	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'stu14_mect'.	6	Mechatronics Engineering	1	2026-10-29 17:31:59.820034
192	\N	1	1	super_admin	super	account_created	Account Created: stu15_mect	Student account for stu15_mect (stu15_mect@inpand.com) was created successfully.	7	Mechatronics Engineering	1	2026-10-22 14:15:31.104955
914	\N	7	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'stu15_mect'.	7	Mechatronics Engineering	1	2026-10-29 17:31:52.378036
193	\N	1	1	super_admin	super	account_created	Account Created: stu21_mect	Student account for stu21_mect (stu21_mect@inpand.com) was created successfully.	8	Mechatronics Engineering	1	2026-10-22 14:16:04.756562
194	\N	1	1	super_admin	super	account_created	Account Created: stu22_mect	Student account for stu22_mect (stu22_mect@inpand.com) was created successfully.	9	Mechatronics Engineering	1	2026-10-22 14:16:40.30763
195	\N	1	1	super_admin	super	account_created	Account Created: stu23_mect	Student account for stu23_mect (stu23_mect@inpand.com) was created successfully.	10	Mechatronics Engineering	1	2026-10-22 14:17:13.799593
196	\N	1	1	super_admin	super	account_created	Account Created: stu24_mect	Student account for stu24_mect (stu24_mect@inpand.com) was created successfully.	11	Mechatronics Engineering	1	2026-10-22 14:17:41.960289
197	\N	1	1	super_admin	super	account_created	Account Created: stu25_mect	Student account for stu25_mect (stu25_mect@inpand.com) was created successfully.	12	Mechatronics Engineering	1	2026-10-22 14:18:06.183259
198	\N	1	1	super_admin	super	account_created	Account Created: stu31_mect	Student account for stu31_mect (stu31_mect@inpand.com) was created successfully.	13	Mechatronics Engineering	1	2026-10-22 14:18:33.356899
199	\N	1	1	super_admin	super	account_created	Account Created: stu32_mect	Student account for stu32_mect (stu32_mect@inpand.com) was created successfully.	14	Mechatronics Engineering	1	2026-10-22 14:18:55.220757
200	\N	1	1	super_admin	super	account_created	Account Created: stu33_mect	Student account for stu33_mect (stu33_mect@inpand.com) was created successfully.	15	Mechatronics Engineering	1	2026-10-22 14:19:16.661577
201	\N	1	1	super_admin	super	account_created	Account Created: stu34_mect	Student account for stu34_mect (stu34_mect@inpand.com) was created successfully.	16	Mechatronics Engineering	1	2026-10-22 14:19:50.85416
202	\N	1	1	super_admin	super	account_created	Account Created: stu35_mect	Student account for stu35_mect (stu35_mect@inpand.com) was created successfully.	17	Mechatronics Engineering	1	2026-10-22 14:20:08.988516
203	\N	1	1	super_admin	super	account_created	Account Created: stu41_mect	Student account for stu41_mect (stu41_mect@inpand.com) was created successfully.	18	Mechatronics Engineering	1	2026-10-22 14:20:41.259012
204	\N	1	1	super_admin	super	account_created	Account Created: stu42_mect	Student account for stu42_mect (stu42_mect@inpand.com) was created successfully.	19	Mechatronics Engineering	1	2026-10-22 14:21:02.762195
205	\N	1	1	super_admin	super	account_created	Account Created: stu43_mect	Student account for stu43_mect (stu43_mect@inpand.com) was created successfully.	20	Mechatronics Engineering	1	2026-10-22 14:21:30.595267
206	\N	1	1	super_admin	super	account_created	Account Created: stu44_mect	Student account for stu44_mect (stu44_mect@inpand.com) was created successfully.	21	Mechatronics Engineering	1	2026-10-22 14:21:51.966802
207	\N	1	1	super_admin	super	account_created	Account Created: stu45_mect	Student account for stu45_mect (stu45_mect@inpand.com) was created successfully.	22	Mechatronics Engineering	1	2026-10-22 14:22:10.247585
208	\N	1	1	super_admin	super	account_created	Account Created: stu11_aero	Student account for stu11_aero (stu11_aero@inpand.com) was created successfully.	23	Aeronautical Engineering	1	2026-10-22 14:23:07.094987
209	\N	1	1	super_admin	super	account_created	Account Created: stu12_aero	Student account for stu12_aero (stu12_aero@inpand.com) was created successfully.	24	Aeronautical Engineering	1	2026-10-22 14:23:38.158974
210	\N	1	1	super_admin	super	account_created	Account Created: stu13_aero	Student account for stu13_aero (stu13_aero@inpand.com) was created successfully.	25	Aeronautical Engineering	1	2026-10-22 14:23:54.104548
211	\N	1	1	super_admin	super	account_created	Account Created: stu14_aero	Student account for stu14_aero (stu14_aero@inpand.com) was created successfully.	26	Aeronautical Engineering	1	2026-10-22 14:24:18.414124
212	\N	1	1	super_admin	super	account_created	Account Created: stu15_aero	Student account for stu15_aero (stu15_aero@inpand.com) was created successfully.	27	Aeronautical Engineering	1	2026-10-22 14:24:41.34097
213	\N	1	1	super_admin	super	account_created	Account Created: stu21_aero	Student account for stu21_aero (stu21_aero@inpand.com) was created successfully.	28	Aeronautical Engineering	1	2026-10-22 14:25:12.420174
214	\N	1	1	super_admin	super	account_created	Account Created: stu22_aero	Student account for stu22_aero (stu22_aero@inpand.com) was created successfully.	29	Aeronautical Engineering	1	2026-10-22 14:25:35.294331
215	\N	1	1	super_admin	super	account_created	Account Created: stu23_aero	Student account for stu23_aero (stu23_aero@inpand.com) was created successfully.	30	Aeronautical Engineering	1	2026-10-22 14:25:53.2947
216	\N	1	1	super_admin	super	account_created	Account Created: stu24_aero	Student account for stu24_aero (stu24_aero@inpand.com) was created successfully.	31	Aeronautical Engineering	1	2026-10-22 14:26:16.026099
217	\N	1	1	super_admin	super	account_created	Account Created: stu25_aero	Student account for stu25_aero (stu25_aero@inpand.com) was created successfully.	32	Aeronautical Engineering	1	2026-10-22 14:26:38.356388
218	\N	1	1	super_admin	super	account_created	Account Created: stu31_aero	Student account for stu31_aero (stu31_aero@inpand.com) was created successfully.	33	Aeronautical Engineering	1	2026-10-22 14:27:10.690775
219	\N	1	1	super_admin	super	account_created	Account Created: stu32_aero	Student account for stu32_aero (stu32_aero@inpand.com) was created successfully.	34	Aeronautical Engineering	1	2026-10-22 14:27:31.842105
220	\N	1	1	super_admin	super	account_created	Account Created: stu33_aero	Student account for stu33_aero (stu33_aero@inpand.com) was created successfully.	35	Aeronautical Engineering	1	2026-10-22 14:27:54.070337
221	\N	1	1	super_admin	super	account_created	Account Created: stu34_aero	Student account for stu34_aero (stu34_aero@inpand.com) was created successfully.	36	Aeronautical Engineering	1	2026-10-22 14:28:10.964087
222	\N	1	1	super_admin	super	account_created	Account Created: stu35_aero	Student account for stu35_aero (stu35_aero@inpand.com) was created successfully.	37	Aeronautical Engineering	1	2026-10-22 14:28:37.126073
223	\N	1	1	super_admin	super	account_created	Account Created: stu41_aero	Student account for stu41_aero (stu41_aero@inpand.com) was created successfully.	38	Aeronautical Engineering	1	2026-10-22 14:29:05.943656
224	\N	1	1	super_admin	super	account_created	Account Created: stu42_aero	Student account for stu42_aero (stu42_aero@inpand.com) was created successfully.	39	Aeronautical Engineering	1	2026-10-22 14:29:28.523457
225	\N	1	1	super_admin	super	account_created	Account Created: stu43_aero	Student account for stu43_aero (stu43_aero@inpand.com) was created successfully.	40	Aeronautical Engineering	1	2026-10-22 14:29:47.299411
226	\N	1	1	super_admin	super	account_created	Account Created: stu44_aero	Student account for stu44_aero (stu44_aero@inpand.com) was created successfully.	41	Aeronautical Engineering	1	2026-10-22 14:30:17.095877
227	\N	1	1	super_admin	super	account_created	Account Created: stu45_aero	Student account for stu45_aero (stu45_aero@inpand.com) was created successfully.	42	Aeronautical Engineering	1	2026-10-22 14:30:41.399642
228	\N	1	1	super_admin	super	account_created	Account Created: stu11_cse	Student account for stu11_cse (stu11_cse@inpand.com) was created successfully.	43	Computer Science Engineering	1	2026-10-22 14:31:20.277485
229	\N	1	1	super_admin	super	account_created	Account Created: stu12_cse	Student account for stu12_cse (stu12_cse@inpand.com) was created successfully.	44	Computer Science Engineering	1	2026-10-22 14:31:47.565794
230	\N	1	1	super_admin	super	account_created	Account Created: stu13_cse	Student account for stu13_cse (stu13_cse@inpand.com) was created successfully.	45	Computer Science Engineering	1	2026-10-22 14:32:13.271158
231	\N	1	1	super_admin	super	account_created	Account Created: stu14_cse	Student account for stu14_cse (stu14_cse@inpand.com) was created successfully.	46	Computer Science Engineering	1	2026-10-22 14:32:34.806271
232	\N	1	1	super_admin	super	account_created	Account Created: stu15_cse	Student account for stu15_cse (stu15_cse@inpand.com) was created successfully.	47	Computer Science Engineering	1	2026-10-22 14:32:56.009521
233	\N	1	1	super_admin	super	account_created	Account Created: stu21_cse	Student account for stu21_cse (stu21_cse@inpand.com) was created successfully.	48	Computer Science Engineering	1	2026-10-22 14:33:33.86023
234	\N	1	1	super_admin	super	account_created	Account Created: stu22_cse	Student account for stu22_cse (stu22_cse@inpand.com) was created successfully.	49	Computer Science Engineering	1	2026-10-22 14:34:10.379626
235	\N	1	1	super_admin	super	account_created	Account Created: stu23_cse	Student account for stu23_cse (stu23_cse@inpand.com) was created successfully.	50	Computer Science Engineering	1	2026-10-22 14:34:31.182307
236	\N	1	1	super_admin	super	account_created	Account Created: stu24_cse	Student account for stu24_cse (stu24_cse@inpand.com) was created successfully.	51	Computer Science Engineering	1	2026-10-22 14:34:47.698838
237	\N	1	1	super_admin	super	account_created	Account Created: stu25_cse	Student account for stu25_cse (stu25_cse@inpand.com) was created successfully.	52	Computer Science Engineering	1	2026-10-22 14:35:16.764371
238	\N	1	1	super_admin	super	account_created	Account Created: stu31_cse	Student account for stu31_cse (stu31_cse@inpand.com) was created successfully.	53	Computer Science Engineering	1	2026-10-22 14:35:45.096178
239	\N	1	1	super_admin	super	account_created	Account Created: stu32_cse	Student account for stu32_cse (stu32_cse@inpand.com) was created successfully.	54	Computer Science Engineering	1	2026-10-22 14:36:05.720983
240	\N	1	1	super_admin	super	account_created	Account Created: stu33_cse	Student account for stu33_cse (stu33_cse@inpand.com) was created successfully.	55	Computer Science Engineering	1	2026-10-22 14:36:43.29558
241	\N	1	1	super_admin	super	account_created	Account Created: stu34_cse	Student account for stu34_cse (stu34_cse@inpand.com) was created successfully.	56	Computer Science Engineering	1	2026-10-22 14:37:11.109394
242	\N	1	1	super_admin	super	account_created	Account Created: stu35_cse	Student account for stu35_cse (stu35_cse@inpand.com) was created successfully.	57	Computer Science Engineering	1	2026-10-22 14:37:29.509479
243	\N	1	1	super_admin	super	account_created	Account Created: stu41_cse	Student account for stu41_cse (stu41_cse@inpand.com) was created successfully.	58	Computer Science Engineering	1	2026-10-22 14:38:01.307548
244	\N	1	1	super_admin	super	account_created	Account Created: stu42_cse	Student account for stu42_cse (stu42_cse@inpand.com) was created successfully.	59	Computer Science Engineering	1	2026-10-22 14:38:21.728198
245	\N	1	1	super_admin	super	account_created	Account Created: stu43_cse	Student account for stu43_cse (stu43_cse@inpand.com) was created successfully.	60	Computer Science Engineering	1	2026-10-22 14:38:39.971419
246	\N	1	1	super_admin	super	account_created	Account Created: stu44_cse	Student account for stu44_cse (stu44_cse@inpand.com) was created successfully.	61	Computer Science Engineering	1	2026-10-22 14:39:00.99752
247	\N	1	1	super_admin	super	account_created	Account Created: stu45_cse	Student account for stu45_cse (stu45_cse@inpand.com) was created successfully.	62	Computer Science Engineering	1	2026-10-22 14:39:25.975946
248	\N	1	1	super_admin	super	account_created	Account Created: stu41_ece	Student account for stu41_ece (stu41_ece@inpand.com) was created successfully.	63	Electrical and Communication Engineering	1	2026-10-22 14:39:59.317014
249	\N	63	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'stu11_ece'.	63	Electrical and Communication Engineering	1	2026-10-22 14:40:17.662706
250	\N	1	1	super_admin	super	account_created	Account Created: stu12_ece	Student account for stu12_ece (stu12_ece@inpand.com) was created successfully.	64	Electrical and Communication Engineering	1	2026-10-22 14:41:04.989704
251	\N	1	1	super_admin	super	account_created	Account Created: stu13_ece	Student account for stu13_ece (stu13_ece@inpand.com) was created successfully.	65	Electrical and Communication Engineering	1	2026-10-22 14:43:33.280037
252	\N	1	1	super_admin	super	account_created	Account Created: stu14_ece	Student account for stu14_ece (stu14_ece@inpand.com) was created successfully.	66	Electrical and Communication Engineering	1	2026-10-22 14:43:54.197723
253	\N	1	1	super_admin	super	account_created	Account Created: stu15_ece	Student account for stu15_ece (stu15_ece@inpand.com) was created successfully.	67	Electrical and Communication Engineering	1	2026-10-22 14:44:17.454326
254	\N	1	1	super_admin	super	account_created	Account Created: stu21_ece	Student account for stu21_ece (stu21_ece@inpand.com) was created successfully.	68	Electrical and Communication Engineering	1	2026-10-22 14:44:50.409639
255	\N	1	1	super_admin	super	account_created	Account Created: stu22_ece	Student account for stu22_ece (stu22_ece@inpand.com) was created successfully.	69	Electrical and Communication Engineering	1	2026-10-22 14:45:12.605294
256	\N	1	1	super_admin	super	account_created	Account Created: stu23_ece	Student account for stu23_ece (stu23_ece@inpand.com) was created successfully.	70	Electrical and Communication Engineering	1	2026-10-22 14:46:09.427511
290	\N	71	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'stu24_ece'.	71	Electrical and Communication Engineering	1	2026-10-22 15:01:48.294821
258	\N	1	1	super_admin	super	account_created	Account Created: stu25_ece	Student account for stu25_ece (stu25_ece@inpand.com) was created successfully.	72	Electrical and Communication Engineering	1	2026-10-22 14:46:46.629305
259	\N	1	1	super_admin	super	account_created	Account Created: stu31_ece	Student account for stu31_ece (stu31_ece@inpand.com) was created successfully.	73	Electrical and Communication Engineering	1	2026-10-22 14:47:15.514407
260	\N	1	1	super_admin	super	account_created	Account Created: stu32_ece	Student account for stu32_ece (stu32_ece@inpand.com) was created successfully.	74	Electrical and Communication Engineering	1	2026-10-22 14:49:48.47699
261	\N	1	1	super_admin	super	account_created	Account Created: stu33_ece	Student account for stu33_ece (stu33_ece@inpand.com) was created successfully.	75	Electrical and Communication Engineering	1	2026-10-22 14:50:11.460266
262	\N	1	1	super_admin	super	account_created	Account Created: stu34_ece	Student account for stu34_ece (stu34_ece@inpand.com) was created successfully.	76	Electrical and Communication Engineering	1	2026-10-22 14:50:32.415599
263	\N	1	1	super_admin	super	account_created	Account Created: stu35_ece	Student account for stu35_ece (stu35_ece@inpand.com) was created successfully.	77	Electrical and Communication Engineering	1	2026-10-22 14:50:49.002907
264	\N	1	1	super_admin	super	account_created	Account Created: stu41_ece	Student account for stu41_ece (stu41_ece@inpand.com) was created successfully.	78	Electrical and Communication Engineering	1	2026-10-22 14:51:11.551926
265	\N	1	1	super_admin	super	account_created	Account Created: stu42_ece	Student account for stu42_ece (stu42_ece@inpand.com) was created successfully.	79	Electrical and Communication Engineering	1	2026-10-22 14:51:46.027551
266	\N	1	1	super_admin	super	account_created	Account Created: stu43_ece	Student account for stu43_ece (stu43_ece@inpand.com) was created successfully.	80	Electrical and Communication Engineering	1	2026-10-22 14:52:04.743241
267	\N	1	1	super_admin	super	account_created	Account Created: stu44_ece	Student account for stu44_ece (stu44_ece@inpand.com) was created successfully.	81	Electrical and Communication Engineering	1	2026-10-22 14:52:21.442422
268	\N	1	1	super_admin	super	account_created	Account Created: stu45_ece	Student account for stu45_ece (stu45_ece@inpand.com) was created successfully.	82	Electrical and Communication Engineering	1	2026-10-22 14:52:39.677161
269	\N	1	1	super_admin	super	account_created	Account Created: stu11_eee	Student account for stu11_eee (stu11_eee@inpand.com) was created successfully.	83	Electrical and Electronics Engineering	1	2026-10-22 14:53:26.821509
270	\N	1	1	super_admin	super	account_created	Account Created: stu12_eee	Student account for stu12_eee (stu12_eee@inpand.com) was created successfully.	84	Electrical and Electronics Engineering	1	2026-10-22 14:53:48.902366
271	\N	1	1	super_admin	super	account_created	Account Created: stu13_eee	Student account for stu13_eee (stu13_eee@inpand.com) was created successfully.	85	Electrical and Electronics Engineering	1	2026-10-22 14:54:07.810313
272	\N	1	1	super_admin	super	account_created	Account Created: stu14_eee	Student account for stu14_eee (stu14_eee@inpand.com) was created successfully.	86	Electrical and Electronics Engineering	1	2026-10-22 14:54:40.253483
273	\N	1	1	super_admin	super	account_created	Account Created: stu15_eee	Student account for stu15_eee (stu15_eee@inpand.com) was created successfully.	87	Electrical and Electronics Engineering	1	2026-10-22 14:55:04.240345
274	\N	1	1	super_admin	super	account_created	Account Created: stu21_eee	Student account for stu21_eee (stu21_eee@inpand.com) was created successfully.	88	Electrical and Electronics Engineering	1	2026-10-22 14:55:27.863078
275	\N	1	1	super_admin	super	account_created	Account Created: stu22_eee	Student account for stu22_eee (stu22_eee@inpand.com) was created successfully.	89	Electrical and Electronics Engineering	1	2026-10-22 14:56:05.485354
276	\N	1	1	super_admin	super	account_created	Account Created: stu23_eee	Student account for stu23_eee (stu23_eee@inpand.com) was created successfully.	90	Electrical and Electronics Engineering	1	2026-10-22 14:56:23.84169
277	\N	1	1	super_admin	super	account_created	Account Created: stu24_eee	Student account for stu24_eee (stu24_eee@inpand.com) was created successfully.	91	Electrical and Electronics Engineering	1	2026-10-22 14:56:41.670055
278	\N	1	1	super_admin	super	account_created	Account Created: stu25_eee	Student account for stu25_eee (stu25_eee@inpand.com) was created successfully.	92	Electrical and Electronics Engineering	1	2026-10-22 14:56:59.351216
279	\N	1	1	super_admin	super	account_created	Account Created: stu31_eee	Student account for stu31_eee (stu31_eee@inpand.com) was created successfully.	93	Electrical and Electronics Engineering	1	2026-10-22 14:57:25.383693
280	\N	1	1	super_admin	super	account_created	Account Created: stu32_eee	Student account for stu32_eee (stu32_eee@inpand.com) was created successfully.	94	Electrical and Electronics Engineering	1	2026-10-22 14:57:45.761922
281	\N	1	1	super_admin	super	account_created	Account Created: stu33_eee	Student account for stu33_eee (stu33_eee@inpand.com) was created successfully.	95	Electrical and Electronics Engineering	1	2026-10-22 14:58:09.547376
282	\N	1	1	super_admin	super	account_created	Account Created: stu34_eee	Student account for stu34_eee (stu34_eee@inpand.com) was created successfully.	96	Electrical and Electronics Engineering	1	2026-10-22 14:58:27.843064
283	\N	1	1	super_admin	super	account_created	Account Created: stu35_eee	Student account for stu35_eee (stu35_eee@inpand.com) was created successfully.	97	Electrical and Electronics Engineering	1	2026-10-22 14:58:46.225487
284	\N	1	1	super_admin	super	account_created	Account Created: stu41_eee	Student account for stu41_eee (stu41_eee@inpand.com) was created successfully.	98	Electrical and Electronics Engineering	1	2026-10-22 14:59:22.110537
285	\N	1	1	super_admin	super	account_created	Account Created: stu42_eee	Student account for stu42_eee (stu42_eee@inpand.com) was created successfully.	99	Electrical and Electronics Engineering	1	2026-10-22 14:59:42.559071
286	\N	1	1	super_admin	super	account_created	Account Created: stu43_eee	Student account for stu43_eee (stu43_eee@inpand.com) was created successfully.	100	Electrical and Electronics Engineering	1	2026-10-22 15:00:00.578741
287	\N	1	1	super_admin	super	account_created	Account Created: stu44_eee	Student account for stu44_eee (stu44_eee@inpand.com) was created successfully.	101	Electrical and Electronics Engineering	1	2026-10-22 15:00:25.232623
288	\N	1	1	super_admin	super	account_created	Account Created: stu445eee	Student account for stu445eee (stu445eee@inpand.com) was created successfully.	102	Electrical and Electronics Engineering	1	2026-10-22 15:00:46.014432
341	\N	102	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'stu45_eee'.	102	Electrical and Electronics Engineering	1	2026-10-23 09:44:47.507325
289	\N	102	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'stu445_eee'.	102	Electrical and Electronics Engineering	1	2026-10-22 15:01:12.228154
778	class_teacher	\N	103	admin	Admin	broadcast	New Academic Year: 2026-2027-Test	Admin added the academic year 2026-2027-Test, from 2026-06-01 to 2027-05-31.	4	\N	1	2026-10-28 10:31:06.156598
777	teacher	\N	103	admin	Admin	broadcast	New Academic Year: 2026-2027-Test	Admin added the academic year 2026-2027-Test, from 2026-06-01 to 2027-05-31.	4	\N	1	2026-10-28 10:31:06.148593
488	\N	103	103	admin	Admin	account_created	Account Created: Testprof	Teacher account for Testprof (testprof@inpand.com) was created successfully.	1000278	\N	1	2026-10-24 13:24:44.746677
482	\N	103	103	admin	Admin	account_created	Account Created: Testprof	Teacher account for Testprof (testprof@inpand.com) was created successfully.	1000275	\N	1	2026-10-24 13:24:00.433184
504	\N	103	103	admin	Admin	account_created	Account Created: Testprof	Teacher account for Testprof (testprof@inpand.com) was created successfully.	1000287	\N	1	2026-10-24 13:25:40.029541
494	\N	103	103	admin	Admin	account_created	Account Created: Testprof	Teacher account for Testprof (testprof@inpand.com) was created successfully.	1000282	\N	1	2026-10-24 13:25:15.608071
492	\N	103	103	admin	Admin	account_created	Account Created: Teststudent	Student account for Teststudent (teststudent1@inpand.com) was created successfully.	1000280	\N	1	2026-10-24 13:24:46.333949
490	\N	103	103	admin	Admin	account_created	Account Created: Testclassteacher	Class Teacher account for Testclassteacher (testclassteacher@inpand.com) was created successfully.	1000279	\N	1	2026-10-24 13:24:45.657695
486	\N	103	103	admin	Admin	account_created	Account Created: Teststudent	Student account for Teststudent (teststudent1@inpand.com) was created successfully.	1000277	\N	1	2026-10-24 13:24:02.238238
447	\N	103	103	admin	Admin	account_created	Account Created: Darwin	Teacher account for Darwin (darwin1@inpand.com) was created successfully.	1000262	\N	1	2026-10-24 11:44:18.536167
510	\N	103	103	admin	Admin	account_created	Account Created: Testaccountant	Accountant account for Testaccountant (testaccountant1@inpand.com) was created successfully.	1000290	\N	1	2026-10-24 13:25:43.304967
508	\N	103	103	admin	Admin	account_created	Account Created: Teststudent	Student account for Teststudent (teststudent1@inpand.com) was created successfully.	1000289	\N	1	2026-10-24 13:25:42.268847
506	\N	103	103	admin	Admin	account_created	Account Created: Testclassteacher	Class Teacher account for Testclassteacher (testclassteacher@inpand.com) was created successfully.	1000288	\N	1	2026-10-24 13:25:41.254602
453	\N	103	103	admin	Admin	account_created	Account Created: Darwin	Teacher account for Darwin (darwin1@inpand.com) was created successfully.	1000265	\N	1	2026-10-24 11:46:09.910987
498	\N	103	103	admin	Admin	account_created	Account Created: Teststudent	Student account for Teststudent (teststudent1@inpand.com) was created successfully.	1000284	\N	1	2026-10-24 13:25:17.417055
496	\N	103	103	admin	Admin	account_created	Account Created: Testclassteacher	Class Teacher account for Testclassteacher (testclassteacher@inpand.com) was created successfully.	1000283	\N	1	2026-10-24 13:25:16.287688
484	\N	103	103	admin	Admin	account_created	Account Created: Testclassteacher	Class Teacher account for Testclassteacher (testclassteacher@inpand.com) was created successfully.	1000276	\N	1	2026-10-24 13:24:01.231058
332	\N	1	1	super_admin	super	account_created	Account Created: admin	Admin account for admin (admin1@inpand.com) was created successfully.	103	\N	1	2026-10-22 17:29:39.496929
331	\N	103	1	super_admin	super	account_created	Your Account Has Been Created	Your Admin account was created by super (Super Admin). Sign in with your user name 'admin' and the password you were given.	103	\N	1	2026-10-22 17:29:39.464968
455	\N	1	1	super_admin	super	account_created	Account Created: librarian1	Librarian account for librarian1 (librarian11@inpand.com) was created successfully.	104	\N	1	2026-10-24 11:50:47.358393
480	\N	104	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'librarian1'.	104	\N	1	2026-10-24 13:23:46.087155
479	\N	104	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'librarian1'.	104	\N	1	2026-10-24 13:23:30.031863
454	\N	104	1	super_admin	super	account_created	Your Account Has Been Created	Your Librarian account was created by super (Super Admin). Sign in with your username 'librarian1'.	104	\N	1	2026-10-24 11:50:47.321802
906	super_admin	\N	105	class_teacher	class mect1	system	Student Year Promotion Notice	1 students successfully changed from Year 1 to Year 2 by class mect1.	\N	\N	0	2026-10-29 15:37:40.991054
905	super_admin	\N	105	class_teacher	class mect1	system	Student Year Promotion Notice	1 students successfully changed from Year 1 to Year 2 by class mect1.	\N	\N	0	2026-10-29 15:32:19.686041
909	super_admin	\N	105	class_teacher	class mect1	system	Student Academic Year Transition	5 students were transitioned from Year 1 to Year 2.	\N	\N	0	2026-10-29 16:12:20.139632
516	\N	1	1	super_admin	super	account_created	Account Created: class mect	Class Teacher account for class mect (classmect@inpand.com) was created successfully.	105	Mechatronics Engineering	1	2026-10-24 14:20:37.108314
515	\N	105	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classmect'.	105	Mechatronics Engineering	1	2026-10-24 14:20:37.063646
527	\N	105	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'classmect1'.	105	Mechatronics Engineering	1	2026-10-24 14:25:19.041035
708	\N	105	105	class_teacher	class mect1	account_updated	Your Account Was Updated	class mect1 (Class Teacher) updated your account details. Sign in with user name 'classmect1'.	105	Mechatronics Engineering	1	2026-10-27 17:29:14.893271
518	\N	1	1	super_admin	super	account_created	Account Created: class eee	Class Teacher account for class eee (classeee@inpand.com) was created successfully.	106	Electrical and Electronics Engineering	1	2026-10-24 14:21:09.955242
528	\N	106	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'classeee2'.	106	Electrical and Electronics Engineering	1	2026-10-24 14:26:14.73813
530	\N	106	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'classeee1'.	106	Electrical and Electronics Engineering	1	2026-10-24 14:26:35.269274
517	\N	106	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classeee'.	106	Electrical and Electronics Engineering	1	2026-10-24 14:21:09.923794
520	\N	1	1	super_admin	super	account_created	Account Created: class aero	Class Teacher account for class aero (classaero@inpand.com) was created successfully.	107	Aeronautical Engineering	1	2026-10-24 14:21:27.728612
529	\N	107	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'classaero1'.	107	Aeronautical Engineering	1	2026-10-24 14:26:23.704982
519	\N	107	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classaero'.	107	Aeronautical Engineering	1	2026-10-24 14:21:27.679905
522	\N	1	1	super_admin	super	account_created	Account Created: class cse	Class Teacher account for class cse (classcse@inpand.com) was created successfully.	108	Computer Science Engineering	1	2026-10-24 14:21:41.441389
531	\N	108	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'classcse1'.	108	Computer Science Engineering	1	2026-10-24 14:26:43.62612
521	\N	108	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classcse'.	108	Computer Science Engineering	1	2026-10-24 14:21:41.405251
524	\N	1	1	super_admin	super	account_created	Account Created: class ece	Class Teacher account for class ece (classece@inpand.com) was created successfully.	109	Electrical and Communication Engineering	1	2026-10-24 14:22:00.983867
532	\N	109	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'classece1'.	109	Electrical and Communication Engineering	1	2026-10-24 14:26:50.354048
523	\N	109	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classece'.	109	Electrical and Communication Engineering	1	2026-10-24 14:22:00.822291
526	\N	1	1	super_admin	super	account_created	Account Created: class mech	Class Teacher account for class mech (classmech@inpand.com) was created successfully.	110	Mechanical Engineering	1	2026-10-24 14:22:24.679153
525	\N	110	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classmech'.	110	Mechanical Engineering	1	2026-10-24 14:22:24.637425
533	\N	110	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'classmech1'.	110	Mechanical Engineering	1	2026-10-24 14:26:55.913942
535	\N	1	1	super_admin	super	account_created	Account Created: class mect2	Class Teacher account for class mect2 (classmect2@inpand.com) was created successfully.	111	Mechatronics Engineering	1	2026-10-24 14:27:49.243052
534	\N	111	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classmect2'.	111	Mechatronics Engineering	1	2026-10-24 14:27:49.210402
537	\N	1	1	super_admin	super	account_created	Account Created: class eee2	Class Teacher account for class eee2 (classeee2@inpand.com) was created successfully.	112	Electrical and Electronics Engineering	1	2026-10-24 14:28:18.408918
536	\N	112	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classeee2'.	112	Electrical and Electronics Engineering	1	2026-10-24 14:28:18.374265
539	\N	1	1	super_admin	super	account_created	Account Created: class aero2	Class Teacher account for class aero2 (classaero2@inpand.com) was created successfully.	113	Aeronautical Engineering	1	2026-10-24 14:28:46.463512
538	\N	113	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classaero2'.	113	Aeronautical Engineering	1	2026-10-24 14:28:46.315577
541	\N	1	1	super_admin	super	account_created	Account Created: class cse2	Class Teacher account for class cse2 (classcse2@inpand.com) was created successfully.	114	Computer Science Engineering	1	2026-10-24 14:29:42.636626
540	\N	114	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classcse2'.	114	Computer Science Engineering	1	2026-10-24 14:29:42.602162
543	\N	1	1	super_admin	super	account_created	Account Created: class ece2	Class Teacher account for class ece2 (classece2@inpand.com) was created successfully.	115	Electrical and Communication Engineering	1	2026-10-24 14:30:09.364734
542	\N	115	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classece2'.	115	Electrical and Communication Engineering	1	2026-10-24 14:30:09.321632
545	\N	1	1	super_admin	super	account_created	Account Created: class mech2	Class Teacher account for class mech2 (classmech2@inpand.com) was created successfully.	116	Mechanical Engineering	1	2026-10-24 14:30:50.053321
544	\N	116	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classmech2'.	116	Mechanical Engineering	1	2026-10-24 14:30:50.01478
547	\N	1	1	super_admin	super	account_created	Account Created: class mect3	Class Teacher account for class mect3 (classmect3@inpand.com) was created successfully.	117	Mechatronics Engineering	1	2026-10-24 14:31:22.315803
546	\N	117	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classmect3'.	117	Mechatronics Engineering	1	2026-10-24 14:31:22.276603
549	\N	1	1	super_admin	super	account_created	Account Created: class eee3	Class Teacher account for class eee3 (classeee3@inpand.com) was created successfully.	118	Electrical and Electronics Engineering	1	2026-10-24 14:31:47.082982
548	\N	118	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classeee3'.	118	Electrical and Electronics Engineering	1	2026-10-24 14:31:47.038636
551	\N	1	1	super_admin	super	account_created	Account Created: class aero3	Class Teacher account for class aero3 (classaero3@inpand.com) was created successfully.	119	Aeronautical Engineering	1	2026-10-24 14:32:09.868988
550	\N	119	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classaero3'.	119	Aeronautical Engineering	1	2026-10-24 14:32:09.728449
553	\N	1	1	super_admin	super	account_created	Account Created: class cse3	Class Teacher account for class cse3 (classcse3@inpand.com) was created successfully.	120	Computer Science Engineering	1	2026-10-24 14:32:28.751241
552	\N	120	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classcse3'.	120	Computer Science Engineering	1	2026-10-24 14:32:28.714566
555	\N	1	1	super_admin	super	account_created	Account Created: class ece3	Class Teacher account for class ece3 (classece3@inpand.com) was created successfully.	121	Electrical and Communication Engineering	1	2026-10-24 14:33:02.736875
554	\N	121	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classece3'.	121	Electrical and Communication Engineering	1	2026-10-24 14:33:02.702689
557	\N	1	1	super_admin	super	account_created	Account Created: class mech3	Class Teacher account for class mech3 (classmech3@inpand.com) was created successfully.	122	Mechanical Engineering	1	2026-10-24 14:33:31.369809
556	\N	122	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classmech3'.	122	Mechanical Engineering	1	2026-10-24 14:33:31.334935
559	\N	1	1	super_admin	super	account_created	Account Created: class mect4	Class Teacher account for class mect4 (classmect4@inpand.com) was created successfully.	123	Mechatronics Engineering	1	2026-10-24 14:34:09.10802
558	\N	123	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classmect4'.	123	Mechatronics Engineering	1	2026-10-24 14:34:09.054806
561	\N	1	1	super_admin	super	account_created	Account Created: class eee4	Class Teacher account for class eee4 (classeee4@inpand.com) was created successfully.	124	Electrical and Electronics Engineering	1	2026-10-24 14:34:29.091409
560	\N	124	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classeee4'.	124	Electrical and Electronics Engineering	1	2026-10-24 14:34:29.058277
563	\N	1	1	super_admin	super	account_created	Account Created: tec1 aero4	Class Teacher account for tec1 aero4 (tec1aero4@inpand.com) was created successfully.	125	Aeronautical Engineering	1	2026-10-24 14:34:59.732913
562	\N	125	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'tec1aero4'.	125	Aeronautical Engineering	1	2026-10-24 14:34:59.691595
564	\N	125	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'classaero4'.	125	Aeronautical Engineering	1	2026-10-24 14:35:42.431966
566	\N	1	1	super_admin	super	account_created	Account Created: class cse4	Class Teacher account for class cse4 (classcse4@inpand.com) was created successfully.	126	Computer Science Engineering	1	2026-10-24 14:36:09.412707
565	\N	126	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classcse4'.	126	Computer Science Engineering	1	2026-10-24 14:36:09.373757
568	\N	1	1	super_admin	super	account_created	Account Created: class ece4	Class Teacher account for class ece4 (classece4@inpand.com) was created successfully.	127	Electrical and Communication Engineering	1	2026-10-24 14:36:37.012218
567	\N	127	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classece4'.	127	Electrical and Communication Engineering	1	2026-10-24 14:36:36.980808
570	\N	1	1	super_admin	super	account_created	Account Created: class mech4	Class Teacher account for class mech4 (classmech4@inpand.com) was created successfully.	128	Mechanical Engineering	1	2026-10-24 14:37:00.620102
569	\N	128	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Teacher account was created by super (Super Admin). Sign in with your username 'classmech4'.	128	Mechanical Engineering	1	2026-10-24 14:37:00.583148
572	\N	1	1	super_admin	super	account_created	Account Created: tec1 aero	Teacher account for tec1 aero (tec1aero@inpand.com) was created successfully.	129	Aeronautical Engineering	1	2026-10-24 14:37:55.253851
571	\N	129	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec1aero'.	129	Aeronautical Engineering	1	2026-10-24 14:37:55.21866
574	\N	1	1	super_admin	super	account_created	Account Created: tec2 aero	Teacher account for tec2 aero (tec2aero@inpand.com) was created successfully.	130	Aeronautical Engineering	1	2026-10-24 14:38:17.280329
573	\N	130	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec2aero'.	130	Aeronautical Engineering	1	2026-10-24 14:38:17.138401
576	\N	1	1	super_admin	super	account_created	Account Created: tec3 aero	Teacher account for tec3 aero (tec3aero@inpand.com) was created successfully.	131	Aeronautical Engineering	1	2026-10-24 14:38:36.417104
575	\N	131	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec3aero'.	131	Aeronautical Engineering	1	2026-10-24 14:38:36.381466
578	\N	1	1	super_admin	super	account_created	Account Created: tec4 aero	Teacher account for tec4 aero (tec4aero@inpand.com) was created successfully.	132	Aeronautical Engineering	1	2026-10-24 14:39:14.822959
577	\N	132	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec4aero'.	132	Aeronautical Engineering	1	2026-10-24 14:39:14.786065
580	\N	1	1	super_admin	super	account_created	Account Created: tec5 aero	Teacher account for tec5 aero (tec5aero@inpand.com) was created successfully.	133	Aeronautical Engineering	1	2026-10-24 14:39:42.898693
579	\N	133	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec5aero'.	133	Aeronautical Engineering	1	2026-10-24 14:39:42.853202
582	\N	1	1	super_admin	super	account_created	Account Created: tec1 cse	Teacher account for tec1 cse (tec1cse@inpand.com) was created successfully.	134	Computer Science Engineering	1	2026-10-24 14:40:25.157008
581	\N	134	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec1cse'.	134	Computer Science Engineering	1	2026-10-24 14:40:25.112812
584	\N	1	1	super_admin	super	account_created	Account Created: tec2 cse	Teacher account for tec2 cse (tec2cse@inpand.com) was created successfully.	135	Computer Science Engineering	1	2026-10-24 14:40:55.913246
583	\N	135	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec2cse'.	135	Computer Science Engineering	1	2026-10-24 14:40:55.760256
586	\N	1	1	super_admin	super	account_created	Account Created: tec3 cse	Teacher account for tec3 cse (tec3cse@inpand.com) was created successfully.	136	Computer Science Engineering	1	2026-10-24 14:42:32.717303
585	\N	136	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec3cse'.	136	Computer Science Engineering	1	2026-10-24 14:42:32.678964
588	\N	1	1	super_admin	super	account_created	Account Created: tec4 cse	Teacher account for tec4 cse (tec4cse@inpand.com) was created successfully.	137	Computer Science Engineering	1	2026-10-24 14:42:53.857438
587	\N	137	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec4cse'.	137	Computer Science Engineering	1	2026-10-24 14:42:53.823997
590	\N	1	1	super_admin	super	account_created	Account Created: tec5 cse	Teacher account for tec5 cse (tec5cse@inpand.com) was created successfully.	138	Computer Science Engineering	1	2026-10-24 14:43:16.761486
589	\N	138	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec5cse'.	138	Computer Science Engineering	1	2026-10-24 14:43:16.612286
592	\N	1	1	super_admin	super	account_created	Account Created: tec1 ece	Teacher account for tec1 ece (tec1ece@inpand.com) was created successfully.	139	Electrical and Communication Engineering	1	2026-10-24 14:44:04.676972
591	\N	139	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec1ece'.	139	Electrical and Communication Engineering	1	2026-10-24 14:44:04.642599
594	\N	1	1	super_admin	super	account_created	Account Created: tec2 ece	Teacher account for tec2 ece (tec2ece@inpand.com) was created successfully.	140	Electrical and Communication Engineering	1	2026-10-24 14:44:35.54689
593	\N	140	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec2ece'.	140	Electrical and Communication Engineering	1	2026-10-24 14:44:35.393472
596	\N	1	1	super_admin	super	account_created	Account Created: tec3 ece	Teacher account for tec3 ece (tec3ece@inpand.com) was created successfully.	141	Electrical and Communication Engineering	1	2026-10-24 14:46:33.420121
595	\N	141	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec3ece'.	141	Electrical and Communication Engineering	1	2026-10-24 14:46:33.384906
598	\N	1	1	super_admin	super	account_created	Account Created: tec4 ece	Teacher account for tec4 ece (tec4ece@inpand.com) was created successfully.	142	Electrical and Communication Engineering	1	2026-10-24 14:46:56.62795
597	\N	142	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec4ece'.	142	Electrical and Communication Engineering	1	2026-10-24 14:46:56.597712
600	\N	1	1	super_admin	super	account_created	Account Created: tec5 ece	Teacher account for tec5 ece (tec5ece@inpand.com) was created successfully.	143	Electrical and Communication Engineering	1	2026-10-24 14:47:14.489024
599	\N	143	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec5ece'.	143	Electrical and Communication Engineering	1	2026-10-24 14:47:14.454568
602	\N	1	1	super_admin	super	account_created	Account Created: tec1 eee	Teacher account for tec1 eee (tec1eee@inpand.com) was created successfully.	144	Electrical and Electronics Engineering	1	2026-10-24 14:47:57.518992
601	\N	144	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec1eee'.	144	Electrical and Electronics Engineering	1	2026-10-24 14:47:57.378046
604	\N	1	1	super_admin	super	account_created	Account Created: tec2 eee	Teacher account for tec2 eee (tec2eee@inpand.com) was created successfully.	145	Electrical and Electronics Engineering	1	2026-10-24 14:48:35.49143
603	\N	145	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec2eee'.	145	Electrical and Electronics Engineering	1	2026-10-24 14:48:35.453827
606	\N	1	1	super_admin	super	account_created	Account Created: tec3 eee	Teacher account for tec3 eee (tec3eee@inpand.com) was created successfully.	146	Electrical and Electronics Engineering	1	2026-10-24 14:48:56.751884
605	\N	146	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec3eee'.	146	Electrical and Electronics Engineering	1	2026-10-24 14:48:56.708171
608	\N	1	1	super_admin	super	account_created	Account Created: tec4 eee	Teacher account for tec4 eee (tec4eee@inpand.com) was created successfully.	147	Electrical and Electronics Engineering	1	2026-10-24 14:49:16.602137
607	\N	147	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec4eee'.	147	Electrical and Electronics Engineering	1	2026-10-24 14:49:16.565495
610	\N	1	1	super_admin	super	account_created	Account Created: tec5 eee	Teacher account for tec5 eee (tec5eee@inpand.com) was created successfully.	148	Electrical and Electronics Engineering	1	2026-10-24 14:50:13.324487
609	\N	148	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec5eee'.	148	Electrical and Electronics Engineering	1	2026-10-24 14:50:13.280821
612	\N	1	1	super_admin	super	account_created	Account Created: tec3 mech	Teacher account for tec3 mech (tec3mech@inpand.com) was created successfully.	149	Mechanical Engineering	1	2026-10-24 14:51:03.353225
611	\N	149	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec3mech'.	149	Mechanical Engineering	1	2026-10-24 14:51:03.322673
614	\N	1	1	super_admin	super	account_created	Account Created: tec1 mech	Teacher account for tec1 mech (tec1mech@inpand.com) was created successfully.	150	Mechanical Engineering	1	2026-10-24 14:51:24.152468
613	\N	150	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec1mech'.	150	Mechanical Engineering	1	2026-10-24 14:51:24.118218
616	\N	1	1	super_admin	super	account_created	Account Created: tec2 mech	Teacher account for tec2 mech (tec2mech@inpand.com) was created successfully.	151	Mechanical Engineering	1	2026-10-24 14:51:43.257949
615	\N	151	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec2mech'.	151	Mechanical Engineering	1	2026-10-24 14:51:43.219188
618	\N	1	1	super_admin	super	account_created	Account Created: tec4 mech	Teacher account for tec4 mech (tec4mech@inpand.com) was created successfully.	152	Mechanical Engineering	1	2026-10-24 14:52:12.992971
617	\N	152	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec4mech'.	152	Mechanical Engineering	1	2026-10-24 14:52:12.962041
620	\N	1	1	super_admin	super	account_created	Account Created: tec5 mech	Teacher account for tec5 mech (tec5mech@inpand.com) was created successfully.	153	Mechanical Engineering	1	2026-10-24 14:52:41.348178
619	\N	153	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec5mech'.	153	Mechanical Engineering	1	2026-10-24 14:52:41.310048
874	teacher	\N	154	system	Admissions System	student_registration	New Student Account Needs Approval: Notify Test Student	Account registration for Notify Test Student (notify_test_user) requires your review. Click Accept or Reject below.	1000402	General	1	2026-10-28 16:20:38.32939
622	\N	1	1	super_admin	super	account_created	Account Created: tec1 mect	Teacher account for tec1 mect (tec1mect@inpand.com) was created successfully.	154	Mechatronics Engineering	1	2026-10-24 14:53:30.081311
621	\N	154	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec1mect'.	154	Mechatronics Engineering	1	2026-10-24 14:53:30.046232
709	\N	154	154	teacher	tec1 mect	account_updated	Your Account Was Updated	tec1 mect (Teacher) updated your account details. Sign in with user name 'tec1mect'.	154	Mechatronics Engineering	1	2026-10-27 17:29:28.560193
624	\N	1	1	super_admin	super	account_created	Account Created: tec2 mect	Teacher account for tec2 mect (tec2mect@inpand.com) was created successfully.	155	Mechatronics Engineering	1	2026-10-24 14:53:55.112402
623	\N	155	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec2mect'.	155	Mechatronics Engineering	1	2026-10-24 14:53:55.075599
626	\N	1	1	super_admin	super	account_created	Account Created: tec3 mect	Teacher account for tec3 mect (tec3mect@inpand.com) was created successfully.	156	Mechatronics Engineering	1	2026-10-24 14:54:25.521502
625	\N	156	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec3mect'.	156	Mechatronics Engineering	1	2026-10-24 14:54:25.472137
628	\N	1	1	super_admin	super	account_created	Account Created: tec4 mect	Teacher account for tec4 mect (tec4mect@inpand.com) was created successfully.	157	Mechatronics Engineering	1	2026-10-24 14:54:53.003279
627	\N	157	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec4mect'.	157	Mechatronics Engineering	1	2026-10-24 14:54:52.960143
630	\N	1	1	super_admin	super	account_created	Account Created: tec5 mect	Teacher account for tec5 mect (tec5mect@inpand.com) was created successfully.	158	Mechatronics Engineering	1	2026-10-24 14:55:15.516068
629	\N	158	1	super_admin	super	account_created	Your Account Has Been Created	Your Teacher account was created by super (Super Admin). Sign in with your username 'tec5mect'.	158	Mechatronics Engineering	1	2026-10-24 14:55:15.474497
632	\N	154	154	teacher	tec1 mect	account_created	Account Created: leader mect1	Class Leader account for leader mect1 (leadermect11@inpand.com) was created successfully.	159	Mechatronics Engineering	1	2026-10-24 14:59:51.576813
913	\N	159	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'leadermect1'.	159	Mechatronics Engineering	1	2026-10-29 17:29:52.459939
631	\N	159	154	teacher	tec1 mect	account_created	Your Account Has Been Created	Your Class Leader account was created by tec1 mect (Teacher). Sign in with your username 'leadermect1'.	159	Mechatronics Engineering	1	2026-10-24 14:59:51.533692
634	\N	1	1	super_admin	super	account_created	Account Created: leader mect2	Class Leader account for leader mect2 (leadermect21@inpand.com) was created successfully.	160	Mechatronics Engineering	1	2026-10-24 15:02:38.769463
633	\N	160	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadermect2'.	160	Mechatronics Engineering	1	2026-10-24 15:02:38.735924
636	\N	1	1	super_admin	super	account_created	Account Created: leader mect3	Class Leader account for leader mect3 (leadermect31@inpand.com) was created successfully.	161	Mechatronics Engineering	1	2026-10-24 15:03:22.114287
635	\N	161	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadermect3'.	161	Mechatronics Engineering	1	2026-10-24 15:03:22.083298
638	\N	1	1	super_admin	super	account_created	Account Created: leader mect4	Class Leader account for leader mect4 (leadermect41@inpand.com) was created successfully.	162	Mechatronics Engineering	1	2026-10-24 15:03:37.946424
637	\N	162	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadermect4'.	162	Mechatronics Engineering	1	2026-10-24 15:03:37.911526
642	\N	1	1	super_admin	super	account_created	Account Created: leader aero1	Class Leader account for leader aero1 (leaderaero11@inpand.com) was created successfully.	163	Aeronautical Engineering	1	2026-10-24 15:04:46.164937
641	\N	163	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leaderaero1'.	163	Aeronautical Engineering	1	2026-10-24 15:04:46.015212
644	\N	1	1	super_admin	super	account_created	Account Created: leader aero3	Class Leader account for leader aero3 (leaderaero31@inpand.com) was created successfully.	164	Aeronautical Engineering	1	2026-10-24 15:05:45.379788
643	\N	164	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leaderaero3'.	164	Aeronautical Engineering	1	2026-10-24 15:05:45.337911
646	\N	1	1	super_admin	super	account_created	Account Created: leader aero4	Class Leader account for leader aero4 (leaderaero41@inpand.com) was created successfully.	165	Aeronautical Engineering	1	2026-10-24 15:06:08.256327
645	\N	165	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leaderaero4'.	165	Aeronautical Engineering	1	2026-10-24 15:06:08.116071
648	\N	1	1	super_admin	super	account_created	Account Created: leader cse1	Class Leader account for leader cse1 (leadercse11@inpand.com) was created successfully.	166	Computer Science Engineering	1	2026-10-24 15:06:52.406207
647	\N	166	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadercse1'.	166	Computer Science Engineering	1	2026-10-24 15:06:52.363478
650	\N	1	1	super_admin	super	account_created	Account Created: leader cse2	Class Leader account for leader cse2 (leadercse21@inpand.com) was created successfully.	167	Computer Science Engineering	1	2026-10-24 15:07:12.374366
649	\N	167	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadercse2'.	167	Computer Science Engineering	1	2026-10-24 15:07:12.335166
652	\N	1	1	super_admin	super	account_created	Account Created: leader cse3	Class Leader account for leader cse3 (leadercse31@inpand.com) was created successfully.	168	Computer Science Engineering	1	2026-10-24 15:08:00.1589
651	\N	168	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadercse3'.	168	Computer Science Engineering	1	2026-10-24 15:08:00.123717
654	\N	1	1	super_admin	super	account_created	Account Created: leader cse4	Class Leader account for leader cse4 (leadercse41@inpand.com) was created successfully.	169	Computer Science Engineering	1	2026-10-24 15:08:19.272072
653	\N	169	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadercse4'.	169	Computer Science Engineering	1	2026-10-24 15:08:19.238046
656	\N	1	1	super_admin	super	account_created	Account Created: leader ece1	Class Leader account for leader ece1 (leaderece11@inpand.com) was created successfully.	170	Electrical and Communication Engineering	1	2026-10-24 15:08:48.914991
655	\N	170	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leaderece1'.	170	Electrical and Communication Engineering	1	2026-10-24 15:08:48.816036
658	\N	1	1	super_admin	super	account_created	Account Created: leader ece2	Class Leader account for leader ece2 (leaderece21@inpand.com) was created successfully.	171	Electrical and Communication Engineering	1	2026-10-24 15:09:15.719999
657	\N	171	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leaderece2'.	171	Electrical and Communication Engineering	1	2026-10-24 15:09:15.679482
660	\N	1	1	super_admin	super	account_created	Account Created: leader ece3	Class Leader account for leader ece3 (leaderece31@inpand.com) was created successfully.	172	Electrical and Communication Engineering	1	2026-10-24 15:09:33.590643
659	\N	172	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leaderece3'.	172	Electrical and Communication Engineering	1	2026-10-24 15:09:33.447666
662	\N	1	1	super_admin	super	account_created	Account Created: leader ece4	Class Leader account for leader ece4 (leaderece41@inpand.com) was created successfully.	173	Electrical and Communication Engineering	1	2026-10-24 15:09:55.338704
661	\N	173	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leaderece4'.	173	Electrical and Communication Engineering	1	2026-10-24 15:09:55.29219
664	\N	1	1	super_admin	super	account_created	Account Created: leader eee1	Class Leader account for leader eee1 (leadereee11@inpand.com) was created successfully.	174	Electrical and Electronics Engineering	1	2026-10-24 15:10:47.054947
663	\N	174	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadereee1'.	174	Electrical and Electronics Engineering	1	2026-10-24 15:10:47.009795
666	\N	1	1	super_admin	super	account_created	Account Created: leader eee2	Class Leader account for leader eee2 (leadereee21@inpand.com) was created successfully.	175	Electrical and Electronics Engineering	1	2026-10-24 15:11:11.213597
665	\N	175	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadereee2'.	175	Electrical and Electronics Engineering	1	2026-10-24 15:11:11.177136
668	\N	1	1	super_admin	super	account_created	Account Created: leader eee3	Class Leader account for leader eee3 (leadereee31@inpand.com) was created successfully.	176	Electrical and Electronics Engineering	1	2026-10-24 15:11:32.648537
667	\N	176	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadereee3'.	176	Electrical and Electronics Engineering	1	2026-10-24 15:11:32.608234
670	\N	1	1	super_admin	super	account_created	Account Created: leader eee4	Class Leader account for leader eee4 (leadereee41@inpand.com) was created successfully.	177	Electrical and Electronics Engineering	1	2026-10-24 15:12:01.592233
669	\N	177	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadereee4'.	177	Electrical and Electronics Engineering	1	2026-10-24 15:12:01.458076
672	\N	1	1	super_admin	super	account_created	Account Created: leader mech1	Class Leader account for leader mech1 (leadermech11@inpand.com) was created successfully.	178	Mechanical Engineering	1	2026-10-24 15:12:58.580098
671	\N	178	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadermech1'.	178	Mechanical Engineering	1	2026-10-24 15:12:58.544317
674	\N	1	1	super_admin	super	account_created	Account Created: leader mech2	Class Leader account for leader mech2 (leadermech21@inpand.com) was created successfully.	179	Mechanical Engineering	1	2026-10-24 15:13:23.594107
673	\N	179	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadermech2'.	179	Mechanical Engineering	1	2026-10-24 15:13:23.442367
676	\N	1	1	super_admin	super	account_created	Account Created: leader mech3	Class Leader account for leader mech3 (leadermech31@inpand.com) was created successfully.	180	Mechanical Engineering	1	2026-10-24 15:13:52.506761
675	\N	180	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadermech3'.	180	Mechanical Engineering	1	2026-10-24 15:13:52.469541
677	\N	180	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'leadermech3'.	180	Mechanical Engineering	1	2026-10-24 15:14:08.207423
678	\N	180	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'leadermech3'.	180	Mechanical Engineering	1	2026-10-24 15:14:37.94479
680	\N	1	1	super_admin	super	account_created	Account Created: leader mech4	Class Leader account for leader mech4 (leadermech41@inpand.com) was created successfully.	181	Mechanical Engineering	1	2026-10-24 15:15:09.068587
679	\N	181	1	super_admin	super	account_created	Your Account Has Been Created	Your Class Leader account was created by super (Super Admin). Sign in with your username 'leadermech4'.	181	Mechanical Engineering	1	2026-10-24 15:15:08.924915
780	\N	1	1	super_admin	super	account_created	Account Created: hod_mect	Hod account for hod_mect (hod_mect1@inpand.com) was created successfully.	182	Mechatronics Engineering	1	2026-10-28 10:33:17.831751
779	\N	182	1	super_admin	super	account_created	Your Account Has Been Created	Your Hod account was created by super (Super Admin). Sign in with your username 'hod_mect'.	182	Mechatronics Engineering	1	2026-10-28 10:33:17.830311
791	\N	182	182	hod	hod_mect	account_updated	Your Account Was Updated	hod_mect (Hod) updated your account details. Sign in with user name 'hod_mect'.	182	Mechatronics Engineering	1	2026-10-28 12:27:04.749888
782	\N	1	1	super_admin	super	account_created	Account Created: hod_mech	Hod account for hod_mech (hod_mech1@inpand.com) was created successfully.	183	Mechanical Engineering	1	2026-10-28 10:33:52.052937
781	\N	183	1	super_admin	super	account_created	Your Account Has Been Created	Your Hod account was created by super (Super Admin). Sign in with your username 'hod_mech'.	183	Mechanical Engineering	1	2026-10-28 10:33:52.05185
784	\N	1	1	super_admin	super	account_created	Account Created: hod_eee	Hod account for hod_eee (hod_eee1@inpand.com) was created successfully.	184	Electrical and Electronics Engineering	1	2026-10-28 10:34:30.741658
783	\N	184	1	super_admin	super	account_created	Your Account Has Been Created	Your Hod account was created by super (Super Admin). Sign in with your username 'hod_eee'.	184	Electrical and Electronics Engineering	1	2026-10-28 10:34:30.740838
786	\N	1	1	super_admin	super	account_created	Account Created: hod_ece	Hod account for hod_ece (hod_ece1@inpand.com) was created successfully.	185	Electrical and Communication Engineering	1	2026-10-28 10:34:51.453848
785	\N	185	1	super_admin	super	account_created	Your Account Has Been Created	Your Hod account was created by super (Super Admin). Sign in with your username 'hod_ece'.	185	Electrical and Communication Engineering	1	2026-10-28 10:34:51.452491
788	\N	1	1	super_admin	super	account_created	Account Created: hod_cse	Hod account for hod_cse (hod_cse1@inpand.com) was created successfully.	186	Computer Science Engineering	1	2026-10-28 10:35:10.340978
787	\N	186	1	super_admin	super	account_created	Your Account Has Been Created	Your Hod account was created by super (Super Admin). Sign in with your username 'hod_cse'.	186	Computer Science Engineering	1	2026-10-28 10:35:10.340078
790	\N	1	1	super_admin	super	account_created	Account Created: hod_aero	Hod account for hod_aero (hod_aero1@inpand.com) was created successfully.	187	Aeronautical Engineering	1	2026-10-28 10:35:27.2907
789	\N	187	1	super_admin	super	account_created	Your Account Has Been Created	Your Hod account was created by super (Super Admin). Sign in with your username 'hod_aero'.	187	Aeronautical Engineering	1	2026-10-28 10:35:27.289686
796	\N	1	1	super_admin	super	account_created	Account Created: principal	Principal account for principal (principal@inpand.com) was created successfully.	188	\N	1	2026-10-28 13:21:36.509518
922	\N	188	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'principaliiet'.	188	\N	1	2026-10-31 09:30:41.621394
795	\N	188	1	super_admin	super	account_created	Your Account Has Been Created	Your Principal account was created by super (Super Admin). Sign in with your username 'principaliiet'.	188	\N	1	2026-10-28 13:21:36.495759
919	\N	188	1	super_admin	super	account_updated	Your Account Was Updated	super (Super Admin) updated your account details. Sign in with user name 'principaliiet'.	188	\N	1	2026-10-29 17:40:58.928248
\.


--
-- Data for Name: programs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.programs (id, department_id, name, degree, duration_years) FROM stdin;
1	1	B.Tech Computer Science Engineering	B.Tech	4
4	2	B.Tech Mechanical Engineering	B.Tech	4
5	3	B.Tech Mechatronics Engineering	B.Tech	4
6	4	B.Tech Aeronautical Engineering	B.Tech	4
7	5	B.Tech Electrical and Electronics Engineering	B.Tech	4
8	6	B.Tech Electrical and Communication Engineering	B.Tech	4
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.questions (id, teacher_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, duration_seconds, target_type, target_group_id, created_at, target_department_id, target_year, task_number) FROM stdin;
74	105	1	11`1`1`1	1	1	1	A		60	all	\N	2026-10-28 16:53:23.008094	3	1	Task 1
56	108	XXX	CCC	CC	CC	C	A		30	all	\N	2026-10-26 11:50:38.488588	1	1	Task 1
55	108	who is thala of tamil cimema	aSAa	AAA	XCXX	CCCCC	A		30	all	\N	2026-10-26 11:50:17.868757	1	1	Task 1
57	129	What is Python programming?	Reptile	Programming language	Car	Drink	B		60	all	\N	2026-10-26 12:33:11.656314	4	1	Task 2
58	129	What is Python programming?	Reptile	Programming language	Car	Drink	B		60	all	\N	2026-10-26 12:33:36.282054	4	1	Task 2
59	129	What is Python programming?	Reptile	Programming language	Car	Drink	B		60	all	\N	2026-10-26 12:34:00.633654	4	1	Task 2
72	154	a	a	a	a	a	A		60	all	\N	2026-10-26 14:46:42.221279	3	1	sq2s
73	154	a	a	as	s	ds	A		60	all	\N	2026-10-26 14:47:02.553635	3	1	sq2s
\.


--
-- Data for Name: removed_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.removed_users (id, name, email, username, role, department, deleted_at, archive_id, registered_at, status) FROM stdin;
413	hello	hello1@inpand.com	hello	student	-	2026-10-29 12:29:25.175963	27	2026-10-29 12:28:21.38039	deleted
412	eeeeeeee	eeeeeeee1@inpand.com	eeeeeeee	student	-	2026-10-29 12:29:27.439694	28	2026-10-29 12:27:08.230868	deleted
411	qqqqqq	qqqqqq1@inpand.com	qqqqqq	teacher	-	2026-10-29 12:29:29.169043	29	2026-10-29 12:26:41.475294	deleted
410	abcdef	abcdef1@inpand.com	abcdef	student	Mechatronics Engineering	2026-10-29 12:29:30.717187	30	2026-10-29 11:22:41.787681	deleted
415	test_final_year	test_final@inpand.com	test_final_year	student	-	2026-10-29 16:09:25.59025	31	2026-10-29 16:07:56.031033	deleted
416	test_final_year	test_final@inpand.com	test_final_year	student	Mechatronics Engineering	2026-10-29 16:10:29.49065	32	2026-10-29 16:09:25.735538	deleted
417	test_final_year	test_final@inpand.com	test_final_year	student	-	2026-10-29 16:10:29.956539	33	2026-10-29 16:10:29.624965	deleted
419	test_stu21_mect	test_stu21_mect@inpand.com	test_stu21_mect	student	-	2026-10-29 16:11:14.228645	34	2026-10-29 16:11:13.886453	deleted
420	test_final_year	test_final@inpand.com	test_final_year	student	-	2026-10-29 17:27:24.414605	35	2026-10-29 17:27:24.014007	deleted
414	rahesh	rahesh1@inpand.com	rahesh	student	-	2026-10-31 09:14:55.629928	36	2026-10-29 14:38:54.740211	deleted
421	test_final_year	test_final@inpand.com	test_final_year	student	-	2026-10-31 09:30:21.549668	37	2026-10-31 09:30:20.705104	deleted
422	test_stu21_mect	test_stu21_mect@inpand.com	test_stu21_mect	student	-	2026-10-31 09:30:32.008484	38	2026-10-31 09:30:31.681682	deleted
192	test_seq_1	test_seq_1@inpand.com	test_seq_1	student	-	2026-10-31 09:50:28.089436	42	2026-10-31 09:49:05.906265	deleted
380	gggggg	gggggg1@inpand.com	gggggg	admin	-	2026-10-26 10:37:18.442103	4	2026-10-26 10:35:31.865323	deleted
381	gggggg	gggggg1@inpand.com	gggggg	admin	-	2026-10-26 10:44:48.416178	5	2026-10-26 10:37:32.125627	deleted
382	thalapathy	thalapathy1@inpand.com	thalapathy	student	-	2026-10-26 11:07:49.071032	6	2026-10-26 11:07:27.375419	deleted
384	Prof6732bf	prof6732bf@inpand.com	prof6732bf	teacher	-	2026-10-26 15:01:20.796934	7	2026-10-26 12:48:55.964645	deleted
383	ProfMultiDept	profmultidept@inpand.com	profmultidept	teacher	-	2026-10-26 15:01:35.014313	8	2026-10-26 12:48:25.186912	deleted
385	aaaaaaa	aaaaaaa1@inpand.com	aaaaaaa	admin	-	2026-10-27 09:57:55.848893	9	2026-10-27 09:57:12.039455	deleted
390	PrincipalOne	principal_official@inpand.com	principal_official	principal	-	2026-10-28 09:59:57.082473	10	2026-10-28 09:59:56.933627	deleted
389	principal	principal1@inpand.com	principal	admin	-	2026-10-28 10:01:36.353702	11	2026-10-28 09:11:54.676725	deleted
391	principal iiet	principaliiet1@inpand.com	principaliiet	principal	-	2026-10-28 13:20:05.313013	12	2026-10-28 10:02:27.193878	deleted
400	Test Pending Student	testpendingstudent@inpand.com	testpendingstudent	student	-	2026-10-28 15:50:48.144131	13	2026-10-28 15:50:48.122398	deleted
402	Notify Test Student	test_notify_unit@example.com	notify_test_user	student	-	2026-10-28 16:20:56.65642	14	2026-10-28 16:20:25.037684	deleted
403	Notify Test Student	test_notify_unit@example.com	notify_test_user	student	-	2026-10-28 16:21:19.763326	15	2026-10-28 16:20:56.683423	deleted
404	Notify Test Student	test_notify_unit@example.com	notify_test_user	student	-	2026-10-28 16:21:19.96147	16	2026-10-28 16:21:19.791831	deleted
406	ssss	ssss1@inpand.com	ssss	admin	-	2026-10-29 09:33:30.639284	17	2026-10-29 09:33:12.378389	deleted
405	ffffff	ffffff1@inpand.com	ffffff	admin	-	2026-10-29 09:33:32.799033	18	2026-10-29 09:20:38.919446	deleted
398	jjjjjj	jjjjjj1@inpand.com	jjjjjj	student	-	2026-10-29 09:33:35.721012	19	2026-10-28 12:57:58.496026	deleted
241	accountant	accountant@inpand.com	accountant	accountant	-	2026-10-29 10:05:27.255703	20	2026-10-23 10:24:27.92362	deleted
408	dddddddddddddddd	dddddddddddddddd1@inpand.com	dddddddddddddddd	admin	-	2026-10-29 10:38:22.236071	21	2026-10-29 10:05:14.48725	deleted
407	eeeeee	eeeeee1@inpand.com	eeeeee	admin	-	2026-10-29 10:38:25.670288	22	2026-10-29 09:40:30.752649	deleted
409	wwwwww	wwwwww1@inpand.com	wwwwww	teacher	-	2026-10-29 10:46:46.128356	23	2026-10-29 10:46:29.472064	deleted
388	aaaa	aaaa1@inpand.com	aaaa	student	Aeronautical Engineering	2026-10-29 10:51:37.366577	24	2026-10-27 17:28:48.943531	deleted
387	leader mect11	leadermect111@inpand.com	leadermect11	student	Mechatronics Engineering	2026-10-29 10:55:29.254915	25	2026-10-27 17:24:05.445441	deleted
386	leader mect12	leadermect121@inpand.com	leadermect12	student	Aeronautical Engineering	2026-10-29 10:55:33.197879	26	2026-10-27 17:23:07.164057	deleted
191	test_seq_3	test_seq_3@inpand.com	test_seq_3	student	-	2026-10-31 09:53:53.449072	41	2026-10-31 09:42:30.25503	deleted
189	test_seq_1	test_seq_1@inpand.com	test_seq_1	student	-	2026-10-31 09:57:29.353078	39	2026-10-31 09:42:30.032282	deleted
190	test_seq_2	test_seq_2@inpand.com	test_seq_2	student	-	2026-10-31 09:57:44.552068	40	2026-10-31 09:42:30.126335	deleted
\.


--
-- Data for Name: revoked_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.revoked_tokens (jti, revoked_at) FROM stdin;
c11468d527b64fba9c1baf105fd2320b	2026-10-22 09:01:18.594008
24086ebdad824e1bb2862f0bc5cc177d	2026-10-22 09:20:47.057068
70e05300e2a44ec898bfe32d4bf3d8f5	2026-10-22 10:05:44.525777
25e29905d02a4ee1bdb0c5b7865bdb29	2026-10-22 12:56:40.014096
51935af9f793468981c981af74fea4c0	2026-10-22 17:14:06.962498
09eec1a4c70a43a3bf4e2de38aba177a	2026-10-23 09:39:13.466379
8085c2d927bc4f67b06fe61fa4abcd47	2026-10-23 09:41:21.48534
0f9ff826a27a442682dea1647e17ef70	2026-10-26 11:44:08.665459
3be7f3e003ce4e70a9c5fed2e4a3aa5f	2026-10-26 12:40:29.347654
1dafd18d2c3548dcbd1c0b26243c87d0	2026-10-26 12:47:56.834598
7ad0815f713245b0962107294e406f32	2026-10-26 13:17:48.819101
9a320fa63f33428e82db2ded5a6590c0	2026-10-27 10:03:05.200641
270247418332472f8afef47d252f2c5c	2026-10-27 17:41:11.3338
cdb4a4d078d74fb5a72e9e7f818e2a11	2026-10-27 17:42:02.157001
35d07abd1b464bf2bd1d8f10bad5fe33	2026-10-28 09:01:08.606597
f60c666fa89d43c6bf6a32c2eb8de830	2026-10-31 09:56:07.891179
\.


--
-- Data for Name: sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sections (id, batch_id, name) FROM stdin;
12	14	A
\.


--
-- Data for Name: semesters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.semesters (id, academic_year_id, name, start_date, end_date) FROM stdin;
1	2	Sem 1 (6ffbdf)	2026-08-01	2026-12-15
2	3	Sem 1 (0fd375)	2026-08-01	2026-12-15
\.


--
-- Data for Name: staff_departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff_departments (id, user_id, department_id, assigned_at) FROM stdin;
216	63	6	2026-10-22 14:40:17.459045
218	71	6	2026-10-22 15:01:48.20218
359	102	5	2026-10-23 09:44:47.294063
534	105	3	2026-10-27 17:29:14.881421
453	106	5	2026-10-24 14:26:35.066947
452	107	4	2026-10-24 14:26:23.611738
454	108	1	2026-10-24 14:26:43.515525
455	109	6	2026-10-24 14:26:50.027197
456	110	2	2026-10-24 14:26:55.706433
457	111	3	2026-10-24 14:27:49.113532
458	112	5	2026-10-24 14:28:18.160055
459	113	4	2026-10-24 14:28:46.072816
460	114	1	2026-10-24 14:29:42.385541
461	115	6	2026-10-24 14:30:09.106329
462	116	2	2026-10-24 14:30:49.897064
463	117	3	2026-10-24 14:31:22.062952
464	118	5	2026-10-24 14:31:46.812453
465	119	4	2026-10-24 14:32:09.6121
466	120	1	2026-10-24 14:32:28.390407
467	121	6	2026-10-24 14:33:02.591649
468	122	2	2026-10-24 14:33:31.218736
469	123	3	2026-10-24 14:34:08.813075
470	124	5	2026-10-24 14:34:28.952677
472	125	4	2026-10-24 14:35:42.228602
473	126	1	2026-10-24 14:36:09.116304
554	3	3	2026-10-29 17:32:24.346278
553	4	3	2026-10-29 17:32:16.139434
552	5	3	2026-10-29 17:32:08.51002
551	6	3	2026-10-29 17:31:59.818641
550	7	3	2026-10-29 17:31:52.377536
474	127	6	2026-10-24 14:36:36.783051
475	128	2	2026-10-24 14:37:00.3647
476	129	4	2026-10-24 14:37:55.117605
477	130	4	2026-10-24 14:38:16.919588
478	131	4	2026-10-24 14:38:36.277818
479	132	4	2026-10-24 14:39:14.668909
480	133	4	2026-10-24 14:39:42.716762
481	134	1	2026-10-24 14:40:24.997333
482	135	1	2026-10-24 14:40:55.523269
483	136	1	2026-10-24 14:42:32.569603
484	137	1	2026-10-24 14:42:53.721785
485	138	1	2026-10-24 14:43:16.503145
486	139	6	2026-10-24 14:44:04.536838
487	140	6	2026-10-24 14:44:35.162868
488	141	6	2026-10-24 14:46:33.277915
489	142	6	2026-10-24 14:46:56.371655
490	143	6	2026-10-24 14:47:14.24391
491	144	5	2026-10-24 14:47:57.271615
492	145	5	2026-10-24 14:48:35.340299
493	146	5	2026-10-24 14:48:56.563914
494	147	5	2026-10-24 14:49:16.455976
495	148	5	2026-10-24 14:50:13.062699
496	149	2	2026-10-24 14:51:03.226255
497	150	2	2026-10-24 14:51:24.013851
498	151	2	2026-10-24 14:51:42.960033
499	152	2	2026-10-24 14:52:12.853808
500	153	2	2026-10-24 14:52:41.179615
535	154	3	2026-10-27 17:29:28.559465
502	155	3	2026-10-24 14:53:54.957916
503	156	3	2026-10-24 14:54:25.335576
504	157	3	2026-10-24 14:54:52.839282
505	158	3	2026-10-24 14:55:15.345208
549	159	3	2026-10-29 17:29:52.458458
507	180	2	2026-10-24 15:14:37.845679
542	182	3	2026-10-28 12:27:04.745702
537	183	2	2026-10-28 10:33:52.050143
538	184	5	2026-10-28 10:34:30.739253
539	185	6	2026-10-28 10:34:51.450187
540	186	1	2026-10-28 10:35:10.338528
541	187	4	2026-10-28 10:35:27.287689
\.


--
-- Data for Name: staff_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff_profiles (user_id, department_id, designation, qualification) FROM stdin;
146	5	\N	\N
147	5	\N	\N
148	5	\N	\N
149	2	\N	\N
105	3	\N	\N
106	5	\N	\N
107	4	\N	\N
108	1	\N	\N
109	6	\N	\N
110	2	\N	\N
111	3	\N	\N
112	5	\N	\N
113	4	\N	\N
114	1	\N	\N
115	6	\N	\N
116	2	\N	\N
117	3	\N	\N
118	5	\N	\N
119	4	\N	\N
120	1	\N	\N
121	6	\N	\N
122	2	\N	\N
123	3	\N	\N
124	5	\N	\N
125	4	\N	\N
126	1	\N	\N
127	6	\N	\N
128	2	\N	\N
129	4	\N	\N
130	4	\N	\N
131	4	\N	\N
132	4	\N	\N
133	4	\N	\N
134	1	\N	\N
135	1	\N	\N
136	1	\N	\N
137	1	\N	\N
138	1	\N	\N
139	6	\N	\N
140	6	\N	\N
141	6	\N	\N
142	6	\N	\N
143	6	\N	\N
144	5	\N	\N
145	5	\N	\N
150	2	\N	\N
151	2	\N	\N
152	2	\N	\N
153	2	\N	\N
154	3	\N	\N
155	3	\N	\N
156	3	\N	\N
157	3	\N	\N
158	3	\N	\N
182	3	\N	\N
183	2	\N	\N
184	5	\N	\N
185	6	\N	\N
186	1	\N	\N
187	4	\N	\N
\.


--
-- Data for Name: student_daily_attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_daily_attendance (id, student_id, attendance_date, status, marked_by, created_at, updated_at) FROM stdin;
3	23	2026-10-23	P	\N	2026-10-23 12:14:13.962658	2026-10-23 12:14:13.962658
4	24	2026-10-23	A	\N	2026-10-23 12:14:15.428041	2026-10-23 12:14:15.428041
5	25	2026-10-23	P	\N	2026-10-23 12:14:16.364355	2026-10-23 12:14:16.364355
6	26	2026-10-23	P	\N	2026-10-23 12:14:17.204462	2026-10-23 12:14:17.204462
7	27	2026-10-23	P	\N	2026-10-23 12:14:18.229353	2026-10-23 12:14:18.229353
8	28	2026-10-23	P	\N	2026-10-23 12:14:48.577093	2026-10-23 12:14:48.577093
20	4	2026-10-28	P	129	2026-10-28 11:02:27.665012	2026-10-28 11:02:27.665012
12	3	2026-10-24	P	154	2026-10-24 15:46:19.908765	2026-10-24 15:46:19.908765
13	3	2026-10-27	P	154	2026-10-27 10:56:27.967399	2026-10-27 10:56:27.967399
9	159	2026-10-24	P	154	2026-10-24 15:23:31.215474	2026-10-24 15:46:09.683898
14	159	2026-10-27	P	154	2026-10-27 11:42:54.448728	2026-10-27 11:42:54.448728
\.


--
-- Data for Name: student_fees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_fees (id, student_id, fee_amount, paid_amount, status, academic_year, due_date, paid_at, updated_by_id, updated_at, remarks) FROM stdin;
23	3	40000	20000	partial	2025-2026	\N	2026-10-28 13:01:24.062249	\N	2026-10-28 13:01:24.062249	\N
1	4	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-28 14:31:24.796564	\N
2	5	40000	40000	paid	2025-2026	\N	2026-10-28 14:31:18.028436	\N	2026-10-28 14:31:18.028436	\N
3	6	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-28 14:31:30.381452	\N
4	7	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-28 14:31:31.445598	\N
5	8	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-28 14:31:35.293109	\N
6	9	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-28 14:31:40.943645	\N
7	10	40000	40000	paid	2025-2026	\N	2026-10-28 14:31:44.471207	\N	2026-10-28 14:31:44.471207	\N
8	11	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-28 14:31:50.149054	\N
9	12	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-28 14:31:49.62957	\N
10	13	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 14:05:24.14403	\N
11	14	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 14:05:24.144771	\N
12	15	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 14:05:24.145416	\N
13	16	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 14:05:24.14602	\N
14	17	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 14:05:24.146546	\N
15	18	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 14:05:24.146976	\N
16	19	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 14:05:24.147522	\N
17	20	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 14:05:24.148005	\N
18	21	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 14:05:24.148527	\N
19	22	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 14:05:24.148969	\N
20	23	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:39.22005	\N
21	24	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:39.955645	\N
22	25	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:40.834849	\N
24	26	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:41.706637	\N
25	27	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:42.562648	\N
26	28	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:36.419954	\N
27	29	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:35.139511	\N
28	30	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:34.124348	\N
29	31	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:33.691696	\N
30	32	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:33.275943	\N
31	33	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:55.483201	\N
32	34	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:55.931436	\N
33	35	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:56.467066	\N
34	36	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:52.33895	\N
35	37	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:51.795688	\N
36	38	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:48.515863	\N
37	39	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:47.307939	\N
38	40	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:46.738464	\N
39	41	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:46.29884	\N
40	42	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:23:45.907691	\N
41	43	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:01.163772	\N
42	44	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:01.835271	\N
43	45	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:02.31558	\N
44	46	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:02.802648	\N
45	47	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:03.49263	\N
46	48	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:04.938512	\N
47	49	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:05.755886	\N
48	50	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:06.347231	\N
49	51	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:11.139651	\N
50	52	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:11.667648	\N
51	53	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:16.30743	\N
52	54	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:17.003217	\N
53	55	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:14.48355	\N
54	56	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:18.763651	\N
55	57	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:19.491985	\N
56	58	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:20.044413	\N
57	59	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:20.571773	\N
58	60	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:21.547875	\N
59	61	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:22.04254	\N
60	62	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:24:23.195648	\N
61	63	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:08.419984	\N
62	64	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:09.019274	\N
63	65	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:09.547889	\N
64	66	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:10.044033	\N
65	67	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:10.546253	\N
66	68	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:11.107484	\N
67	69	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:12.132083	\N
68	70	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:12.643531	\N
99	71	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:13.403563	\N
69	72	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:14.210383	\N
70	73	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:18.844246	\N
71	74	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:19.587534	\N
72	75	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:22.619542	\N
73	76	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:23.419822	\N
74	77	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:24.130707	\N
75	78	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:24.724077	\N
76	79	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:25.492378	\N
77	80	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:26.308342	\N
78	81	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:27.028009	\N
79	82	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:28.051968	\N
80	83	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:36.115913	\N
81	84	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:36.635723	\N
82	85	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:37.220021	\N
83	86	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:37.836092	\N
84	87	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:38.484185	\N
85	88	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:34.131051	\N
86	89	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:33.298367	\N
87	90	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:32.868051	\N
88	91	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:32.299862	\N
89	92	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:31.532082	\N
90	93	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:46.092553	\N
91	94	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:46.523344	\N
92	95	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:47.004409	\N
93	96	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:48.347502	\N
94	97	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:49.52313	\N
95	98	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:44.690392	\N
96	99	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:43.88389	\N
97	100	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:42.051629	\N
98	101	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:41.627302	\N
101	102	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:41.170475	\N
523	159	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 14:05:24.149975	\N
524	160	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 14:05:24.150368	\N
525	161	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 14:05:24.150751	\N
526	162	40000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 14:05:24.151128	\N
527	163	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:57.027862	\N
528	164	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:57.643069	\N
529	165	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:58.171626	\N
530	166	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:59.002391	\N
531	167	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:25:59.490716	\N
532	168	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:26:00.004382	\N
533	169	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:26:10.395914	\N
534	170	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:26:11.011137	\N
535	171	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:26:11.579858	\N
536	172	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:26:08.187558	\N
537	173	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:26:05.259453	\N
538	174	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:26:04.826567	\N
539	175	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:26:04.243607	\N
540	176	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:26:03.636484	\N
541	177	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:26:02.595708	\N
542	178	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:26:02.179316	\N
543	179	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:26:14.267463	\N
544	180	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:26:14.747759	\N
545	181	20000	0	unpaid	2025-2026	\N	\N	\N	2026-10-27 13:26:15.171328	\N
\.


--
-- Data for Name: student_library_books; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_library_books (id, student_id, book_name, validity_date, status, issued_at, returned_at, issued_by_id, updated_at) FROM stdin;
4	3	M1	2026-10-23	returned	2026-10-23 11:08:10.271203	2026-10-23 11:09:31.842207	\N	2026-10-23 11:09:31.842207
5	3	a	2026-10-23	returned	2026-10-23 11:09:39.356759	2026-10-23 11:09:44.383055	\N	2026-10-23 11:09:39.356759
6	3	b	2026-10-23	returned	2026-10-23 11:09:44.529144	2026-10-23 11:09:57.522032	\N	2026-10-23 11:09:44.529144
7	3	aa	2026-10-23	returned	2026-10-23 11:09:57.55778	2026-10-23 11:39:40.731244	\N	2026-10-23 11:39:40.731244
9	3	aa	2026-10-23	returned	2026-10-23 11:39:57.759077	2026-10-23 11:40:06.45884	\N	2026-10-23 11:39:57.759077
10	3	bb	2026-10-23	returned	2026-10-23 11:40:06.49709	2026-10-23 11:50:18.813635	\N	2026-10-23 11:50:18.813635
13	3	aaa	2026-10-23	returned	2026-10-23 11:50:13.680217	2026-10-23 11:50:18.813635	\N	2026-10-23 11:50:18.813635
14	33	ebniuhjbnfg	2026-10-27	returned	2026-10-27 12:47:28.700156	2026-10-27 12:47:35.626702	104	2026-10-27 12:47:35.626702
15	33	dd	2026-10-27	returned	2026-10-27 12:47:48.281915	2026-10-27 12:48:07.52351	104	2026-10-27 12:48:07.52351
16	33	ss	2026-10-28	returned	2026-10-27 12:48:02.634283	2026-10-27 12:48:11.707011	104	2026-10-27 12:48:11.707011
17	33	gbmoijn	2026-10-27	returned	2026-10-27 13:05:12.721819	2026-10-27 13:05:15.947177	104	2026-10-27 13:05:15.947177
\.


--
-- Data for Name: student_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_profiles (user_id, roll_number, batch_id, section_id, department_id, guardian_name, guardian_phone, guardian_email, academic_year, previous_year, year_changed_at) FROM stdin;
173	\N	\N	\N	6	\N	\N	\N	4	\N	\N
3	\N	14	\N	3	\N	\N	\N	1	1	2026-10-29 16:12:20
4	\N	14	\N	3	\N	\N	\N	1	1	2026-10-29 16:12:20
5	\N	14	\N	3	\N	\N	\N	1	1	2026-10-29 16:12:20
6	\N	14	\N	3	\N	\N	\N	1	1	2026-10-29 16:12:20
7	\N	14	\N	3	\N	\N	\N	1	1	2026-10-29 16:12:20
8	\N	\N	\N	3	\N	\N	\N	2	\N	\N
9	\N	\N	\N	3	\N	\N	\N	2	\N	\N
10	\N	\N	\N	3	\N	\N	\N	2	\N	\N
11	\N	\N	\N	3	\N	\N	\N	2	\N	\N
12	\N	\N	\N	3	\N	\N	\N	2	\N	\N
13	\N	\N	\N	3	\N	\N	\N	3	\N	\N
14	\N	\N	\N	3	\N	\N	\N	3	\N	\N
15	\N	\N	\N	3	\N	\N	\N	3	\N	\N
16	\N	\N	\N	3	\N	\N	\N	3	\N	\N
17	\N	\N	\N	3	\N	\N	\N	3	\N	\N
18	\N	\N	\N	3	\N	\N	\N	4	\N	\N
19	\N	\N	\N	3	\N	\N	\N	4	\N	\N
20	\N	\N	\N	3	\N	\N	\N	4	\N	\N
21	\N	\N	\N	3	\N	\N	\N	4	\N	\N
22	\N	\N	\N	3	\N	\N	\N	4	\N	\N
23	\N	\N	\N	4	\N	\N	\N	2	1	2026-10-29 17:10:24
24	\N	\N	\N	4	\N	\N	\N	1	\N	\N
25	\N	\N	\N	4	\N	\N	\N	1	\N	\N
26	\N	\N	\N	4	\N	\N	\N	1	\N	\N
27	\N	\N	\N	4	\N	\N	\N	2	1	2026-10-29 17:10:24
28	\N	\N	\N	4	\N	\N	\N	2	\N	\N
29	\N	\N	\N	4	\N	\N	\N	2	\N	\N
30	\N	\N	\N	4	\N	\N	\N	2	\N	\N
31	\N	\N	\N	4	\N	\N	\N	2	\N	\N
32	\N	\N	\N	4	\N	\N	\N	2	\N	\N
33	\N	\N	\N	4	\N	\N	\N	3	\N	\N
34	\N	\N	\N	4	\N	\N	\N	3	\N	\N
35	\N	\N	\N	4	\N	\N	\N	3	\N	\N
36	\N	\N	\N	4	\N	\N	\N	3	\N	\N
37	\N	\N	\N	4	\N	\N	\N	3	\N	\N
38	\N	\N	\N	4	\N	\N	\N	4	\N	\N
39	\N	\N	\N	4	\N	\N	\N	4	\N	\N
40	\N	\N	\N	4	\N	\N	\N	4	\N	\N
41	\N	\N	\N	4	\N	\N	\N	4	\N	\N
42	\N	\N	\N	4	\N	\N	\N	4	\N	\N
43	\N	\N	\N	1	\N	\N	\N	1	\N	\N
44	\N	\N	\N	1	\N	\N	\N	1	\N	\N
45	\N	\N	\N	1	\N	\N	\N	1	\N	\N
46	\N	\N	\N	1	\N	\N	\N	1	\N	\N
47	\N	\N	\N	1	\N	\N	\N	1	\N	\N
48	\N	\N	\N	1	\N	\N	\N	2	\N	\N
49	\N	\N	\N	1	\N	\N	\N	2	\N	\N
50	\N	\N	\N	1	\N	\N	\N	2	\N	\N
51	\N	\N	\N	1	\N	\N	\N	2	\N	\N
52	\N	\N	\N	1	\N	\N	\N	2	\N	\N
53	\N	\N	\N	1	\N	\N	\N	3	\N	\N
54	\N	\N	\N	1	\N	\N	\N	3	\N	\N
55	\N	\N	\N	1	\N	\N	\N	3	\N	\N
56	\N	\N	\N	1	\N	\N	\N	3	\N	\N
57	\N	\N	\N	1	\N	\N	\N	3	\N	\N
58	\N	\N	\N	1	\N	\N	\N	4	\N	\N
59	\N	\N	\N	1	\N	\N	\N	4	\N	\N
60	\N	\N	\N	1	\N	\N	\N	4	\N	\N
61	\N	\N	\N	1	\N	\N	\N	4	\N	\N
62	\N	\N	\N	1	\N	\N	\N	4	\N	\N
63	\N	\N	\N	6	\N	\N	\N	1	\N	\N
64	\N	\N	\N	6	\N	\N	\N	1	\N	\N
65	\N	\N	\N	6	\N	\N	\N	1	\N	\N
66	\N	\N	\N	6	\N	\N	\N	1	\N	\N
67	\N	\N	\N	6	\N	\N	\N	1	\N	\N
68	\N	\N	\N	6	\N	\N	\N	2	\N	\N
69	\N	\N	\N	6	\N	\N	\N	2	\N	\N
70	\N	\N	\N	6	\N	\N	\N	2	\N	\N
71	\N	\N	\N	6	\N	\N	\N	2	\N	\N
72	\N	\N	\N	6	\N	\N	\N	2	\N	\N
73	\N	\N	\N	6	\N	\N	\N	3	\N	\N
74	\N	\N	\N	6	\N	\N	\N	3	\N	\N
75	\N	\N	\N	6	\N	\N	\N	3	\N	\N
76	\N	\N	\N	6	\N	\N	\N	3	\N	\N
77	\N	\N	\N	6	\N	\N	\N	3	\N	\N
78	\N	\N	\N	6	\N	\N	\N	4	\N	\N
79	\N	\N	\N	6	\N	\N	\N	4	\N	\N
80	\N	\N	\N	6	\N	\N	\N	4	\N	\N
81	\N	\N	\N	6	\N	\N	\N	4	\N	\N
82	\N	\N	\N	6	\N	\N	\N	4	\N	\N
83	\N	\N	\N	5	\N	\N	\N	1	\N	\N
84	\N	\N	\N	5	\N	\N	\N	1	\N	\N
85	\N	\N	\N	5	\N	\N	\N	1	\N	\N
86	\N	\N	\N	5	\N	\N	\N	1	\N	\N
87	\N	\N	\N	5	\N	\N	\N	1	\N	\N
88	\N	\N	\N	5	\N	\N	\N	2	\N	\N
89	\N	\N	\N	5	\N	\N	\N	2	\N	\N
90	\N	\N	\N	5	\N	\N	\N	2	\N	\N
91	\N	\N	\N	5	\N	\N	\N	2	\N	\N
92	\N	\N	\N	5	\N	\N	\N	2	\N	\N
93	\N	\N	\N	5	\N	\N	\N	3	\N	\N
94	\N	\N	\N	5	\N	\N	\N	3	\N	\N
95	\N	\N	\N	5	\N	\N	\N	3	\N	\N
96	\N	\N	\N	5	\N	\N	\N	3	\N	\N
97	\N	\N	\N	5	\N	\N	\N	3	\N	\N
98	\N	\N	\N	5	\N	\N	\N	4	\N	\N
99	\N	\N	\N	5	\N	\N	\N	4	\N	\N
100	\N	\N	\N	5	\N	\N	\N	4	\N	\N
101	\N	\N	\N	5	\N	\N	\N	4	\N	\N
102	\N	\N	\N	5	\N	\N	\N	5	4	2026-10-29 16:20:20
159	\N	14	\N	3	\N	\N	\N	1	1	2026-10-29 15:37:40
160	\N	\N	\N	3	\N	\N	\N	2	\N	\N
161	\N	\N	\N	3	\N	\N	\N	3	\N	\N
162	\N	\N	\N	3	\N	\N	\N	4	\N	\N
163	\N	\N	\N	4	\N	\N	\N	1	\N	\N
164	\N	\N	\N	4	\N	\N	\N	3	\N	\N
165	\N	\N	\N	4	\N	\N	\N	4	\N	\N
166	\N	\N	\N	1	\N	\N	\N	1	\N	\N
167	\N	\N	\N	1	\N	\N	\N	2	\N	\N
168	\N	\N	\N	1	\N	\N	\N	3	\N	\N
169	\N	\N	\N	1	\N	\N	\N	4	\N	\N
170	\N	\N	\N	6	\N	\N	\N	1	\N	\N
171	\N	\N	\N	6	\N	\N	\N	2	\N	\N
172	\N	\N	\N	6	\N	\N	\N	3	\N	\N
174	\N	\N	\N	5	\N	\N	\N	1	\N	\N
175	\N	\N	\N	5	\N	\N	\N	2	\N	\N
176	\N	\N	\N	5	\N	\N	\N	3	\N	\N
177	\N	\N	\N	5	\N	\N	\N	4	\N	\N
178	\N	\N	\N	2	\N	\N	\N	1	\N	\N
179	\N	\N	\N	2	\N	\N	\N	2	\N	\N
180	\N	\N	\N	2	\N	\N	\N	3	\N	\N
181	\N	\N	\N	2	\N	\N	\N	4	\N	\N
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subjects (id, name, code, department_id, batch_id, faculty_user_id) FROM stdin;
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.submissions (id, question_id, student_id, selected_option, is_correct, time_taken_seconds, submitted_at) FROM stdin;
17	73	3	A	1	5	2026-10-26 14:47:46.316704
18	74	3	A	1	2	2026-10-29 14:20:24.575485
\.


--
-- Data for Name: user_department_snapshot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_department_snapshot (user_id, department, updated_at) FROM stdin;
1000381	-	2026-10-26 10:43:05.969847
1000387	Mechatronics Engineering	2026-10-29 10:24:04.940305
1000407	-	2026-10-29 10:24:04.940305
2	-	2026-10-29 12:21:29.978423
4	Mechatronics Engineering	2026-10-29 12:21:29.978423
19	Mechatronics Engineering	2026-10-29 12:21:29.978423
20	Mechatronics Engineering	2026-10-29 12:21:29.978423
1000386	Aeronautical Engineering	2026-10-29 10:24:04.940305
1000408	-	2026-10-29 10:24:04.940305
1	-	2026-10-29 12:21:29.978423
3	Mechatronics Engineering	2026-10-29 12:21:29.978423
5	Mechatronics Engineering	2026-10-29 12:21:29.978423
6	Mechatronics Engineering	2026-10-29 12:21:29.978423
7	Mechatronics Engineering	2026-10-29 12:21:29.978423
8	Mechatronics Engineering	2026-10-29 12:21:29.978423
9	Mechatronics Engineering	2026-10-29 12:21:29.978423
10	Mechatronics Engineering	2026-10-29 12:21:29.978423
11	Mechatronics Engineering	2026-10-29 12:21:29.978423
12	Mechatronics Engineering	2026-10-29 12:21:29.978423
13	Mechatronics Engineering	2026-10-29 12:21:29.978423
14	Mechatronics Engineering	2026-10-29 12:21:29.978423
15	Mechatronics Engineering	2026-10-29 12:21:29.978423
16	Mechatronics Engineering	2026-10-29 12:21:29.978423
17	Mechatronics Engineering	2026-10-29 12:21:29.978423
18	Mechatronics Engineering	2026-10-29 12:21:29.978423
1000241	-	2026-10-29 10:01:42.286047
1000388	Aeronautical Engineering	2026-10-29 10:24:04.940305
1000410	Mechatronics Engineering	2026-10-29 12:21:29.978423
21	Mechatronics Engineering	2026-10-29 12:21:29.978423
22	Mechatronics Engineering	2026-10-29 12:21:29.978423
23	Aeronautical Engineering	2026-10-29 12:21:29.978423
24	Aeronautical Engineering	2026-10-29 12:21:29.978423
25	Aeronautical Engineering	2026-10-29 12:21:29.978423
26	Aeronautical Engineering	2026-10-29 12:21:29.978423
27	Aeronautical Engineering	2026-10-29 12:21:29.978423
28	Aeronautical Engineering	2026-10-29 12:21:29.978423
29	Aeronautical Engineering	2026-10-29 12:21:29.978423
30	Aeronautical Engineering	2026-10-29 12:21:29.978423
31	Aeronautical Engineering	2026-10-29 12:21:29.978423
32	Aeronautical Engineering	2026-10-29 12:21:29.978423
33	Aeronautical Engineering	2026-10-29 12:21:29.978423
34	Aeronautical Engineering	2026-10-29 12:21:29.978423
35	Aeronautical Engineering	2026-10-29 12:21:29.978423
36	Aeronautical Engineering	2026-10-29 12:21:29.978423
37	Aeronautical Engineering	2026-10-29 12:21:29.978423
38	Aeronautical Engineering	2026-10-29 12:21:29.978423
39	Aeronautical Engineering	2026-10-29 12:21:29.978423
40	Aeronautical Engineering	2026-10-29 12:21:29.978423
41	Aeronautical Engineering	2026-10-29 12:21:29.978423
42	Aeronautical Engineering	2026-10-29 12:21:29.978423
188	-	2026-10-29 12:21:29.978423
43	Computer Science Engineering	2026-10-29 12:21:29.978423
44	Computer Science Engineering	2026-10-29 12:21:29.978423
45	Computer Science Engineering	2026-10-29 12:21:29.978423
46	Computer Science Engineering	2026-10-29 12:21:29.978423
47	Computer Science Engineering	2026-10-29 12:21:29.978423
48	Computer Science Engineering	2026-10-29 12:21:29.978423
49	Computer Science Engineering	2026-10-29 12:21:29.978423
50	Computer Science Engineering	2026-10-29 12:21:29.978423
51	Computer Science Engineering	2026-10-29 12:21:29.978423
52	Computer Science Engineering	2026-10-29 12:21:29.978423
53	Computer Science Engineering	2026-10-29 12:21:29.978423
54	Computer Science Engineering	2026-10-29 12:21:29.978423
55	Computer Science Engineering	2026-10-29 12:21:29.978423
56	Computer Science Engineering	2026-10-29 12:21:29.978423
57	Computer Science Engineering	2026-10-29 12:21:29.978423
58	Computer Science Engineering	2026-10-29 12:21:29.978423
59	Computer Science Engineering	2026-10-29 12:21:29.978423
60	Computer Science Engineering	2026-10-29 12:21:29.978423
61	Computer Science Engineering	2026-10-29 12:21:29.978423
62	Computer Science Engineering	2026-10-29 12:21:29.978423
63	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
64	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
65	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
66	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
67	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
68	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
69	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
70	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
71	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
72	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
73	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
74	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
75	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
76	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
77	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
78	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
79	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
80	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
81	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
82	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
83	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
84	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
85	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
86	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
87	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
88	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
89	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
90	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
91	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
92	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
93	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
94	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
95	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
96	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
97	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
98	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
99	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
100	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
101	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
102	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
103	-	2026-10-29 12:21:29.978423
104	-	2026-10-29 12:21:29.978423
105	Mechatronics Engineering	2026-10-29 12:21:29.978423
106	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
107	Aeronautical Engineering	2026-10-29 12:21:29.978423
108	Computer Science Engineering	2026-10-29 12:21:29.978423
109	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
110	Mechanical Engineering	2026-10-29 12:21:29.978423
111	Mechatronics Engineering	2026-10-29 12:21:29.978423
112	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
113	Aeronautical Engineering	2026-10-29 12:21:29.978423
114	Computer Science Engineering	2026-10-29 12:21:29.978423
115	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
116	Mechanical Engineering	2026-10-29 12:21:29.978423
117	Mechatronics Engineering	2026-10-29 12:21:29.978423
118	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
119	Aeronautical Engineering	2026-10-29 12:21:29.978423
120	Computer Science Engineering	2026-10-29 12:21:29.978423
121	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
122	Mechanical Engineering	2026-10-29 12:21:29.978423
123	Mechatronics Engineering	2026-10-29 12:21:29.978423
124	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
125	Aeronautical Engineering	2026-10-29 12:21:29.978423
126	Computer Science Engineering	2026-10-29 12:21:29.978423
127	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
128	Mechanical Engineering	2026-10-29 12:21:29.978423
129	Aeronautical Engineering	2026-10-29 12:21:29.978423
130	Aeronautical Engineering	2026-10-29 12:21:29.978423
131	Aeronautical Engineering	2026-10-29 12:21:29.978423
132	Aeronautical Engineering	2026-10-29 12:21:29.978423
133	Aeronautical Engineering	2026-10-29 12:21:29.978423
134	Computer Science Engineering	2026-10-29 12:21:29.978423
135	Computer Science Engineering	2026-10-29 12:21:29.978423
136	Computer Science Engineering	2026-10-29 12:21:29.978423
137	Computer Science Engineering	2026-10-29 12:21:29.978423
138	Computer Science Engineering	2026-10-29 12:21:29.978423
139	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
140	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
141	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
142	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
143	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
144	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
145	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
146	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
147	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
148	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
149	Mechanical Engineering	2026-10-29 12:21:29.978423
150	Mechanical Engineering	2026-10-29 12:21:29.978423
151	Mechanical Engineering	2026-10-29 12:21:29.978423
152	Mechanical Engineering	2026-10-29 12:21:29.978423
153	Mechanical Engineering	2026-10-29 12:21:29.978423
154	Mechatronics Engineering	2026-10-29 12:21:29.978423
155	Mechatronics Engineering	2026-10-29 12:21:29.978423
156	Mechatronics Engineering	2026-10-29 12:21:29.978423
157	Mechatronics Engineering	2026-10-29 12:21:29.978423
158	Mechatronics Engineering	2026-10-29 12:21:29.978423
159	Mechatronics Engineering	2026-10-29 12:21:29.978423
160	Mechatronics Engineering	2026-10-29 12:21:29.978423
161	Mechatronics Engineering	2026-10-29 12:21:29.978423
162	Mechatronics Engineering	2026-10-29 12:21:29.978423
163	Aeronautical Engineering	2026-10-29 12:21:29.978423
164	Aeronautical Engineering	2026-10-29 12:21:29.978423
165	Aeronautical Engineering	2026-10-29 12:21:29.978423
166	Computer Science Engineering	2026-10-29 12:21:29.978423
167	Computer Science Engineering	2026-10-29 12:21:29.978423
168	Computer Science Engineering	2026-10-29 12:21:29.978423
169	Computer Science Engineering	2026-10-29 12:21:29.978423
170	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
171	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
172	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
173	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
174	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
175	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
176	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
177	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
178	Mechanical Engineering	2026-10-29 12:21:29.978423
179	Mechanical Engineering	2026-10-29 12:21:29.978423
180	Mechanical Engineering	2026-10-29 12:21:29.978423
181	Mechanical Engineering	2026-10-29 12:21:29.978423
182	Mechatronics Engineering	2026-10-29 12:21:29.978423
183	Mechanical Engineering	2026-10-29 12:21:29.978423
184	Electrical and Electronics Engineering	2026-10-29 12:21:29.978423
185	Electrical and Communication Engineering	2026-10-29 12:21:29.978423
186	Computer Science Engineering	2026-10-29 12:21:29.978423
187	Aeronautical Engineering	2026-10-29 12:21:29.978423
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, username, password_hash, role, status, created_by_id, created_at, last_edited_by_id, last_edited_at, academic_year, previous_year) FROM stdin;
1	super	super1@inpand.com	super	scrypt:32768:8:1$fpjaRyk4fCAgL5bh$46957a98ae805119f5db851e6fb9ceac3b0333545c7b91f8e61f8f3c5220240a45f25cbaeca2b3de566cdc4da7d907c0d0dd3b622722c04275bd8d62c8eba649	super_admin	active	\N	2026-10-21 17:45:56.980579	\N	\N	\N	\N
2	Dean	dean1@inpand.com	dean	scrypt:32768:8:1$EHNntNMQLzph1wLs$7aabecd8cf86e58a4ca7016bbe1d86d170d2bad0ecbe4800065004c9378b966a11f6f90cc80e68d027be03169d4fb6566b5ff540c2eb682d338a1e5d64afb9cd	dean	active	1	2026-10-22 13:09:15.063131	\N	\N	\N	\N
3	stu21_mect	stu11_mect@inpand.com	stu11_mect	scrypt:32768:8:1$nCMdX10EZdKeiSU6$bbae9793003dd880b4ff58149f372c5ad4b2655a665dad4d999bc58d0080bdae6a451c95498b30e17dc4234a662058a03acd9a72816156fe827b6304a80c6ef3	student	active	\N	2026-10-22 13:14:34.154919	1	2026-10-29 17:32:24.340745	1	1
4	stu22_mect	stu12_mect@inpand.com	stu12_mect	scrypt:32768:8:1$dfMRHsieIESCiJnd$f1a138dffe9ba40dbec14562a4f144e5a49f688094709fb75841462c575d2318f91d96480ca7f0a14e48571f1f569d2be7adffc4b3bcbb716b9125127ad26d20	student	active	1	2026-10-22 14:13:42.81654	1	2026-10-29 17:32:16.133691	1	1
5	stu23_mect	stu13_mect@inpand.com	stu13_mect	scrypt:32768:8:1$h9M6KluM8zwnAbtW$f39fb604c14887bf7ded905560687aec7df6c56d739dd8aadcb80d73ed6905ea7b0007903c5a9ab5f0805a1bd8f23eff9f6831b7ed9752b1c8d3e28ce060128d	student	active	1	2026-10-22 14:14:33.050634	1	2026-10-29 17:32:08.507785	1	1
6	stu24_mect	stu14_mect@inpand.com	stu14_mect	scrypt:32768:8:1$auMGuwhASVHbvhNC$6d47c909ff685d543b0da368d1e4249e6b924479e20146c77574096a4d75eb7c2ecbc77f02f355ed63ca6c98c06190baebb12ab55160493e7aa24d7ea43b610d	student	active	1	2026-10-22 14:15:01.348357	1	2026-10-29 17:31:59.812342	1	1
7	stu25_mect	stu15_mect@inpand.com	stu15_mect	scrypt:32768:8:1$0RyUEFba0H8iqj8o$1f99141160675ea5d675fe76184716ffcda97a18a81efe43c4806fabcbe595e9f237cb9e982e22524a98448a21838fc73ab6e11640e3f12963f4824e7f354b48	student	active	1	2026-10-22 14:15:30.845993	1	2026-10-29 17:31:52.374881	1	1
8	stu21_mect	stu21_mect@inpand.com	stu21_mect	scrypt:32768:8:1$lXvSQ8r5g2GnX4Ey$2a6b808f17d5acac5c5474bf94cbbe1d38003208ce38f109e90f428368d428f1ccf0d88488c242f1d472f5a72e5ba544b8df104eca2e267a3a444bffb53be978	student	active	1	2026-10-22 14:16:04.607418	\N	\N	2	\N
9	stu22_mect	stu22_mect@inpand.com	stu22_mect	scrypt:32768:8:1$cRtUjtd62dKLa0F0$3a6b1bafc9ff3b33fc96755b76c2a9d0e070720df1ae4fcb3117700e74e45c99d0fb876100c4ee03639f515c2fad095a3ba36f0494959161537d6d0092119117	student	active	1	2026-10-22 14:16:39.982212	\N	\N	2	\N
10	stu23_mect	stu23_mect@inpand.com	stu23_mect	scrypt:32768:8:1$lWZqoM5LELvYidIi$f1db3a2e381bd2bdbe275825bc385a75336bf19fa39e703d82689750e98507af8e79bd58b37dbd072b11f9b1c409cf094301e4dccc2932ed36033ac02e46ac0c	student	active	1	2026-10-22 14:17:13.540974	\N	\N	2	\N
11	stu24_mect	stu24_mect@inpand.com	stu24_mect	scrypt:32768:8:1$fDJsQUsggfh4aCXs$b666ad084ad3699ca99adb5c799a5828d4a1b25d20b234fe963adc8d376b817c7a5750affa72b1aa9438267b4bbc66f5ca7aec537a57e3e562e62357352b4fc9	student	active	1	2026-10-22 14:17:41.703806	\N	\N	2	\N
12	stu25_mect	stu25_mect@inpand.com	stu25_mect	scrypt:32768:8:1$BHLHPKpVXAuCIj60$390ee80683c22c05b83b3f4c1d4b50eaccf82f1ffc31d296c6209b90d148031210b4a58d1eef35d24a0d6f31c328cb148497fed98033314ec9fddc0a46468188	student	active	1	2026-10-22 14:18:05.805323	\N	\N	2	\N
13	stu31_mect	stu31_mect@inpand.com	stu31_mect	scrypt:32768:8:1$Nou5pqjApwTVLqgb$32e7b139926165384e145a1011a4f891b29896c55df4f1b36c6adba6ca3be3f747eb3338bcee769f5d83ce3b14fca6dffc80ca5789e0588b45ae35e4b368cadd	student	active	1	2026-10-22 14:18:33.093442	\N	\N	3	\N
14	stu32_mect	stu32_mect@inpand.com	stu32_mect	scrypt:32768:8:1$MZlLZDes2xuP93Vg$462459e1603b2efae64eb1709800cc0c66ffee57768510ed7132da9478d2fa57578980d8564b550cae1d316896addc0710be982139745886d781566fae626959	student	active	1	2026-10-22 14:18:54.847566	\N	\N	3	\N
15	stu33_mect	stu33_mect@inpand.com	stu33_mect	scrypt:32768:8:1$CHCTotrlETZmgGso$fab289af8b37034fda8cd3c16406368038df066aee0caa55683e6fd40a254ef1da98e1a28409a4ce95fe0b4c7ab269145fa7622fe6b2ccb8e5b80cfba19e3755	student	active	1	2026-10-22 14:19:16.395039	\N	\N	3	\N
16	stu34_mect	stu34_mect@inpand.com	stu34_mect	scrypt:32768:8:1$FyMg41kxBlxaJGKa$874bc6eee7c9669014bc19abecae1dec3f0fb802886504a06b4fd79ee8b26ef48cf9badccc3e00e775b9c8b1ebb2397ec35334ffb0454f62e59ebdc03d314c24	student	active	1	2026-10-22 14:19:50.70422	\N	\N	3	\N
17	stu35_mect	stu35_mect@inpand.com	stu35_mect	scrypt:32768:8:1$zzziTpaL6hloLZm9$c657cd4d60afa1616dd03692ecfcc57a4e2cb4877eda04843097a4f87fb5b3a5917ee18f830f8ca88556f6ee384aa496543e073506bbaf144d56eb46cafd9b69	student	active	1	2026-10-22 14:20:08.722541	\N	\N	3	\N
18	stu41_mect	stu41_mect@inpand.com	stu41_mect	scrypt:32768:8:1$jIpeZuREWJfydZZf$82c9ad98575537ca2914dce8d238343d1036238a03cd9d825e8065c4d3cdfad9d9f3978884e220f4da21b99ecbfb962660c4f527f91739e6fc9333d8bec2e362	student	active	1	2026-10-22 14:20:40.889335	\N	\N	4	\N
19	stu42_mect	stu42_mect@inpand.com	stu42_mect	scrypt:32768:8:1$lj3C966DB7JG431f$d3de78a752acb084ef9b725859c829d292cef80b7f73c294bd066c78323672487255ece80771d9c14bce5df0e24ea4ff7f82acb45ff5eac5573b402c02e5f368	student	active	1	2026-10-22 14:21:02.603675	\N	\N	4	\N
20	stu43_mect	stu43_mect@inpand.com	stu43_mect	scrypt:32768:8:1$sebHNUo7rRLC79eN$cedeac9bc663f50624c00fb3e0488704488c37c2df35eb8c5ae9d02b1fcc22911615ba27d8089ee12a449728c4b6f1372cf926f02d39fc8310470ea19334d192	student	active	1	2026-10-22 14:21:30.326487	\N	\N	4	\N
21	stu44_mect	stu44_mect@inpand.com	stu44_mect	scrypt:32768:8:1$c63BcnspjYGgNB97$9344958a39cf7fb8f336748d944cb247a8ca234146ea89ea0941e960c2cd1df3a9e25fa69fa4a89d68d62a8d3a968b8863f38cc4a9aa8a89c990d2814a244cfd	student	active	1	2026-10-22 14:21:51.815493	\N	\N	4	\N
22	stu45_mect	stu45_mect@inpand.com	stu45_mect	scrypt:32768:8:1$nE3VOji52UoOuyOQ$88e682b05a2a6d7000f996a2a3d0bf08060b155fc7c7076cbfaab726c613c8dcb93239744b8e8f390bd0009062881aa986e0fff7ade88e5ee3387590c0d0c4da	student	active	1	2026-10-22 14:22:10.091407	\N	\N	4	\N
23	stu21_aero	stu11_aero@inpand.com	stu11_aero	scrypt:32768:8:1$c7n19Q0BLJalcGkX$6bd4e1a4b2c98fe39b32e086c16f2000af1098bc2d0eaadb6b1d4c0b68662f2127a41f2f3cd2aff4242c33c100bec8b06a7e107eeb416e3a042a8086f75eebb1	student	active	1	2026-10-22 14:23:06.946914	\N	\N	2	1
24	stu12_aero	stu12_aero@inpand.com	stu12_aero	scrypt:32768:8:1$AeX6AvHkruAIJgkN$3b562d88c67eaa23a1b7fba021204fe5c9e88690e253cf31a07e3a2be2bcc8723b1320705cca4ab0c007db6953f9a980573828aa766028b16ae1a682aee2d9f8	student	active	1	2026-10-22 14:23:37.97726	\N	\N	1	\N
25	stu13_aero	stu13_aero@inpand.com	stu13_aero	scrypt:32768:8:1$T35BVjJlIvK8KLDd$a99be7e2cad022ad38b4f8afb2f7edfab7aa530cec7a6cae0f7275d14b3999f67f17b98529ea1b98edf17179a39932acf6783baa36edbbbdeb690ef949505099	student	active	1	2026-10-22 14:23:53.840846	\N	\N	1	\N
26	stu14_aero	stu14_aero@inpand.com	stu14_aero	scrypt:32768:8:1$mB8fUT4jl9BVZx2h$6f827213362474d50d3a2481caafd71ac8105b05db89031efbe25bb35237f306343d8ac9c3ece5b475c02ab872fe87608f79980323f0698d241ccdc0a9849a04	student	active	1	2026-10-22 14:24:18.26169	\N	\N	1	\N
27	stu25_aero	stu15_aero@inpand.com	stu15_aero	scrypt:32768:8:1$c6xfMx79Gmh3EqlX$5d6ff4d786130f9235dbf0e1c166c7548adf2835cf90965d4a975286b9678617274bf28629fe0c9ca19f08bf38d7eb51d680a0a832d0c22e77c371e317715a86	student	active	1	2026-10-22 14:24:41.084447	\N	\N	2	1
28	stu21_aero	stu21_aero@inpand.com	stu21_aero	scrypt:32768:8:1$6wrdRB7AYRD2GH6j$1606bb51faa187c6b2123802d1d4f6af0c484a3fa7b50a339892e41360ac14a579ec9eebb478d27a40e869fafe71b378e009cd21ef110ee755626f4397eff4e3	student	active	1	2026-10-22 14:25:12.155059	\N	\N	2	\N
29	stu22_aero	stu22_aero@inpand.com	stu22_aero	scrypt:32768:8:1$bNV5foqVPvSapcas$baabf936085dfb26894d085f3c48345c43002ddd28de25caf668dcd5ecd5431c937a20d93391c2be5d90e40e84956afc61704e320a50999b855c38ceaada9641	student	active	1	2026-10-22 14:25:35.018504	\N	\N	2	\N
30	stu23_aero	stu23_aero@inpand.com	stu23_aero	scrypt:32768:8:1$Ax0PgKTffzKfDJzU$95d3d8d6558271f19653fd7066e5586e4e16ca4595cb7762d3c561e6bdba5670ae82121adc077976c8fbf9478d0e1fc0d249955d216100f45996d0d5c44352be	student	active	1	2026-10-22 14:25:52.924895	\N	\N	2	\N
31	stu24_aero	stu24_aero@inpand.com	stu24_aero	scrypt:32768:8:1$fK6nZy7h4eKgNDxc$895c374b38f8ebe232da0b782bd9e5f67509c1c1529231bebe9afab8a0132529771e7b1d1cfe7e2317476e3fc7a8c44234daeecfbb986f2a8c950e0be27e8fa5	student	active	1	2026-10-22 14:26:15.76278	\N	\N	2	\N
32	stu25_aero	stu25_aero@inpand.com	stu25_aero	scrypt:32768:8:1$sYqyeU91O6HSptR2$a071da57e7da2af9d84226a7a2876d50f80e1f9443b6d04b49f9ad97174f0cc072ee8abbdf616359724bb454861ccb79b1512171c3affa2311b90457daad1884	student	active	1	2026-10-22 14:26:38.196773	\N	\N	2	\N
33	stu31_aero	stu31_aero@inpand.com	stu31_aero	scrypt:32768:8:1$kSdJaVqnwNTm32Mm$5b88dade3130a68757ef3774b6403640cb0f68c3457269bc4f536d5d10bb8b5ece6bb3a9f0d07b0a8d29ea5d277b1196f40fea380b904c408798d0db983e809d	student	active	1	2026-10-22 14:27:10.488627	\N	\N	3	\N
34	stu32_aero	stu32_aero@inpand.com	stu32_aero	scrypt:32768:8:1$Wc8FpFixKr9axnkk$1482cb159790d3b18bd638eefb88645a583110250180718d32c22fd4e8df3f339564b1b938f64aeaa5f98044370636d768b24e1bd803396a8b8779a0a83d53b5	student	active	1	2026-10-22 14:27:31.700564	\N	\N	3	\N
35	stu33_aero	stu33_aero@inpand.com	stu33_aero	scrypt:32768:8:1$V1EciSYmp690TO6s$9a9c9e27f1e7cdfd1052271613996a72944e23bb809df2b19bdd6774f824f98ea6fa391365a9aa72b1656b32888e911322721bb90f6ba3b641cc707a549c533b	student	active	1	2026-10-22 14:27:53.799301	\N	\N	3	\N
36	stu34_aero	stu34_aero@inpand.com	stu34_aero	scrypt:32768:8:1$c6cmYUQqlQPNHAVr$e699fa8d7f401a6c9a6b884f43df7355b81e9da0565d559562a69f3ab6b81e440adb5fef4f7d5f4f9c94a638a083c709a38c54ad20db78d953cd24515c4722af	student	active	1	2026-10-22 14:28:10.518882	\N	\N	3	\N
37	stu35_aero	stu35_aero@inpand.com	stu35_aero	scrypt:32768:8:1$lI86b4WGpip0rR1g$05b10ee0a4190881dca9cd5a7c9cb18dd5600cd580ab9b47dc78f56184bb6cf52c613021cdfa7936195cf87c1549e994126b8a2fb49a91f97b85f331bc2fc381	student	active	1	2026-10-22 14:28:36.637076	\N	\N	3	\N
38	stu41_aero	stu41_aero@inpand.com	stu41_aero	scrypt:32768:8:1$z1GiS8BtfQgpvOjd$15924fcdef03d7acd6dbe37fa07309fe180bdab1e7751b3a42184a800341cc631b02ed1bbc1bb3bd8069d9f5091d2fe37ead666d6401095f25772b28db092a64	student	active	1	2026-10-22 14:29:05.672896	\N	\N	4	\N
39	stu42_aero	stu42_aero@inpand.com	stu42_aero	scrypt:32768:8:1$K2OW9tlgWGmniVbx$41dc5874b616d5071453e7559a596ccd2b9eaed33ed25819d7657e3cfec3a2b4b778cc470962fc6e393b26a1c42b60e952daac4ad4c04f4c9e5201f3e909a421	student	active	1	2026-10-22 14:29:28.152065	\N	\N	4	\N
40	stu43_aero	stu43_aero@inpand.com	stu43_aero	scrypt:32768:8:1$W93GYfh6xncYokj2$0769b293a56f0eb30d7a2f241846b4398fd8dbd4ab8e3cfd5c52ba680481eb19cd0fad462653eb816b3287159a0a6d26ab39e93b338a7ccedfcf02c6dd3d7193	student	active	1	2026-10-22 14:29:47.040153	\N	\N	4	\N
41	stu44_aero	stu44_aero@inpand.com	stu44_aero	scrypt:32768:8:1$NX172knqOYJRLsAa$5325f4873b073f4c545c50f2e95956339c0e8bd6a05a07492a2f066c6796f3d3ca8406336a0269f61c11dfa3843365755b4a4b3e009426391d5c70ad6f9ffde2	student	active	1	2026-10-22 14:30:16.950381	\N	\N	4	\N
42	stu45_aero	stu45_aero@inpand.com	stu45_aero	scrypt:32768:8:1$vP4Fh9Tv0Txmu6IC$5c11814da15e5386dc6cb0efe425826de094e3bc2f4d6a2af4cef88471246f5c8d7f578eb45d9343a64eca431ba0db6ebafafbddd60b331fca42713ed1f155dd	student	active	1	2026-10-22 14:30:41.1387	\N	\N	4	\N
43	stu11_cse	stu11_cse@inpand.com	stu11_cse	scrypt:32768:8:1$xBI4nD3KKgvTmOQM$4163c0c0a8fb9a8187fde763d3f54da7660b73e39a2168ecd38c0c00a5d493379291bc53c082e47d1c01694c1bd6ad6a02b8ac6e734266dcfdbcc4506e1c77cc	student	active	1	2026-10-22 14:31:20.024321	\N	\N	1	\N
44	stu12_cse	stu12_cse@inpand.com	stu12_cse	scrypt:32768:8:1$pan5ghZKVGwuDnz8$0d063a0b4d8716c52159268a2200a2d454de708c67f8138a8fcc5f7da1cee592dd73badbe6ef9e6836467e5c17a1ff262d7d8be8b8d3eccdd4543b79f306227a	student	active	1	2026-10-22 14:31:47.147271	\N	\N	1	\N
45	stu13_cse	stu13_cse@inpand.com	stu13_cse	scrypt:32768:8:1$8ChFZN6Daugjm5uD$12cc8e617816289d8aa15e8d7d62e0df017b7452c73bd3eef18c856a58b02288f86aa6ea1080b403aeacbfe60aa36b6c5ef8b8fd1a10901cded6847fa0241259	student	active	1	2026-10-22 14:32:13.013428	\N	\N	1	\N
46	stu14_cse	stu14_cse@inpand.com	stu14_cse	scrypt:32768:8:1$jMzG968w9RKjJ2Jj$22df14e875f7f4bbea0e3e5ef09183b9898b8e6940663ec434e9c4c6fa746249cff6edfa07b26510975b44782ae3b2c732af6949a5e4f51d5ac4a9b95ddc0966	student	active	1	2026-10-22 14:32:34.436999	\N	\N	1	\N
47	stu15_cse	stu15_cse@inpand.com	stu15_cse	scrypt:32768:8:1$TOZ52ta5oCi2KDSh$fb4fc4de5239f7eac64c02f9dda733c4a5a15ff2d3cd7606c48e50b58a9534efbad6c67da7fa22a7926a640a3ef45588631c6a51e632140b834db0aed8cafccb	student	active	1	2026-10-22 14:32:55.744985	\N	\N	1	\N
48	stu21_cse	stu21_cse@inpand.com	stu21_cse	scrypt:32768:8:1$pPrWsUklrztUtdm1$ee5a771308a76876be7c8253448d8d70a4986b6fc767e85cf10fc1709ee8eb2a3ccfa98ac1004ac38f6cbd53d0465b805de7422fafdb3877f7442b76cc115c66	student	active	1	2026-10-22 14:33:33.380519	\N	\N	2	\N
49	stu22_cse	stu22_cse@inpand.com	stu22_cse	scrypt:32768:8:1$ihjTHXeLwUs2hfjM$7580e9490aed6e9bdf68fe2a7ae341e89ecd7ab2ee711aeeb8f595af2d6521f898ab7f1de772781a1908b34725bdb221708d69f108b2267165cf455857639876	student	active	1	2026-10-22 14:34:10.232993	\N	\N	2	\N
50	stu23_cse	stu23_cse@inpand.com	stu23_cse	scrypt:32768:8:1$KKWSUWq0edNcTqH5$54289be35731c6865b90a601cf13e50f3fd4a5f64cd5dc5161df8389d2dc99e720a1795de7092d4feaf2aa4b12aae1f4e4a7fbdea1a68a47d1c07b415d073a95	student	active	1	2026-10-22 14:34:31.03971	\N	\N	2	\N
51	stu24_cse	stu24_cse@inpand.com	stu24_cse	scrypt:32768:8:1$osrqhrVVl3om34pT$7d1dabc2c428641f08212cd5695525bc0be9b373632a93650ca043e2b99c7f8f9d425dd430fd3710818e4419d332a1510b6965bff16a7093cff9c8c0c7679774	student	active	1	2026-10-22 14:34:47.432512	\N	\N	2	\N
52	stu25_cse	stu25_cse@inpand.com	stu25_cse	scrypt:32768:8:1$EvtglABl0TplrFLz$e8fbbb8e3a6d0e5f2cfb05ce6b7beee9b1dc3df2cdc8cee4e067912053168c246106028df84866e0e787c27c2c2604171298198d9a16dee3a4b086e9b05ed8a2	student	active	1	2026-10-22 14:35:16.395113	\N	\N	2	\N
53	stu31_cse	stu31_cse@inpand.com	stu31_cse	scrypt:32768:8:1$7hPTpdPuYgDCAtlL$0d562bf247818af5d8c4eb98ba46a5bfa414de886b94d7955a1d6990fcaa16ab8b6cb699ec8702f49c7d378cbce1d9520fb3982123002e4f8699b8ffe386ccaa	student	active	1	2026-10-22 14:35:44.832759	\N	\N	3	\N
54	stu32_cse	stu32_cse@inpand.com	stu32_cse	scrypt:32768:8:1$yt9io55CpNjBnfxh$8a73a3621976537d0a8a251a5f427d3bb66ff30b232634d40c223c1a4102a06ebf4ae44dc1dde93f90349fb82081c436e9909bdc9a055e05a5d62ee7efd40d5d	student	active	1	2026-10-22 14:36:05.567849	\N	\N	3	\N
55	stu33_cse	stu33_cse@inpand.com	stu33_cse	scrypt:32768:8:1$DIPQMerZFG7MeoX6$9a7b46c9133a5f42ae7eaea0f6e5109094c1b452221a112ded6d2bbd48ac8df3380f1f7af641b6f5756de7a806df7c4ce90a1b13ba7e828dda0214bc04628f2c	student	active	1	2026-10-22 14:36:43.041335	\N	\N	3	\N
56	stu34_cse	stu34_cse@inpand.com	stu34_cse	scrypt:32768:8:1$qM17H9xOfs6dNgKe$a4df4ad55ac6a2a262fa947de3277d586f1adb1700843329e7e3fe0494788879a3394b420ef3f4fa9b3465b6eddaf8cac34783e2b76972452a5f1cf3056e9b47	student	active	1	2026-10-22 14:37:10.95186	\N	\N	3	\N
57	stu35_cse	stu35_cse@inpand.com	stu35_cse	scrypt:32768:8:1$wxnPjGJ9XkSRBwzE$c559bc37362a84af0390ff70f70a18606778919569c0f2af75d9db6414ba593c628a4eb4e2759e5a034a2c13695fe458987e5d03156dc31eb8a999d46852adeb	student	active	1	2026-10-22 14:37:29.364432	\N	\N	3	\N
58	stu41_cse	stu41_cse@inpand.com	stu41_cse	scrypt:32768:8:1$c8LNMvsru5l2Bz8m$4c50c4abe088b52aabf3b67a36776bf2515e293a577d7c58bd09a6f4c9f88acbe015acf44b754ee6f4be4cc478fcb96d0ad3375dfc352ced1f9f05809a94999b	student	active	1	2026-10-22 14:38:01.16508	\N	\N	4	\N
59	stu42_cse	stu42_cse@inpand.com	stu42_cse	scrypt:32768:8:1$lYExrv0CCTJ1gOvo$39a2d69e6dc9c29765b98985f2384e17c4b89cdfd690538d2dbe6690e350a8eb6397231366d96caee5b8fb188e9696e625ddb29db97c61f367e41161505d80c1	student	active	1	2026-10-22 14:38:21.57361	\N	\N	4	\N
60	stu43_cse	stu43_cse@inpand.com	stu43_cse	scrypt:32768:8:1$T8ZKSgaixo2Zgveg$108cb62faaf034841c9dc2f319b975e88bcb61d2227f836fa0c451f068fb43d9b99bd4ee964204cbee73a76d6f4848e3442ebdff61be5994f4588ef1bad674fb	student	active	1	2026-10-22 14:38:39.482985	\N	\N	4	\N
61	stu44_cse	stu44_cse@inpand.com	stu44_cse	scrypt:32768:8:1$CnlPxMxZncMhltvV$58d4b19c2ec83af62071298030306912bb9bd2be4a60011fb5c5bf40c8c4e2d42126502dd5605ab0cfbe170ad6a0765ae6b528bda285a08715d7bee5756dec98	student	active	1	2026-10-22 14:39:00.713936	\N	\N	4	\N
62	stu45_cse	stu45_cse@inpand.com	stu45_cse	scrypt:32768:8:1$40fZz6p9U4TtIAcE$357944e021ea651e2d9cdf69659dd0029eb587401427293a310e842fa6b3ab1c7e325433f871faf56504bc9d2919dff8de34822b392bb23827f60da5b46fe913	student	active	1	2026-10-22 14:39:25.709949	\N	\N	4	\N
63	stu11_ece	stu11_ece@inpand.com	stu11_ece	scrypt:32768:8:1$NoubV31mQyhsoCeD$d6b973a9092f45bd79a3b80799588d8cb6ef8309317f2f337b7b6491d8be83e3664b9c15a35dc3d323dfc83dca4f6774f42661ab92f41f14e70b335bc8c065d8	student	active	1	2026-10-22 14:39:59.051396	\N	\N	1	\N
64	stu12_ece	stu12_ece@inpand.com	stu12_ece	scrypt:32768:8:1$8Za19e9E9FiaXmSo$347d96a3eec9153611b446ff87a96cad0f89ea0799698881ce0e1eb9e179893f53d4ac8421ab0627de1dab8712ddf3058fa916c529b43e94ff06dd5271c48ded	student	active	1	2026-10-22 14:41:04.505661	\N	\N	1	\N
65	stu13_ece	stu13_ece@inpand.com	stu13_ece	scrypt:32768:8:1$LYY7tvKrzlyodptj$2316cfcb35eb52de433bdceb4c92136a1a4580db827d39f3d630779b965bdf188882d99348d7cba58beadb0410c642317d5faf7d1e9f5a03e210115d8b7174ee	student	active	1	2026-10-22 14:43:33.129894	\N	\N	1	\N
66	stu14_ece	stu14_ece@inpand.com	stu14_ece	scrypt:32768:8:1$3A1h9M0fUqmL3ZUw$9e1f89529911c458d317cc6fdc095a367ce62cc0b11180c8819567c04ee13d4a7ccbdb9796bb2944a9be67734a781eaa63e341f74f90ef453f08d98961fa0286	student	active	1	2026-10-22 14:43:53.825511	\N	\N	1	\N
67	stu15_ece	stu15_ece@inpand.com	stu15_ece	scrypt:32768:8:1$Suo9rUVBocv5zcxw$0f16efdb9e9556064b868be9c37e5c15a3bade7510fe5455b953010fc342bfa5211d8ff8fda220b35f25bc3fd9dd86371475c46c8c67cfa4345a6613f9664959	student	active	1	2026-10-22 14:44:16.962053	\N	\N	1	\N
68	stu21_ece	stu21_ece@inpand.com	stu21_ece	scrypt:32768:8:1$9bi3KrUXfsYfvLLv$a7fd730c62883611354e07dc4e437ae22a5bab9d4de6457a2a2e0e9ac1120cd3e3bdd04d62384ae8661b00f2ce675abcf0e2986aef658425ad3933576412b24c	student	active	1	2026-10-22 14:44:50.253853	\N	\N	2	\N
69	stu22_ece	stu22_ece@inpand.com	stu22_ece	scrypt:32768:8:1$Xpw0S7fPj1JR0MGE$0b3294033e33656b881a86ad853260913d39c2f4b7a23f99c1943ff1b43a595725ae34a86be979d3771778e9f5fe7a236dee6ae38449a1310f64ae89049adf87	student	active	1	2026-10-22 14:45:12.455921	\N	\N	2	\N
70	stu23_ece	stu23_ece@inpand.com	stu23_ece	scrypt:32768:8:1$4TwBqGzD5LJgV6ZT$a3d0d58f413aaf24bc8f79f49787e91b1d586fe5db2bbc107a584904814b662ac0bbcb93082a06efff694f6a0db82e07c3ec8306e110c7da4accf60bfad632d3	student	active	1	2026-10-22 14:46:09.164936	\N	\N	2	\N
71	stu24_ece	stu24_ece@inpand.com	stu24_ece	scrypt:32768:8:1$JJiyEKtxV57U9nKZ$41b5082075bd1723dc1a21eca833498c9e8a13ae0aa3734123bd22a7c0d264aad20af0f88242597fbdebadfc996a892964c8811340a8bb8b7e9c896a7d889f57	student	active	1	2026-10-22 14:46:25.755595	\N	\N	2	\N
72	stu25_ece	stu25_ece@inpand.com	stu25_ece	scrypt:32768:8:1$dH6UhQZhdVfcyJ10$360a9d616bb46957eadcaa576f769a722a381584b862a1c724bd09fae7589f428ec7b3c5a3e6be9a4c369f5e38f62b35087d2bae017f4c0d4dce31d7cc9a0d98	student	active	1	2026-10-22 14:46:46.471326	\N	\N	2	\N
73	stu31_ece	stu31_ece@inpand.com	stu31_ece	scrypt:32768:8:1$J1GGsplaLFy7NyGp$c90686c3b412633677cb680f0a8f617cfdbb596ed23a3ded6b1978752c4144337d107ca7784059dd1471bbb0748735768656a5c69bdb72c5794e60848397cb64	student	active	1	2026-10-22 14:47:15.362744	\N	\N	3	\N
74	stu32_ece	stu32_ece@inpand.com	stu32_ece	scrypt:32768:8:1$rJYHeNs6Az832elF$72a3e9e88a5fc980b5804bde23dd5b08937f1dd8d137b40cfad1908df9552086b8f714a85f66d2f4697971f3d5670bd2fd7229158c4c1f5fff906f60c316b42f	student	active	1	2026-10-22 14:49:48.318747	\N	\N	3	\N
75	stu33_ece	stu33_ece@inpand.com	stu33_ece	scrypt:32768:8:1$mGHi9O027mNyLdaa$bae57dcee488849fb23fb3dae99e997674a12e7c784b1b13c081ac299e455592bc682de67a0303536bb4773ad74226277f2a9cd6dae28d552c12333aa153af56	student	active	1	2026-10-22 14:50:11.095635	\N	\N	3	\N
76	stu34_ece	stu34_ece@inpand.com	stu34_ece	scrypt:32768:8:1$M3SmJovhFTFEuBlf$5f0aa6bc7e3846de3a8b46f3ce0905ae53a00145d8c95df87e056e978055a9dac83a1fb1a8215a22083a7bb32abc069c99f8221345e45713ba799ae92bdd0eaf	student	active	1	2026-10-22 14:50:32.049737	\N	\N	3	\N
77	stu35_ece	stu35_ece@inpand.com	stu35_ece	scrypt:32768:8:1$4ycXnGqhPAOMxfRB$d4f59e6ef54bd064491f9c0b16e2f5a2aa4c7dc079b0ef0dd73a0c0b40240bb7229c3aacd5716269bcfd75f273cd750db20143626cfac3fbf0ae34244f595172	student	active	1	2026-10-22 14:50:48.739537	\N	\N	3	\N
78	stu41_ece	stu41_ece@inpand.com	stu41_ece	scrypt:32768:8:1$ekLcuxGOUDYmQoCl$17023fa1a48477e7b0309eca5cb9f03b891dd5665860c20c6bf1584c15d5fa7322d17482f45569710b43f55ecfdfb434873daf3dc273784d824bfaba78d66842	student	active	1	2026-10-22 14:51:11.39835	\N	\N	4	\N
79	stu42_ece	stu42_ece@inpand.com	stu42_ece	scrypt:32768:8:1$Wf84B0lPzNjfjaVz$fdc6139fd20859a8c0e10abcfeb9f60894d6aa41df00fb647e406f645c005d5d15a898d085fec8112b3505527b2310874bb40dd47f863d0a227e15cf733a01e3	student	active	1	2026-10-22 14:51:45.760063	\N	\N	4	\N
80	stu43_ece	stu43_ece@inpand.com	stu43_ece	scrypt:32768:8:1$qggErbsUuwrHCdYX$adea14707c850144f06956647ec9974a07de5b8f95f4d8feed144b3a873822fb129a600562f15751a6f5537b1aedde2793dc6fa44cbf2483e557919c2c44badd	student	active	1	2026-10-22 14:52:04.602966	\N	\N	4	\N
81	stu44_ece	stu44_ece@inpand.com	stu44_ece	scrypt:32768:8:1$NHz6fCxv3GddB58b$5e9465995c49f65f200acf7b997deaa1b48f6eb9a9dfae2905d028a23f7e599212edc3e9cc39982f3172f3c8db41b60d71fe4398e08d24eea7a3617e549f58eb	student	active	1	2026-10-22 14:52:21.176127	\N	\N	4	\N
82	stu45_ece	stu45_ece@inpand.com	stu45_ece	scrypt:32768:8:1$4Dxqd5kzPkUtE22G$7dbbf86b52b0825c6f6bafb38ebd0fd37c47515fa9752a4e8379fe274562e6b9c0586bbf63aee91143cc9350691b73a0c5a86783407e791ae7d394e1996fc41b	student	active	1	2026-10-22 14:52:39.301658	\N	\N	4	\N
83	stu11_eee	stu11_eee@inpand.com	stu11_eee	scrypt:32768:8:1$OPUp8ztAGLBNbR6e$2660913e624edbb9ee34fd7aa65a11ff73eda7c25d4bacee12cd898b76df5040833948758ba477ea59e6257b51fca1ce804599cb9195db267da5103edc186380	student	active	1	2026-10-22 14:53:26.662693	\N	\N	1	\N
84	stu12_eee	stu12_eee@inpand.com	stu12_eee	scrypt:32768:8:1$G6MjJfif3G9Qlctg$39689db4bab559dbc219d4a0779ef0205691f5f8617c0e9cae7e72e970a941f84f7e8d6f72b8e64591b67e2d8326125cdc57e1301b61c552a44691a939f18b7c	student	active	1	2026-10-22 14:53:48.621361	\N	\N	1	\N
85	stu13_eee	stu13_eee@inpand.com	stu13_eee	scrypt:32768:8:1$Ps3Sui88O6pfimOU$dcd934038d37ba3c54d4badf6b9821b3d22a9e2b740d5897101c35033f39e6dd4c5c4d6c0af18a2a5f3e0606907f2a411531af60903e1e7406340022f0e23098	student	active	1	2026-10-22 14:54:07.655001	\N	\N	1	\N
86	stu14_eee	stu14_eee@inpand.com	stu14_eee	scrypt:32768:8:1$TgkQcMcZDY28OZ1y$99293e672e1bec13001bb7eea739c99ef01472e5bd9d6d26e964fac31c13d1408d0579d14148bd95458775c0d625d823dd66f9b3bd7ae4a27a1168010c2daccd	student	active	1	2026-10-22 14:54:40.073005	\N	\N	1	\N
87	stu15_eee	stu15_eee@inpand.com	stu15_eee	scrypt:32768:8:1$1JT2FBDCOoY5Jnnk$f0e2637e2d3db0d1b94ac5bf34419c6c0dd213809bb3ed427945906377e8e6bff3818434bf58a012975e242b5912342749edeb1f52aae7118bd36d4502453635	student	active	1	2026-10-22 14:55:03.866015	\N	\N	1	\N
88	stu21_eee	stu21_eee@inpand.com	stu21_eee	scrypt:32768:8:1$N40DfWpt5xAL99ET$4aee999d29d725455bd53347b5dc85c1aa5bcdc2d8307ee25cc32531e3e1b4316813b45b262091a0f397fed437e460ba414de87b296e6afc48a6b5212f4ef62f	student	active	1	2026-10-22 14:55:27.483202	\N	\N	2	\N
89	stu22_eee	stu22_eee@inpand.com	stu22_eee	scrypt:32768:8:1$Ju61ZXNcnk0ssReu$e03f2c550645b7535286b6137760339a308f3f9a89b26ce563e19e8551e9cfebc79fa5a870d371900b76156c713d30a9ef2171abe7d29569be24e069c8a42b36	student	active	1	2026-10-22 14:56:05.217666	\N	\N	2	\N
90	stu23_eee	stu23_eee@inpand.com	stu23_eee	scrypt:32768:8:1$HskER5Kzj02tgJ0C$5090347bb079ee0e42a06e3423781b6fe8d5b3c1ebee25631bb4ca338771eec0803fdb2583f6c2388b1cd485d9b21ef770e08ca757b8d37290d7435f9169a0b2	student	active	1	2026-10-22 14:56:23.5779	\N	\N	2	\N
91	stu24_eee	stu24_eee@inpand.com	stu24_eee	scrypt:32768:8:1$TDmRHOUFf56Ak1kw$44b984f427b511b13d5073af309540fcf7152e7908e91883e0019186d139484861b2c5e2909cde1e0af148a35d2fd35976aade45a4bc9985bb524296b64c46ec	student	active	1	2026-10-22 14:56:41.408906	\N	\N	2	\N
92	stu25_eee	stu25_eee@inpand.com	stu25_eee	scrypt:32768:8:1$p9T6BsYhdNym1CrF$afc4b1d87499ddce38c348a5d5db9f992db1ac8208ce3623b4a507a8aacc9e8be0460ad7b2d505a90a6c929d61ade690ca6a51b7705fa1e2dc517d0bfb853ee1	student	active	1	2026-10-22 14:56:59.08755	\N	\N	2	\N
93	stu31_eee	stu31_eee@inpand.com	stu31_eee	scrypt:32768:8:1$KqGbPjTqtPjXfhM9$64ae0f9671f14eb09424dfff1f3f712116a0c10b115100fc342cfe4d4752ff863f06f327ad3d912b046a81e66cd450e545eb2fcef164545ac0c5de2ca2a3a257	student	active	1	2026-10-22 14:57:24.888321	\N	\N	3	\N
94	stu32_eee	stu32_eee@inpand.com	stu32_eee	scrypt:32768:8:1$z8SLBqSzP9THtFVc$28184f0ec29baafde3ecb2f9e1c2ec32998b07baf0250d5a8e3d407f4a077a2d755cbe0afa91ecdc33c52e9980a21ff1d2012ffa983b34eb296b950f8be614bf	student	active	1	2026-10-22 14:57:45.499161	\N	\N	3	\N
95	stu33_eee	stu33_eee@inpand.com	stu33_eee	scrypt:32768:8:1$hFUu8dbCtjwPUFw5$ec4c5b73b8653c2cc334ab8c4e67445f9a3819b30be346e8b86481aef2726f165b1fc2b45a12a70200af8e6d8930af4c1c60946b56ecce16d14793c3550c65ed	student	active	1	2026-10-22 14:58:09.362363	\N	\N	3	\N
96	stu34_eee	stu34_eee@inpand.com	stu34_eee	scrypt:32768:8:1$tyiNEscPiPhjMsqs$b0301f3dc17147efc71b198d3344fe38312c90e5faf711f9863adb151734a8d4c4109caad4211163b0aa08c424b39e077aab056b9e8124270b7657aef2ffe6c3	student	active	1	2026-10-22 14:58:27.477832	\N	\N	3	\N
97	stu35_eee	stu35_eee@inpand.com	stu35_eee	scrypt:32768:8:1$3lQEJGJkJ1PGdGFB$e553a8c6ce12f408346861e3311001fe9312d2e82124de935bd8991ff9f86e55d214be04061ef5784afd3e4f869c64633d2b91cb784dde85cb6df3f5f23660e8	student	active	1	2026-10-22 14:58:46.020356	\N	\N	3	\N
98	stu41_eee	stu41_eee@inpand.com	stu41_eee	scrypt:32768:8:1$m3ajhI3X6Em5hZ2L$6b2f5cda87fc9584b515b6a7e37c3e804b468ac466e4f5149a0fdde74f3f5aed990abca3b28568256d2ca853e9b008ee8d2a9bcd773bbbf4ba7bf1ec027f2040	student	active	1	2026-10-22 14:59:21.722855	\N	\N	4	\N
99	stu42_eee	stu42_eee@inpand.com	stu42_eee	scrypt:32768:8:1$oyKfLJDlRLsP7tBe$36bc1191602e0b77f700cafa0cbc9d629858ec2899b67d8493272e550fc2c6580aa28e53a42f8aa6c5d73939c40b123c6bf2b8301be76c605702ebdb92451307	student	active	1	2026-10-22 14:59:42.401418	\N	\N	4	\N
100	stu43_eee	stu43_eee@inpand.com	stu43_eee	scrypt:32768:8:1$Rw167G6e1ZGunLEo$3257300f79588b8a2ec27bc0b4943aa759083ababfe5a0d78333f24c421391ab7f5d147afe2521f8e6a9a70f0d34a6a4d8078050cbd8cd59c5985fd1dfc3eaf0	student	active	1	2026-10-22 15:00:00.311869	\N	\N	4	\N
101	stu44_eee	stu44_eee@inpand.com	stu44_eee	scrypt:32768:8:1$8SEgsbSGBKWJUod6$76a98d03d250621e1fd9d4b1f0a7b4d108a7841daf9d63f1a8adfcda2428fa91adafb011f4d4a4bc9ce4f49bd0368e98a56ff0e300abe950c3e7bb6e16e4199d	student	active	1	2026-10-22 15:00:25.040475	\N	\N	4	\N
102	stu45_eee	stu45_eee@inpand.com	stu45_eee	scrypt:32768:8:1$VPQqIUx04hwk7OEL$9500a38c56637610c289bc15a2317392a2849ce34b82d28717050fa8b883523b7545a3e1b370bb3c6da879e09a49f9c7a33bfc091d930f4eaea793b4a04cc717	student	passed_out	1	2026-10-22 15:00:45.842331	\N	\N	5	4
103	Admin	admin1@inpand.com	admin	scrypt:32768:8:1$EHNntNMQLzph1wLs$7aabecd8cf86e58a4ca7016bbe1d86d170d2bad0ecbe4800065004c9378b966a11f6f90cc80e68d027be03169d4fb6566b5ff540c2eb682d338a1e5d64afb9cd	admin	active	1	2026-10-22 17:29:39.402545	\N	\N	\N	\N
104	librarian1	librarian1@inpand.com	librarian1	scrypt:32768:8:1$QglEqJFayuq0ACTC$51a98f3098528baa68dcfa7cb6397df990d329c310f56ede990c806ff14ae4e2b8f6b7f279b39883bb046cb15beba0ab1b5c622960192ba99bc0eee676c9b854	librarian	active	1	2026-10-24 11:50:47.075861	1	2026-10-24 13:23:45.923781	\N	\N
105	class mect1	classmect1@inpand.com	classmect1	scrypt:32768:8:1$m2lcjA1Dix5EIGdC$d8a71f4118323833cbf13c5c135255c893859f7ab6ced6455e97885ae21a8e37dcdff7502ca612a5c12642aeee49a4a39a9a41156204d0331383fe613697662f	class_teacher	active	1	2026-10-24 14:20:36.878161	105	2026-10-27 17:29:14.877379	1	\N
106	class eee1	classeee1@inpand.com	classeee1	scrypt:32768:8:1$4xTjBeanvAQ0anQ9$05f44628adf6ebb6bff4912fbf3e1c2ce258af534dd6136225ccdbd7922882e445697ed2779c94dd19f6625225b4bd9dd334a7400ac2a090ed74e2ecc851d6be	class_teacher	active	1	2026-10-24 14:21:09.629252	1	2026-10-24 14:26:34.972111	1	\N
107	class aero1	classaero1@inpand.com	classaero1	scrypt:32768:8:1$zssvvZmKZQm6AeWc$f615df2c79e5998a4fa6a6ff350840cfd28c008062a0a381afcaef693fcb1adeca8b40cc1c9fa38389f669b0f78ca6bce121a1d9bd14fd47bb5a6bd7e0c8ee14	class_teacher	active	1	2026-10-24 14:21:27.35818	1	2026-10-24 14:26:23.515774	1	\N
108	class cse1	classcse1@inpand.com	classcse1	scrypt:32768:8:1$coxAnVGlVALxvLvJ$c0126a7f85fabf315cc18902dcb7d6096fafc2e5205fed0951d847656673084abb8d47919b649cf122d2916a8fc8596b1fecbc09bc36b49e32131d4a0ca4d5d2	class_teacher	active	1	2026-10-24 14:21:41.133212	1	2026-10-24 14:26:43.408131	1	\N
109	class ece1	classece1@inpand.com	classece1	scrypt:32768:8:1$pHc2Bvz4EuWwsUCn$9574c922c9ffc701acca26e0bb98357ee464e90fe25b54b62c148ab1e4c0e2452ad7c366dc4f37d36fce38719a0f420eab93baecd14cee5820405834ef1ee053	class_teacher	active	1	2026-10-24 14:22:00.521363	1	2026-10-24 14:26:49.926169	1	\N
110	class mech1	classmech1@inpand.com	classmech1	scrypt:32768:8:1$576DLZhlZACYG2uk$078c85e804f009e09fe4594dd00cde8d936dc36132896013f8d037bbc122c86e6f0ab527b88b0ba20f69cf7358aac193032c55cb59524a1db601fa0ccfcf21b2	class_teacher	active	1	2026-10-24 14:22:24.323992	1	2026-10-24 14:26:55.607635	1	\N
111	class mect2	classmect2@inpand.com	classmect2	scrypt:32768:8:1$9iRoHwI0CZEcR1Hn$c898895b195cdd4a610d2c79f3bcd15a55f2abac1d3b519d0985efbfd5ea7639a63fbd37ecad378cd15950dbb7d2efcc97e1d00ecaab37dc693325d27a64ad64	class_teacher	active	1	2026-10-24 14:27:48.933804	\N	\N	2	\N
112	class eee2	classeee2@inpand.com	classeee2	scrypt:32768:8:1$ZHQuqEVuDetqdTm2$f28cedcf81f38834a8049c76dbb514b15cc017464209085fcdb478b6cc468d6964b7763e8a8aa227a00705e250578074e65f6901654f9cd735ed15e3703a28ff	class_teacher	active	1	2026-10-24 14:28:18.095163	\N	\N	2	\N
113	class aero2	classaero2@inpand.com	classaero2	scrypt:32768:8:1$OLgWfqyGMCdrEpgE$bf5d7dbf81e2576f80c5a40c23241e6f8022ea187c760cfecee31656d180d18edd55eeac6d56adb3903a60097a404bfcf0b351e6a89f835f0f11791f53bb2ec6	class_teacher	active	1	2026-10-24 14:28:45.963604	\N	\N	2	\N
114	class cse2	classcse2@inpand.com	classcse2	scrypt:32768:8:1$HgR8nxVw3uOL29ED$7d678c9f379d829e4138084eb89438146b6277abd613ed5534ca97d153eefc97ff1ca4c8d40f9b6bf88134d203b0297cac178da1e6e37340724757806358f4e1	class_teacher	active	1	2026-10-24 14:29:42.210011	\N	\N	2	\N
115	class ece2	classece2@inpand.com	classece2	scrypt:32768:8:1$ULWNMCIvUUZfj2UJ$5bb1dc37557792880f2750052a0ac36f6e620ec25727b6022f3ac196dd8fd6f6e5bc4886b3586ad0f1490d9865ede7b4044f075218fe5513b4b6c00f5fefbcfd	class_teacher	active	1	2026-10-24 14:30:09.036056	\N	\N	2	\N
116	class mech2	classmech2@inpand.com	classmech2	scrypt:32768:8:1$p6ehS4ByRWOv3x5L$7d68817255b20bb5297c90fc24963561ccbc5464d65def02f4b8a100153e13369a0faeba77828939812b8d11c31f6b024b5d06c4410ba87541dbb5d8a4f9656d	class_teacher	active	1	2026-10-24 14:30:49.829968	\N	\N	2	\N
117	class mect3	classmect3@inpand.com	classmect3	scrypt:32768:8:1$ixT1AcAvQGeOKpDZ$9265326c2c9842e57dd1a78c40a0352f6e4c0e68466ea132fead023aa6b245376c8406c8fc15ce5b75862fbf46c7ee34255e6c81c8a8a41170d79ef5030215f5	class_teacher	active	1	2026-10-24 14:31:21.979952	\N	\N	3	\N
118	class eee3	classeee3@inpand.com	classeee3	scrypt:32768:8:1$4fQy5JkMVZAcgYL9$a1c35c6e176793156b56c3c7ad19e0521ee26f84257cbf45645d3ceba23dd0821f56403babb9751ec56a9a28fbbc143916c8e56250b718ff98836460ec5a2cc6	class_teacher	active	1	2026-10-24 14:31:46.621199	\N	\N	3	\N
119	class aero3	classaero3@inpand.com	classaero3	scrypt:32768:8:1$omOTGlgJOhjqtslL$acd6c8c545e9eb77cfdc64dec677ca036b9d760248cf88e58ae523b552e35ea92a9961537b815d48cd3fd3281cb9bd91196d8429d24526be4511346c0d14b2c9	class_teacher	active	1	2026-10-24 14:32:09.428667	\N	\N	3	\N
120	class cse3	classcse3@inpand.com	classcse3	scrypt:32768:8:1$Hl1qfoKBcfNS5Ika$8de0216b9b7645b065089f22df0db5c045a908bb6d015ed27e84d615fdee92268f210ee40be890bcf13a4aad819dd440186a4e1bb3d0fefa2c725ad1ea311458	class_teacher	active	1	2026-10-24 14:32:28.315553	\N	\N	3	\N
121	class ece3	classece3@inpand.com	classece3	scrypt:32768:8:1$3C3OolqdproNOXif$e64a9a922d45dce2b8ad5ad28ce83593ff67d3fd226ac89f3fc16f5a7619a2813ded973f30e191b2212a53e7a6aed03b6e60d1026538178c4236c4b2e4176b8d	class_teacher	active	1	2026-10-24 14:33:02.517828	\N	\N	3	\N
122	class mech3	classmech3@inpand.com	classmech3	scrypt:32768:8:1$fe63iHuyF2jDe8Te$dc7755281cc981a3deaa2b879e45c3a907e83287e6acaa59b4d815b35bb576322230f1a01452b276010eb20e810cd8b706c6b7ad5dee454cd258ed1ff85d6787	class_teacher	active	1	2026-10-24 14:33:31.132663	\N	\N	3	\N
123	class mect4	classmect4@inpand.com	classmect4	scrypt:32768:8:1$9Xbtavs0ARUUhLSD$776c43f7d6760c8863f3841d54997264520b6791d3fab58cbf012860c23e966e5eab14ee921545d2d8f8c5b2e96f3a71e5e0d3a08ce0eba41a3f9849ec4ec844	class_teacher	active	1	2026-10-24 14:34:08.73089	\N	\N	4	\N
124	class eee4	classeee4@inpand.com	classeee4	scrypt:32768:8:1$l2frqiqPH3JJ4u80$44adfe7c5c9ab41be08e41f7e75ea33775fcba8bfbda222542e0e9b95ed08dc3568839f2ff0d3277552868e9d15e4af29b39687592cfaef985d431068dc3806d	class_teacher	active	1	2026-10-24 14:34:28.770615	\N	\N	4	\N
125	class aero4	classaero4@inpand.com	classaero4	scrypt:32768:8:1$NakuVBxNTWjqcbCG$f28cbdac0098ececa26639c6efaeb938409cfd18ee5a962f6941854e5b46b9f0c286d73f3f44318dae05e174152608f9c061ba537a031c01ecda53fcb4191e22	class_teacher	active	1	2026-10-24 14:34:59.273282	1	2026-10-24 14:35:42.028268	4	\N
126	class cse4	classcse4@inpand.com	classcse4	scrypt:32768:8:1$cGl6pzSj8Xj1i58W$b3312599c21c4afa6fbedb613a2f08a5789a4ca3b9d6a3a58998b0ebc83e8fa94ce1a03c524d3028b54672b35849f77e13130db857de2f54b85c8d9b982b81d8	class_teacher	active	1	2026-10-24 14:36:08.925642	\N	\N	4	\N
127	class ece4	classece4@inpand.com	classece4	scrypt:32768:8:1$wZRbWcPELpc14iPO$abeb420bb7b0ae79c3b753b0bdc642416ba4c932895c90b2ec978e4faf277f127d962ccc350a36442e610d65c98bdf2e8ab963779b43e3595608e6d87f19e81b	class_teacher	active	1	2026-10-24 14:36:36.714848	\N	\N	4	\N
128	class mech4	classmech4@inpand.com	classmech4	scrypt:32768:8:1$8kcZvXC5dtkpTevu$43e20d409c92f4e747d020dc622e5c639a31e037e7f2a204b197ee366481a1b8188d3474fe5559e2d44d4e7470d7b39b3f9ef4ceb5664a1aea9c4563b0f4f28a	class_teacher	active	1	2026-10-24 14:37:00.184282	\N	\N	4	\N
129	tec1 aero	tec1aero@inpand.com	tec1aero	scrypt:32768:8:1$df25TpckWCRa1J4b$e490db02ac93ee0fd3d00756fa0a4236e7e8c0355f167b6fdf50b20eb17897fde659d083c13ee081670c8e6e19969fc032cdde2e638f93264bc9d53ca4f8f2bf	teacher	active	1	2026-10-24 14:37:55.05607	\N	\N	\N	\N
130	tec2 aero	tec2aero@inpand.com	tec2aero	scrypt:32768:8:1$M6P1e94wQApWjcE4$1de0e5635a8edc3af1a1cfaddebfee6f1bbba80df0666a6373d79b27cf5d2fc0d0d3297ca6ac8093485aa6e8ffb810abd296b8f23b158ad5c2c171aef0a1f4db	teacher	active	1	2026-10-24 14:38:16.72904	\N	\N	\N	\N
131	tec3 aero	tec3aero@inpand.com	tec3aero	scrypt:32768:8:1$RPQmYFTiBlPVzneJ$0f168c5eca5e9816ac6ad0642b08fea819f47d2352cfaf1e76239887356c2a0b3e29a19559be05dc46e752f07810220459e6c3e93eccd6b9ffe9745ec6e8f9c9	teacher	active	1	2026-10-24 14:38:36.112333	\N	\N	\N	\N
132	tec4 aero	tec4aero@inpand.com	tec4aero	scrypt:32768:8:1$hxNAsiT8AovWAgiD$f2a186a8fe10e1291552f8bcf3f7bfcd84f3ae58ca8526f9bedd94fa6e92edb796ecfba19b3b359527b640034706bb470bed86472f2939f62e342dd12199bf15	teacher	active	1	2026-10-24 14:39:14.58596	\N	\N	\N	\N
133	tec5 aero	tec5aero@inpand.com	tec5aero	scrypt:32768:8:1$k7Yn1UtesYlmvss5$65ec739f38533bd114b891cbc89c3d60633befc55c7387a66f2f8de030643d4fd1bb3d89869684ffd211b99cf25a187ef07633c3daa78bd9131b933156b1f36e	teacher	active	1	2026-10-24 14:39:42.625403	\N	\N	\N	\N
134	tec1 cse	tec1cse@inpand.com	tec1cse	scrypt:32768:8:1$LNZHuDhWRPVhavRa$ec75d99d67889365d8602c363926122d165f9c7639747a485ed69eb97488f1a348de06ecdf9568fb0d114eeff4007361ab9cf971d023306f7d21d0854b24f1a5	teacher	active	1	2026-10-24 14:40:24.808522	\N	\N	\N	\N
135	tec2 cse	tec2cse@inpand.com	tec2cse	scrypt:32768:8:1$bJJ810JujWLZ0xza$9dd46efbf4567ce60507e12c0ac923b90262dd69b099761112045712076cd84b423c5c6bbd79325761f976c520419917c356b59ec69695b17831f89ad7c44f94	teacher	active	1	2026-10-24 14:40:55.442097	\N	\N	\N	\N
136	tec3 cse	tec3cse@inpand.com	tec3cse	scrypt:32768:8:1$CPsLs0d0MTP35mJI$5b39eb1b542772cdbccf04b3944c39949c5ec5ebce056c7d9899ee66c5761805b6d8673ffaa950ec1d836794b7fa8fe514ef8eeef80f47a428b5f5d4c91700b9	teacher	active	1	2026-10-24 14:42:32.49955	\N	\N	\N	\N
137	tec4 cse	tec4cse@inpand.com	tec4cse	scrypt:32768:8:1$4t0SEqOkVojqF4a4$8547264a207bc2bba94e4ff12564a02ef72380614395244f843b06591595db6f71371186364e459c7eb8b8c1cb20099c1c5709ff0e1642cab271d53e8ca0f522	teacher	active	1	2026-10-24 14:42:53.661209	\N	\N	\N	\N
138	tec5 cse	tec5cse@inpand.com	tec5cse	scrypt:32768:8:1$Dntg6pmnv8EOKTFt$9129181b0a3604dc98c4b926ed6651a119d3440270ac2c36d49e27d5e28d26813718ad624b2b752c3cb857b8fdd3b91d7cf6c273da1a69972d21e035b8c1de17	teacher	active	1	2026-10-24 14:43:16.436103	\N	\N	\N	\N
139	tec1 ece	tec1ece@inpand.com	tec1ece	scrypt:32768:8:1$FBg55maljk1uf0jG$ca6ff3a0c16fb5558f98b326f4e8a6b018588fe0b1e028e740f1730682ffbebee86776c57ac64b7f1c46fa23dc69dc2aecf0acc26342e5d431e2b2e986d78027	teacher	active	1	2026-10-24 14:44:04.355771	\N	\N	\N	\N
140	tec2 ece	tec2ece@inpand.com	tec2ece	scrypt:32768:8:1$cYRLPBAvcJiqVng8$a94ddf7a07fbe6b5636ba6e84b0f14f50cd3301e35a251d82076e3eb82ec85694dfff06494145a223177e54b80f9841f2f89f13c25d6b0fc805de5f5abe3d5f3	teacher	active	1	2026-10-24 14:44:34.985629	\N	\N	\N	\N
141	tec3 ece	tec3ece@inpand.com	tec3ece	scrypt:32768:8:1$Qqb1DpaaaY0cds8u$f9120e3cb45ccecac4da1bc43b9217f1ae7b3b568f34db9ee0f81f53f282ffb9c6916ec4bc6509057ceb4a5d2f3064e7109489c216cdefd1f205bbcc5941f13f	teacher	active	1	2026-10-24 14:46:33.213092	\N	\N	\N	\N
142	tec4 ece	tec4ece@inpand.com	tec4ece	scrypt:32768:8:1$gaTb6wmQBJaz8Yp4$1cc143596277f9665071674014e28d97be5aabbd52a69495e7116f1f866bd2a0b5ba2899df68010214632ae671b5cf61ff415230f90cec07bd0cbee628185cae	teacher	active	1	2026-10-24 14:46:56.28536	\N	\N	\N	\N
143	tec5 ece	tec5ece@inpand.com	tec5ece	scrypt:32768:8:1$XTHlBaEtKJmplkev$676e4495d10ace6dff5e2b1653a45c2310c1939a1b1c898af98e584c6d9cae9e8cd4c4c13f5e4c04feb35352a21393e810848ff8f83ea04e6c65f4d73a60d4c3	teacher	active	1	2026-10-24 14:47:14.063355	\N	\N	\N	\N
144	tec1 eee	tec1eee@inpand.com	tec1eee	scrypt:32768:8:1$TWSljQcxMwCOVOtN$be1ea1309e8db8dce894fde3f082486b1155811a97f17c1a00dc7090cefad8943493b0965280e0aebabdc4c0652fec2c84aee1c7f8234cd10e2b185f994e2032	teacher	active	1	2026-10-24 14:47:57.199158	\N	\N	\N	\N
145	tec2 eee	tec2eee@inpand.com	tec2eee	scrypt:32768:8:1$JOyw25diuxMCfzxb$fa405ffcefda2ca9cce6d9cba440a60fa78a9c62be85d770a80c438f5780489fe4bf34fe6035fef4f0922c4b737261119ea5d03cc0e4eca67940bc0ba65a807c	teacher	active	1	2026-10-24 14:48:35.24627	\N	\N	\N	\N
146	tec3 eee	tec3eee@inpand.com	tec3eee	scrypt:32768:8:1$sk88FSqMJkrezUSN$5e89411a0acd9a65aa88a579dafdff9fb33b0151886e773b836f59d4dcc04e3bfb2782f56a5547ae491e0196a4b6951ea308803de73514912d9f63b011c93dda	teacher	active	1	2026-10-24 14:48:56.474805	\N	\N	\N	\N
147	tec4 eee	tec4eee@inpand.com	tec4eee	scrypt:32768:8:1$OzorvwbLF6vR4ykn$918bde83d146e3b10a7d4f8a61dca528c55ddeb2d3214ee3302e23d3abbf52036a666ae3b194081732538b439af7ee81ac460523feb9593b2a5d865a2e5f7aa6	teacher	active	1	2026-10-24 14:49:16.384215	\N	\N	\N	\N
148	tec5 eee	tec5eee@inpand.com	tec5eee	scrypt:32768:8:1$CR9SjmnBG7w9xFTG$b9d10e8d78f2b34416c6c425ec97858b135eb2f8290dfb9fb5867b093bb1523cca22ce8ad15591780e8e668f29b28e3e7b0065ab7abc476d626097cdf3a4514d	teacher	active	1	2026-10-24 14:50:12.8839	\N	\N	\N	\N
149	tec3 mech	tec3mech@inpand.com	tec3mech	scrypt:32768:8:1$B7BCHBXj8v8CStoW$163b124871ef9021f4d1e7820c279828b53fbc7fffefe69196f8643d5724636cb9dd049b41b871191b8f87e3cba7b41699b287d47730ebf0bd9574000942808e	teacher	active	1	2026-10-24 14:51:03.163984	\N	\N	\N	\N
150	tec1 mech	tec1mech@inpand.com	tec1mech	scrypt:32768:8:1$NoxMHBJQ1Rik1N6Q$dc98f0622fde17b37d930f29fd9a8c51a05a072998edbad15e9c016ec7fae06564556876acf90a992b17b2526a3d41dd5ab54365b620208b4b37885c6a392e93	teacher	active	1	2026-10-24 14:51:23.941818	\N	\N	\N	\N
151	tec2 mech	tec2mech@inpand.com	tec2mech	scrypt:32768:8:1$vk1KHpVwZoriwf9V$1ad2c5ec681d1157f8b5e186a129ff686f3cd61aeeb96e344a059121572dba147fecdf509e7e6f4f6cb9dea85f5b0e920f068d33d4b7e5f87da307e2e434983c	teacher	active	1	2026-10-24 14:51:42.835585	\N	\N	\N	\N
152	tec4 mech	tec4mech@inpand.com	tec4mech	scrypt:32768:8:1$WADJhZgnWlFBkQWN$386cafa4e854209fe1f5e3073ef913e71cecdab8fd8f33403d7e770f8dba7444266fe996ff65515f1fff28b2153b4ea0128092b91586b09976ae318eeece4752	teacher	active	1	2026-10-24 14:52:12.782043	\N	\N	\N	\N
153	tec5 mech	tec5mech@inpand.com	tec5mech	scrypt:32768:8:1$wJyPUQrQAK8QhdpX$e7f9c13c814c2cfb6903aac597c059809e549c28278dc1350b5b9613d8399352c2223d7509fca868e198077440e82e3e67cc1ffefeecd8e8c7587ea7ac894fa4	teacher	active	1	2026-10-24 14:52:40.979495	\N	\N	\N	\N
154	tec1 mect	tec1mect@inpand.com	tec1mect	scrypt:32768:8:1$qpvpuDeNwy1uNvPX$268f489b51912c7b21436d9a451ae9feac3c6c7596fedc2b57297e1d74ef2b28f7a7c21907ec09490e9a7388bd94aba48d2be272b85cae0734fb92ed03ec3247	teacher	active	1	2026-10-24 14:53:29.882645	154	2026-10-27 17:29:28.541047	\N	\N
155	tec2 mect	tec2mect@inpand.com	tec2mect	scrypt:32768:8:1$TGBVkmVQB5eHTS7I$12bba176284a288a6de5dc0fe972b593b0c241052568bbbe84876ba93874f1910ec5069a7046320cd359cff217995ff44adf6518ebc4dea8467f7ecceedea140	teacher	active	1	2026-10-24 14:53:54.871953	\N	\N	\N	\N
156	tec3 mect	tec3mect@inpand.com	tec3mect	scrypt:32768:8:1$0cMk6VK2Fl6Xi4HL$67afa753439f248b00887ea0c5681e83e54a1b1e9f616180951336e6a796ccba3da872329c86f346964d51ca321b0b158b8364ee2d2e4bcc5db306067c87ca40	teacher	active	1	2026-10-24 14:54:25.134485	\N	\N	\N	\N
157	tec4 mect	tec4mect@inpand.com	tec4mect	scrypt:32768:8:1$Y6jjo6sWdZoFenFi$3fa22add70e78f7f4c722b1aa8547d017f09f38624cf1651b4979273f2e294d7d6e0671b277caf24350aa3dc1bfe1f8786dc9de2bb9013d2d448230d68436160	teacher	active	1	2026-10-24 14:54:52.646153	\N	\N	\N	\N
158	tec5 mect	tec5mect@inpand.com	tec5mect	scrypt:32768:8:1$Gkvpcn7gFVEvjK8c$26d02ea9a9c970e6b0f0ddeb6703743928be1bff009b544788caedf95ff8232bd82214bf37d30791fd0158f55882b6ead1165c0008cf477706c0683976997f5a	teacher	active	1	2026-10-24 14:55:15.272334	\N	\N	\N	\N
159	leader mect1	leadermect11@inpand.com	leadermect1	scrypt:32768:8:1$pgToTPJtoZWiCijm$f92269fc00821036e9700ea57dc2d588f9fbe86183920533a72b9e3c8ced2f84d1ba7a40811cef4f6c1c9832f7ab64beb78e461ec4f96ce9b0541358653116ba	class_leader	active	154	2026-10-24 14:59:51.247088	1	2026-10-29 17:29:52.445235	1	1
160	leader mect2	leadermect21@inpand.com	leadermect2	scrypt:32768:8:1$ESsKo2iOj0ico3JU$d85a6c7844b2a9423321d7a6486f2fba173086c256b20b7c1f9ef8d2526604209f37a78ca4e5ec820571be45b700ad668c6c2a46ce347c0a94d91e9ad42133a1	class_leader	active	1	2026-10-24 15:02:38.574778	\N	\N	2	\N
161	leader mect3	leadermect31@inpand.com	leadermect3	scrypt:32768:8:1$AOhPhdZJtvGKArpO$a1e134354df6900e14278f072c529a5df2d127f2ae9b0747f960d13103a71f6935038ecc2ee4932cd35d5a6d0a5d7afb4170dfab44cb89d46bec83b88683f6cd	class_leader	active	1	2026-10-24 15:03:21.820947	\N	\N	3	\N
162	leader mect4	leadermect41@inpand.com	leadermect4	scrypt:32768:8:1$ROcAaciqIe6FNz3H$b8452fa2a8566e1dccd82ec1c49db0ad036882b9e13772f36248c895520d08c7244cd1b360c4629de6cc96e46dc16c1c53769ea648468606265c3d39b7fb56e7	class_leader	active	1	2026-10-24 15:03:37.738559	\N	\N	4	\N
163	leader aero1	leaderaero11@inpand.com	leaderaero1	scrypt:32768:8:1$E6yM058c9sQMa0pK$0ec377875453c1c42ab61b41ad6fee53b5eee4c2f6e00aad1639fa40419ef3ad5217ebe2220c5d641e1db97551a276c6a77a48674834ae59165d2b7d9ac1c283	class_leader	active	1	2026-10-24 15:04:45.743964	\N	\N	1	\N
164	leader aero3	leaderaero31@inpand.com	leaderaero3	scrypt:32768:8:1$WXigsrki0UscfyZn$d54ad9c793f172970e3d0edeb40f60856175b686ddf16bb72ea3cc8d9fac6304d7569db43186394aba6e668ba88fdb30f635384d7c662693fe86d6bec8b24879	class_leader	active	1	2026-10-24 15:05:44.930028	\N	\N	3	\N
165	leader aero4	leaderaero41@inpand.com	leaderaero4	scrypt:32768:8:1$CRbELjr2wSZSXK06$4b1ff9bb3f485f83d9645d5140ed877424d84654efd59b3744f6a6f737c78385ea9d1f02e8e258cf70d6ce3444667988f3b10f5ddf0a6424ede21e56db3fbb32	class_leader	active	1	2026-10-24 15:06:07.709621	\N	\N	4	\N
166	leader cse1	leadercse11@inpand.com	leadercse1	scrypt:32768:8:1$JBEVOLP4O9212fTz$bb984ef197debc2cca7af54afd870eca36c0b8c4e9f069e0005676b0e458691cdfac6bf20e42dbc380721943d58b55089703f822a7cc5dfb10f630135ddb59d1	class_leader	active	1	2026-10-24 15:06:51.998825	\N	\N	1	\N
167	leader cse2	leadercse21@inpand.com	leadercse2	scrypt:32768:8:1$tcw7L26revADRTnz$7d4e828cace40776777f24b69042336e3daae666d0de36988e408cdee9456ffc3d53172313dbe072800d4bdc64ca14b3515cef06b9e754051b602123a5331622	class_leader	active	1	2026-10-24 15:07:12.155321	\N	\N	2	\N
168	leader cse3	leadercse31@inpand.com	leadercse3	scrypt:32768:8:1$fkEYWAZUBPu3VzTb$9e09b8f051a27582df60cdd1a900f0dac8a4eb1b5fcd6d39ec0eba7c11c90559b6283716125a91ce1a00bc08a039b5d05190a0ab46a759cccb5170b3aef0e273	class_leader	active	1	2026-10-24 15:07:59.731972	\N	\N	3	\N
169	leader cse4	leadercse41@inpand.com	leadercse4	scrypt:32768:8:1$uysVv1IXJkZV4VjJ$3ce9c4a4e33754a4a5ad425e38fead2905e6150b5f92296921dd9a11cf28772061096469a04ec3b094f77d7348a0f6646043889f0d2ad1f1a470da890eb82ea1	class_leader	active	1	2026-10-24 15:08:19.067363	\N	\N	4	\N
170	leader ece1	leaderece11@inpand.com	leaderece1	scrypt:32768:8:1$hNVHR7SnBsAYZrw7$c8ce3432327ee2fdd0ee9db668835bbecb7efccf87c38f2d5f165cebd24a791404c136a76f6d6c28bc8de601164fccd47e34901d97d2ffe9e32271f2331e3b2a	class_leader	active	1	2026-10-24 15:08:48.214984	\N	\N	1	\N
171	leader ece2	leaderece21@inpand.com	leaderece2	scrypt:32768:8:1$xY8QN1OIJRTaIQ4H$1ebd18cc0a5a30bb1ec132ab5f283828c5c775bd9cda70f88cac699dd0cc1865c511123e18eb78160b22e2af0c551faa2f91dd1e534b87db9fa26dd0bb0db512	class_leader	active	1	2026-10-24 15:09:15.356335	\N	\N	2	\N
172	leader ece3	leaderece31@inpand.com	leaderece3	scrypt:32768:8:1$G8BNExr1eHkl7A6i$3c3e4dc8dba23b1f8f52dc203fa16cca6fcc8b9920a63e7f5779ec202cde560fccde95e585f701f992121888ef3294f346ab2edfc887b9bebd43bb023b9c4004	class_leader	active	1	2026-10-24 15:09:33.14758	\N	\N	3	\N
173	leader ece4	leaderece41@inpand.com	leaderece4	scrypt:32768:8:1$ZW0CbDSFNQ6LlSFC$fa22bebabc83c59daa8e2cc97f4182fe0bc6067149186f30fad7c423c3930233a0bbd190b2c0218b6b781bd84e47fb92235d2039a0acdd0a8a66d3a426fbb5a9	class_leader	active	1	2026-10-24 15:09:55.036898	\N	\N	4	\N
174	leader eee1	leadereee11@inpand.com	leadereee1	scrypt:32768:8:1$bVnPDiN3rxDiI8UR$b30ec2329c9d00e948582b9d209a391c377ca99b7afb7dee1850dc0a2067ee6ae5a7a64e2560d93a96401267dee3a476d10484a5af0b4b671b961ff29bd32a4c	class_leader	active	1	2026-10-24 15:10:46.829922	\N	\N	1	\N
175	leader eee2	leadereee21@inpand.com	leadereee2	scrypt:32768:8:1$2sXIbXIQuoiWQeIx$7ba195a5ecbeb6f2955ba737d110f57d3a9c0355cc9ff519c4b5f06ff9ff1e5e53cc8c6cd996a4f5d612c46fa1850100f9a8e80eb57631d5d7dd2ece33354862	class_leader	active	1	2026-10-24 15:11:10.892217	\N	\N	2	\N
176	leader eee3	leadereee31@inpand.com	leadereee3	scrypt:32768:8:1$e7XSNfr9nAItgRwq$a7607f81297481a6df6a3068ae59a3d404752c44ab2f411a081c668e52c8b8ef924be72c748791ee5281310e817c54fbfc06f6e4ced4e09354df5d75150b4f23	class_leader	active	1	2026-10-24 15:11:32.431268	\N	\N	3	\N
177	leader eee4	leadereee41@inpand.com	leadereee4	scrypt:32768:8:1$7dGGwGgArz4hE2pA$319f54f95ba317a29158ff118291376904fc50845b65ce03e7115f84197db832efb431f5a507487dccf32a105335d14aa0174b24a8dabc77f0dfd24782e973b4	class_leader	active	1	2026-10-24 15:12:01.053999	\N	\N	4	\N
178	leader mech1	leadermech11@inpand.com	leadermech1	scrypt:32768:8:1$Lnr6PaWbH4Kx7hwP$1fb9fbb1172745f99ffce9aa5f47e99785f64b068171b017c53b65dce747c33155f2655e42ca7684224e265466eb085781b099d6f2ee8fb5b77b82ae7d26dd23	class_leader	active	1	2026-10-24 15:12:58.138298	\N	\N	1	\N
179	leader mech2	leadermech21@inpand.com	leadermech2	scrypt:32768:8:1$RkrCBozdwO86nvUf$ad44a8834aaf0a685ece75767538a39749bc3abb697f3428b4036d0fd5edd8ab4d71a550bcd38a0ba7ac096d2591294362b087ee461cb24237bf8e35f5cdfaf1	class_leader	active	1	2026-10-24 15:13:23.111548	\N	\N	2	\N
180	leader mech3	leadermech31@inpand.com	leadermech3	scrypt:32768:8:1$Xrx3U0rshhzf4CGC$786e6ae5733e69abb2d56e1d9c98d942a1b44ee6991432c25a0527f9c63ca86a98a29f017fa1a4b63c1055fbfe0600fb7be5a0006de712916d52b9ecdbb52ecc	class_leader	active	1	2026-10-24 15:13:52.182238	1	2026-10-24 15:14:37.426256	3	\N
181	leader mech4	leadermech41@inpand.com	leadermech4	scrypt:32768:8:1$I6b95UnB9tGk5XM0$3e5ddc64bd63e0a1768255854ec91936dca2fa4625b3684767a080e79c42be3b2cd9522bd5151e8c4b1e6f1d18aab2bb5d385d9aa1d9b0b4cc8eaa593f432295	class_leader	active	1	2026-10-24 15:15:08.645089	\N	\N	4	\N
182	hod_mect	hod_mect1@inpand.com	hod_mect	scrypt:32768:8:1$Mv5ypqf1oYP6UsP0$967cecccfa76843770ce24117de4a99740fcd3d70aa8837121e5144838ec4585922d75076caa2cec0fca9e3c252b85ee0cf8c3745e9b49ea4fdc8c00586cc05a	hod	active	1	2026-10-28 10:33:17.679995	182	2026-10-28 12:27:04.74179	\N	\N
183	hod_mech	hod_mech1@inpand.com	hod_mech	scrypt:32768:8:1$T8CLwX9h8Ov2GbD1$be27c0234b04ebb2f4c997615231c399283eb6c961de098d4470e48341ceb130a4f7c4adf89c5eb566502e723696438e15edee0a28cc6e1581980b3c66b93c69	hod	active	1	2026-10-28 10:33:51.937986	\N	\N	\N	\N
184	hod_eee	hod_eee1@inpand.com	hod_eee	scrypt:32768:8:1$9orbcqUv4IdC23Bl$eb493e358f9f09625971c747cb77fe146e808ef4db55e462091a3a1ea424d5297d5e2e2d06fd1211bfe1434f0c6faa3c23b751ed82db1da1ef92ffb13135c52b	hod	active	1	2026-10-28 10:34:30.634963	\N	\N	\N	\N
185	hod_ece	hod_ece1@inpand.com	hod_ece	scrypt:32768:8:1$Q4cndpeBJ5LEcgUd$d9a1f65bfa6de7a0ef9918530dae42b3670a6560a5a31eb7cbb36dd83dd5add623e65dffa0745c0c94f3bfbf95bfc01cb89eca63b649bcfe19ac60d4bf41c14d	hod	active	1	2026-10-28 10:34:51.342692	\N	\N	\N	\N
186	hod_cse	hod_cse1@inpand.com	hod_cse	scrypt:32768:8:1$PnAFapmoTjy3kIFQ$4a45ce852f5fd0ed2b3d941b6c3f12e6fa149f052a814c87de4e0bbc48c2b7211d236800bf00a2fedc35ee05011d1d08143f33ab378df5a2270d1aa3564c38ba	hod	active	1	2026-10-28 10:35:10.233812	\N	\N	\N	\N
187	hod_aero	hod_aero1@inpand.com	hod_aero	scrypt:32768:8:1$1b6MqT9KRm9F6pXU$a839de9a2f47725136852f77ee69b9cc1ce58c65f6de360eca137e9398e90a284eb7a3a5d2fe930a831eb963722ddeff97b6f81fdd0924d5f1cd6d592802716d	hod	active	1	2026-10-28 10:35:27.174888	\N	\N	\N	\N
188	principal	principal@inpand.com	principaliiet	scrypt:32768:8:1$63l5OCRstunyshoi$0a84017144a329b448f94229f5de474b41cd8a8241c63d1ee62310ad40c18315e270ff3b5fe475e16b6a24253d9b937482b7c47cc3c4dff3dbfb34415ce2ebc6	principal	active	1	2026-10-28 13:21:36.380666	1	2026-10-31 09:54:50.055361	\N	\N
\.


--
-- Name: academic_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.academic_tasks_id_seq', 1, true);


--
-- Name: academic_years_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.academic_years_id_seq', 4, true);


--
-- Name: attendance_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendance_sessions_id_seq', 2, true);


--
-- Name: batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.batches_id_seq', 14, true);


--
-- Name: department_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.department_requests_id_seq', 2, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_id_seq', 13, true);


--
-- Name: groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.groups_id_seq', 17, true);


--
-- Name: holidays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.holidays_id_seq', 2, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 929, true);


--
-- Name: programs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.programs_id_seq', 8, true);


--
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.questions_id_seq', 74, true);


--
-- Name: removed_users_archive_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.removed_users_archive_id_seq', 51, true);


--
-- Name: sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sections_id_seq', 12, true);


--
-- Name: semesters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.semesters_id_seq', 2, true);


--
-- Name: staff_departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.staff_departments_id_seq', 554, true);


--
-- Name: student_daily_attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_daily_attendance_id_seq', 20, true);


--
-- Name: student_fees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_fees_id_seq', 1922, true);


--
-- Name: student_library_books_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_library_books_id_seq', 17, true);


--
-- Name: subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subjects_id_seq', 3, true);


--
-- Name: submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.submissions_id_seq', 18, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 190, true);


--
-- Name: academic_tasks academic_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_tasks
    ADD CONSTRAINT academic_tasks_pkey PRIMARY KEY (id);


--
-- Name: academic_tasks academic_tasks_task_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_tasks
    ADD CONSTRAINT academic_tasks_task_number_key UNIQUE (task_number);


--
-- Name: academic_years academic_years_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_name_key UNIQUE (name);


--
-- Name: academic_years academic_years_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (session_id, student_id);


--
-- Name: attendance_sessions attendance_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_pkey PRIMARY KEY (id);


--
-- Name: attendance_sessions attendance_sessions_subject_id_session_date_period_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_subject_id_session_date_period_key UNIQUE (subject_id, session_date, period);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (id);


--
-- Name: batches batches_program_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_program_id_name_key UNIQUE (program_id, name);


--
-- Name: college_settings college_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.college_settings
    ADD CONSTRAINT college_settings_pkey PRIMARY KEY (key);


--
-- Name: department_requests department_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_requests
    ADD CONSTRAINT department_requests_pkey PRIMARY KEY (id);


--
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: group_students group_students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_students
    ADD CONSTRAINT group_students_pkey PRIMARY KEY (group_id, student_id);


--
-- Name: groups groups_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key UNIQUE (name);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_holiday_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_holiday_date_key UNIQUE (holiday_date);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: programs programs_department_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_department_id_name_key UNIQUE (department_id, name);


--
-- Name: programs programs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: removed_users removed_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.removed_users
    ADD CONSTRAINT removed_users_pkey PRIMARY KEY (archive_id);


--
-- Name: removed_users removed_users_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.removed_users
    ADD CONSTRAINT removed_users_user_id_unique UNIQUE (id);


--
-- Name: revoked_tokens revoked_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revoked_tokens
    ADD CONSTRAINT revoked_tokens_pkey PRIMARY KEY (jti);


--
-- Name: sections sections_batch_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_batch_id_name_key UNIQUE (batch_id, name);


--
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);


--
-- Name: semesters semesters_academic_year_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semesters
    ADD CONSTRAINT semesters_academic_year_id_name_key UNIQUE (academic_year_id, name);


--
-- Name: semesters semesters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semesters
    ADD CONSTRAINT semesters_pkey PRIMARY KEY (id);


--
-- Name: staff_departments staff_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_departments
    ADD CONSTRAINT staff_departments_pkey PRIMARY KEY (id);


--
-- Name: staff_departments staff_departments_user_id_department_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_departments
    ADD CONSTRAINT staff_departments_user_id_department_id_key UNIQUE (user_id, department_id);


--
-- Name: staff_profiles staff_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_profiles
    ADD CONSTRAINT staff_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: student_daily_attendance student_daily_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_daily_attendance
    ADD CONSTRAINT student_daily_attendance_pkey PRIMARY KEY (id);


--
-- Name: student_daily_attendance student_daily_attendance_student_id_attendance_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_daily_attendance
    ADD CONSTRAINT student_daily_attendance_student_id_attendance_date_key UNIQUE (student_id, attendance_date);


--
-- Name: student_fees student_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_fees
    ADD CONSTRAINT student_fees_pkey PRIMARY KEY (id);


--
-- Name: student_fees student_fees_student_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_fees
    ADD CONSTRAINT student_fees_student_id_key UNIQUE (student_id);


--
-- Name: student_library_books student_library_books_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_library_books
    ADD CONSTRAINT student_library_books_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: student_profiles student_profiles_roll_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_roll_number_key UNIQUE (roll_number);


--
-- Name: subjects subjects_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_code_key UNIQUE (code);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_question_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_question_id_student_id_key UNIQUE (question_id, student_id);


--
-- Name: user_department_snapshot user_department_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_department_snapshot
    ADD CONSTRAINT user_department_snapshot_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_group_students_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_group_students_group ON public.group_students USING btree (group_id);


--
-- Name: idx_group_students_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_group_students_student ON public.group_students USING btree (student_id);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_role, recipient_id);


--
-- Name: idx_questions_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_questions_target ON public.questions USING btree (target_type, target_group_id);


--
-- Name: idx_questions_target_dept; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_questions_target_dept ON public.questions USING btree (target_department_id);


--
-- Name: idx_questions_target_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_questions_target_group ON public.questions USING btree (target_group_id);


--
-- Name: idx_questions_target_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_questions_target_year ON public.questions USING btree (target_year);


--
-- Name: idx_questions_teacher_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_questions_teacher_id ON public.questions USING btree (teacher_id);


--
-- Name: idx_sda_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sda_date ON public.student_daily_attendance USING btree (attendance_date);


--
-- Name: idx_sda_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sda_student ON public.student_daily_attendance USING btree (student_id);


--
-- Name: idx_staff_departments_dept; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staff_departments_dept ON public.staff_departments USING btree (department_id);


--
-- Name: idx_staff_departments_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staff_departments_user ON public.staff_departments USING btree (user_id);


--
-- Name: idx_staff_depts_dept_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staff_depts_dept_id ON public.staff_departments USING btree (department_id);


--
-- Name: idx_staff_depts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staff_depts_user_id ON public.staff_departments USING btree (user_id);


--
-- Name: idx_staff_profiles_dept_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staff_profiles_dept_id ON public.staff_profiles USING btree (department_id);


--
-- Name: idx_staff_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staff_profiles_user_id ON public.staff_profiles USING btree (user_id);


--
-- Name: idx_student_fees_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_fees_status ON public.student_fees USING btree (status);


--
-- Name: idx_student_fees_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_fees_student ON public.student_fees USING btree (student_id);


--
-- Name: idx_student_lib_books_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_lib_books_status ON public.student_library_books USING btree (status);


--
-- Name: idx_student_lib_books_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_lib_books_student ON public.student_library_books USING btree (student_id);


--
-- Name: idx_student_profiles_batch_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_profiles_batch_id ON public.student_profiles USING btree (batch_id);


--
-- Name: idx_student_profiles_dept_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_profiles_dept_id ON public.student_profiles USING btree (department_id);


--
-- Name: idx_student_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_profiles_user_id ON public.student_profiles USING btree (user_id);


--
-- Name: idx_submissions_q_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_submissions_q_student ON public.submissions USING btree (question_id, student_id);


--
-- Name: idx_submissions_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_submissions_student ON public.submissions USING btree (student_id);


--
-- Name: idx_users_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_created_by ON public.users USING btree (created_by_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_role_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role_status ON public.users USING btree (role, status);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: users users_archive_before_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER users_archive_before_delete BEFORE DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trg_archive_user_before_delete();


--
-- Name: users users_archive_on_status_deleted; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER users_archive_on_status_deleted AFTER UPDATE OF status ON public.users FOR EACH ROW EXECUTE FUNCTION public.trg_archive_user_on_status_deleted();


--
-- Name: academic_tasks academic_tasks_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_tasks
    ADD CONSTRAINT academic_tasks_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: attendance_records attendance_records_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: attendance_sessions attendance_sessions_marked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: attendance_sessions attendance_sessions_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: batches batches_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: department_requests department_requests_decided_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_requests
    ADD CONSTRAINT department_requests_decided_by_id_fkey FOREIGN KEY (decided_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: department_requests department_requests_requested_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_requests
    ADD CONSTRAINT department_requests_requested_by_id_fkey FOREIGN KEY (requested_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: department_requests department_requests_requested_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_requests
    ADD CONSTRAINT department_requests_requested_user_id_fkey FOREIGN KEY (requested_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: departments departments_hod_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_hod_user_id_fkey FOREIGN KEY (hod_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: group_students group_students_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_students
    ADD CONSTRAINT group_students_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_students group_students_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_students
    ADD CONSTRAINT group_students_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: groups groups_created_by_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_created_by_teacher_id_fkey FOREIGN KEY (created_by_teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: programs programs_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: questions questions_target_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_target_group_id_fkey FOREIGN KEY (target_group_id) REFERENCES public.groups(id) ON DELETE SET NULL;


--
-- Name: questions questions_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sections sections_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;


--
-- Name: semesters semesters_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semesters
    ADD CONSTRAINT semesters_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE CASCADE;


--
-- Name: staff_departments staff_departments_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_departments
    ADD CONSTRAINT staff_departments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: staff_departments staff_departments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_departments
    ADD CONSTRAINT staff_departments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: staff_profiles staff_profiles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_profiles
    ADD CONSTRAINT staff_profiles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: staff_profiles staff_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_profiles
    ADD CONSTRAINT staff_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_daily_attendance student_daily_attendance_marked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_daily_attendance
    ADD CONSTRAINT student_daily_attendance_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: student_daily_attendance student_daily_attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_daily_attendance
    ADD CONSTRAINT student_daily_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_fees student_fees_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_fees
    ADD CONSTRAINT student_fees_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_fees student_fees_updated_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_fees
    ADD CONSTRAINT student_fees_updated_by_id_fkey FOREIGN KEY (updated_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: student_library_books student_library_books_issued_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_library_books
    ADD CONSTRAINT student_library_books_issued_by_id_fkey FOREIGN KEY (issued_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: student_library_books student_library_books_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_library_books
    ADD CONSTRAINT student_library_books_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_profiles student_profiles_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE SET NULL;


--
-- Name: student_profiles student_profiles_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE SET NULL;


--
-- Name: student_profiles student_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subjects subjects_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;


--
-- Name: subjects subjects_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: subjects subjects_faculty_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_faculty_user_id_fkey FOREIGN KEY (faculty_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: submissions submissions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: submissions submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


