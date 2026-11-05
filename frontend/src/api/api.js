/**
 * Unified API Client for College Quiz & Role Management Portal
 */

const API_BASE = "";

// Clean up legacy localStorage keys once so tabs never share tokens
try {
  localStorage.removeItem("quiz_auth_token");
  localStorage.removeItem("quiz_auth_user");
} catch {}

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
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
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
