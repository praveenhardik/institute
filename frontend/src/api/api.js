
export function resolveTeacherIdentifier(s) {
  if (!s) return null;
  let clean = String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  clean = clean.replace(/(tec|teacher|classteacher|classtec|ct)l([a-z]+)/g, "$11$2");
  const m_ct = clean.match(/^(?:ct|classteacher|classtec|class_teacher|classteacher)([1-5])?(cse|eee|ece|aero|mect|mech)$/);
  if (m_ct) {
    const yr = m_ct[1] || '1';
    const dept = m_ct[2].toUpperCase();
    return `class teacher${yr} ${dept}`;
  }
  const m_t = clean.match(/^(?:tec|teacher|teach)([1-5])?(cse|eee|ece|aero|mect|mech)$/);
  if (m_t) {
    const yr = m_t[1] || '1';
    const dept = m_t[2].toUpperCase();
    return `teacher${yr} ${dept}`;
  }
  return null;
}

export function parseTeacherDeptAndYear(u) {
  if (!u) return { deptCode: null, year: null, deptName: null };
  const combined = [u.username, u.name, (u.email || '').split('@')[0]].filter(Boolean).join(' ').toLowerCase();
  const cleaned = combined.replace(/^(?:tec|teacher|class(?:_teacher)?|faculty)\s*\d*\s*/, '');
  
  let deptCode = null;
  const deptMap = {
    mect: { code: 'MECT', name: 'Mechatronics Engineering' },
    mech: { code: 'MECH', name: 'Mechanical Engineering' },
    aero: { code: 'AERO', name: 'Aeronautical Engineering' },
    cse: { code: 'CSE', name: 'Computer Science Engineering' },
    eee: { code: 'EEE', name: 'Electrical and Electronics Engineering' },
    ece: { code: 'ECE', name: 'Electrical and Communication Engineering' }
  };
  for (const k of ['mect', 'mech', 'aero', 'cse', 'eee', 'ece']) {
    if (cleaned.includes(k) || combined.includes(k)) {
      deptCode = deptMap[k].code;
      break;
    }
  }
  
  let year = null;
  const fields = [u.username || '', u.name || '', (u.email || '').split('@')[0]];
  for (const f of fields) {
    const mTeacher = f.toLowerCase().match(/(?:class\s*teacher|classteacher|teacher|tec|class)\s*([1-5])/);
    if (mTeacher) {
      year = Number(mTeacher[1]);
      break;
    }
    const mEnd = f.trim().toLowerCase().match(/([1-5])\s*$/);
    if (mEnd) {
      year = Number(mEnd[1]);
      break;
    }
  }
  return {
    deptCode,
    year,
    deptName: deptCode ? (deptMap[deptCode.toLowerCase()]?.name || null) : null
  };
}

/**
 * Unified API Client for College Quiz & Role Management Portal
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");



// Clean up legacy localStorage keys once so tabs never share tokens
try {
  localStorage.removeItem("quiz_auth_token");
  localStorage.removeItem("quiz_auth_user");
} catch {}

// --- Client-side Fallback & Mock Engine for Standalone Vercel Deployments ---
const DEFAULT_PORTAL_USERS = [
  { id: 1, name: "Dean", username: "dean", email: "dean1@inpand.com", role: "dean", status: "active", department_name: null, department_code: null, designation: "Dean of Academic Affairs" },
  { id: 2, name: "Super Admin", username: "superadmin", email: "superadmin1@inpand.com", role: "super_admin", status: "active", department_name: null, department_code: null, designation: "Chief Institutional Administrator" },
  { id: 3, name: "Admin", username: "admin", email: "admin1@inpand.com", role: "admin", status: "active", department_name: null, department_code: null, designation: "College Administrator" },
  { id: 4, name: "Principal", username: "principal", email: "principal1@inpand.com", role: "principal", status: "active", department_name: null, department_code: null, designation: "College Principal" },
  { id: 5, name: "HOD", username: "hod", email: "hod1@inpand.com", role: "hod", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", designation: "Head of Department (CSE)" },
  { id: 22, name: "class teacher1 CSE", username: "class teacher1 CSE", email: "classteacher1cse@inpand.com", role: "class_teacher", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", designation: "Class Teacher (CSE Year 1)" },
  { id: 23, name: "teacher1 CSE", username: "teacher1 CSE", email: "teacher1cse@inpand.com", role: "teacher", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", designation: "Teacher (CSE Year 1)" },
  { id: 24, name: "class teacher2 CSE", username: "class teacher2 CSE", email: "classteacher2cse@inpand.com", role: "class_teacher", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", designation: "Class Teacher (CSE Year 2)" },
  { id: 25, name: "teacher2 CSE", username: "teacher2 CSE", email: "teacher2cse@inpand.com", role: "teacher", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", designation: "Teacher (CSE Year 2)" },
  { id: 26, name: "class teacher3 CSE", username: "class teacher3 CSE", email: "classteacher3cse@inpand.com", role: "class_teacher", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", designation: "Class Teacher (CSE Year 3)" },
  { id: 27, name: "teacher3 CSE", username: "teacher3 CSE", email: "teacher3cse@inpand.com", role: "teacher", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", designation: "Teacher (CSE Year 3)" },
  { id: 28, name: "class teacher4 CSE", username: "class teacher4 CSE", email: "classteacher4cse@inpand.com", role: "class_teacher", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", designation: "Class Teacher (CSE Year 4)" },
  { id: 29, name: "teacher4 CSE", username: "teacher4 CSE", email: "teacher4cse@inpand.com", role: "teacher", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", designation: "Teacher (CSE Year 4)" },
  { id: 30, name: "class teacher5 CSE", username: "class teacher5 CSE", email: "classteacher5cse@inpand.com", role: "class_teacher", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", designation: "Class Teacher (CSE Year 5)" },
  { id: 31, name: "teacher5 CSE", username: "teacher5 CSE", email: "teacher5cse@inpand.com", role: "teacher", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", designation: "Teacher (CSE Year 5)" },
  { id: 32, name: "class teacher1 EEE", username: "class teacher1 EEE", email: "classteacher1eee@inpand.com", role: "class_teacher", status: "active", department_id: 5, department_name: "Electrical and Electronics Engineering", department_code: "EEE", designation: "Class Teacher (EEE Year 1)" },
  { id: 33, name: "teacher1 EEE", username: "teacher1 EEE", email: "teacher1eee@inpand.com", role: "teacher", status: "active", department_id: 5, department_name: "Electrical and Electronics Engineering", department_code: "EEE", designation: "Teacher (EEE Year 1)" },
  { id: 34, name: "class teacher2 EEE", username: "class teacher2 EEE", email: "classteacher2eee@inpand.com", role: "class_teacher", status: "active", department_id: 5, department_name: "Electrical and Electronics Engineering", department_code: "EEE", designation: "Class Teacher (EEE Year 2)" },
  { id: 35, name: "teacher2 EEE", username: "teacher2 EEE", email: "teacher2eee@inpand.com", role: "teacher", status: "active", department_id: 5, department_name: "Electrical and Electronics Engineering", department_code: "EEE", designation: "Teacher (EEE Year 2)" },
  { id: 36, name: "class teacher3 EEE", username: "class teacher3 EEE", email: "classteacher3eee@inpand.com", role: "class_teacher", status: "active", department_id: 5, department_name: "Electrical and Electronics Engineering", department_code: "EEE", designation: "Class Teacher (EEE Year 3)" },
  { id: 37, name: "teacher3 EEE", username: "teacher3 EEE", email: "teacher3eee@inpand.com", role: "teacher", status: "active", department_id: 5, department_name: "Electrical and Electronics Engineering", department_code: "EEE", designation: "Teacher (EEE Year 3)" },
  { id: 38, name: "class teacher4 EEE", username: "class teacher4 EEE", email: "classteacher4eee@inpand.com", role: "class_teacher", status: "active", department_id: 5, department_name: "Electrical and Electronics Engineering", department_code: "EEE", designation: "Class Teacher (EEE Year 4)" },
  { id: 39, name: "teacher4 EEE", username: "teacher4 EEE", email: "teacher4eee@inpand.com", role: "teacher", status: "active", department_id: 5, department_name: "Electrical and Electronics Engineering", department_code: "EEE", designation: "Teacher (EEE Year 4)" },
  { id: 40, name: "class teacher5 EEE", username: "class teacher5 EEE", email: "classteacher5eee@inpand.com", role: "class_teacher", status: "active", department_id: 5, department_name: "Electrical and Electronics Engineering", department_code: "EEE", designation: "Class Teacher (EEE Year 5)" },
  { id: 41, name: "teacher5 EEE", username: "teacher5 EEE", email: "teacher5eee@inpand.com", role: "teacher", status: "active", department_id: 5, department_name: "Electrical and Electronics Engineering", department_code: "EEE", designation: "Teacher (EEE Year 5)" },
  { id: 42, name: "class teacher1 ECE", username: "class teacher1 ECE", email: "classteacher1ece@inpand.com", role: "class_teacher", status: "active", department_id: 6, department_name: "Electrical and Communication Engineering", department_code: "ECE", designation: "Class Teacher (ECE Year 1)" },
  { id: 43, name: "teacher1 ECE", username: "teacher1 ECE", email: "teacher1ece@inpand.com", role: "teacher", status: "active", department_id: 6, department_name: "Electrical and Communication Engineering", department_code: "ECE", designation: "Teacher (ECE Year 1)" },
  { id: 44, name: "class teacher2 ECE", username: "class teacher2 ECE", email: "classteacher2ece@inpand.com", role: "class_teacher", status: "active", department_id: 6, department_name: "Electrical and Communication Engineering", department_code: "ECE", designation: "Class Teacher (ECE Year 2)" },
  { id: 45, name: "teacher2 ECE", username: "teacher2 ECE", email: "teacher2ece@inpand.com", role: "teacher", status: "active", department_id: 6, department_name: "Electrical and Communication Engineering", department_code: "ECE", designation: "Teacher (ECE Year 2)" },
  { id: 46, name: "class teacher3 ECE", username: "class teacher3 ECE", email: "classteacher3ece@inpand.com", role: "class_teacher", status: "active", department_id: 6, department_name: "Electrical and Communication Engineering", department_code: "ECE", designation: "Class Teacher (ECE Year 3)" },
  { id: 47, name: "teacher3 ECE", username: "teacher3 ECE", email: "teacher3ece@inpand.com", role: "teacher", status: "active", department_id: 6, department_name: "Electrical and Communication Engineering", department_code: "ECE", designation: "Teacher (ECE Year 3)" },
  { id: 48, name: "class teacher4 ECE", username: "class teacher4 ECE", email: "classteacher4ece@inpand.com", role: "class_teacher", status: "active", department_id: 6, department_name: "Electrical and Communication Engineering", department_code: "ECE", designation: "Class Teacher (ECE Year 4)" },
  { id: 49, name: "teacher4 ECE", username: "teacher4 ECE", email: "teacher4ece@inpand.com", role: "teacher", status: "active", department_id: 6, department_name: "Electrical and Communication Engineering", department_code: "ECE", designation: "Teacher (ECE Year 4)" },
  { id: 50, name: "class teacher5 ECE", username: "class teacher5 ECE", email: "classteacher5ece@inpand.com", role: "class_teacher", status: "active", department_id: 6, department_name: "Electrical and Communication Engineering", department_code: "ECE", designation: "Class Teacher (ECE Year 5)" },
  { id: 51, name: "teacher5 ECE", username: "teacher5 ECE", email: "teacher5ece@inpand.com", role: "teacher", status: "active", department_id: 6, department_name: "Electrical and Communication Engineering", department_code: "ECE", designation: "Teacher (ECE Year 5)" },
  { id: 52, name: "class teacher1 AERO", username: "class teacher1 AERO", email: "classteacher1aero@inpand.com", role: "class_teacher", status: "active", department_id: 4, department_name: "Aeronautical Engineering", department_code: "AERO", designation: "Class Teacher (AERO Year 1)" },
  { id: 53, name: "teacher1 AERO", username: "teacher1 AERO", email: "teacher1aero@inpand.com", role: "teacher", status: "active", department_id: 4, department_name: "Aeronautical Engineering", department_code: "AERO", designation: "Teacher (AERO Year 1)" },
  { id: 54, name: "class teacher2 AERO", username: "class teacher2 AERO", email: "classteacher2aero@inpand.com", role: "class_teacher", status: "active", department_id: 4, department_name: "Aeronautical Engineering", department_code: "AERO", designation: "Class Teacher (AERO Year 2)" },
  { id: 55, name: "teacher2 AERO", username: "teacher2 AERO", email: "teacher2aero@inpand.com", role: "teacher", status: "active", department_id: 4, department_name: "Aeronautical Engineering", department_code: "AERO", designation: "Teacher (AERO Year 2)" },
  { id: 56, name: "class teacher3 AERO", username: "class teacher3 AERO", email: "classteacher3aero@inpand.com", role: "class_teacher", status: "active", department_id: 4, department_name: "Aeronautical Engineering", department_code: "AERO", designation: "Class Teacher (AERO Year 3)" },
  { id: 57, name: "teacher3 AERO", username: "teacher3 AERO", email: "teacher3aero@inpand.com", role: "teacher", status: "active", department_id: 4, department_name: "Aeronautical Engineering", department_code: "AERO", designation: "Teacher (AERO Year 3)" },
  { id: 58, name: "class teacher4 AERO", username: "class teacher4 AERO", email: "classteacher4aero@inpand.com", role: "class_teacher", status: "active", department_id: 4, department_name: "Aeronautical Engineering", department_code: "AERO", designation: "Class Teacher (AERO Year 4)" },
  { id: 59, name: "teacher4 AERO", username: "teacher4 AERO", email: "teacher4aero@inpand.com", role: "teacher", status: "active", department_id: 4, department_name: "Aeronautical Engineering", department_code: "AERO", designation: "Teacher (AERO Year 4)" },
  { id: 60, name: "class teacher5 AERO", username: "class teacher5 AERO", email: "classteacher5aero@inpand.com", role: "class_teacher", status: "active", department_id: 4, department_name: "Aeronautical Engineering", department_code: "AERO", designation: "Class Teacher (AERO Year 5)" },
  { id: 61, name: "teacher5 AERO", username: "teacher5 AERO", email: "teacher5aero@inpand.com", role: "teacher", status: "active", department_id: 4, department_name: "Aeronautical Engineering", department_code: "AERO", designation: "Teacher (AERO Year 5)" },
  { id: 62, name: "class teacher1 MECT", username: "class teacher1 MECT", email: "classteacher1mect@inpand.com", role: "class_teacher", status: "active", department_id: 3, department_name: "Mechatronics Engineering", department_code: "MECT", designation: "Class Teacher (MECT Year 1)" },
  { id: 63, name: "teacher1 MECT", username: "teacher1 MECT", email: "teacher1mect@inpand.com", role: "teacher", status: "active", department_id: 3, department_name: "Mechatronics Engineering", department_code: "MECT", designation: "Teacher (MECT Year 1)" },
  { id: 64, name: "class teacher2 MECT", username: "class teacher2 MECT", email: "classteacher2mect@inpand.com", role: "class_teacher", status: "active", department_id: 3, department_name: "Mechatronics Engineering", department_code: "MECT", designation: "Class Teacher (MECT Year 2)" },
  { id: 65, name: "teacher2 MECT", username: "teacher2 MECT", email: "teacher2mect@inpand.com", role: "teacher", status: "active", department_id: 3, department_name: "Mechatronics Engineering", department_code: "MECT", designation: "Teacher (MECT Year 2)" },
  { id: 66, name: "class teacher3 MECT", username: "class teacher3 MECT", email: "classteacher3mect@inpand.com", role: "class_teacher", status: "active", department_id: 3, department_name: "Mechatronics Engineering", department_code: "MECT", designation: "Class Teacher (MECT Year 3)" },
  { id: 67, name: "teacher3 MECT", username: "teacher3 MECT", email: "teacher3mect@inpand.com", role: "teacher", status: "active", department_id: 3, department_name: "Mechatronics Engineering", department_code: "MECT", designation: "Teacher (MECT Year 3)" },
  { id: 68, name: "class teacher4 MECT", username: "class teacher4 MECT", email: "classteacher4mect@inpand.com", role: "class_teacher", status: "active", department_id: 3, department_name: "Mechatronics Engineering", department_code: "MECT", designation: "Class Teacher (MECT Year 4)" },
  { id: 69, name: "teacher4 MECT", username: "teacher4 MECT", email: "teacher4mect@inpand.com", role: "teacher", status: "active", department_id: 3, department_name: "Mechatronics Engineering", department_code: "MECT", designation: "Teacher (MECT Year 4)" },
  { id: 70, name: "class teacher5 MECT", username: "class teacher5 MECT", email: "classteacher5mect@inpand.com", role: "class_teacher", status: "active", department_id: 3, department_name: "Mechatronics Engineering", department_code: "MECT", designation: "Class Teacher (MECT Year 5)" },
  { id: 71, name: "teacher5 MECT", username: "teacher5 MECT", email: "teacher5mect@inpand.com", role: "teacher", status: "active", department_id: 3, department_name: "Mechatronics Engineering", department_code: "MECT", designation: "Teacher (MECT Year 5)" },
  { id: 72, name: "class teacher1 MECH", username: "class teacher1 MECH", email: "classteacher1mech@inpand.com", role: "class_teacher", status: "active", department_id: 2, department_name: "Mechanical Engineering", department_code: "MECH", designation: "Class Teacher (MECH Year 1)" },
  { id: 73, name: "teacher1 MECH", username: "teacher1 MECH", email: "teacher1mech@inpand.com", role: "teacher", status: "active", department_id: 2, department_name: "Mechanical Engineering", department_code: "MECH", designation: "Teacher (MECH Year 1)" },
  { id: 74, name: "class teacher2 MECH", username: "class teacher2 MECH", email: "classteacher2mech@inpand.com", role: "class_teacher", status: "active", department_id: 2, department_name: "Mechanical Engineering", department_code: "MECH", designation: "Class Teacher (MECH Year 2)" },
  { id: 75, name: "teacher2 MECH", username: "teacher2 MECH", email: "teacher2mech@inpand.com", role: "teacher", status: "active", department_id: 2, department_name: "Mechanical Engineering", department_code: "MECH", designation: "Teacher (MECH Year 2)" },
  { id: 76, name: "class teacher3 MECH", username: "class teacher3 MECH", email: "classteacher3mech@inpand.com", role: "class_teacher", status: "active", department_id: 2, department_name: "Mechanical Engineering", department_code: "MECH", designation: "Class Teacher (MECH Year 3)" },
  { id: 77, name: "teacher3 MECH", username: "teacher3 MECH", email: "teacher3mech@inpand.com", role: "teacher", status: "active", department_id: 2, department_name: "Mechanical Engineering", department_code: "MECH", designation: "Teacher (MECH Year 3)" },
  { id: 78, name: "class teacher4 MECH", username: "class teacher4 MECH", email: "classteacher4mech@inpand.com", role: "class_teacher", status: "active", department_id: 2, department_name: "Mechanical Engineering", department_code: "MECH", designation: "Class Teacher (MECH Year 4)" },
  { id: 79, name: "teacher4 MECH", username: "teacher4 MECH", email: "teacher4mech@inpand.com", role: "teacher", status: "active", department_id: 2, department_name: "Mechanical Engineering", department_code: "MECH", designation: "Teacher (MECH Year 4)" },
  { id: 80, name: "class teacher5 MECH", username: "class teacher5 MECH", email: "classteacher5mech@inpand.com", role: "class_teacher", status: "active", department_id: 2, department_name: "Mechanical Engineering", department_code: "MECH", designation: "Class Teacher (MECH Year 5)" },
  { id: 81, name: "teacher5 MECH", username: "teacher5 MECH", email: "teacher5mech@inpand.com", role: "teacher", status: "active", department_id: 2, department_name: "Mechanical Engineering", department_code: "MECH", designation: "Teacher (MECH Year 5)" },
  { id: 8, name: "Student", username: "student", email: "student1@inpand.com", role: "student", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", roll_number: "CSE2026001", batch_name: "Batch 2026-2030", section_name: "A", academic_year: 1 },
  { id: 9, name: "Class Leader", username: "classleader", email: "classleader1@inpand.com", role: "class_leader", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", roll_number: "CSE2026002", batch_name: "Batch 2026-2030", section_name: "A", academic_year: 1 },
  { id: 10, name: "Accountant", username: "accountant", email: "accountant1@inpand.com", role: "accountant", status: "active", designation: "Senior Accountant / Bursar" },
  { id: 11, name: "Librarian", username: "librarian", email: "librarian1@inpand.com", role: "librarian", status: "active", designation: "Chief Librarian" },
  { id: 12, name: "Parent", username: "parent", email: "parent1@inpand.com", role: "parent", status: "active", designation: "Parent / Guardian" }
];

const CANONICAL_DEPTS = [
  { id: 1, name: "Computer Science Engineering", code: "CSE", hod_user_id: 5, hod_name: "HOD" },
  { id: 2, name: "Mechanical Engineering", code: "MECH", hod_user_id: 5, hod_name: "HOD" },
  { id: 3, name: "Mechatronics Engineering", code: "MECT", hod_user_id: 5, hod_name: "HOD" },
  { id: 4, name: "Aeronautical Engineering", code: "AERO", hod_user_id: 5, hod_name: "HOD" },
  { id: 5, name: "Electrical and Electronics Engineering", code: "EEE", hod_user_id: 5, hod_name: "HOD" },
  { id: 6, name: "Electrical and Communication Engineering", code: "ECE", hod_user_id: 5, hod_name: "HOD" }
];

const DEPTS_SCHEMA_VERSION = "v4_all_depts_hod_assigned";

function getStoredDepartments() {
  try {
    const ver = localStorage.getItem("portal_depts_version");
    if (ver !== DEPTS_SCHEMA_VERSION) {
      localStorage.setItem("portal_depts_version", DEPTS_SCHEMA_VERSION);
      const migrated = CANONICAL_DEPTS.map(d => ({ ...d, hod_user_id: 5, hod_name: "HOD" }));
      localStorage.setItem("portal_departments", JSON.stringify(migrated));
      return migrated;
    }
    const raw = localStorage.getItem("portal_departments");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(d => ({
          ...d,
          hod_user_id: d.hod_user_id || 5,
          hod_name: d.hod_name || "HOD"
        }));
      }
    }
  } catch {}
  return CANONICAL_DEPTS.map(d => ({ ...d, hod_user_id: 5, hod_name: "HOD" }));
}

function saveStoredDepartments(depts) {
  try {
    localStorage.setItem("portal_departments", JSON.stringify(depts));
  } catch {}
}

function getDepartmentNameById(deptId) {
  if (!deptId) return null;
  const depts = getStoredDepartments();
  const d = depts.find(item => Number(item.id) === Number(deptId));
  return d ? d.name : "Computer Science Engineering";
}

const USERS_SCHEMA_VERSION = "v10_60_dept_teachers_and_aliases";

function getStoredUsers() {
  try {
    const ver = localStorage.getItem("portal_users_version");
    if (ver !== USERS_SCHEMA_VERSION) {
      localStorage.setItem("portal_users_version", USERS_SCHEMA_VERSION);
      localStorage.setItem("portal_all_users", JSON.stringify(DEFAULT_PORTAL_USERS));
      return [...DEFAULT_PORTAL_USERS];
    }
    const raw = localStorage.getItem("portal_all_users");
    if (raw) {
      const parsed = JSON.parse(raw);
      const cleaned = parsed.map(u => {
        const lowerName = (u.name || '').toLowerCase();
        if (lowerName === 'eleanor') u = { ...DEFAULT_PORTAL_USERS[1] };
        else if (lowerName === 'xavier') u = { ...DEFAULT_PORTAL_USERS[4] };
        else if (lowerName === 'alan') u = { ...DEFAULT_PORTAL_USERS[5] };
        else if (lowerName === 'lovelace') u = { ...DEFAULT_PORTAL_USERS[6] };
        else if (lowerName === 'alex') u = { ...DEFAULT_PORTAL_USERS[7] };
        else if (lowerName === 'leader') u = { ...DEFAULT_PORTAL_USERS[8] };
        else if (lowerName === 'arthur') u = { ...DEFAULT_PORTAL_USERS[9] };

        if (!['student', 'class_leader'].includes(u.role)) {
          u.academic_year = null;
          u.previous_year = null;
        }
        return u;
      });
      return cleaned.length > 0 ? cleaned : [...DEFAULT_PORTAL_USERS];
    }
  } catch {}
  return [...DEFAULT_PORTAL_USERS];
}

function saveStoredUsers(users) {
  try {
    localStorage.setItem("portal_all_users", JSON.stringify(users));
  } catch {}
}

const DEFAULT_NOTIFICATIONS = [
  { id: 1, title: "Welcome to EduPortal", message: "Your institutional portal is active and ready across all portions.", created_at: "2026-08-01 09:00:00", is_read: 0, sender_name: "Administration", sender_role: "admin", type: "broadcast" }
];

function getStoredNotifications() {
  try {
    const raw = localStorage.getItem("portal_notifications");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_NOTIFICATIONS];
}

function saveStoredNotifications(notifs) {
  try {
    localStorage.setItem("portal_notifications", JSON.stringify(notifs));
  } catch {}
}

function getStoredLibraryBooks() {
  try {
    const raw = localStorage.getItem("portal_library_books");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [
    { id: 1, student_id: 8, book_name: "Introduction to Algorithms (CLRS 4th Edition)", validity_date: "2027-05-31", status: "issued", issued_at: "2026-08-01 10:00:00", returned_at: null },
    { id: 2, student_id: 9, book_name: "Operating System Concepts", validity_date: "2027-06-30", status: "issued", issued_at: "2026-08-01 11:00:00", returned_at: null }
  ];
}

function saveStoredLibraryBooks(books) {
  try {
    localStorage.setItem("portal_library_books", JSON.stringify(books));
  } catch {}
}

function getStoredFees() {
  try {
    const raw = localStorage.getItem("portal_fees_records");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [
    { student_id: 8, fee_amount: 50000, paid_amount: 50000, status: "paid", paid_at: "2026-08-01 10:00:00" },
    { student_id: 9, fee_amount: 50000, paid_amount: 0, status: "unpaid", paid_at: null }
  ];
}

function saveStoredFees(fees) {
  try {
    localStorage.setItem("portal_fees_records", JSON.stringify(fees));
  } catch {}
}

function handleLocalFallback(endpoint, options = {}, config = {}) {
  const method = (options.method || config.method || "GET").toUpperCase();
  const [path] = endpoint.split("?");
  let body = {};
  try {
    body = typeof options.body === "string" ? JSON.parse(options.body || "{}") : (options.body || {});
  } catch {
    body = {};
  }

  // 1. /api/auth/login
  if (path === "/api/auth/login" && method === "POST") {
    const rawId = (body.username || body.email_or_phone || body.email || body.identifier || "").trim().toLowerCase();
    let cleanId = rawId.includes("@") ? rawId.split("@")[0] : rawId;
    const suffixes = [" login", " portal", " account", " user", "_login", "_portal", "-login", "-portal"];
    for (const suffix of suffixes) {
      if (cleanId.endsWith(suffix)) {
        cleanId = cleanId.slice(0, -suffix.length).trim();
      }
    }
    const normKey = cleanId.replace(/[^a-z0-9]/g, "");
    const pwd = (body.password || "").trim();

    const roleAliases = {
      // Super Admin
      super: "super_admin",
      superadmin: "super_admin",
      super_admin: "super_admin",
      sujper: "super_admin",
      sujperadmin: "super_admin",
      sujper_admin: "super_admin",
      supper: "super_admin",
      supperadmin: "super_admin",
      // Admin
      admin: "admin",
      admins: "admin",
      administrator: "admin",
      collegeadmin: "admin",
      // Dean
      dean: "dean",
      deans: "dean",
      // Principal
      principal: "principal",
      principals: "principal",
      // HOD
      hod: "hod",
      hods: "hod",
      xavier: "hod",
      headofdepartment: "hod",
      hodcse: "hod",
      hodeee: "hod",
      hodece: "hod",
      hodmech: "hod",
      hodmect: "hod",
      hodaero: "hod",
      // Teacher
      teacher: "teacher",
      teachers: "teacher",
      faculty: "teacher",
      alan: "teacher",
      tec1cse: "teacher",
      tec1eee: "teacher",
      tecleee: "teacher",
      teceee: "teacher",
      teccse: "teacher",
      tec1mech: "teacher",
      tec1ece: "teacher",
      tec1aero: "teacher",
      tec1mect: "teacher",
      teacher1: "teacher",
      teacher2: "teacher",
      // Class Teacher
      classteacher: "class_teacher",
      class_teacher: "class_teacher",
      lovelace: "class_teacher",
      classcse2: "class_teacher",
      classtec: "class_teacher",
      // Student
      student: "student",
      students: "student",
      alex: "student",
      stu11_cse: "student",
      stu11cse: "student",
      stu1: "student",
      stucse: "student",
      stueee: "student",
      stumech: "student",
      stuaero: "student",
      stuece: "student",
      stumect: "student",
      student1: "student",
      student2: "student",
      // Class Leader
      classleader: "class_leader",
      class_leader: "class_leader",
      leader: "class_leader",
      leaders: "class_leader",
      leadercse1: "class_leader",
      leader1: "class_leader",
      // Accountant
      accountant: "accountant",
      accountants: "accountant",
      staff: "accountant",
      arthur: "accountant",
      accounts: "accountant",
      account: "accountant",
      bursar: "accountant",
      // Librarian
      librarian: "librarian",
      librarians: "librarian",
      libratrian: "librarian",
      libratrians: "librarian",
      library: "librarian",
      // Parent
      parent: "parent",
      parents: "parent",
      guardian: "parent",
      guardians: "parent"
    };

    const users = getStoredUsers();
    let matched = users.find(u =>
      (u.username && u.username.toLowerCase() === rawId) ||
      (u.email && u.email.toLowerCase() === rawId) ||
      (u.name && u.name.toLowerCase() === rawId) ||
      (u.username && u.username.toLowerCase() === cleanId) ||
      (u.name && u.name.toLowerCase() === cleanId) ||
      (u.username && u.username.toLowerCase().replace(/[^a-z0-9]/g, "") === normKey) ||
      (u.name && u.name.toLowerCase().replace(/[^a-z0-9]/g, "") === normKey)
    );

    if (!matched) {
      const resolvedT = resolveTeacherIdentifier(cleanId) || resolveTeacherIdentifier(normKey);
      if (resolvedT) {
        matched = users.find(u =>
          (u.username && u.username.toLowerCase() === resolvedT.toLowerCase()) ||
          (u.name && u.name.toLowerCase() === resolvedT.toLowerCase()) ||
          (u.username && u.username.toLowerCase().replace(/[^a-z0-9]/g, "") === resolvedT.toLowerCase().replace(/[^a-z0-9]/g, ""))
        );
      }
    }

    let targetRole = roleAliases[cleanId] || roleAliases[normKey];
    if (!targetRole) {
      if (normKey.startsWith("tec") || normKey.startsWith("teach")) {
        targetRole = "teacher";
      } else if (normKey.startsWith("stu")) {
        targetRole = "student";
      } else if (normKey.startsWith("lead")) {
        targetRole = "class_leader";
      } else if (normKey.startsWith("classt")) {
        targetRole = "class_teacher";
      } else if (normKey.startsWith("libr")) {
        targetRole = "librarian";
      } else if (normKey.startsWith("acc")) {
        targetRole = "accountant";
      } else if (normKey.startsWith("sup") || normKey.startsWith("sujp")) {
        targetRole = "super_admin";
      } else if (normKey.startsWith("adm")) {
        targetRole = "admin";
      } else if (normKey.startsWith("prin")) {
        targetRole = "principal";
      } else if (normKey.startsWith("dean")) {
        targetRole = "dean";
      } else if (normKey.startsWith("hod")) {
        targetRole = "hod";
      } else if (normKey.startsWith("par") || normKey.startsWith("guard")) {
        targetRole = "parent";
      }
    }

    if (!matched && targetRole) {
      matched = users.find(u => u.role === targetRole);
    }

    if (!matched) {
      throw new Error("Invalid user name or password");
    }

    const cleanPwd = pwd.toLowerCase();
    const isValidPwd = !pwd || cleanPwd === "admin@123" || cleanPwd === "admin123" || cleanPwd === "admin" || (matched.password && matched.password === pwd);
    if (!isValidPwd) {
      throw new Error("Invalid user name or password");
    }

    let tokenPayload = {
      user_id: matched.id,
      role: matched.role,
      name: matched.name,
      email: matched.email,
      exp: Math.floor(Date.now() / 1000) + 86400
    };
    let mockToken = "mock_jwt_" + btoa(unescape(encodeURIComponent(JSON.stringify(tokenPayload))));

    const userObj = {
      id: matched.id,
      name: matched.name,
      username: matched.username,
      email: matched.email,
      role: matched.role,
      status: matched.status || "active",
      department_id: matched.department_id || (["hod", "teacher", "class_teacher", "student", "class_leader"].includes(matched.role) ? 1 : null),
      department_name: matched.department_name || (["hod", "teacher", "class_teacher", "student", "class_leader"].includes(matched.role) ? "Computer Science Engineering" : null),
      department_code: matched.department_code || (["hod", "teacher", "class_teacher", "student", "class_leader"].includes(matched.role) ? "CSE" : null)
    };

    return {
      token: mockToken,
      user: userObj
    };
  }

  // 2. /api/auth/me
  if (path === "/api/auth/me") {
    const u = API.getCurrentUser() || DEFAULT_PORTAL_USERS[0];
    return { user: u };
  }

  // 3. /api/auth/super-admin-status
  if (path === "/api/auth/super-admin-status") {
    return { exists: false };
  }

  // 4. /api/auth/principal-status
  if (path === "/api/auth/principal-status") {
    return { exists: true };
  }

  // 5. /api/auth/check-name
  if (path === "/api/auth/check-name") {
    return { eligible: true, message: "Name is eligible" };
  }

  // 6. /api/auth/forgot-password
  if (path === "/api/auth/forgot-password") {
    return { message: "Password has been successfully reset! Please sign in with your new password." };
  }

  // 7. /api/auth/change-password
  if (path === "/api/auth/change-password") {
    return { message: "Password updated successfully!" };
  }

  // 8. /api/auth/register-student
  if (path === "/api/auth/register-student" && method === "POST") {
    const users = getStoredUsers();
    const newId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 100;
    const newUser = {
      id: newId,
      name: body.name || "New User",
      username: body.username || (body.name || "").toLowerCase().replace(/\s+/g, ""),
      email: body.email_or_phone || `${(body.username || "user")}1@inpand.com`,
      role: body.role || "student",
      status: "active",
      password: body.password || "Admin@123"
    };
    users.push(newUser);
    saveStoredUsers(users);
    return {
      message: `${newUser.role.replace("_", " ")} account for ${newUser.name} created successfully! You can sign in now.`,
      name: newUser.name,
      student_id: newId,
      role: newUser.role,
      status: "active"
    };
  }

  // 9. /api/college-name
  if (path === "/api/college-name") {
    if (method === "POST" || method === "PUT") {
      const newName = (body.name || "").trim() || "INPAND institute of Engineering and Technology";
      try { localStorage.setItem("college_name", newName); } catch {}
      return { name: newName, message: `Institute name updated to '${newName}' successfully.` };
    }
    let cur = "INPAND institute of Engineering and Technology";
    try { cur = localStorage.getItem("college_name") || cur; } catch {}
    return { name: cur };
  }

  // 10. /api/college/departments
  if (path === "/api/college/departments") {
    const depts = getStoredDepartments();
    if (method === "POST") {
      const cur = API.getCurrentUser();
      if (cur?.role !== "super_admin") {
        throw new Error("Forbidden: Only Super Admins can add an Academic Department.");
      }
      const name = (body.name || "").trim();
      const code = (body.code || "").trim().toUpperCase();
      if (!name || !code) {
        throw new Error("Department name and code are required.");
      }
      if (depts.length >= 10) {
        throw new Error("Maximum limit of 10 departments reached for this college.");
      }
      const existing = depts.find(d => (d.name || '').toLowerCase() === name.toLowerCase() || (d.code || '').toUpperCase() === code);
      if (existing) {
        throw new Error(`Department '${existing.name}' already exists with this name or code.`);
      }
      const newId = depts.length ? Math.max(...depts.map(d => d.id || 0)) + 1 : 1;
      const newDept = { id: newId, name, code, hod_user_id: 5, hod_name: "HOD" };
      depts.push(newDept);
      saveStoredDepartments(depts);
      return { message: `Department ${name} added`, id: newId, department: newDept };
    }
    return { departments: depts };
  }

  // 10b. DELETE /api/college/departments/:id
  if (path.startsWith("/api/college/departments/") && method === "DELETE") {
    const cur = API.getCurrentUser();
    if (cur?.role !== "super_admin" && cur?.role !== "admin") {
      throw new Error("Forbidden: Only Super Admins can delete an Academic Department.");
    }
    const deptId = parseInt(path.split("/").pop(), 10);
    const depts = getStoredDepartments();
    const targetDept = depts.find(d => d.id === deptId);
    if (!targetDept) {
      throw new Error("Department not found.");
    }

    // 1. Remove department from stored list
    const updatedDepts = depts.filter(d => d.id !== deptId);
    saveStoredDepartments(updatedDepts);

    // 2. Cascade delete all students enrolled in this department
    const allUsers = getStoredUsers();
    let deletedCount = 0;
    const remainingUsers = allUsers.filter(u => {
      const isStudent = u.role === "student" || u.role === "class_leader";
      if (!isStudent) return true; // Keep faculty/admins
      const matchesDept = (
        u.department_id === deptId ||
        (targetDept.code && (u.department_code || "").toUpperCase() === targetDept.code.toUpperCase()) ||
        (targetDept.name && (u.department_name || "").toLowerCase() === targetDept.name.toLowerCase()) ||
        (targetDept.code && (u.roll_number || "").toUpperCase().startsWith(targetDept.code.toUpperCase()))
      );
      if (matchesDept) {
        deletedCount++;
        return false;
      }
      return true;
    });
    saveStoredUsers(remainingUsers);
    API.setCachedProfiles(remainingUsers);

    return {
      message: `Department '${targetDept.name}' and ${deletedCount} enrolled student(s) have been permanently deleted.`,
      department_id: deptId,
      deleted_students_count: deletedCount
    };
  }

  // 11. /api/college/my-departments
  if (path === "/api/college/my-departments") {
    const cur = API.getCurrentUser();
    const isHod = cur?.role === "hod";
    return {
      departments: [
        { id: 1, name: "Computer Science Engineering", code: "CSE", relation: isHod ? "HOD" : "Member", hod_user_id: isHod ? cur.id : 5 }
      ],
      pending: []
    };
  }

  // 12. /api/college/programs
  if (path === "/api/college/programs") {
    return {
      programs: CANONICAL_DEPTS.map(d => ({
        id: d.id,
        department_id: d.id,
        name: `B.Tech ${d.name}`,
        degree: "B.Tech",
        duration_years: 4
      }))
    };
  }

  // 13. /api/college/batches
  if (path === "/api/college/batches") {
    return {
      batches: [
        { id: 1, program_id: 1, name: "Batch 2026-2030" }
      ]
    };
  }

  // 14. /api/college/sections
  if (path === "/api/college/sections") {
    return {
      sections: [
        { id: 1, batch_id: 1, name: "A" },
        { id: 2, batch_id: 1, name: "B" }
      ]
    };
  }

  // 15. /api/college/academic-years
  if (path === "/api/college/academic-years") {
    return {
      academic_years: [{ id: 1, name: "2026-2027", start_date: "2026-07-01", end_date: "2027-06-30" }],
      years: [{ id: 1, name: "2026-2027", start_date: "2026-07-01", end_date: "2027-06-30" }]
    };
  }

  // 16. /api/college/semesters
  if (path === "/api/college/semesters") {
    return { semesters: [{ id: 1, academic_year_id: 1, name: "Semester 1", start_date: "2026-08-01", end_date: "2026-12-15" }] };
  }

  // 17. /api/college/holidays
  if (path === "/api/college/holidays") {
    return { holidays: [] };
  }

  // 18. /api/admin/profiles
  if (path === "/api/admin/profiles" || path.startsWith("/api/admin/profiles/")) {
    const currentUser = API.getCurrentUser() || { id: 13, name: "Super Admin", role: "super_admin" };
    const singleMatch = path.match(/^\/api\/admin\/profiles\/(\d+)/);
    if (singleMatch) {
      const uId = parseInt(singleMatch[1], 10);
      const user = getStoredUsers().find(u => Number(u.id) === Number(uId)) || DEFAULT_PORTAL_USERS[0];
      const isStudent = ["student", "class_leader"].includes(user.role);
      const canEdit = currentUser.role === "super_admin" || (!isStudent && currentUser.role !== "principal");
      return {
        user: {
          ...user,
          academic_year: isStudent ? (user.academic_year || 1) : null,
          previous_year: isStudent ? user.previous_year : null,
          can_edit: canEdit,
          can_delete: user.role !== "super_admin",
          department_name: user.department_name || (user.department_id ? "Computer Science Engineering" : null)
        },
        details: {},
        can_edit: canEdit
      };
    }
    let allUsers = getStoredUsers();
    // Students can NEVER view other students:
    if (currentUser.role === "student") {
      allUsers = allUsers.filter(u => Number(u.id) === Number(currentUser.id));
    }
    const users = allUsers.map(u => {
      const isStudent = ["student", "class_leader"].includes(u.role);
      const canEdit = currentUser.role === "super_admin" || (!isStudent && currentUser.role !== "principal");
      return {
        ...u,
        academic_year: isStudent ? (u.academic_year || 1) : null,
        previous_year: isStudent ? u.previous_year : null,
        can_edit: canEdit,
        can_delete: u.role !== "super_admin",
        department_name: u.department_name || (getDepartmentNameById(u.department_id)),
        department: u.department_name || (getDepartmentNameById(u.department_id) || "-")
      };
    });
    return { users, profiles: users };
  }

  // 19. /api/admin/dean/super-admin-monitor
  if (path === "/api/admin/dean/super-admin-monitor") {
    const allUsers = getStoredUsers();
    const superAdmins = allUsers.filter(u => u.role === "super_admin");
    const admins = allUsers.filter(u => u.role === "admin");
    const teachers = allUsers.filter(u => ["teacher", "class_teacher"].includes(u.role));
    const students = allUsers.filter(u => ["student", "class_leader"].includes(u.role));
    const hods = allUsers.filter(u => u.role === "hod");

    return {
      super_admins: superAdmins,
      created_by_super_admins: [
        { id: 3, name: "Admin", username: "admin", email: "admin1@inpand.com", role: "admin", status: "active", creator_name: "Super Admin", created_at: "2026-08-02 11:00:00" },
        { id: 5, name: "HOD", username: "hod", email: "hod1@inpand.com", role: "hod", status: "active", creator_name: "Super Admin", created_at: "2026-08-02 11:30:00" },
        { id: 6, name: "Teacher", username: "teacher", email: "teacher1@inpand.com", role: "teacher", status: "active", creator_name: "Super Admin", created_at: "2026-08-03 09:00:00" }
      ],
      system_stats: {
        total_users: allUsers.length,
        total_super_admins: superAdmins.length,
        super_admins: superAdmins.length,
        total_admins: admins.length,
        admins: admins.length,
        total_teachers: teachers.length,
        teachers: teachers.length,
        total_students: students.length,
        students: students.length,
        total_departments: 6,
        total_quizzes: 2,
        hods: hods.length
      },
      recent_broadcasts: getStoredNotifications()
    };
  }

  // 20. /api/admin/create-account
  if (path === "/api/admin/create-account" && method === "POST") {
    const users = getStoredUsers();
    const newId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 100;
    const newUser = {
      id: newId,
      name: body.name || "New User",
      username: body.username || (body.name || "").toLowerCase().replace(/\s+/g, ""),
      email: body.email_or_phone || `${(body.username || "user")}1@inpand.com`,
      role: body.role || "student",
      status: "active",
      password: body.password || "Admin@123",
      designation: body.designation,
      qualification: body.qualification
    };
    users.push(newUser);
    saveStoredUsers(users);
    return {
      message: `Account for ${newUser.name} created successfully!`,
      user_id: newId,
      student_id: newId,
      status: "active"
    };
  }

  // 21. /api/admin/pending-students
  if (path === "/api/admin/pending-students") {
    return { pending_students: [], students: [] };
  }

  // 22. /api/college/staff
  if (path === "/api/college/staff") {
    const staff = getStoredUsers()
      .filter(u => ["hod", "teacher", "class_teacher", "accountant", "librarian"].includes(u.role))
      .map(u => ({ ...u, user_id: u.id, designation: u.designation || "Faculty", department_id: u.department_id || 1, department_name: u.department_name || "Computer Science Engineering" }));
    return { staff };
  }

  // 23. /api/college/students || /api/teacher/students
  if (path === "/api/college/students" || path === "/api/teacher/students" || path === "/api/college/students/by-department") {
    const curUser = API.getCurrentUser();
    let scopedDeptCode = null;
    let scopedYear = null;
    if (curUser && ["teacher", "class_teacher"].includes(curUser.role)) {
      const parsed = parseTeacherDeptAndYear(curUser);
      scopedDeptCode = parsed.deptCode;
      scopedYear = parsed.year;
    }

    const students = getStoredUsers()
      .filter(u => ["student", "class_leader"].includes(u.role))
      .filter(u => {
        if (scopedDeptCode) {
          const deptCode = (u.department_code || "").toUpperCase() || (u.roll_number || "").toUpperCase().slice(0, scopedDeptCode.length);
          if (deptCode && deptCode !== scopedDeptCode) return false;
        }
        if (scopedYear) {
          const sYr = Number(u.academic_year || 1);
          if (sYr !== Number(scopedYear)) return false;
        }
        return true;
      })
      .map(u => ({
        ...u,
        user_id: u.id,
        roll_number: u.roll_number || `CSE202600${u.id}`,
        department_id: u.department_id || 1,
        department_name: u.department_name || "Computer Science Engineering",
        batch_name: "Batch 2026-2030",
        section_name: "A",
        academic_year: u.academic_year || 1
      }));
    return { students, list: students };
  }

  // 24. /api/teacher/groups
  if (path === "/api/teacher/groups") {
    return { groups: [] };
  }

  // 25. /api/teacher/tasks
  if (path === "/api/teacher/tasks") {
    return { tasks: [{ id: 1, task_number: "Task 1", description: "Core Academic Quiz Task" }] };
  }

  // 26. /api/teacher/questions || /api/student/questions
  if (path === "/api/teacher/questions" || path === "/api/student/questions" || path.startsWith("/api/student/questions/")) {
    const sampleQuestions = [
      {
        id: 1,
        teacher_id: 6,
        question_text: "What is the average time complexity of searching an element in a balanced Binary Search Tree (BST)?",
        option_a: "O(1)",
        option_b: "O(log n)",
        option_c: "O(n)",
        option_d: "O(n log n)",
        correct_option: "B",
        duration_seconds: 60,
        target_type: "all",
        task_number: "Task 1",
        teacher_name: "Teacher",
        explanation: "In a balanced binary search tree, the height is logarithmic (log n), resulting in O(log n) search time."
      },
      {
        id: 2,
        teacher_id: 6,
        question_text: "Which of the following data structures operates on a Last In First Out (LIFO) principle?",
        option_a: "Queue",
        option_b: "Array",
        option_c: "Stack",
        option_d: "Linked List",
        correct_option: "C",
        duration_seconds: 45,
        target_type: "all",
        task_number: "Task 1",
        teacher_name: "Teacher",
        explanation: "A Stack is a LIFO (Last In First Out) linear data structure where elements are pushed and popped from the same end."
      }
    ];
    if (path.includes("/submit") && method === "POST") {
      return { is_correct: true, correct_option: "B", message: "Answer submitted successfully!" };
    }
    return { questions: sampleQuestions };
  }

  // 27. /api/fees
  if (path.startsWith("/api/fees")) {
    const feeRecords = getStoredFees();
    const students = getStoredUsers().filter(u => ["student", "class_leader"].includes(u.role));
    
    // Toggle status: /api/fees/students/:id/toggle-status
    const toggleMatch = path.match(/\/api\/fees\/students\/(\d+)\/toggle-status/);
    if (toggleMatch && method === "POST") {
      const sId = Number(toggleMatch[1]);
      let rec = feeRecords.find(f => Number(f.student_id) === sId);
      if (!rec) {
        rec = { student_id: sId, fee_amount: 50000, paid_amount: 0, status: "unpaid", paid_at: null };
        feeRecords.push(rec);
      }
      const newStatus = body.status ? body.status.toLowerCase() : (rec.status === "paid" ? "unpaid" : "paid");
      rec.status = newStatus;
      rec.paid_amount = newStatus === "paid" ? rec.fee_amount : 0;
      rec.paid_at = newStatus === "paid" ? new Date().toISOString() : null;
      saveStoredFees(feeRecords);
      return {
        message: `Fee status updated to ${newStatus.toUpperCase()}`,
        status: newStatus,
        fee_amount: rec.fee_amount,
        paid_amount: rec.paid_amount,
        pending_amount: rec.fee_amount - rec.paid_amount
      };
    }

    // Partial payment: /api/fees/students/:id/partial-payment
    const partialMatch = path.match(/\/api\/fees\/students\/(\d+)\/partial-payment/);
    if (partialMatch && method === "POST") {
      const sId = Number(partialMatch[1]);
      let rec = feeRecords.find(f => Number(f.student_id) === sId);
      if (!rec) {
        rec = { student_id: sId, fee_amount: 50000, paid_amount: 0, status: "unpaid", paid_at: null };
        feeRecords.push(rec);
      }
      const numVal = Math.max(0, Number(body.partial_amount || 0));
      rec.paid_amount = numVal;
      if (numVal >= rec.fee_amount) {
        rec.status = "paid";
      } else if (numVal === 0) {
        rec.status = "unpaid";
      } else {
        rec.status = "partial";
      }
      rec.paid_at = numVal > 0 ? new Date().toISOString() : null;
      saveStoredFees(feeRecords);
      return {
        message: "Partial payment recorded successfully!",
        status: rec.status,
        fee_amount: rec.fee_amount,
        paid_amount: rec.paid_amount,
        pending_amount: Math.max(0, rec.fee_amount - rec.paid_amount),
        paid_at: rec.paid_at
      };
    }

    // Summary: /api/fees/summary
    if (path === "/api/fees/summary") {
      let overall = 0, collected = 0, pending = 0, paidStus = 0, unpaidStus = 0, partialStus = 0;
      students.forEach(st => {
        const rec = feeRecords.find(f => Number(f.student_id) === Number(st.id)) || { fee_amount: 50000, paid_amount: 0, status: "unpaid" };
        const fee = rec.fee_amount || 50000;
        const paid = rec.paid_amount || 0;
        overall += fee;
        collected += paid;
        pending += Math.max(0, fee - paid);
        if (rec.status === "paid") paidStus++;
        else if (rec.status === "partial") partialStus++;
        else unpaidStus++;
      });
      return {
        overall_fees: overall,
        collected_fees: collected,
        pending_fees: pending,
        total_students: students.length,
        paid_students: paidStus,
        unpaid_students: unpaidStus,
        partial_students: partialStus,
        collection_rate: overall > 0 ? Math.round((collected / overall) * 100) : 0
      };
    }

    // Students list: /api/fees/students
    const studentList = students.map(st => {
      const rec = feeRecords.find(f => Number(f.student_id) === Number(st.id)) || { fee_amount: 50000, paid_amount: 0, status: "unpaid" };
      const fee = rec.fee_amount || 50000;
      const paid = rec.paid_amount || 0;
      return {
        student_id: st.id,
        student_name: st.name,
        username: st.username,
        email: st.email,
        roll_number: st.roll_number || `REG-${st.id}`,
        department_id: st.department_id,
        department_name: st.department_name || "Computer Science Engineering",
        fee_amount: fee,
        paid_amount: paid,
        pending_amount: Math.max(0, fee - paid),
        status: rec.status || "unpaid",
        paid_at: rec.paid_at
      };
    });
    return { students: studentList };
  }

  // 28. /api/library
  if (path.startsWith("/api/library")) {
    const libraryBooks = getStoredLibraryBooks();
    const students = getStoredUsers().filter(u => ["student", "class_leader"].includes(u.role));

    // Return book: /api/library/return/:studentId
    const returnMatch = path.match(/\/api\/library\/return\/(\d+)/);
    if (returnMatch && method === "POST") {
      const sId = Number(returnMatch[1]);
      const returnTime = body.returned_at || new Date().toISOString();
      const targetBookId = body.book_id ? Number(body.book_id) : null;
      let returnedCount = 0;
      libraryBooks.forEach(b => {
        if (Number(b.student_id) === sId && b.status === "issued") {
          if (!targetBookId || Number(b.id) === targetBookId) {
            b.status = "returned";
            b.returned_at = returnTime;
            returnedCount++;
          }
        }
      });
      saveStoredLibraryBooks(libraryBooks);
      return { message: "Book returned successfully.", has_book: libraryBooks.some(b => Number(b.student_id) === sId && b.status === "issued") };
    }

    // Issue book: /api/library/issue
    if (path === "/api/library/issue" && method === "POST") {
      const sId = Number(body.student_id);
      const newBook = {
        id: libraryBooks.length ? Math.max(...libraryBooks.map(b => b.id || 0)) + 1 : 1,
        student_id: sId,
        book_name: body.book_name || "Reference Book",
        validity_date: body.validity_date || new Date().toISOString().split("T")[0],
        status: "issued",
        issued_at: new Date().toISOString(),
        returned_at: null
      };
      libraryBooks.unshift(newBook);
      saveStoredLibraryBooks(libraryBooks);
      return { message: `Book "${newBook.book_name}" issued successfully!` };
    }

    // My book: /api/library/my-book
    if (path === "/api/library/my-book") {
      const curUser = API.getCurrentUser();
      const myActive = curUser ? libraryBooks.filter(b => Number(b.student_id) === Number(curUser.id) && b.status === "issued") : [];
      return { books: myActive, has_book: myActive.length > 0 };
    }

    // Books list: /api/library/books
    let issuedCount = 0;
    const studentList = students.map(st => {
      const stuBooks = libraryBooks.filter(b => Number(b.student_id) === Number(st.id));
      const activeBooks = stuBooks.filter(b => b.status === "issued");
      const previousBooks = stuBooks.filter(b => b.status === "returned");
      const hasBook = activeBooks.length > 0;
      if (hasBook) issuedCount++;
      const latest = activeBooks[0] || null;
      return {
        student_id: st.id,
        student_name: st.name,
        email: st.email,
        username: st.username,
        roll_number: st.roll_number || `REG-${st.id}`,
        department_id: st.department_id,
        department_name: st.department_name || "Computer Science Engineering",
        has_book: hasBook,
        book_record_id: latest ? latest.id : null,
        book_name: latest ? latest.book_name : null,
        validity_date: latest ? latest.validity_date : null,
        issued_at: latest ? latest.issued_at : null,
        is_overdue: false,
        active_books: activeBooks,
        previous_books: previousBooks
      };
    });

    return {
      students: studentList,
      total_students: studentList.length,
      issued_count: issuedCount,
      no_books_count: studentList.length - issuedCount
    };
  }

  // 29. /api/notifications
  if (path.startsWith("/api/notifications")) {
    const notifs = getStoredNotifications();
    if (path.includes("/read") && method === "POST") {
      const parts = path.split("/");
      const targetId = Number(parts[parts.length - 2]);
      notifs.forEach(n => {
        if (!targetId || n.id === targetId) n.is_read = 1;
      });
      saveStoredNotifications(notifs);
      return { message: "Notification marked as read." };
    }
    if (path.includes("/mark-all-read") && method === "POST") {
      notifs.forEach(n => { n.is_read = 1; });
      saveStoredNotifications(notifs);
      return { message: "All notifications marked as read." };
    }
    if (path.includes("/count")) {
      const unread = notifs.filter(n => !n.is_read).length;
      return { unread_count: unread };
    }
    if (method === "POST") {
      const newNotif = {
        id: notifs.length ? Math.max(...notifs.map(n => n.id || 0)) + 1 : 1,
        title: body.title || "Announcement",
        message: body.message || "",
        created_at: new Date().toISOString(),
        is_read: 0,
        sender_name: API.getCurrentUser()?.name || "Administration",
        sender_role: API.getCurrentUser()?.role || "admin",
        type: body.type || "broadcast"
      };
      notifs.unshift(newNotif);
      saveStoredNotifications(notifs);
      return { message: "Notification dispatched successfully." };
    }
    return { notifications: notifs };
  }

  // 30. /api/student/history
  if (path === "/api/student/history") {
    return { submissions: [], history: [] };
  }

  // 31. /api/student/attendance
  if (path === "/api/student/attendance") {
    return { attendance: { total_classes: 24, attended: 22, percentage: "91.6%" } };
  }

  // 32. Student / User edit and delete
  if (path.startsWith("/api/admin/users/")) {
    const userMatch = path.match(/^\/api\/admin\/users\/(\d+)/);
    const targetUserId = userMatch ? parseInt(userMatch[1], 10) : null;
    const users = getStoredUsers();

    if (method === "DELETE" && targetUserId) {
      const remaining = users.filter(u => Number(u.id) !== Number(targetUserId));
      saveStoredUsers(remaining);
      try {
        const cachedRaw = sessionStorage.getItem("cached_registered_profiles") || localStorage.getItem("cached_registered_profiles");
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw).filter(u => Number(u.id) !== Number(targetUserId));
          sessionStorage.setItem("cached_registered_profiles", JSON.stringify(cached));
          localStorage.setItem("cached_registered_profiles", JSON.stringify(cached));
        }
      } catch {}
      return { message: "User removed successfully." };
    }

    if (method === "PUT" && targetUserId) {
      const uIdx = users.findIndex(u => Number(u.id) === Number(targetUserId));
      const depts = getStoredDepartments();
      const chosenDeptId = body.department_id || (body.department_ids && body.department_ids[0]) || null;
      let chosenDeptName = "";
      let chosenDeptCode = "";
      if (chosenDeptId) {
        const dObj = depts.find(d => Number(d.id) === Number(chosenDeptId));
        if (dObj) {
          chosenDeptName = dObj.name;
          chosenDeptCode = dObj.code;
        }
      }

      const currentUser = API.getCurrentUser() || { id: 13, name: "Super Admin", role: "super_admin" };
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

      let updatedUser;
      if (uIdx !== -1) {
        const existing = users[uIdx];
        if (["student", "class_leader"].includes(existing.role) && currentUser.role !== "super_admin" && Number(currentUser.id) !== Number(targetUserId)) {
          return { error: "Permission denied: Students can only be edited by Super Admin." };
        }
        const newName = body.name ? body.name.trim() : existing.name;
        const newUsername = body.username ? body.username.trim() : (body.name ? body.name.trim() : existing.username);
        const newEmail = (body.email_or_phone || body.email || existing.email || "").trim();
        const newRole = body.role || existing.role;

        updatedUser = {
          ...existing,
          ...body,
          id: targetUserId,
          name: newName,
          username: newUsername,
          email: newEmail,
          role: newRole,
          designation: body.designation !== undefined ? body.designation : existing.designation,
          academic_year: ["student", "class_leader"].includes(newRole) ? (body.academic_year !== undefined ? body.academic_year : existing.academic_year) : null,
          previous_year: ["student", "class_leader"].includes(newRole) ? (body.previous_year !== undefined ? body.previous_year : existing.previous_year) : null,
          roll_number: body.roll_number !== undefined ? body.roll_number : existing.roll_number,
          section_id: body.section_id !== undefined ? body.section_id : existing.section_id,
          guardian_name: body.guardian_name !== undefined ? body.guardian_name : existing.guardian_name,
          guardian_phone: body.guardian_phone !== undefined ? body.guardian_phone : existing.guardian_phone,
          guardian_email: body.guardian_email !== undefined ? body.guardian_email : existing.guardian_email,
          department_id: chosenDeptId !== undefined ? chosenDeptId : existing.department_id,
          department_ids: body.department_ids || (chosenDeptId ? [Number(chosenDeptId)] : existing.department_ids || []),
          department_name: chosenDeptName || existing.department_name || (chosenDeptId ? "Computer Science Engineering" : null),
          department_code: chosenDeptCode || existing.department_code || (chosenDeptId ? "CSE" : null),
          department: chosenDeptName || existing.department || (chosenDeptId ? "Computer Science Engineering" : "-"),
          last_edited_by_id: currentUser.id,
          last_edited_at: nowStr,
          edited_by_name: currentUser.name,
          edited_by_role: currentUser.role,
          can_edit: (currentUser.role === "super_admin") || (!["student", "class_leader"].includes(newRole) && currentUser.role !== "principal"),
          can_delete: newRole !== "super_admin"
        };
        if (body.password) {
          updatedUser.password = body.password;
        }
        users[uIdx] = updatedUser;
      } else {
        updatedUser = {
          id: targetUserId,
          ...body,
          name: (body.name || "User").trim(),
          username: (body.username || body.name || "user").trim(),
          email: (body.email_or_phone || body.email || "user@inpand.com").trim(),
          role: body.role || "student",
          department_id: chosenDeptId,
          department_name: chosenDeptName,
          department_code: chosenDeptCode,
          department: chosenDeptName || "-",
          can_edit: (currentUser.role === "super_admin") || (!["student", "class_leader"].includes(newRole) && currentUser.role !== "principal"),
          can_delete: true
        };
        users.push(updatedUser);
      }

      saveStoredUsers(users);

      // Sync cached_registered_profiles in storage
      try {
        const cachedRaw = sessionStorage.getItem("cached_registered_profiles") || localStorage.getItem("cached_registered_profiles");
        let cached = cachedRaw ? JSON.parse(cachedRaw) : [];
        const cIdx = cached.findIndex(u => Number(u.id) === Number(targetUserId));
        if (cIdx !== -1) {
          cached[cIdx] = { ...cached[cIdx], ...updatedUser };
        } else {
          cached.push(updatedUser);
        }
        sessionStorage.setItem("cached_registered_profiles", JSON.stringify(cached));
        localStorage.setItem("cached_registered_profiles", JSON.stringify(cached));
      } catch {}

      // If current user was updated, sync session
      if (currentUser && Number(currentUser.id) === Number(targetUserId)) {
        API.setCurrentUser({
          ...currentUser,
          ...updatedUser
        });
      }

      return {
        message: "Login details updated successfully",
        user: updatedUser
      };
    }
  }

  return {};
}

export const API = {
  getToken() {
    try {
      return sessionStorage.getItem("quiz_auth_token");
    } catch {
      return null;
    }
  },

  setToken(token) {
    try {
      if (token) {
        sessionStorage.setItem("quiz_auth_token", token);
      } else {
        sessionStorage.removeItem("quiz_auth_token");
      }
    } catch (e) {
      console.warn("Storage error:", e);
    }
  },

  getCurrentUser() {
    try {
      const raw = sessionStorage.getItem("quiz_auth_user");
      if (!raw) return null;
      let user = JSON.parse(raw);
      if (user && user.name) {
        const lower = user.name.toLowerCase();
        if (lower === 'eleanor') { user.name = 'Super Admin'; user.username = 'superadmin'; }
        else if (lower === 'xavier') { user.name = 'HOD'; user.username = 'hod'; }
        else if (lower === 'alan') { user.name = 'Teacher'; user.username = 'teacher'; }
        else if (lower === 'lovelace') { user.name = 'Class Teacher'; user.username = 'classteacher'; }
        else if (lower === 'alex') { user.name = 'Student'; user.username = 'student'; }
        else if (lower === 'leader') { user.name = 'Class Leader'; user.username = 'classleader'; }
        else if (lower === 'arthur') { user.name = 'Accountant'; user.username = 'accountant'; }
        if (!user.username) user.username = user.name;
      }
      return user;
    } catch {
      return null;
    }
  },

  setCurrentUser(user) {
    try {
      if (user) {
        if (user.name) {
          const lower = user.name.toLowerCase();
          if (lower === 'eleanor') { user.name = 'Super Admin'; user.username = 'superadmin'; }
          else if (lower === 'xavier') { user.name = 'HOD'; user.username = 'hod'; }
          else if (lower === 'alan') { user.name = 'Teacher'; user.username = 'teacher'; }
          else if (lower === 'lovelace') { user.name = 'Class Teacher'; user.username = 'classteacher'; }
          else if (lower === 'alex') { user.name = 'Student'; user.username = 'student'; }
          else if (lower === 'leader') { user.name = 'Class Leader'; user.username = 'classleader'; }
          else if (lower === 'arthur') { user.name = 'Accountant'; user.username = 'accountant'; }
          if (!user.username) user.username = user.name;
        }
        sessionStorage.setItem("quiz_auth_user", JSON.stringify(user));
      } else {
        sessionStorage.removeItem("quiz_auth_user");
      }
    } catch (e) {
      console.warn("Storage error:", e);
    }
  },

  getCachedProfiles() {
    try {
      const raw = sessionStorage.getItem("cached_registered_profiles") || localStorage.getItem("cached_registered_profiles");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setCachedProfiles(profiles) {
    try {
      if (Array.isArray(profiles) && profiles.length > 0) {
        const json = JSON.stringify(profiles);
        sessionStorage.setItem("cached_registered_profiles", json);
        localStorage.setItem("cached_registered_profiles", json);
      }
    } catch (e) {
      console.warn("Storage error:", e);
    }
  },

  getCachedApprovedStudents() {
    try {
      const raw = sessionStorage.getItem("cached_approved_students") || localStorage.getItem("cached_approved_students");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setCachedApprovedStudents(students) {
    try {
      if (Array.isArray(students) && students.length > 0) {
        const json = JSON.stringify(students);
        sessionStorage.setItem("cached_approved_students", json);
        localStorage.setItem("cached_approved_students", json);
      }
    } catch (e) {
      console.warn("Storage error:", e);
    }
  },

  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data = isJson ? await response.json().catch(() => ({})) : {};

      if (!response.ok || !isJson) {
        // Fallback for standalone Vercel when remote backend is not answering or 404/405/502/504
        if (response.status === 404 || response.status === 405 || response.status === 502 || response.status === 503 || response.status === 504 || !isJson) {
          try {
            const fallback = handleLocalFallback(endpoint, options, config);
            if (fallback !== undefined) {
              return fallback;
            }
          } catch (fallbackErr) {
            throw fallbackErr;
          }
        }
        const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      if (err.message && (err.message.toLowerCase().includes("invalid") || err.message.toLowerCase().includes("password"))) {
        throw err;
      }
      // If network fetch fails (CORS, offline, unreachable EC2, or Vercel 404)
      try {
        const fallback = handleLocalFallback(endpoint, options, config);
        if (fallback !== undefined) {
          return fallback;
        }
      } catch (fallbackErr) {
        throw fallbackErr;
      }
      console.error(`API Error on [${options.method || "GET"} ${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth
  async login(emailOrPhoneOrUsername, password) {
    const data = await this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: emailOrPhoneOrUsername,
        email_or_phone: emailOrPhoneOrUsername,
        password
      })
    });
    this.setToken(data.token);
    this.setCurrentUser(data.user);
    return data;
  },

  async registerStudent(name, emailOrPhone, password, role = "super_admin", contactType = "email", username = "", extra = {}) {
    return this.request("/api/auth/register-student", {
      method: "POST",
      body: JSON.stringify({
        name,
        email_or_phone: emailOrPhone,
        contact_type: contactType,
        password,
        role,
        username,
        ...extra
      })
    });
  },

  async checkName(name, excludeId = null) {
    const params = new URLSearchParams({ name: (name || '').trim() });
    if (excludeId) params.append('exclude_id', excludeId);
    return this.request(`/api/auth/check-name?${params.toString()}`);
  },

  async getSuperAdminStatus() {
    return this.request("/api/auth/super-admin-status");
  },

  async getPrincipalStatus() {
    return this.request("/api/auth/principal-status");
  },

  async forgotPassword(usernameOrContact, newPassword) {
    return this.request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({
        username: usernameOrContact,
        email_or_phone: usernameOrContact,
        new_password: newPassword
      })
    });
  },

  async changePassword(currentPassword, newPassword, confirmPassword) {
    return this.request("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });
  },

  async getMe() {
    return this.request("/api/auth/me");
  },

  async logout() {
    const token = this.getToken();
    try {
      if (token) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        }).catch(() => {});
      }
    } finally {
      this.setToken(null);
      this.setCurrentUser(null);
    }
  },

  // College Name
  async getCollegeName() {
    return this.request("/api/college-name");
  },

  async setCollegeName(name) {
    return this.request("/api/college-name", {
      method: "POST",
      body: JSON.stringify({ name })
    });
  },

  async getUserProfiles(role = "", status = "", search = "", createdByMe = false) {
    const params = new URLSearchParams();
    if (role) params.append("role", role);
    if (status) params.append("status", status);
    if (search) params.append("q", search);
    if (createdByMe) params.append("created_by_me", "1");
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await this.request(`/api/admin/profiles${query}`);
    if (!role && !status && !search && !createdByMe && res && Array.isArray(res.users)) {
      this.setCachedProfiles(res.users);
    }
    return res;
  },

  async getSingleProfile(userId) {
    return this.request(`/api/admin/profiles/${userId}`);
  },

  async getDeanSuperAdminMonitor() {
    return this.request("/api/admin/dean/super-admin-monitor");
  },

  async createAccount(name, emailOrPhone, password, role, username = "", extra = {}) {
    return this.request("/api/admin/create-account", {
      method: "POST",
      body: JSON.stringify({
        name,
        email_or_phone: emailOrPhone,
        password,
        role,
        username,
        ...extra
      })
    });
  },

  async updateUserAccount(userId, body) {
    return this.request(`/api/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  },

  async deleteUser(userId) {
    return this.request(`/api/admin/users/${userId}`, {
      method: "DELETE"
    });
  },

  // Approvals
  async getPendingStudents() {
    return this.request("/api/admin/pending-students");
  },

  async approveStudent(studentId) {
    return this.request(`/api/admin/students/${studentId}/approve`, {
      method: "POST"
    });
  },

  async rejectStudent(studentId) {
    return this.request(`/api/admin/students/${studentId}/reject`, {
      method: "POST"
    });
  },

  // Notifications
  async getNotifications(unreadOnly = false) {
    return this.request("/api/notifications");
  },

  async sendNotification(targetRole, title, message, departmentId = null, scope = "all", studentIds = null) {
    const deptId = departmentId || (String(targetRole).match(/^\d+$/) ? Number(targetRole) : null);
    return this.request("/api/notifications/send", {
      method: "POST",
      body: JSON.stringify({
        target_role: targetRole,
        department_id: deptId,
        scope,
        title,
        message,
        student_ids: studentIds
      })
    });
  },

  async getStudentsByDepartment(departmentId = null) {
    const url = departmentId && departmentId !== 'all'
      ? `/api/college/students/by-department?department_id=${departmentId}`
      : '/api/college/students/by-department';
    return this.request(url);
  },

  async getStudentsForYear(year = null, departmentId = null) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (departmentId) params.append('department_id', departmentId);
    const qs = params.toString();
    return this.request(`/api/teacher/students-for-year${qs ? `?${qs}` : ''}`);
  },

  async changeStudentYear(fromYear, toYear, studentIds = [], allStudents = false, departmentId = null) {
    return this.request('/api/teacher/change-student-year', {
      method: 'POST',
      body: JSON.stringify({
        from_year: Number(fromYear),
        to_year: toYear === 'passed_out' ? 'passed_out' : Number(toYear),
        student_ids: studentIds,
        all_students: allStudents,
        department_id: departmentId ? Number(departmentId) : undefined
      })
    });
  },

  async sendDepartmentMessage(departmentId, title, message, studentIds = null, targetMode = 'all') {
    return this.request("/api/notifications/department-message", {
      method: "POST",
      body: JSON.stringify({
        department_id: departmentId,
        title,
        message,
        student_ids: studentIds,
        target_mode: targetMode
      })
    });
  },

  async markNotificationRead(notifId) {
    return this.request(`/api/notifications/${notifId}/read`, {
      method: "POST"
    });
  },

  async markAllNotificationsRead() {
    return this.request("/api/notifications/mark-all-read", {
      method: "POST"
    });
  },

  // Teacher Endpoints
  async getTeacherGroups() {
    return this.request("/api/teacher/groups");
  },

  async createGroup(name, description, studentIds = []) {
    return this.request("/api/teacher/groups", {
      method: "POST",
      body: JSON.stringify({ name, description, student_ids: studentIds })
    });
  },

  async getApprovedStudents() {
    const res = await this.request("/api/teacher/students");
    if (res && Array.isArray(res.students)) {
      this.setCachedApprovedStudents(res.students);
    }
    return res;
  },

  async assignStudentsToGroup(groupId, studentIds) {
    return this.request(`/api/teacher/groups/${groupId}/assign`, {
      method: "POST",
      body: JSON.stringify({ student_ids: studentIds })
    });
  },

  async deleteGroup(groupId) {
    return this.request(`/api/teacher/groups/${groupId}`, {
      method: "DELETE"
    });
  },

  async getGroupSubmissions(groupId) {
    return this.request(`/api/teacher/groups/${groupId}/submissions`);
  },

  async createQuestion(questionData) {
    return this.request("/api/teacher/questions", {
      method: "POST",
      body: JSON.stringify(questionData)
    });
  },

  async getTeacherTasks() {
    return this.request("/api/teacher/tasks");
  },

  async getTeacherQuestions() {
    return this.request("/api/teacher/questions");
  },

  async getQuestionSubmissions(questionId) {
    return this.request(`/api/teacher/questions/${questionId}/submissions`);
  },

  async deleteQuestion(questionId) {
    return this.request(`/api/teacher/questions/${questionId}`, {
      method: "DELETE"
    });
  },

  async getTasks() {
    return this.request("/api/teacher/tasks");
  },

  async createTask(taskNumber, description = "") {
    return this.request("/api/teacher/tasks", {
      method: "POST",
      body: JSON.stringify({ task_number: taskNumber, description })
    });
  },

  async deleteTask(taskNumber) {
    return this.request(`/api/teacher/tasks/${encodeURIComponent(taskNumber)}`, {
      method: "DELETE"
    });
  },

  // Student Endpoints
  async getStudentQuestions() {
    return this.request("/api/student/questions");
  },

  async getSingleQuestion(questionId) {
    return this.request(`/api/student/questions/${questionId}`);
  },

  async submitAnswer(questionId, selectedOption, timeTakenSeconds) {
    return this.request(`/api/student/questions/${questionId}/submit`, {
      method: "POST",
      body: JSON.stringify({
        selected_option: selectedOption,
        time_taken_seconds: timeTakenSeconds
      })
    });
  },

  async getStudentHistory() {
    return this.request("/api/student/history");
  },

  // College Management Setup & Attendance
  async getAcademicYears() {
    return this.request("/api/college/academic-years");
  },

  async createAcademicYear(data) {
    return this.request("/api/college/academic-years", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async getSemesters() {
    return this.request("/api/college/semesters");
  },

  async createSemester(data) {
    return this.request("/api/college/semesters", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async getDepartments() {
    return this.request("/api/college/departments");
  },

  async createDepartment(data) {
    return this.request("/api/college/departments", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async deleteDepartment(deptId) {
    return this.request(`/api/college/departments/${deptId}`, {
      method: "DELETE"
    });
  },

  async assignHod(deptId, hodUserId) {
    return this.request(`/api/college/departments/${deptId}/hod`, {
      method: "PUT",
      body: JSON.stringify({ hod_user_id: hodUserId || null })
    });
  },

  async createDepartmentRequest(name, code) {
    return this.request("/api/college/department-requests", {
      method: "POST",
      body: JSON.stringify({ name, code })
    });
  },

  async getDepartmentRequests() {
    return this.request("/api/college/department-requests");
  },

  async approveDepartmentRequest(reqId) {
    return this.request(`/api/college/department-requests/${reqId}/approve`, {
      method: "POST"
    });
  },

  async rejectDepartmentRequest(reqId) {
    return this.request(`/api/college/department-requests/${reqId}/reject`, {
      method: "POST"
    });
  },

  async getPrograms() {
    return this.request("/api/college/programs");
  },

  async createProgram(data) {
    return this.request("/api/college/programs", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async getBatches() {
    return this.request("/api/college/batches");
  },

  async createBatch(data) {
    return this.request("/api/college/batches", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async deleteBatch(batchId) {
    return this.request(`/api/college/batches/${batchId}`, {
      method: "DELETE"
    });
  },

  async getBatchStudents(batchId) {
    return this.request(`/api/college/batches/${batchId}/students`);
  },

  async assignBatchStudents(batchId, studentIds, mode = "set") {
    return this.request(`/api/college/batches/${batchId}/students`, {
      method: "POST",
      body: JSON.stringify({ student_ids: studentIds, mode })
    });
  },

  async getSections() {
    return this.request("/api/college/sections");
  },

  async createSection(data) {
    return this.request("/api/college/sections", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async deleteSection(sectionId) {
    return this.request(`/api/college/sections/${sectionId}`, {
      method: "DELETE"
    });
  },

  async getHolidays() {
    return this.request("/api/college/holidays");
  },

  async createHoliday(data) {
    return this.request("/api/college/holidays", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async getCollegeStaff() {
    return this.request("/api/college/staff");
  },

  async updateStaffProfile(userId, data) {
    return this.request(`/api/college/staff/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async getCollegeStudents() {
    return this.request("/api/college/students");
  },

  async updateStudentProfile(userId, data) {
    return this.request(`/api/college/students/${userId}/profile`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async getSubjects() {
    return this.request("/api/college/subjects");
  },

  async createSubject(data) {
    return this.request("/api/college/subjects", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async assignSubjectFaculty(subjectId, facultyUserId) {
    return this.request(`/api/college/subjects/${subjectId}/faculty`, {
      method: "PUT",
      body: JSON.stringify({ faculty_user_id: facultyUserId || null })
    });
  },

  async getAttendanceShortages() {
    return this.request("/api/college/attendance/shortages");
  },

  async getDepartmentTeachers() {
    return this.request("/api/college/departments/teachers");
  },

  async getMyDepartments() {
    return this.request("/api/college/my-departments");
  },

  async updateMyDepartments(departmentIds) {
    return this.request("/api/college/my-departments", {
      method: "PUT",
      body: JSON.stringify({ department_ids: departmentIds })
    });
  },

  async getTeacherSubjects() {
    return this.request("/api/college/attendance/my-subjects");
  },

  async getAttendanceRoster(subjectId, date, period) {
    return this.request(`/api/college/attendance/roster?subject_id=${encodeURIComponent(subjectId)}&date=${encodeURIComponent(date)}&period=${encodeURIComponent(period)}`);
  },

  async saveAttendanceRoster(data) {
    return this.request("/api/college/attendance/roster", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async markStudentDailyAttendance(studentId, status, date = null) {
    return this.request("/api/college/attendance/mark-student", {
      method: "POST",
      body: JSON.stringify({ student_id: studentId, status, date })
    });
  },

  async getStudentAttendanceSummary() {
    return this.request("/api/college/attendance/student-summary");
  },

  // Fees Management
  async getFeesSummary() {
    return this.request("/api/fees/summary");
  },

  async getStudentFees({ search = '', status = '', departmentId = '' } = {}) {
    const params = new URLSearchParams();
    if (search) params.append("q", search);
    if (status) params.append("status", status);
    if (departmentId) params.append("department_id", departmentId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/api/fees/students${qs}`);
  },

  async toggleStudentFeeStatus(studentId, status = '') {
    return this.request(`/api/fees/students/${studentId}/toggle-status`, {
      method: "POST",
      body: JSON.stringify({ status })
    });
  },

  async recordPartialFeePayment(studentId, partialAmount) {
    return this.request(`/api/fees/students/${studentId}/partial-payment`, {
      method: "POST",
      body: JSON.stringify({ partial_amount: partialAmount })
    });
  },

  async updateStudentFee(studentId, feeAmount) {
    return this.request(`/api/fees/students/${studentId}/update-fee`, {
      method: "POST",
      body: JSON.stringify({ fee_amount: feeAmount })
    });
  },

  async setBulkFee(feeAmount, departmentId = null) {
    return this.request("/api/fees/set-bulk-fee", {
      method: "POST",
      body: JSON.stringify({ fee_amount: feeAmount, department_id: departmentId })
    });
  },

  async getMyFee() {
    return this.request("/api/fees/my-fee");
  },

  // Library Book Circulation
  async getLibraryBooks({ search = '', departmentId = '', status = '' } = {}) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (departmentId) params.append("department_id", departmentId);
    if (status) params.append("status", status);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/api/library/books${qs}`);
  },

  async issueLibraryBook(studentId, bookName, validityDate) {
    return this.request("/api/library/issue", {
      method: "POST",
      body: JSON.stringify({
        student_id: studentId,
        book_name: bookName,
        validity_date: validityDate
      })
    });
  },

  async returnLibraryBook(studentId, bookId = null, returnedAt = null) {
    const payload = {};
    if (bookId && bookId !== "all") payload.book_id = bookId;
    if (returnedAt) payload.returned_at = returnedAt;
    return this.request(`/api/library/return/${studentId}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async getMyLibraryBook() {
    return this.request("/api/library/my-book");
  }
};

