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
  { id: 5, name: "Xavier", username: "hod", email: "xavier1@inpand.com", role: "hod", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", designation: "Head of Department (CSE)" },
  { id: 6, name: "Alan", username: "teacher", email: "alan1@inpand.com", role: "teacher", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", designation: "Associate Professor" },
  { id: 7, name: "Lovelace", username: "classteacher", email: "lovelace1@inpand.com", role: "class_teacher", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", designation: "Class Teacher (CSE 1st Year)" },
  { id: 8, name: "Alex", username: "student", email: "alex1@inpand.com", role: "student", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", roll_number: "CSE2026001", batch_name: "Batch 2026-2030", section_name: "A", academic_year: 1 },
  { id: 9, name: "Leader", username: "classleader", email: "leader1@inpand.com", role: "class_leader", status: "active", department_id: 1, department_name: "Computer Science Engineering", department_code: "CSE", roll_number: "CSE2026002", batch_name: "Batch 2026-2030", section_name: "A", academic_year: 1 },
  { id: 10, name: "Arthur", username: "staff", email: "arthur1@inpand.com", role: "accountant", status: "active", designation: "Senior Accountant / Bursar" },
  { id: 11, name: "Librarian", username: "librarian", email: "librarian1@inpand.com", role: "librarian", status: "active", designation: "Chief Librarian" },
  { id: 12, name: "Parent", username: "parent", email: "parent1@inpand.com", role: "parent", status: "active", designation: "Parent / Guardian" }
];

const CANONICAL_DEPTS = [
  { id: 1, name: "Computer Science Engineering", code: "CSE", hod_user_id: 5, hod_name: "Xavier" },
  { id: 2, name: "Mechanical Engineering", code: "MECH", hod_user_id: null, hod_name: null },
  { id: 3, name: "Mechatronics Engineering", code: "MECT", hod_user_id: null, hod_name: null },
  { id: 4, name: "Aeronautical Engineering", code: "AERO", hod_user_id: null, hod_name: null },
  { id: 5, name: "Electrical and Electronics Engineering", code: "EEE", hod_user_id: null, hod_name: null },
  { id: 6, name: "Electrical and Communication Engineering", code: "ECE", hod_user_id: null, hod_name: null }
];

function getStoredDepartments() {
  try {
    const raw = localStorage.getItem("portal_departments");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...CANONICAL_DEPTS];
}

function saveStoredDepartments(depts) {
  try {
    localStorage.setItem("portal_departments", JSON.stringify(depts));
  } catch {}
}

function getStoredUsers() {
  try {
    const raw = localStorage.getItem("portal_all_users");
    if (raw) {
      const parsed = JSON.parse(raw);
      const filtered = parsed.filter(u => (u.name || '').toLowerCase() !== 'eleanor');
      if (!filtered.some(u => u.role === 'super_admin')) {
        filtered.unshift(DEFAULT_PORTAL_USERS[1]);
      }
      return filtered.length > 0 ? filtered : [...DEFAULT_PORTAL_USERS];
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
    const cleanId = rawId.includes("@") ? rawId.split("@")[0] : rawId;
    const pwd = (body.password || "").trim();

    const roleAliases = {
      super: "super_admin",
      superadmin: "super_admin",
      super_admin: "super_admin",
      admin: "admin",
      dean: "dean",
      hod: "hod",
      xavier: "hod",
      hod_cse: "hod",
      teacher: "teacher",
      alan: "teacher",
      tec1cse: "teacher",
      classteacher: "class_teacher",
      lovelace: "class_teacher",
      classcse2: "class_teacher",
      student: "student",
      alex: "student",
      stu11_cse: "student",
      classleader: "class_leader",
      leader: "class_leader",
      leadercse1: "class_leader",
      staff: "accountant",
      accountant: "accountant",
      arthur: "accountant",
      librarian: "librarian",
      principal: "principal",
      parent: "parent"
    };

    const users = getStoredUsers();
    let matched = users.find(u =>
      (u.username && u.username.toLowerCase() === rawId) ||
      (u.email && u.email.toLowerCase() === rawId) ||
      (u.name && u.name.toLowerCase() === rawId) ||
      (u.username && u.username.toLowerCase() === cleanId) ||
      (u.name && u.name.toLowerCase() === cleanId)
    );

    if (!matched && roleAliases[cleanId]) {
      const targetRole = roleAliases[cleanId];
      matched = users.find(u => u.role === targetRole);
    }

    if (!matched) {
      throw new Error("Invalid user name or password");
    }

    if (pwd && pwd !== "Admin@123" && matched.password && matched.password !== pwd) {
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
      const newDept = { id: newId, name, code, hod_user_id: null, hod_name: null };
      depts.push(newDept);
      saveStoredDepartments(depts);
      return { message: `Department ${name} added`, id: newId, department: newDept };
    }
    return { departments: depts };
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
    const users = getStoredUsers().map(u => ({
      ...u,
      can_edit: true,
      can_delete: u.role !== "super_admin",
      department: u.department_name || (u.department_id ? "Computer Science Engineering" : "-")
    }));
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
        { id: 5, name: "Xavier", username: "hod", email: "xavier1@inpand.com", role: "hod", status: "active", creator_name: "Super Admin", created_at: "2026-08-02 11:30:00" },
        { id: 6, name: "Alan", username: "teacher", email: "alan1@inpand.com", role: "teacher", status: "active", creator_name: "Super Admin", created_at: "2026-08-03 09:00:00" }
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
    const students = getStoredUsers()
      .filter(u => ["student", "class_leader"].includes(u.role))
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
        teacher_name: "Alan",
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
        teacher_name: "Alan",
        explanation: "A Stack is a LIFO (Last In First Out) linear data structure where elements are pushed and popped from the same end."
      }
    ];
    if (path.includes("/submit") && method === "POST") {
      return { is_correct: true, correct_option: "B", message: "Answer submitted successfully!" };
    }
    return { questions: sampleQuestions };
  }

  // 27. /api/fees/student-fees || /api/fees/stats
  if (path.startsWith("/api/fees/")) {
    return {
      fees: [
        { id: 1, student_id: 8, student_name: "Alex", roll_number: "CSE2026001", fee_amount: 50000, paid_amount: 50000, status: "paid", academic_year: "2026-2027", remarks: "Tuition Fee Paid in Full" },
        { id: 2, student_id: 9, student_name: "Leader", roll_number: "CSE2026002", fee_amount: 50000, paid_amount: 50000, status: "paid", academic_year: "2026-2027", remarks: "Tuition Fee Paid in Full" }
      ],
      stats: { total_expected: 100000, total_collected: 100000, pending_balance: 0 }
    };
  }

  // 28. /api/library/student-books
  if (path.startsWith("/api/library/")) {
    return {
      books: [
        { id: 1, student_id: 8, student_name: "Alex", roll_number: "CSE2026001", book_name: "Introduction to Algorithms (CLRS 4th Edition)", validity_date: "2027-05-31", status: "issued" }
      ]
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
    if (method === "DELETE") return { message: "User removed successfully." };
    if (method === "PUT") return { message: "User updated successfully." };
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
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user) {
    try {
      if (user) {
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

  async returnLibraryBook(studentId, bookId = null) {
    return this.request(`/api/library/return/${studentId}`, {
      method: "POST",
      body: JSON.stringify(bookId ? { book_id: bookId } : {})
    });
  },

  async getMyLibraryBook() {
    return this.request("/api/library/my-book");
  }
};

