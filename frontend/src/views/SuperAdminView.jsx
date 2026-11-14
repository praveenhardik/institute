import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { API } from '../api/api';
import { useAuth, formatRoleName, formatUserId } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useNotifications } from '../context/NotificationContext';
import { CollegeSetup } from '../components/CollegeSetup';
import { ProfileModal } from '../components/ProfileModal';
import { EditUserModal } from '../components/EditUserModal';
import { PasswordInput } from '../components/PasswordInput';
import { Pagination } from '../components/Pagination';
import { CreateAccountModal, CreateAccountButton } from '../components/CreateAccountModal';
import { CreateAccountPill, PendingPill, YearTransitionPill } from '../components/ActionPills';
import YearTransitionSection from '../components/YearTransitionSection';

export const SuperAdminView = () => {
  const { user: currentUser } = useAuth();
  const { showAlert } = useAlert();
  const { notifications, markRead, loadNotifications } = useNotifications();
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showYearTransitionModal, setShowYearTransitionModal] = useState(false);

  // Local account created notification pill
  const [localCreatedNotice, setLocalCreatedNotice] = useState(null);
  const latestAccountCreatedNotification = notifications.find(n => n.type === 'account_created' && !n.is_read);
  const accountCreatedNotice = localCreatedNotice || latestAccountCreatedNotification;

  const handleDismissAccountNotice = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (localCreatedNotice) {
      setLocalCreatedNotice(null);
    }
    if (latestAccountCreatedNotification) {
      markRead(latestAccountCreatedNotification.id);
    }
  };

  // Stats
  const [stats, setStats] = useState(() => {
    const cached = API.getCachedProfiles();
    const adminsCount = cached.filter(u => ['admin', 'super_admin'].includes(u.role)).length;
    return { admins: adminsCount, total: cached.length };
  });

  // Account creation form
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [newDesignation, setNewDesignation] = useState('');
  const [newDeptId, setNewDeptId] = useState('');
  const [saTeacherDeptIds, setSaTeacherDeptIds] = useState([]);
  const [showNewDeptBlock, setShowNewDeptBlock] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [nameEligibilityNotice, setNameEligibilityNotice] = useState('');

  const [newSection, setNewSection] = useState('');
  const [newCustomSection, setNewCustomSection] = useState('');
  const [newRollNumber, setNewRollNumber] = useState('');
  const [newGuardianName, setNewGuardianName] = useState('');
  const [newGuardianPhone, setNewGuardianPhone] = useState('');
  const [newGuardianEmail, setNewGuardianEmail] = useState('');
  const [newIsClassLeader, setNewIsClassLeader] = useState(false);
  const [sectionsList, setSectionsList] = useState([]);

  // Departments for dropdown & management
  const [departments, setDepartments] = useState([]);
  const [directDeptName, setDirectDeptName] = useState('');
  const [directDeptCode, setDirectDeptCode] = useState('');
  const [directDeptLoading, setDirectDeptLoading] = useState(false);

  const handleDirectAddDept = async (e) => {
    e.preventDefault();
    if (!directDeptName.trim() || !directDeptCode.trim()) {
      showAlert('Department name and code are required.', 'danger');
      return;
    }
    if (departments.length >= 10) {
      showAlert('Maximum limit of 10 departments reached for this college.', 'warning');
      return;
    }
    try {
      setDirectDeptLoading(true);
      const res = await API.createDepartment({
        name: directDeptName.trim(),
        code: directDeptCode.trim().toUpperCase()
      });
      showAlert(res.message || 'Academic Department added successfully!', 'success');
      setDirectDeptName('');
      setDirectDeptCode('');
      loadDepartments();
    } catch (err) {
      showAlert(err.message || 'Failed to add department.', 'danger');
    } finally {
      setDirectDeptLoading(false);
    }
  };

  const handleDeleteDepartment = async (dept) => {
    if (!dept || !dept.id) return;
    const confirmMsg = `Are you sure you want to delete the department "${dept.name}" (${dept.code})?\n\nWARNING: All students enrolled in this department will also be permanently deleted. This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setDirectDeptLoading(true);
      const res = await API.deleteDepartment(dept.id);
      showAlert(res.message || `Department "${dept.name}" and all enrolled students have been deleted.`, 'success');
      await loadDepartments();
      if (typeof loadProfiles === 'function') {
        await loadProfiles();
      }
    } catch (err) {
      console.error('Delete department failed:', err);
      showAlert(err.message || 'Failed to delete department.', 'danger');
    } finally {
      setDirectDeptLoading(false);
    }
  };

  // Pending approvals
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Profiles directory (instantly loaded from cache without loading state on refresh)
  const [profiles, setProfiles] = useState(() => API.getCachedProfiles());
  const [roleFilter, setRoleFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [profilesLoading, setProfilesLoading] = useState(false);

  // Search & Select for User Profiles Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [filterCreatedByMe, setFilterCreatedByMe] = useState(false);

  // Modals
  const [inspectUserId, setInspectUserId] = useState(null);
  const [editUser, setEditUser] = useState(null);

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard' | 'tasks' | 'setup'

  // Tasks & Questions for Super Admin
  const [adminQuestions, setAdminQuestions] = useState([]);
  const [activeAdminTask, setActiveAdminTask] = useState('');
  const [adminQuestionsLoading, setAdminQuestionsLoading] = useState(false);
  const [openAdminQuestionId, setOpenAdminQuestionId] = useState(null);

  const loadAdminQuestions = useCallback(async () => {
    try {
      setAdminQuestionsLoading(true);
      const res = await API.getTeacherQuestions();
      setAdminQuestions(res.questions || []);
    } catch (e) {
      console.warn('Could not load questions for super admin:', e);
    } finally {
      setAdminQuestionsLoading(false);
    }
  }, []);

  const handleDeleteTask = async (taskNumber) => {
    if (!taskNumber) return;
    const questionsInTask = (adminQuestions || []).filter(q => (q.task_number || 'Task 1') === taskNumber);
    const count = questionsInTask.length;
    if (!window.confirm(`Are you sure you want to completely delete "${taskNumber}"?\n\nThis will permanently delete all ${count} question(s) published under ${taskNumber} and all associated student submissions. This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await API.deleteTask(taskNumber);
      showAlert(res.message || `Task "${taskNumber}" and all associated questions deleted successfully`, 'success');
      if (activeAdminTask === taskNumber) {
        setActiveAdminTask('');
      }
      loadAdminQuestions();
    } catch (err) {
      showAlert(err.message || `Failed to delete task "${taskNumber}"`, 'danger');
    }
  };

  const handleDeleteQuestion = async (questionId, questionText) => {
    const preview = questionText && questionText.length > 50 ? questionText.slice(0, 50) + '...' : (questionText || 'this question');
    if (!window.confirm(`Are you sure you want to completely delete "${preview}"?\n\nThis will permanently delete the question and all associated submissions. This cannot be undone.`)) {
      return;
    }
    try {
      const res = await API.deleteQuestion(questionId);
      showAlert(res.message || 'Question deleted successfully', 'success');
      loadAdminQuestions();
    } catch (err) {
      showAlert(err.message || 'Failed to delete question', 'danger');
    }
  };

  const groupedAdminQuestions = useMemo(() => {
    const map = {};
    (adminQuestions || []).forEach(q => {
      const t = q?.task_number || 'Task 1';
      if (!map[t]) map[t] = [];
      map[t].push(q);
    });
    return map;
  }, [adminQuestions]);

  const adminTaskKeys = useMemo(() => Object.keys(groupedAdminQuestions), [groupedAdminQuestions]);

  const effectiveAdminTask = activeAdminTask && adminTaskKeys.includes(activeAdminTask)
    ? activeAdminTask
    : (adminTaskKeys[0] || 'Task 1');

  const currentAdminQuestions = groupedAdminQuestions[effectiveAdminTask] || [];

  const handleNextAdminTask = () => {
    if (!adminTaskKeys.length) return;
    const curIdx = adminTaskKeys.indexOf(effectiveAdminTask);
    const nextIdx = (curIdx + 1) % adminTaskKeys.length;
    setActiveAdminTask(adminTaskKeys[nextIdx]);
  };

  const handlePrevAdminTask = () => {
    if (!adminTaskKeys.length) return;
    const curIdx = adminTaskKeys.indexOf(effectiveAdminTask);
    const prevIdx = (curIdx - 1 + adminTaskKeys.length) % adminTaskKeys.length;
    setActiveAdminTask(adminTaskKeys[prevIdx]);
  };

  // Load departments & sections
  const loadDepartments = useCallback(async () => {
    try {
      const [dRes, sRes] = await Promise.all([
        API.getDepartments(),
        API.getSections().catch(() => ({ sections: [] }))
      ]);
      setDepartments(dRes.departments || []);
      setSectionsList(sRes.sections || []);
    } catch (e) {
      console.warn('Could not load departments/sections:', e);
    }
  }, []);

  // Load pending approvals
  const loadPending = useCallback(async () => {
    try {
      setPendingLoading(true);
      const res = await API.getPendingStudents();
      setPendingUsers(res.pending_students || res.students || []);
    } catch (e) {
      console.warn('Could not load pending students:', e);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  // Load profiles
  const loadProfiles = useCallback(async (showLoading = false) => {
    try {
      if (showLoading && profiles.length === 0) setProfilesLoading(true);
      const res = await API.getUserProfiles();
      const list = res.users || [];
      API.setCachedProfiles(list);
      setProfiles(list);

      const adminsCount = list.filter(u => ['admin', 'super_admin'].includes(u.role)).length;
      setStats({
        admins: adminsCount,
        total: list.length
      });
    } catch (e) {
      console.warn('Could not load profiles:', e);
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
    loadPending();
    loadProfiles(false);
  }, [loadDepartments, loadPending, loadProfiles]);

  useEffect(() => {
    if (activeSubTab === 'dashboard') {
      loadProfiles(false);
    } else if (activeSubTab === 'tasks') {
      loadAdminQuestions();
    }
  }, [activeSubTab, loadProfiles, loadAdminQuestions]);

  // Create Account
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newContact.trim() || !newPassword.trim() || !newUsername.trim()) {
      showAlert('All mandatory fields are required', 'danger');
      return;
    }
    if (nameEligibilityNotice) {
      showAlert(nameEligibilityNotice, 'danger');
      return;
    }

    try {
      setCreateLoading(true);
      const checkRes = await API.checkName(newName.trim());
      if (checkRes && !checkRes.eligible) {
        setNameEligibilityNotice(checkRes.message);
        showAlert(checkRes.message, 'danger');
        return;
      }
      const extra = {};
      if (['teacher', 'class_teacher', 'hod', 'student', 'class_leader', 'accountant', 'librarian'].includes(newRole)) {
        if (['teacher', 'class_teacher', 'hod'].includes(newRole) && newDesignation.trim()) {
          extra.designation = newDesignation.trim();
        }

        if (newRole === 'teacher') {
          if (saTeacherDeptIds.length === 0 && !newDeptId && (!showNewDeptBlock || !newDeptName || !newDeptCode)) {
            showAlert('Department is mandatory. Please select at least one department for the teacher.', 'danger');
            return;
          }
          if (saTeacherDeptIds.length > 10) {
            showAlert('A teacher can be assigned to a maximum of 10 departments.', 'warning');
            return;
          }
          const selIds = saTeacherDeptIds.length > 0 ? saTeacherDeptIds : (newDeptId ? [newDeptId] : []);
          extra.department_ids = selIds;
          if (selIds.length > 0) extra.department_id = selIds[0];
          else if (newDeptId) extra.department_id = newDeptId;
        } else {
          if (!newDeptId && (!showNewDeptBlock || !newDeptName || !newDeptCode)) {
            showAlert('Department is mandatory. Please select an assigned department.', 'danger');
            return;
          }
          if (newDeptId) extra.department_id = newDeptId;
          extra.department_ids = newDeptId ? [newDeptId] : [];
        }

        if (showNewDeptBlock && newDeptName && newDeptCode) {
          extra.new_department_name = newDeptName.trim();
          extra.new_department_code = newDeptCode.trim().toUpperCase();
        }
      }
      if (['student', 'class_leader'].includes(newRole)) {
        const finalSec = newSection === 'custom' ? newCustomSection.trim() : newSection;
        if (finalSec) extra.section_id = finalSec;
        if (newRollNumber.trim()) extra.roll_number = newRollNumber.trim();
        if (newGuardianName.trim()) extra.guardian_name = newGuardianName.trim();
        if (newGuardianPhone.trim()) extra.guardian_phone = newGuardianPhone.trim();
        if (newGuardianEmail.trim()) extra.guardian_email = newGuardianEmail.trim();
      }

      const effectiveRole = (newRole === 'student' && newIsClassLeader) ? 'class_leader' : newRole;
      const res = await API.createAccount(
        newName.trim(),
        newContact.trim(),
        newPassword.trim(),
        effectiveRole,
        newUsername.trim(),
        extra
      );

      // Immediately display newly created account in table without waiting or refreshing
      if (res.user) {
        const newAcc = {
          id: res.user.id,
          name: res.user.name || newName.trim(),
          email: res.user.email || newContact.trim(),
          username: newUsername.trim(),
          role: res.user.role || newRole,
          status: res.user.status || 'active',
          created_at: new Date().toISOString(),
          created_by_id: currentUser?.id,
          created_by_name: currentUser?.name,
          created_by_role: currentUser?.role,
          created_by_me: true,
          can_edit: true,
          department_id: newDeptId || null,
          department_name: departments.find(d => String(d.id) === String(newDeptId))?.name || null,
          roll_number: newRollNumber.trim() || null
        };
        setProfiles(prev => {
          const updated = [newAcc, ...prev.filter(u => u.id !== newAcc.id)];
          API.setCachedProfiles(updated);
          return updated;
        });
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          admins: ['admin', 'super_admin'].includes(newRole) ? prev.admins + 1 : prev.admins
        }));
      }

      setLocalCreatedNotice({
        title: `Account Created: ${newName.trim()}`,
        name: newName.trim(),
        role: newRole
      });
      loadNotifications();

      setNewName('');
      setNameEligibilityNotice('');
      setNewContact('');
      setNewUsername('');
      setNewPassword('');
      setNewDesignation('');
      setNewDeptId('');
      setSaTeacherDeptIds([]);
      setShowNewDeptBlock(false);
      setNewDeptName('');
      setNewDeptCode('');
      setNewSection('');
      setNewCustomSection('');
      setNewRollNumber('');
      setNewGuardianName('');
      setNewGuardianPhone('');
      setNewGuardianEmail('');
      setNewIsClassLeader(false);
      loadProfiles(false);
      loadDepartments();
    } catch (err) {
      showAlert(err.message, 'danger');
      if (err.message && err.message.toLowerCase().includes('not eligible')) {
        setNameEligibilityNotice(err.message);
      }
    } finally {
      setCreateLoading(false);
    }
  };

  // Approve Pending
  const handleApprove = async (id) => {
    try {
      const res = await API.approveStudent(id);
      showAlert(res.message || 'Account approved successfully', 'success');
      loadPending();
      loadProfiles();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Reject Pending
  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this registration?')) return;
    try {
      const res = await API.rejectStudent(id);
      showAlert(res.message || 'Registration rejected', 'warning');
      loadPending();
      loadProfiles();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Permanently delete user
  const handleDeleteUser = async (userToDelete) => {
    if (!window.confirm(`Are you sure you want to permanently delete the account for "${userToDelete.name}" (${userToDelete.username || userToDelete.email})?\n\nThis will permanently delete their account and profile data from the system. This cannot be undone.`)) {
      return;
    }
    try {
      const res = await API.deleteUser(userToDelete.id);
      showAlert(res.message || 'User account permanently deleted', 'success');
      if (selectedUser && selectedUser.id === userToDelete.id) {
        setSelectedUser(null);
      }
      setProfiles(prev => {
        const updated = prev.filter(u => u.id !== userToDelete.id);
        API.setCachedProfiles(updated);
        return updated;
      });
      loadProfiles();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Search and Clear Handlers for User Profiles Directory
  const handleSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const q = searchQuery.trim();
    setActiveSearchTerm(q);
    if (selectedUser && q) {
      const qLower = q.toLowerCase();
      const match =
        (selectedUser.name && selectedUser.name.toLowerCase().includes(qLower)) ||
        (selectedUser.email && selectedUser.email.toLowerCase().includes(qLower)) ||
        (selectedUser.username && selectedUser.username.toLowerCase().includes(qLower)) ||
        (selectedUser.role && selectedUser.role.toLowerCase().includes(qLower)) ||
        (selectedUser.department_name && selectedUser.department_name.toLowerCase().includes(qLower)) ||
        String(selectedUser.id) === qLower;
      if (!match) setSelectedUser(null);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearchTerm('');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setRoleFilter('');
    if (selectedUser) {
      const role = selectedUser.role;
      let match = true;
      if (tab === 'super_admin' && role !== 'super_admin') match = false;
      if (tab === 'admin' && role !== 'admin') match = false;
      if (tab === 'principal' && role !== 'principal') match = false;
      if (tab === 'teacher' && role !== 'teacher') match = false;
      if (tab === 'class_teacher' && role !== 'class_teacher') match = false;
      if (tab === 'student' && !['student', 'class_leader'].includes(role)) match = false;
      if (tab === 'accountant' && role !== 'accountant') match = false;
      if (tab === 'librarian' && role !== 'librarian') match = false;
      if (!match) setSelectedUser(null);
    }
  };

  // Profiles filtered by creator: only accounts created by the logged-in user are shown by default
  const scopedProfiles = profiles.filter(u => {
    if (!filterCreatedByMe) return true;
    return u.created_by_id === currentUser?.id || u.created_by_me || u.id === currentUser?.id;
  });

  // Tab counts dynamically calculated from scoped profiles
  const tabCounts = {
    all: scopedProfiles.length,
    super_admin: scopedProfiles.filter(u => u.role === 'super_admin').length,
    hod: scopedProfiles.filter(u => u.role === 'hod').length,
    admin: scopedProfiles.filter(u => u.role === 'admin').length,
    principal: scopedProfiles.filter(u => u.role === 'principal').length,
    teacher: scopedProfiles.filter(u => u.role === 'teacher').length,
    class_teacher: scopedProfiles.filter(u => u.role === 'class_teacher').length,
    student: scopedProfiles.filter(u => ['student', 'class_leader'].includes(u.role)).length,
    accountant: scopedProfiles.filter(u => u.role === 'accountant').length,
    librarian: scopedProfiles.filter(u => u.role === 'librarian').length,
  };

  // Filtered profiles based on active tab, optional role filter, and search
  const displayedProfiles = scopedProfiles.filter(u => {
    if (activeTab === 'super_admin' && u.role !== 'super_admin') return false;
    if (activeTab === 'hod' && u.role !== 'hod') return false;
    if (activeTab === 'admin' && u.role !== 'admin') return false;
    if (activeTab === 'principal' && u.role !== 'principal') return false;
    if (activeTab === 'teacher' && u.role !== 'teacher') return false;
    if (activeTab === 'class_teacher' && u.role !== 'class_teacher') return false;
    if (activeTab === 'student' && !['student', 'class_leader'].includes(u.role)) return false;
    if (activeTab === 'accountant' && u.role !== 'accountant') return false;
    if (activeTab === 'librarian' && u.role !== 'librarian') return false;

    if (roleFilter && u.role !== roleFilter) return false;
    if (yearFilter && String(u.academic_year || '') !== String(yearFilter)) return false;

    const term = (activeSearchTerm || searchQuery).trim().toLowerCase();
    if (!term) return true;

    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term)) ||
      (u.department_name && u.department_name.toLowerCase().includes(term)) ||
      (u.roll_number && u.roll_number.toLowerCase().includes(term)) ||
      String(u.id) === term ||
      String(u.id).padStart(4, '0') === term ||
      String(u.id).padStart(4, '0') === term.replace(/^id\s*#?/i, '').replace(/^#/, '').trim() ||
      String(u.id) === term.replace(/^id\s*#?/i, '').replace(/^#/, '').trim() ||
      `id #${String(u.id).padStart(4, '0')}`.toLowerCase() === term ||
      `#${String(u.id).padStart(4, '0')}` === term ||
      String(u.id) === term.replace('#', '')
    );
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, roleFilter, yearFilter, activeSearchTerm, searchQuery, filterCreatedByMe]);

  const totalPages = Math.max(1, Math.ceil(displayedProfiles.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginatedProfiles = displayedProfiles.slice(startIndex, startIndex + pageSize);

  const isFacultyRole = ['teacher', 'class_teacher', 'hod'].includes(newRole);
  const isDeptRole = ['teacher', 'class_teacher', 'hod', 'student', 'class_leader'].includes(newRole);

  return (
    <section>
      {/* Header */}
      <div className="card-header" style={{ marginBottom: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              Super Admin Control Panel
            </h1>
            {accountCreatedNotice && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#10b981',
                  padding: '5px 12px',
                  borderRadius: '18px',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                <span>{accountCreatedNotice.title || `Account Created: ${accountCreatedNotice.name}`}</span>
                <button
                  type="button"
                  onClick={handleDismissAccountNotice}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#10b981',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    lineHeight: 1,
                    padding: '0 2px'
                  }}
                  title="Dismiss notification"
                >
                  &times;
                </button>
              </div>
            )}
          </div>
          <p className="card-description" style={{ marginTop: '6px' }}>
            Provision administrative accounts, manage institutional directory, broadcast announcements, and govern academic setup.
          </p>
        </div>
      </div>

      {/* 2-Column Portal Layout: Left side vertical navigation, Right side content */}
      <div className="portal-layout">
        <div className="portal-sidebar">
          <button
            className={`tab-btn ${activeSubTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('dashboard')}
          >
            Administration & Accounts
          </button>
          <button
            className={`tab-btn ${activeSubTab === 'departments' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('departments')}
          >
            Academic Departments
          </button>
          <button
            className={`tab-btn ${activeSubTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('tasks')}
          >
            Academic Tasks & Questions
          </button>
          <button
            className={`tab-btn ${activeSubTab === 'setup' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('setup')}
          >
            College Academic Setup
          </button>
        </div>

        {/* Create Account Modal Popup */}
        <CreateAccountModal
          isOpen={showCreateAccountModal}
          onClose={() => setShowCreateAccountModal(false)}
          onCreated={() => loadProfiles(true)}
          currentUser={currentUser}
        />

        <div className="portal-main-content">
          {activeSubTab === 'departments' ? (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Academic Departments
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                    Super Admin Exclusive Authority: Add new academic departments and govern institutional programs.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: departments.length >= 10 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    color: departments.length >= 10 ? '#ef4444' : '#4f46e5',
                    border: `1px solid ${departments.length >= 10 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                  }}>
                    {departments.length} / 10 Departments
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={loadDepartments}
                    style={{ padding: '6px 14px' }}
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {/* Add Department Form - Super Admin Only */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Add New Academic Department
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                      ✓ Super Admin Authorized Privilege
                    </span>
                  </div>
                </div>

                {departments.length >= 10 ? (
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '6px',
                    color: '#dc2626',
                    fontSize: '0.85rem'
                  }}>
                    Maximum institutional limit of 10 academic departments reached for this college.
                  </div>
                ) : (
                  <form onSubmit={handleDirectAddDept}>
                    <div className="grid-2" style={{ marginBottom: '14px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Department Name <span className="req">*</span></label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Artificial Intelligence and Data Science"
                          value={directDeptName}
                          onChange={(e) => setDirectDeptName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Department Code <span className="req">*</span></label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. AIDS"
                          value={directDeptCode}
                          onChange={(e) => setDirectDeptCode(e.target.value.toUpperCase())}
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={directDeptLoading}
                      style={{ padding: '8px 22px', fontWeight: 600, background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}
                    >
                      {directDeptLoading ? 'Adding Department...' : 'Add Department'}
                    </button>
                  </form>
                )}
              </div>

              {/* Departments Table */}
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Department Name</th>
                      <th>Code</th>
                      <th>Head of Department (HOD)</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center', width: '130px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length ? (
                      departments.map((d, idx) => (
                        <tr key={d.id || idx}>
                          <td>{idx + 1}</td>
                          <td><strong style={{ color: 'var(--text-primary)' }}>{d.name}</strong></td>
                          <td><span className="status-pill status-pill-active">{d.code}</span></td>
                          <td>{d.hod_name || 'HOD'}</td>
                          <td><span style={{ color: '#10b981', fontWeight: 600 }}>Active</span></td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteDepartment(d)}
                              disabled={directDeptLoading}
                              style={{
                                background: '#ef4444',
                                borderColor: '#dc2626',
                                color: '#ffffff',
                                padding: '5px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                              title={`Delete ${d.name} and all enrolled students`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                          No academic departments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeSubTab === 'setup' ? (
            <CollegeSetup canManage={true} />
          ) : activeSubTab === 'tasks' ? (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Academic Tasks & Questions
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                    Super Admin master control: review questions and delete entire tasks completely.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={loadAdminQuestions}
                  disabled={adminQuestionsLoading}
                >
                  {adminQuestionsLoading ? 'Refreshing...' : '🔄 Refresh Tasks'}
                </button>
              </div>

              {adminTaskKeys.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '6px' }}>No Published Tasks Found</p>
                  <p style={{ fontSize: '0.85rem' }}>No questions or tasks have been published yet.</p>
                </div>
              ) : (
                <>
                  {/* Task Filter / Tabs */}
                  <div style={{
                    marginBottom: '16px',
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Tasks:
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {adminTaskKeys.map(tKey => {
                          const isActive = tKey === effectiveAdminTask;
                          const count = (groupedAdminQuestions[tKey] || []).length;
                          return (
                            <button
                              key={tKey}
                              type="button"
                              className="status-pill"
                              onClick={() => setActiveAdminTask(tKey)}
                              style={{
                                cursor: 'pointer',
                                background: isActive ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 'rgba(255,255,255,0.04)',
                                borderColor: isActive ? '#a855f7' : 'var(--border-color)',
                                color: isActive ? '#fff' : 'var(--text-secondary)',
                                fontWeight: isActive ? 700 : 500,
                                padding: '6px 14px',
                                fontSize: '0.86rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>{tKey}</span>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '1px 6px',
                                  borderRadius: '9999px',
                                  background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                                  color: 'var(--text-primary)'
                                }}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right side of Tasks: Navigation & Delete Task completely */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {adminTaskKeys.length > 1 && (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handlePrevAdminTask}
                            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                            title="Go to previous task"
                          >
                            ← Previous Task
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleNextAdminTask}
                            style={{
                              padding: '6px 16px',
                              fontSize: '0.84rem',
                              fontWeight: 600,
                              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                              borderColor: '#a855f7'
                            }}
                            title="Go to next task"
                          >
                            Next Task →
                          </button>
                        </>
                      )}
                      {effectiveAdminTask && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleDeleteTask(effectiveAdminTask)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.18)',
                            border: '1px solid #ef4444',
                            color: '#f87171',
                            fontWeight: 600,
                            padding: '6px 14px',
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                          title={`Permanently delete ${effectiveAdminTask} and all questions under it`}
                        >
                          🗑️ Delete {effectiveAdminTask} Completely
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Current Task Banner */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                    padding: '0 4px',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Questions in {effectiveAdminTask}</span>
                      <span className="status-pill" style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(99, 102, 241, 0.2)', color: '#7e22ce' }}>
                        {currentAdminQuestions.length} Question{currentAdminQuestions.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {adminTaskKeys.length > 1 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Task {adminTaskKeys.indexOf(effectiveAdminTask) + 1} of {adminTaskKeys.length}
                        </span>
                      )}
                      {effectiveAdminTask && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleDeleteTask(effectiveAdminTask)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.18)',
                            border: '1px solid #ef4444',
                            color: '#f87171',
                            fontWeight: 600,
                            padding: '4px 12px',
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                          title={`Permanently delete ${effectiveAdminTask} and all questions under it`}
                        >
                          🗑️ Delete Task
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Questions List for Current Task */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {currentAdminQuestions.map((q, idx) => {
                      const isOpen = openAdminQuestionId === q.id;
                      return (
                        <div
                          key={q.id}
                          style={{
                            background: isOpen ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)',
                            border: isOpen ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            transition: 'all 0.2s ease',
                            boxShadow: isOpen ? '0 4px 18px rgba(99, 102, 241, 0.12)' : 'none'
                          }}
                        >
                          {/* Clickable Question Row / List Item */}
                          <div
                            onClick={() => setOpenAdminQuestionId(prev => prev === q.id ? null : q.id)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '14px 18px',
                              cursor: 'pointer',
                              background: isOpen ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                              transition: 'background 0.2s ease',
                              flexWrap: 'wrap'
                            }}
                            onMouseEnter={(e) => {
                              if (!isOpen) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isOpen) e.currentTarget.style.background = 'transparent';
                            }}
                            title={isOpen ? 'Click to collapse question' : 'Click to show question'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '220px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: isOpen ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 'rgba(255, 255, 255, 0.06)',
                                  color: 'var(--text-primary)',
                                  fontWeight: 700,
                                  fontSize: '0.85rem'
                                }}
                              >
                                Q{idx + 1}
                              </span>
                              <span
                                style={{
                                  fontSize: '1rem',
                                  fontWeight: 600,
                                  color: isOpen ? '#7e22ce' : 'var(--text-primary)',
                                  lineHeight: 1.4,
                                  wordBreak: 'break-word'
                                }}
                              >
                                {q.question_text}
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                              <span className="status-pill" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#7e22ce', borderColor: '#4f46e5', fontWeight: 700 }}>
                                {q.task_number || 'Task 1'}
                              </span>
                              <span className="timer-badge">{q.duration_seconds}s</span>
                              {q.teacher_name && (
                                <span className="status-pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#0284c7' }}>
                                  Faculty: {q.teacher_name}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteQuestion(q.id, q.question_text);
                                }}
                                title="Delete question completely"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.16)',
                                  border: '1px solid rgba(239, 68, 68, 0.55)',
                                  color: '#f87171',
                                  borderRadius: '9999px',
                                  padding: '4px 10px',
                                  fontSize: '0.85rem',
                                  cursor: 'pointer'
                                }}
                              >
                                🗑️
                              </button>

                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                  padding: '4px 12px',
                                  fontSize: '0.8rem',
                                  background: isOpen ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                                  border: isOpen ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.15)',
                                  color: isOpen ? '#6b21a8' : '#334155',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 600
                                }}
                              >
                                {isOpen ? '▲ Hide' : '▼ View Question'}
                              </button>
                            </div>
                          </div>

                          {/* If clicked, THEN ONLY show the question details */}
                          {isOpen && (
                            <div
                              style={{
                                padding: '16px 20px',
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                background: '#f8fafc',
                                animation: 'slideUp 0.25s ease-out'
                              }}
                            >
                              <div className="grid-2" style={{ gap: '10px', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                                <div style={{ padding: '8px 12px', borderRadius: '6px', background: q.correct_option === 'A' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255,255,255,0.02)', border: q.correct_option === 'A' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid transparent' }}>
                                  <strong style={{ color: q.correct_option === 'A' ? '#4ade80' : 'var(--text-primary)' }}>A:</strong> {q.option_a} {q.correct_option === 'A' && <span style={{ color: '#4ade80', fontWeight: 700 }}>(Correct)</span>}
                                </div>
                                <div style={{ padding: '8px 12px', borderRadius: '6px', background: q.correct_option === 'B' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255,255,255,0.02)', border: q.correct_option === 'B' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid transparent' }}>
                                  <strong style={{ color: q.correct_option === 'B' ? '#4ade80' : 'var(--text-primary)' }}>B:</strong> {q.option_b} {q.correct_option === 'B' && <span style={{ color: '#4ade80', fontWeight: 700 }}>(Correct)</span>}
                                </div>
                                <div style={{ padding: '8px 12px', borderRadius: '6px', background: q.correct_option === 'C' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255,255,255,0.02)', border: q.correct_option === 'C' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid transparent' }}>
                                  <strong style={{ color: q.correct_option === 'C' ? '#4ade80' : 'var(--text-primary)' }}>C:</strong> {q.option_c} {q.correct_option === 'C' && <span style={{ color: '#4ade80', fontWeight: 700 }}>(Correct)</span>}
                                </div>
                                <div style={{ padding: '8px 12px', borderRadius: '6px', background: q.correct_option === 'D' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255,255,255,0.02)', border: q.correct_option === 'D' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid transparent' }}>
                                  <strong style={{ color: q.correct_option === 'D' ? '#4ade80' : 'var(--text-primary)' }}>D:</strong> {q.option_d} {q.correct_option === 'D' && <span style={{ color: '#4ade80', fontWeight: 700 }}>(Correct)</span>}
                                </div>
                              </div>

                              {q.explanation && (
                                <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '6px', background: '#eef2ff', border: '1px solid rgba(99, 102, 241, 0.25)', fontSize: '0.85rem', color: '#3730a3' }}>
                                  <strong>Explanation:</strong> {q.explanation}
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '8px' }}>
                                <span>Published on {new Date(q.created_at).toLocaleDateString()}</span>
                                <span>Total Submissions: <strong style={{ color: 'var(--text-primary)' }}>{q.total_submissions ?? 0}</strong> ({q.correct_count ?? 0} correct)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
          {/* Stats on the left; small Create Account and Pending Approvals buttons on the right */}
          <div className="grid-2" style={{ marginBottom: '24px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'stretch' }}>
              <div className="stat-card" style={{ flex: 1, margin: 0 }}>
                <div>
                  <div className="stat-val">{stats.admins}</div>
                  <div className="stat-label">College Admins</div>
                </div>
              </div>
              <div className="stat-card" style={{ flex: 1, margin: 0 }}>
                <div>
                  <div className="stat-val">{stats.total}</div>
                  <div className="stat-label">Total Registered Accounts</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <YearTransitionPill twoLines onClick={() => setShowYearTransitionModal(true)} />
              <CreateAccountPill twoLines onClick={() => setShowCreateAccountModal(true)} />
              <PendingPill
                label="Approval pending"
                count={pendingUsers.length}
                onClick={() => {
                  loadPending();
                  setShowPending(true);
                }}
              />
            </div>
          </div>

          {/* Academic Year Transition Pop Up Modal */}
          {showYearTransitionModal && (
            <YearTransitionSection
              isOpen={showYearTransitionModal}
              onClose={() => setShowYearTransitionModal(false)}
              currentUser={currentUser}
              onSuccess={() => {
                loadProfiles();
              }}
            />
          )}

          {/* User Profiles Directory Card */}
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  User Profiles Directory
                  <span
                    className="status-pill"
                    style={{
                      fontSize: '0.8rem',
                      padding: '2px 10px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--accent-primary)',
                      borderColor: 'rgba(99, 102, 241, 0.4)'
                    }}
                  >
                    Showing {displayedProfiles.length} of {scopedProfiles.length} Users
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setFilterCreatedByMe(p => !p)}
                    style={{
                      padding: '3px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      background: filterCreatedByMe ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      borderColor: filterCreatedByMe ? '#10b981' : 'var(--border-color)',
                      color: filterCreatedByMe ? '#047857' : 'var(--text-secondary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                    title="Toggle filter: Only show accounts created by you"
                  >
                    <span>{filterCreatedByMe ? 'Only Created by Me' : 'All System Accounts'}</span>
                  </button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Browse registered members by category tabs or search by name, email, username, or ID.
                </p>
              </div>

              {/* Search Bar & Search Button Group */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <form
                  onSubmit={handleSearch}
                  style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search name, email, ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ minWidth: '240px', padding: '7px 12px', fontSize: '0.88rem' }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          padding: '2px 4px'
                        }}
                        title="Clear input"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    style={{ padding: '8px 16px' }}
                    disabled={profilesLoading}
                  >
                    Search
                  </button>

                  {(activeSearchTerm || searchQuery) && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleClearSearch}
                      style={{ padding: '8px 12px' }}
                      title="Clear search filter"
                    >
                      Reset
                    </button>
                  )}
                </form>

                <select
                  className="form-select"
                  value={roleFilter}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setRoleFilter(newRole);
                  }}
                  style={{ width: 'auto', padding: '7px 12px', fontSize: '0.85rem' }}
                >
                  <option value="">All Specific Roles</option>
                  <option value="super_admin">Super Admins</option>
                  <option value="admin">College Admins</option>
                  <option value="principal">Principals</option>
                  <option value="class_teacher">Class Teachers</option>
                  <option value="teacher">Teachers</option>
                  <option value="hod">HODs</option>
                  <option value="class_leader">Class Leaders</option>
                  <option value="student">Students</option>
                  <option value="accountant">Accountants</option>
                  <option value="librarian">Librarians</option>
                  <option value="parent">Parents</option>
                </select>

                <select
                  className="form-select"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  style={{ width: 'auto', padding: '7px 12px', fontSize: '0.85rem' }}
                >
                  <option value="">All Years</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => loadProfiles()}
                  disabled={profilesLoading}
                  style={{ padding: '8px 12px' }}
                  title="Refresh user directory"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Responsive User Category Tabs */}
            <div className="user-tabs-wrapper">
              <div className="user-tabs-container" role="tablist" aria-label="User Category Tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'all'}
                  className={`user-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => handleTabChange('all')}
                >
                  <span className="user-tab-label">All Users</span>
                  <span className="user-tab-badge">{tabCounts.all}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'super_admin'}
                  className={`user-tab-btn ${activeTab === 'super_admin' ? 'active' : ''}`}
                  onClick={() => handleTabChange('super_admin')}
                >
                  <span className="user-tab-label">Super Admins</span>
                  <span className="user-tab-badge">{tabCounts.super_admin}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'admin'}
                  className={`user-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => handleTabChange('admin')}
                >
                  <span className="user-tab-label">Admins</span>
                  <span className="user-tab-badge">{tabCounts.admin}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'principal'}
                  className={`user-tab-btn ${activeTab === 'principal' ? 'active' : ''}`}
                  onClick={() => handleTabChange('principal')}
                >
                  <span className="user-tab-label">Principals</span>
                  <span className="user-tab-badge">{tabCounts.principal}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'hod'}
                  className={`user-tab-btn ${activeTab === 'hod' ? 'active' : ''}`}
                  onClick={() => handleTabChange('hod')}
                >
                  <span className="user-tab-label">HODs</span>
                  <span className="user-tab-badge">{tabCounts.hod}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'teacher'}
                  className={`user-tab-btn ${activeTab === 'teacher' ? 'active' : ''}`}
                  onClick={() => handleTabChange('teacher')}
                >
                  <span className="user-tab-label">Teachers</span>
                  <span className="user-tab-badge">{tabCounts.teacher}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'class_teacher'}
                  className={`user-tab-btn ${activeTab === 'class_teacher' ? 'active' : ''}`}
                  onClick={() => handleTabChange('class_teacher')}
                >
                  <span className="user-tab-label">Class Teachers</span>
                  <span className="user-tab-badge">{tabCounts.class_teacher}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'student'}
                  className={`user-tab-btn ${activeTab === 'student' ? 'active' : ''}`}
                  onClick={() => handleTabChange('student')}
                >
                  <span className="user-tab-label">Students</span>
                  <span className="user-tab-badge">{tabCounts.student}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'accountant'}
                  className={`user-tab-btn ${activeTab === 'accountant' ? 'active' : ''}`}
                  onClick={() => handleTabChange('accountant')}
                >
                  <span className="user-tab-label">Accountants</span>
                  <span className="user-tab-badge">{tabCounts.accountant}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'librarian'}
                  className={`user-tab-btn ${activeTab === 'librarian' ? 'active' : ''}`}
                  onClick={() => handleTabChange('librarian')}
                >
                  <span className="user-tab-label">Librarians</span>
                  <span className="user-tab-badge">{tabCounts.librarian}</span>
                </button>
              </div>
            </div>

            {/* Filter Scope Banner */}
            {filterCreatedByMe && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 14px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem',
                  color: '#047857',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <span>
                  <strong>Creator Scope Active:</strong> Showing only accounts created by you ({currentUser?.name || 'me'}). Accounts not created by you are hidden from the directory.
                </span>
                <button
                  type="button"
                  onClick={() => setFilterCreatedByMe(false)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    color: '#1e293b',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title="View all accounts across the institution"
                >
                  View All System Accounts
                </button>
              </div>
            )}

            {/* Active Search & Filter Feedback Banner */}
            {(activeSearchTerm || searchQuery) && (
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '9px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.86rem',
                  color: '#3730a3',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <span>
                  Filtered by: "<strong>{activeSearchTerm || searchQuery}</strong>" in{' '}
                  <strong style={{ textTransform: 'capitalize' }}>
                    {activeTab === 'all' ? 'All Users' : activeTab === 'super_admin' ? 'Super Admins' : activeTab === 'class_teacher' ? 'Class Teachers' : `${activeTab}s`}
                  </strong>{' '}
                  ({displayedProfiles.length} match{displayedProfiles.length === 1 ? '' : 'es'})
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleClearSearch}
                  style={{ padding: '2px 10px', fontSize: '0.78rem' }}
                >
                  Clear Search
                </button>
              </div>
            )}

            {/* Selected User Action Banner */}
            {selectedUser && (
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.16)',
                  border: '1px solid #4f46e5',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        SELECTED USER:
                      </span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>{selectedUser.name}</strong>
                      <span className={`user-role-pill role-${selectedUser.role}`}>{formatRoleName(selectedUser.role)}</span>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      ID: <strong style={{ color: 'var(--text-primary)' }}>{formatUserId(selectedUser.id)}</strong> | Email: <strong style={{ color: '#4338ca' }}>{selectedUser.email}</strong> {selectedUser.username ? `| User Name: @${selectedUser.username}` : ''} {selectedUser.department_name ? `| Dept: ${selectedUser.department_name}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setInspectUserId(selectedUser.id)}
                      title="Inspect user profile"
                    >
                      Inspect Profile
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditUser(selectedUser)}
                      title="Edit user login details"
                    >
                      Edit Login Details
                    </button>
                    {selectedUser.id !== currentUser?.id && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          background: 'rgba(239, 68, 68, 0.18)',
                          color: '#f87171',
                          border: '1px solid #ef4444',
                          fontWeight: 600
                        }}
                        onClick={() => handleDeleteUser(selectedUser)}
                        title={`Permanently delete ${selectedUser.name}'s account`}
                      >
                        Delete Account
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedUser(null)}
                      title="Deselect user"
                      style={{ color: '#f87171' }}
                    >
                      Deselect
                    </button>
                  </div>
                </div>

                {/* LOG Block */}
                <div style={{
                  padding: '12px 14px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    LOG
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                      <span style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Created By:</span>
                      <span style={{ textAlign: 'right', color: 'var(--text-primary)', fontSize: '0.84rem', fontWeight: 600 }}>
                        {selectedUser.created_by_name ? `${selectedUser.created_by_name} (${formatRoleName(selectedUser.created_by_role)})` : 'Initial Provision'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                      <span style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Created On:</span>
                      <span style={{ textAlign: 'right', color: 'var(--text-primary)', fontSize: '0.84rem', fontWeight: 600 }}>
                        {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                      <span style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Edited By:</span>
                      <span style={{ textAlign: 'right', color: selectedUser.edited_by_name ? '#60a5fa' : '#334155', fontSize: '0.84rem', fontWeight: 600 }}>
                        {selectedUser.edited_by_name ? `${selectedUser.edited_by_name} (${formatRoleName(selectedUser.edited_by_role)})` : 'Not Edited Yet'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                      <span style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>Edited On:</span>
                      <span style={{ textAlign: 'right', color: selectedUser.last_edited_at ? '#fff' : '#334155', fontSize: '0.84rem', fontWeight: 600 }}>
                        {selectedUser.last_edited_at ? new Date(selectedUser.last_edited_at).toLocaleString() : 'Not Edited Yet'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="table-responsive">
              <table className="custom-table dark-header-table" style={{ width: '100%' }}>
                  <thead className="dark-header-thead" style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 2 }}>
                    <tr>
                      <th style={{ textAlign: 'center', background: '#1e293b', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}>Account Name</th>
                      <th style={{ textAlign: 'center', background: '#1e293b', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}>Role</th>
                      <th style={{ textAlign: 'center', background: '#1e293b', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}>User name</th>
                      <th style={{ textAlign: 'center', background: '#1e293b', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}>Year</th>
                      <th style={{ textAlign: 'center', background: '#1e293b', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}>Email / Contact</th>
                      <th style={{ textAlign: 'center', background: '#1e293b', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}>Provisioned By</th>
                      <th style={{ textAlign: 'center', background: '#1e293b', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}>Created Date</th>
                      <th style={{ textAlign: 'center', background: '#1e293b', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profilesLoading && profiles.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 20px' }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>Loading accounts directory...</div>
                          <p style={{ margin: '0 auto', fontSize: '0.85rem' }}>Fetching registered user profiles...</p>
                        </td>
                      </tr>
                    ) : paginatedProfiles.length ? (
                      paginatedProfiles.map(u => {
                        const isSelected = selectedUser?.id === u.id;
                        return (
                          <tr
                            key={u.id}
                            style={{
                              background: isSelected ? 'rgba(99, 102, 241, 0.14)' : undefined,
                              boxShadow: isSelected ? 'inset 0 0 0 1px #4f46e5' : undefined
                            }}
                          >
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <strong style={{ fontSize: '0.96rem', color: 'var(--text-primary)', display: 'block' }}>{u.name}</strong>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>{formatUserId(u.id)}</div>
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <span className={`user-role-pill role-${u.role}`} style={{ fontSize: '0.74rem' }}>
                                  {formatRoleName(u.role)}
                                </span>
                                {u.department_name && (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    {u.department_name}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 600 }}>
                                @{u.username || '—'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              {u.academic_year ? (
                                <div>
                                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                                    Year {u.academic_year}
                                  </span>
                                  {u.previous_year && (
                                    <div
                                      className="status-pill"
                                      style={{
                                        fontSize: '0.68rem',
                                        marginTop: '3px',
                                        background: 'rgba(99, 102, 241, 0.12)',
                                        color: '#4338ca',
                                        borderColor: '#818cf8',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap'
                                      }}
                                      title={`Changed from Year ${u.previous_year} to Year ${u.academic_year}`}
                                    >
                                      From Yr {u.previous_year} → Yr {u.academic_year}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <span style={{ color: '#4f46e5', fontWeight: 600, fontSize: '0.86rem' }}>{u.email}</span>
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                                  {u.created_by_name ? `${u.created_by_name}` : 'Initial Provision'}
                                </span>
                                {u.created_by_role && (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    ({formatRoleName(u.created_by_role)})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => setInspectUserId(u.id)}
                                  title="View full user details clearly"
                                  style={{
                                    fontSize: '0.78rem',
                                    padding: '5px 12px',
                                    fontWeight: 700,
                                    background: '#0284c7',
                                    borderColor: '#0284c7',
                                    color: '#ffffff'
                                  }}
                                >
                                  View Details
                                </button>

                                                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setEditUser(u)}
                                    title="Edit user login details"
                                    style={{ fontSize: '0.78rem', padding: '5px 10px', fontWeight: 600 }}
                                  >
                                    Edit
                                  </button>

                                {u.id !== currentUser?.id && (
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.15)',
                                      color: '#ef4444',
                                      border: '1px solid #ef4444',
                                      fontWeight: 600,
                                      padding: '5px 10px',
                                      fontSize: '0.78rem'
                                    }}
                                    onClick={() => handleDeleteUser(u)}
                                    title={`Permanently delete ${u.name}'s account`}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 20px' }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>No accounts found in this view</div>
                          <p style={{ margin: '0 auto 12px', maxWidth: '420px', fontSize: '0.88rem' }}>
                            {activeSearchTerm || searchQuery
                              ? `No user records matched "${activeSearchTerm || searchQuery}" in the selected tab.`
                              : `There are currently no accounts categorized under this tab.`}
                          </p>
                          {(activeSearchTerm || searchQuery || activeTab !== 'all' || roleFilter) && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={handleClearSearch}
                            >
                              Reset Filters
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 10 Items Pagination Bar */}
              <Pagination
                currentPage={activePage}
                totalItems={displayedProfiles.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemLabel="users"
              />
            </div>
          </>
        )}
      </div>
    </div>

    {/* Pending Approvals Modal */}
    {showPending && createPortal(
      <div
        className="modal-overlay active"
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowPending(false);
        }}
      >
        <div
          className="modal-card"
          style={{ maxWidth: '900px', width: '94%', maxHeight: '88vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Pending Approvals</h3>
              <span className="user-role-pill" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#b45309' }}>
                {pendingUsers.length} Pending
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={loadPending} disabled={pendingLoading}>
                Refresh Queue
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPending(false)}>
                ✕ Close
              </button>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 12px 0' }}>
            Registrations waiting for administrator review appear here.
          </p>

          <div className="table-responsive">
            <table className="custom-table dark-header-table">
              <thead className="dark-header-thead" style={{ background: '#1e293b' }}>
                <tr>
                  <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>User ID</th>
                  <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Name</th>
                  <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Email / Phone</th>
                  <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Role</th>
                  <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Registered</th>
                  <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.length ? (
                  pendingUsers.map((u) => (
                    <tr key={u.id}>
                      <td style={{ textAlign: 'center' }}>{formatUserId(u.id)}</td>
                      <td style={{ textAlign: 'center' }}><strong>{u.name}</strong></td>
                      <td style={{ textAlign: 'center' }}>{u.email}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`user-role-pill role-${u.role}`}>{formatRoleName(u.role)}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleApprove(u.id)}>Approve</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleReject(u.id)}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      No pending registrations waiting for review.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>,
      document.body
    )}

    {/* Modals */}
      <ProfileModal
        userId={inspectUserId}
        isOpen={Boolean(inspectUserId)}
        onClose={() => setInspectUserId(null)}
      />

      <EditUserModal
        user={editUser}
        isOpen={Boolean(editUser)}
        onClose={() => setEditUser(null)}
        onUpdated={() => loadProfiles(roleFilter)}
      />
    </section>
  );
};
