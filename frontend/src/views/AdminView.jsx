import React, { useEffect, useState, useCallback } from 'react';
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
import { NotificationComposer } from '../components/NotificationComposer';

export const AdminView = () => {
  const { user: currentUser } = useAuth();
  const { showAlert } = useAlert();
  const { notifications, markRead, loadNotifications } = useNotifications();
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
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

  // Sub Tab
  const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard' | 'setup' | 'broadcast'

  useEffect(() => {
    if (currentUser?.role === 'principal' && ['setup', 'students'].includes(activeSubTab)) {
      setActiveSubTab('dashboard');
    }
  }, [currentUser?.role, activeSubTab]);

  // Stats
  const [stats, setStats] = useState(() => {
    const cached = API.getCachedProfiles();
    const studentsCount = cached.filter(u => ['student', 'class_leader'].includes(u.role) && u.status === 'active').length;
    const facultyCount = cached.filter(u => ['teacher', 'class_teacher', 'hod'].includes(u.role)).length;
    return {
      pending: 0,
      students: studentsCount,
      faculty: facultyCount,
      total: cached.length
    };
  });

  // Provision staff form
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('teacher');
  const [designation, setDesignation] = useState('');
  const [qualification, setQualification] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [adminTeacherDeptIds, setAdminTeacherDeptIds] = useState([]);
  const [showNewDept, setShowNewDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [nameEligibilityNotice, setNameEligibilityNotice] = useState('');

  const [batchId, setBatchId] = useState('');
  const [batches, setBatches] = useState([]);
  const [section, setSection] = useState('');
  const [customSection, setCustomSection] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [isClassLeader, setIsClassLeader] = useState(false);
  const [sectionsList, setSectionsList] = useState([]);

  // Departments for dropdown
  const [departments, setDepartments] = useState([]);

  // Profiles directory (instantly loaded from cache without loading state on refresh)
  const [profiles, setProfiles] = useState(() => API.getCachedProfiles());
  const [profilesLoading, setProfilesLoading] = useState(false);

  // Search & Select for User Profiles Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'teacher' | 'class_teacher' | 'student' | 'admin'
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [filterCreatedByMe, setFilterCreatedByMe] = useState(false);

  // Modals
  const [inspectUserId, setInspectUserId] = useState(null);
  const [editUser, setEditUser] = useState(null);

  // Load departments & batches
  const loadDepartments = useCallback(async () => {
    try {
      const [dRes, sRes, bRes] = await Promise.all([
        API.getDepartments(),
        API.getSections().catch(() => ({ sections: [] })),
        API.getBatches().catch(() => ({ batches: [] }))
      ]);
      setDepartments(dRes.departments || []);
      setSectionsList(sRes.sections || []);
      setBatches(bRes.batches || []);
    } catch (e) {
      console.warn('Could not load departments/batches:', e);
    }
  }, []);

  // Load profiles & stats
  const loadProfiles = useCallback(async (showLoading = false) => {
    try {
      if (showLoading && profiles.length === 0) setProfilesLoading(true);
      const [profRes, pendRes] = await Promise.all([
        API.getUserProfiles(),
        API.getPendingStudents().catch(() => ({ students: [] }))
      ]);

      const users = profRes.users || [];
      API.setCachedProfiles(users);
      setProfiles(users);

      const studentsCount = users.filter(u => ['student', 'class_leader'].includes(u.role) && u.status === 'active').length;
      const facultyCount = users.filter(u => ['teacher', 'class_teacher', 'hod'].includes(u.role)).length;
      const pendingCount = (pendRes.students || []).length;

      setStats({
        pending: pendingCount,
        students: studentsCount,
        faculty: facultyCount,
        total: users.length
      });
    } catch (e) {
      console.warn('Could not load profiles:', e);
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
    loadProfiles(false);
  }, [loadDepartments, loadProfiles]);

  useEffect(() => {
    if (activeSubTab === 'dashboard') {
      loadProfiles(false);
    }
  }, [activeSubTab, loadProfiles]);

  // Create account
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !password.trim() || !username.trim()) {
      showAlert('All mandatory fields are required', 'danger');
      return;
    }

    if (nameEligibilityNotice) {
      showAlert(nameEligibilityNotice, 'danger');
      return;
    }

    try {
      setCreateLoading(true);
      const checkRes = await API.checkName(name.trim());
      if (checkRes && !checkRes.eligible) {
        setNameEligibilityNotice(checkRes.message);
        showAlert(checkRes.message, 'danger');
        return;
      }
      const extra = {};
      if (['teacher', 'class_teacher', 'hod', 'student', 'class_leader', 'accountant', 'librarian'].includes(role)) {
        if (designation.trim()) extra.designation = designation.trim();
        if (qualification.trim()) extra.qualification = qualification.trim();

        if (role === 'teacher') {
          if (adminTeacherDeptIds.length === 0 && !departmentId && (!showNewDept || !newDeptName || !newDeptCode)) {
            showAlert('Department is mandatory. Please select at least one department for the teacher.', 'danger');
            return;
          }
          if (adminTeacherDeptIds.length > 10) {
            showAlert('A teacher can be assigned to a maximum of 10 departments.', 'warning');
            return;
          }
          const selIds = adminTeacherDeptIds.length > 0 ? adminTeacherDeptIds : (departmentId ? [departmentId] : []);
          extra.department_ids = selIds;
          if (selIds.length > 0) extra.department_id = selIds[0];
          else if (departmentId) extra.department_id = departmentId;
        } else {
          if (!departmentId && (!showNewDept || !newDeptName || !newDeptCode)) {
            showAlert('Department is mandatory. Please select an assigned department.', 'danger');
            return;
          }
          if (departmentId) extra.department_id = departmentId;
          extra.department_ids = departmentId ? [departmentId] : [];
        }

        if (showNewDept && newDeptName && newDeptCode) {
          extra.new_department_name = newDeptName.trim();
          extra.new_department_code = newDeptCode.trim().toUpperCase();
        }
      }
      if (['student', 'class_leader'].includes(role)) {
        if (batchId) extra.batch_id = batchId;
        const finalSec = section === 'custom' ? customSection.trim() : section;
        if (finalSec) extra.section_id = finalSec;
        if (rollNumber.trim()) extra.roll_number = rollNumber.trim();
        if (guardianName.trim()) extra.guardian_name = guardianName.trim();
        if (guardianPhone.trim()) extra.guardian_phone = guardianPhone.trim();
        if (guardianEmail.trim()) extra.guardian_email = guardianEmail.trim();
      }

      const effectiveRole = (role === 'student' && isClassLeader) ? 'class_leader' : role;
      const res = await API.createAccount(
        name.trim(),
        contact.trim(),
        password.trim(),
        effectiveRole,
        username.trim(),
        extra
      );

      // Immediately display newly created account in table without waiting or refreshing
      if (res.user) {
        const newAcc = {
          id: res.user.id,
          name: res.user.name || name.trim(),
          email: res.user.email || contact.trim(),
          username: username.trim(),
          role: res.user.role || role,
          status: res.user.status || 'active',
          created_at: new Date().toISOString(),
          created_by_id: currentUser?.id,
          created_by_name: currentUser?.name,
          created_by_role: currentUser?.role,
          created_by_me: true,
          can_edit: true,
          department_id: departmentId || null,
          department_name: departments.find(d => String(d.id) === String(departmentId))?.name || null,
          roll_number: rollNumber.trim() || null
        };
        setProfiles(prev => {
          const updated = [newAcc, ...prev.filter(u => u.id !== newAcc.id)];
          API.setCachedProfiles(updated);
          return updated;
        });
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          students: ['student', 'class_leader'].includes(role) ? prev.students + 1 : prev.students,
          faculty: ['teacher', 'class_teacher', 'hod'].includes(role) ? prev.faculty + 1 : prev.faculty
        }));
      }

      setLocalCreatedNotice({
        title: `Account Created: ${name.trim()}`,
        name: name.trim(),
        role: role
      });
      loadNotifications();

      setName('');
      setNameEligibilityNotice('');
      setContact('');
      setUsername('');
      setPassword('');
      setDesignation('');
      setQualification('');
      setDepartmentId('');
      setAdminTeacherDeptIds([]);
      setShowNewDept(false);
      setNewDeptName('');
      setNewDeptCode('');
      setBatchId('');
      setSection('');
      setCustomSection('');
      setRollNumber('');
      setGuardianName('');
      setGuardianPhone('');
      setGuardianEmail('');
      setIsClassLeader(false);
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

  // Permanently delete user account
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

  // Search & Clear Handlers for User Profiles Directory
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
      if (tab === 'teacher' && role !== 'teacher') match = false;
      if (tab === 'class_teacher' && role !== 'class_teacher') match = false;
      if (tab === 'student' && !['student', 'class_leader'].includes(role)) match = false;
      if (tab === 'accountant' && role !== 'accountant') match = false;
      if (tab === 'librarian' && role !== 'librarian') match = false;
      if (!match) setSelectedUser(null);
    }
  };

  // Approve a pending registered account
  const handleApproveStudent = async (id) => {
    try {
      const res = await API.approveStudent(id);
      showAlert(res.message || 'Account approved and activated successfully!', 'success');
      loadProfiles();
    } catch (e) {
      showAlert(e.message || 'Failed to approve account', 'danger');
    }
  };

  // Reject a pending registered account
  const handleRejectStudent = async (id) => {
    if (!window.confirm('Are you sure you want to reject this registration request?')) return;
    try {
      const res = await API.rejectStudent(id);
      showAlert(res.message || 'Registration rejected', 'info');
      loadProfiles();
    } catch (e) {
      showAlert(e.message || 'Failed to reject registration', 'danger');
    }
  };

  // All registered accounts are present in All Users in admin
  const scopedProfiles = profiles.filter(u => {
    if (!filterCreatedByMe) return true;
    return u.created_by_id === currentUser?.id || u.created_by_me || u.id === currentUser?.id || !u.created_by_id;
  });

  // Tab counts dynamically calculated from scoped profiles
  const tabCounts = {
    all: scopedProfiles.length,
    super_admin: scopedProfiles.filter(u => u.role === 'super_admin').length,
    hod: scopedProfiles.filter(u => u.role === 'hod').length,
    admin: scopedProfiles.filter(u => u.role === 'admin').length,
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
    if (activeTab === 'teacher' && u.role !== 'teacher') return false;
    if (activeTab === 'class_teacher' && u.role !== 'class_teacher') return false;
    if (activeTab === 'student' && !['student', 'class_leader'].includes(u.role)) return false;
    if (activeTab === 'accountant' && u.role !== 'accountant') return false;
    if (activeTab === 'librarian' && u.role !== 'librarian') return false;

    if (roleFilter && u.role !== roleFilter) return false;

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
  }, [activeTab, roleFilter, activeSearchTerm, searchQuery, filterCreatedByMe]);

  const totalPages = Math.max(1, Math.ceil(displayedProfiles.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginatedProfiles = displayedProfiles.slice(startIndex, startIndex + pageSize);

  const isFacultyRole = ['teacher', 'class_teacher', 'hod', 'accountant', 'librarian'].includes(role);
  const isDeptRole = ['teacher', 'class_teacher', 'hod', 'student', 'class_leader', 'accountant', 'librarian'].includes(role);

  return (
    <section>
      {/* Header */}
      <div className="card-header" style={{ marginBottom: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {currentUser?.role === 'principal' ? 'Principal Administration Portal' : 'College Administration Portal'}
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
            {currentUser?.role === 'principal'
              ? 'Institutional oversight, department & direct student notifications, faculty broadcasts, and student directory.'
              : 'Provision faculty accounts, manage institutional directory, dispatch faculty broadcasts, and manage student admissions.'}
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
            👥 User Directory ({stats.total})
          </button>
          <button
            className={`tab-btn ${activeSubTab === 'broadcast' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('broadcast')}
          >
            📢 Dispatch Broadcast
          </button>
          {currentUser?.role !== 'principal' && (
            <button
              className={`tab-btn ${activeSubTab === 'setup' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('setup')}
            >
              🏛️ College Academic Setup
            </button>
          )}
        </div>

        {/* Create Account Modal Pop Up */}
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
      <CreateAccountModal
          isOpen={showCreateAccountModal}
          onClose={() => setShowCreateAccountModal(false)}
          onCreated={() => loadProfiles(true)}
          currentUser={currentUser}
        />

        <div className="portal-main-content">
          {currentUser?.role !== 'principal' && activeSubTab === 'setup' && (
            <CollegeSetup canManage={true} />
          )}

          {activeSubTab === 'broadcast' && (
            <div className="card" style={{ maxWidth: '720px', padding: '8px 12px' }}>
              <div className="card-title">
                Dispatch Notification
              </div>
              <div className="alert alert-info" style={{ fontSize: '0.82rem', margin: '6px 0' }}>
                <span>
                  <strong>{currentUser?.role === 'principal' ? 'Principal Authority:' : 'Admin Authority:'}</strong>{' '}
                  {currentUser?.role === 'principal'
                    ? 'Dispatch notifications to Selected Students, Whole Department Students, Teachers, or Admin directly from the dropdown.'
                    : 'Send to all Teachers, all Class Teachers, all Students, or the students (and faculty) of a chosen department.'}
                </span>
              </div>
              <NotificationComposer />
            </div>
          )}

          {activeSubTab === 'dashboard' && (
            <>
              {/* Stat Tiles */}
              <div className="grid-4" style={{ marginBottom: '16px', gap: '12px' }}>
                <div className="stat-card" style={{ padding: '12px 16px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="stat-label" style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>PENDING</div>
                    <div className="stat-val" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>{stats.pending}</div>
                  </div>
                </div>
                <div className="stat-card" style={{ padding: '12px 16px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="stat-label" style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>STUDENTS</div>
                    <div className="stat-val" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{stats.students}</div>
                  </div>
                </div>
                <div className="stat-card" style={{ padding: '12px 16px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="stat-label" style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>FACULTY</div>
                    <div className="stat-val" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6366f1', marginTop: '2px' }}>{stats.faculty}</div>
                  </div>
                </div>
                <div className="stat-card" style={{ padding: '3px 8px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
                  <div>
                    <div className="stat-label" style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL</div>
                    <div className="stat-val" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#090d16', marginTop: '2px' }}>{stats.total}</div>
                  </div>
                </div>
              </div>

              {/* User Profiles Directory */}
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
                    Showing {displayedProfiles.length} of {scopedProfiles.length} Accounts
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
                  Browse registered faculty and student accounts by category tabs or search by name, email, username, or ID.
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
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ width: 'auto', padding: '7px 12px', fontSize: '0.85rem' }}
                >
                  <option value="">All Specific Roles</option>
                  <option value="admin">College Admins</option>
                  <option value="class_teacher">Class Teachers</option>
                  <option value="teacher">Teachers</option>
                  <option value="hod">HODs</option>
                  <option value="class_leader">Class Leaders</option>
                  <option value="student">Students</option>
                  <option value="accountant">Accountants</option>
                  <option value="librarian">Librarians</option>
                  <option value="parent">Parents</option>
                </select>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={loadProfiles}
                  disabled={profilesLoading}
                  style={{ padding: '8px 12px' }}
                  title="Refresh user directory"
                >
                  Refresh
                </button>

                <YearTransitionPill onClick={() => setShowYearTransitionModal(true)} />
                <CreateAccountPill onClick={() => setShowCreateAccountModal(true)} />
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
                  color: '#1e293b',
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
                    {currentUser?.role !== 'principal' && selectedUser.role !== 'principal' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditUser(selectedUser)}
                        title="Edit user login details"
                      >
                        Edit Login Details
                      </button>
                    )}
                    {selectedUser.id !== currentUser?.id && selectedUser.role !== 'super_admin' && (
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
                      <th style={{ textAlign: 'center', background: '#1e293b', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}>User Name</th>
                      <th style={{ textAlign: 'center', background: '#1e293b', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}>Email / Contact</th>
                      <th style={{ textAlign: 'center', background: '#1e293b', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}>Provisioned By</th>
                      <th style={{ textAlign: 'center', background: '#1e293b', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}>Created Date</th>
                      <th style={{ textAlign: 'center', background: '#1e293b', color: '#ffffff', fontWeight: 700, padding: '10px 14px' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profilesLoading && profiles.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 20px' }}>
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

                                {currentUser?.role !== 'principal' && u.role !== 'principal' && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setEditUser(u)}
                                    title="Edit user login details"
                                    style={{ fontSize: '0.78rem', padding: '5px 10px', fontWeight: 600 }}
                                  >
                                    Edit
                                  </button>
                                )}

                                {u.status === 'pending' && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleRejectStudent(u.id)}
                                    title="Reject registration"
                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                  >
                                    Reject
                                  </button>
                                )}

                                {u.id !== currentUser?.id && u.role !== 'super_admin' && (u.created_by_id === currentUser?.id || u.created_by_me) && (
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.18)',
                                      color: '#f87171',
                                      border: '1px solid #ef4444',
                                      fontWeight: 600,
                                      padding: '4px 10px',
                                      fontSize: '0.8rem'
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
              {/* 10 Users/Accounts per screen Pagination bar */}
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
        onUpdated={loadProfiles}
      />
    </section>
  );
};
