import React, { useEffect, useState, useCallback } from 'react';
import { API } from '../api/api';
import { useAuth, formatRoleName, formatUserId } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { ProfileModal } from '../components/ProfileModal';
import { PasswordInput } from '../components/PasswordInput';
import { Pagination } from '../components/Pagination';
import { CreateAccountModal, CreateAccountButton } from '../components/CreateAccountModal';

export const DeanView = () => {
  const { user: currentUser, collegeName, setCollegeName } = useAuth();
  const { showAlert } = useAlert();

  // Active Tab: 'monitor' | 'create' | 'directory'
  const [activeTab, setActiveTab] = useState('monitor');
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);

  // Institute Name Editing (Dean Authority)
  const [isEditingCollege, setIsEditingCollege] = useState(false);
  const [instituteInput, setInstituteInput] = useState('');
  const [saveCollegeLoading, setSaveCollegeLoading] = useState(false);

  const handleSaveInstituteName = async (e) => {
    e.preventDefault();
    const trimmed = (instituteInput || '').trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 100) {
      showAlert('Institute name must be between 2 and 100 characters', 'warning');
      return;
    }
    try {
      setSaveCollegeLoading(true);
      await API.setCollegeName(trimmed);
      setCollegeName(trimmed);
      setIsEditingCollege(false);
      showAlert(`Institute name updated to "${trimmed}" successfully.`, 'success');
    } catch (err) {
      showAlert(err.message || 'Failed to update institute name', 'danger');
    } finally {
      setSaveCollegeLoading(false);
    }
  };

  // Monitor Data
  const [monitorData, setMonitorData] = useState({
    super_admins: [],
    created_by_super_admins: [],
    system_stats: {},
    recent_broadcasts: []
  });
  const [loadingMonitor, setLoadingMonitor] = useState(false);

  // Super Admin Account Provisioning Form
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [nameEligibilityNotice, setNameEligibilityNotice] = useState('');

  // Profiles Directory State (instantly loaded from cache without loading state on refresh)
  const [profiles, setProfiles] = useState(() => API.getCachedProfiles());
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState('');
  const [directorySearch, setDirectorySearch] = useState('');
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [filterCreatedByMe, setFilterCreatedByMe] = useState(false);

  // Profiles filtered by creator: only accounts created by the logged-in Dean are shown by default
  const scopedProfiles = profiles.filter(u => {
    if (!filterCreatedByMe) return true;
    return u.created_by_id === currentUser?.id || u.created_by_me || u.id === currentUser?.id;
  });

  const [dirPage, setDirPage] = useState(1);

  useEffect(() => {
    setDirPage(1);
  }, [directoryRoleFilter, directorySearch, filterCreatedByMe, activeTab]);

  const dirPageSize = 10;
  const dirTotalPages = Math.max(1, Math.ceil(scopedProfiles.length / dirPageSize));
  const dirActivePage = Math.min(Math.max(1, dirPage), dirTotalPages);
  const dirStartIndex = (dirActivePage - 1) * dirPageSize;
  const paginatedScopedProfiles = scopedProfiles.slice(dirStartIndex, dirStartIndex + dirPageSize);

  // Inspect Modal
  const [inspectUserId, setInspectUserId] = useState(null);

  // Search filter for Super Admin created accounts feed
  const [feedSearch, setFeedSearch] = useState('');

  // Load Monitor Data
  const loadMonitorData = useCallback(async () => {
    try {
      setLoadingMonitor(true);
      const data = await API.getDeanSuperAdminMonitor();
      setMonitorData(data || {});
    } catch (err) {
      console.warn('Could not load Dean monitor data:', err);
    } finally {
      setLoadingMonitor(false);
    }
  }, []);

  // Load Profiles Directory
  const loadProfiles = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setProfilesLoading(true);
      const res = await API.getUserProfiles(directoryRoleFilter, '', directorySearch);
      const users = res.users || [];
      if (!directoryRoleFilter && !directorySearch) {
        API.setCachedProfiles(users);
      }
      setProfiles(users);
    } catch (err) {
      console.warn('Could not load profiles:', err);
    } finally {
      setProfilesLoading(false);
    }
  }, [directoryRoleFilter, directorySearch]);

  useEffect(() => {
    loadMonitorData();
    loadProfiles(false);
  }, [loadMonitorData, loadProfiles]);

  useEffect(() => {
    if (activeTab === 'directory') {
      loadProfiles(false);
    }
  }, [activeTab, loadProfiles]);

  // Handle Full Name Eligibility Checking and Auto-Fill
  const handleNameChange = async (e) => {
    const val = e.target.value;
    setNewName(val);
    const uval = val.trim().toLowerCase().replace(/\s+/g, '');
    const prevUval = newName.trim().toLowerCase().replace(/\s+/g, '');
    if (!newUsername || newUsername === prevUval || !newUsername.trim()) {
      setNewUsername(uval);
    }
    if (!newContact || newContact.includes('@inpand.com') || newContact === `${prevUval}1@inpand.com` || !newContact.trim()) {
      setNewContact(uval ? `${uval}1@inpand.com` : '');
    }
    if (!val.trim()) {
      setNameEligibilityNotice('');
      return;
    }
    try {
      const res = await API.checkName(val);
      if (!res.eligible) {
        setNameEligibilityNotice(res.message);
      } else {
        setNameEligibilityNotice('');
      }
    } catch (err) {
      console.warn('Check name error:', err);
    }
  };

  // Handle Super Admin Account Creation
  // Note: By policy and requirement, Dean can ONLY create super_admin accounts.
  const handleCreateSuperAdmin = async (e) => {
    e.preventDefault();

    if (!newName.trim() || !newContact.trim() || !newPassword.trim()) {
      showAlert('Please enter Full Name, Email/Phone, and Password.', 'warning');
      return;
    }

    if (newPassword.length < 6) {
      showAlert('Password must be at least 6 characters long.', 'warning');
      return;
    }

    if (nameEligibilityNotice) {
      showAlert(nameEligibilityNotice, 'danger');
      return;
    }

    try {
      setCreateLoading(true);
      // Dean can ONLY create super_admin accounts
      const res = await API.createAccount(
        newName.trim(),
        newContact.trim(),
        newPassword.trim(),
        'super_admin',
        newUsername.trim()
      );

      showAlert(res.message || 'Super Admin account provisioned successfully!', 'success');

      // Reset form
      setNewName('');
      setNewContact('');
      setNewUsername('');
      setNewPassword('');
      setNameEligibilityNotice('');

      // Refresh monitor data
      loadMonitorData();

      // Switch to monitor tab to see the new Super Admin
      setActiveTab('monitor');
    } catch (err) {
      showAlert(err.message || 'Failed to create Super Admin account', 'danger');
    } finally {
      setCreateLoading(false);
    }
  };

  const { super_admins = [], created_by_super_admins = [], system_stats = {}, recent_broadcasts = [] } = monitorData;

  // Filter created accounts feed
  const filteredFeed = created_by_super_admins.filter(u => {
    if (!feedSearch.trim()) return true;
    const q = feedSearch.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.creator_name && u.creator_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="dean-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Dean Executive Header Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)',
          border: '1px solid rgba(225, 29, 72, 0.4)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(225, 29, 72, 0.12)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                  Dean Oversight & Super Admin Monitor
                </h1>
                <span className="user-role-pill role-dean" style={{ fontSize: '0.8rem', padding: '3px 12px' }}>
                  DEAN
                </span>
              </div>
              <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                Supreme institutional governance: Monitor Super Admin operations, inspect system health, and provision Super Admin accounts.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                loadMonitorData();
                if (activeTab === 'directory') loadProfiles();
              }}
              disabled={loadingMonitor}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Refresh monitoring data"
            >
              <span>{loadingMonitor ? 'Refreshing...' : 'Refresh Monitor'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Official Institute Name Branding & Dean Edit Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(225, 29, 72, 0.35)',
          borderRadius: '12px',
          padding: '12px 20px',
          marginBottom: '14px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Official Institute Name:
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {collegeName || 'INPAND institute of Engineering and Technology'}
              </div>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', alignSelf: 'flex-end', marginBottom: '4px' }}>
              (Dean Authority)
            </span>
          </div>

          <div>
            {!isEditingCollege ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setInstituteInput(collegeName || '');
                  setIsEditingCollege(true);
                }}
                style={{
                  background: '#e11d48',
                  borderColor: '#e11d48',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700
                }}
              >
                Edit Institute Name
              </button>
            ) : null}
          </div>
        </div>

        {/* Inline Edit Form when editing */}
        {isEditingCollege && (
          <form
            onSubmit={handleSaveInstituteName}
            style={{
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
          >
            <input
              type="text"
              className="form-control dean-input"
              value={instituteInput}
              onChange={(e) => setInstituteInput(e.target.value)}
              placeholder="e.g. Apex Institute of Technology"
              autoFocus
              required
              style={{
                flex: 1,
                minWidth: '260px',
                padding: '8px 12px',
                fontSize: '0.88rem'
              }}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={saveCollegeLoading}
              style={{ background: '#e11d48', borderColor: '#e11d48', padding: '8px 16px', fontSize: '0.84rem' }}
            >
              {saveCollegeLoading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsEditingCollege(false)}
              style={{ padding: '8px 14px', fontSize: '0.84rem' }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* Overview Stat Cards - Horizontal Metric Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        <div className="card" style={{ padding: '12px 16px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>SUPER ADMINS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fb7185', marginTop: '2px' }}>{system_stats.total_super_admins ?? super_admins.length}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '12px 16px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>PROVISIONS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4338ca', marginTop: '2px' }}>{created_by_super_admins.length}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '12px 16px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>COLLEGE ADMINS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>{system_stats.total_admins || 0}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '12px 16px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>FACULTY & STUDENTS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>{(system_stats.total_teachers || 0) + (system_stats.total_students || 0)}</div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'monitor' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('monitor')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700,
            background: activeTab === 'monitor' ? '#e11d48' : undefined,
            borderColor: activeTab === 'monitor' ? '#e11d48' : undefined
          }}
        >
          <span>Super Admin Monitor</span>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              padding: '1px 7px',
              fontSize: '0.75rem'
            }}
          >
            {super_admins.length}
          </span>
        </button>

        {super_admins.length === 0 && (
          <button
            className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('create')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700,
              background: activeTab === 'create' ? '#e11d48' : undefined,
              borderColor: activeTab === 'create' ? '#e11d48' : undefined
            }}
          >
            <span>Provision Super Admin Account</span>
          </button>
        )}

        <button
          className={`btn ${activeTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('directory')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
        >
          <span>Institutional Directory</span>
        </button>
      </div>

      {/* TAB 1: Super Admin Monitor */}
      {activeTab === 'monitor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Super Admin Accounts Table */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Super Admin Accounts Under Supervision
                </h2>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Live monitoring of Super Admin accounts, provisioning throughput, and operational activity.
                </p>
              </div>

              {super_admins.length === 0 && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveTab('create')}
                  style={{ background: '#e11d48', borderColor: '#e11d48', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>Provision Super Admin</span>
                </button>
              )}
            </div>

            {loadingMonitor ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading Super Admin monitoring details...
              </div>
            ) : super_admins.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No Super Admin accounts registered in the database.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table dark-header-table" style={{ width: '100%' }}>
                  <thead className="dark-header-thead" style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 2 }}>
                    <tr>
                      <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Account Name</th>
                      <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Role</th>
                      <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>User Name</th>
                      <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Email / Contact</th>
                      <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Provisioned By</th>
                      <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Created Date</th>
                      <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {super_admins.map(acc => (
                      <tr key={acc.id}>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{acc.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatUserId(acc.id)}</div>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <span className={`user-role-pill role-${acc.role || 'super_admin'}`} style={{ fontSize: '0.72rem' }}>
                            {formatRoleName(acc.role || 'super_admin')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                            @{acc.username || '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <span style={{ color: '#334155', fontSize: '0.82rem' }}>{acc.email}</span>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <span style={{ color: '#fb7185', fontWeight: 600, fontSize: '0.82rem' }}>
                              {acc.creator_name || acc.creator_username || 'System / Dean'}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {acc.created_at ? new Date(acc.created_at).toLocaleDateString() : 'Active'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setInspectUserId(acc.id)}
                            style={{
                              fontSize: '0.78rem',
                              padding: '5px 12px',
                              fontWeight: 700,
                              background: '#0284c7',
                              borderColor: '#0284c7',
                              color: '#ffffff'
                            }}
                            title="View full account details"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Accounts Provisioned by Super Admins Audit Feed */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Accounts Provisioned by Super Admins (Audit Log)
                </h2>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Verification feed of all accounts created across the platform by Super Admin users.
                </p>
              </div>

              <div style={{ width: '280px' }}>
                <input
                  type="text"
                  className="form-control dean-input"
                  placeholder="Filter by name, role, creator..."
                  value={feedSearch}
                  onChange={e => setFeedSearch(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1'
                  }}
                />
              </div>
            </div>

            {filteredFeed.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                {feedSearch ? 'No accounts matched your filter.' : 'No accounts provisioned by Super Admins yet.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
                <table className="table" style={{ width: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 2 }}>
                    <tr>
                      <th style={{ color: '#ffffff', fontWeight: 700 }}>Account Name</th>
                      <th style={{ color: '#ffffff', fontWeight: 700 }}>Role</th>
                      <th style={{ color: '#ffffff', fontWeight: 700 }}>User Name</th>
                      <th style={{ color: '#ffffff', fontWeight: 700 }}>Email / Contact</th>
                      <th style={{ color: '#ffffff', fontWeight: 700 }}>Provisioned By</th>
                      <th style={{ color: '#ffffff', fontWeight: 700 }}>Created Date</th>
                      <th style={{ textAlign: 'right', color: '#ffffff', fontWeight: 700 }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeed.map(acc => (
                      <tr key={acc.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{acc.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatUserId(acc.id)}</div>
                        </td>
                        <td>
                          <span className={`user-role-pill role-${acc.role}`} style={{ fontSize: '0.72rem' }}>
                            {formatRoleName(acc.role)}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                            @{acc.username || '-'}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: '#334155', fontSize: '0.82rem' }}>{acc.email}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#fb7185', fontWeight: 600, fontSize: '0.82rem' }}>
                              {acc.creator_name || acc.creator_username || 'Super Admin'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {acc.created_at ? new Date(acc.created_at).toLocaleDateString() : '-'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setInspectUserId(acc.id)}
                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Super Admin Broadcasts & Notices Log */}
          <div className="card" style={{ padding: '20px' }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Super Admin Broadcasts & Communications Log
            </h2>
            <p style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              System notices and dispatches issued by Super Admins.
            </p>

            {recent_broadcasts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No broadcast notifications recorded.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {recent_broadcasts.map(nb => (
                  <div
                    key={nb.id}
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {nb.title}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {nb.message}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Dispatched by: <strong style={{ color: '#fb7185' }}>{nb.sender_name || nb.sender_role}</strong> • Target: <span style={{ textTransform: 'capitalize' }}>{nb.recipient_role}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {nb.created_at ? new Date(nb.created_at).toLocaleDateString() : '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Provision Super Admin Account Form */}
      {activeTab === 'create' && (
        <div style={{ maxWidth: '780px', margin: '0 auto', width: '100%' }}>
          {super_admins.length > 0 ? (
            <div
              className="card"
              style={{
                padding: '36px 24px',
                textAlign: 'center',
                background: '#ffffff',
                border: '1px solid rgba(225, 29, 72, 0.4)',
                borderRadius: '16px'
              }}
            >
              <h2 style={{ margin: '0 0 10px 0', fontSize: '1.35rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                Super Admin Provisioning Locked
              </h2>
              <p style={{ margin: '0 auto 20px', maxWidth: '520px', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                A Super Admin account is already active. Institutional security policy strictly limits the platform to one Super Admin account only.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveTab('monitor')}
                style={{ background: '#e11d48', borderColor: '#e11d48', fontWeight: 700 }}
              >
                Return to Super Admin Monitor
              </button>
            </div>
          ) : (
            <div
              className="card"
              style={{
                padding: '36px 24px',
                textAlign: 'center',
                background: '#ffffff',
                border: '1px solid rgba(225, 29, 72, 0.4)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '1.35rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                  Provision Super Admin Account
                </h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '440px' }}>
                  Click the button below to launch the official pop-up modal to provision an active Super Admin account.
                </p>
              </div>

              <div style={{ margin: '16px 0 24px 0' }}>
                <CreateAccountButton
                  variant="circle"
                  onClick={() => setShowCreateAccountModal(true)}
                />
              </div>

              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(225, 29, 72, 0.08)',
                  border: '1px solid rgba(225, 29, 72, 0.3)',
                  borderRadius: '8px',
                  maxWidth: '520px',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: '0.84rem', color: '#be123c' }}>
                  <strong>Dean Governance:</strong> Dean is strictly authorized to provision <strong>Super Admin</strong> accounts only. The role is locked to Super Admin in the pop-up modal.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Institutional Profiles Directory */}
      {activeTab === 'directory' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                Institutional User Directory
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-secondary)',
                    border: '1px solid rgba(255, 255, 255, 0.15)'
                  }}
                >
                  Showing {scopedProfiles.length} of {profiles.length} Accounts
                </span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setFilterCreatedByMe(p => !p)}
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: filterCreatedByMe ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    borderColor: filterCreatedByMe ? '#10b981' : 'rgba(255, 255, 255, 0.25)',
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
              </h2>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Dean oversight directory: View and inspect accounts across the institution.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                className="form-control dean-input"
                value={directoryRoleFilter}
                onChange={e => setDirectoryRoleFilter(e.target.value)}
                style={{
                  width: '160px',
                  padding: '6px 10px',
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1'
                }}
              >
                <option value="">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">College Admin</option>
                <option value="hod">HOD</option>
                <option value="teacher">Teacher</option>
                <option value="class_teacher">Class Teacher</option>
                <option value="student">Student</option>
                <option value="accountant">Staff</option>
              </select>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loadProfiles();
                }}
                style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}
              >
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by name, email, username..."
                    value={directorySearch}
                    onChange={e => setDirectorySearch(e.target.value)}
                    style={{ minWidth: '240px', padding: '7px 12px', paddingRight: '48px', fontSize: '0.88rem' }}
                  />
                  {directorySearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setDirectorySearch('');
                        loadProfiles();
                      }}
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
                  {profilesLoading ? 'Searching...' : 'Search'}
                </button>

                {directorySearch && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setDirectorySearch('');
                      loadProfiles();
                    }}
                    style={{ padding: '8px 12px' }}
                    title="Clear search filter"
                  >
                    Reset
                  </button>
                )}
              </form>
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
                <strong>Creator Scope Active:</strong> Showing only accounts created by you (Dean). Accounts not created by you are hidden from the directory.
              </span>
              <button
                type="button"
                onClick={() => setFilterCreatedByMe(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  color: 'var(--text-secondary)',
                  padding: '2px 8px',
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
                title="View all accounts across the institution"
              >
                View All System Accounts
              </button>
            </div>
          )}

          {profilesLoading && profiles.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading registered accounts...
            </div>
          ) : scopedProfiles.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No accounts found matching your filter criteria.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 2 }}>
                  <tr>
                    <th>User</th>
                    <th style={{ color: '#ffffff', fontWeight: 700 }}>Role</th>
                    <th>Username</th>
                    <th style={{ color: '#ffffff', fontWeight: 700 }}>Email / Contact</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>LOG</th>
                    <th>CREATED BY</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedScopedProfiles.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatUserId(p.id)}</div>
                      </td>
                      <td>
                        <span className={`user-role-pill role-${p.role}`} style={{ fontSize: '0.72rem' }}>
                          {formatRoleName(p.role)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          @{p.username || '-'}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#334155', fontSize: '0.82rem' }}>{p.email}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {p.department_name || '-'}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: p.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: p.status === 'active' ? '#34d399' : '#f87171'
                          }}
                        >
                          {p.status ? p.status.toUpperCase() : 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ minWidth: '240px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Created By:</span>
                            <span style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>
                              {p.created_by_name ? `${p.created_by_name} (${formatRoleName(p.created_by_role)})` : 'Initial Provision'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Created On:</span>
                            <span style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                              {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Edited By:</span>
                            <span style={{ textAlign: 'right', color: p.edited_by_name ? '#93c5fd' : 'var(--text-muted)', fontWeight: 600 }}>
                              {p.edited_by_name ? `${p.edited_by_name} (${formatRoleName(p.edited_by_role)})` : 'Not Edited Yet'}
                            </span>
                          </div>
                          {p.last_edited_at && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                              <span style={{ textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Edited On:</span>
                              <span style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                {new Date(p.last_edited_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                          {p.created_by_name ? `${p.created_by_name} (${formatRoleName(p.created_by_role)})` : 'Initial Provision'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setInspectUserId(p.id)}
                          style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 10 Users per screen Pagination bar */}
            <Pagination
              currentPage={dirActivePage}
              totalItems={scopedProfiles.length}
              pageSize={dirPageSize}
              onPageChange={setDirPage}
              itemLabel="users"
            />
          </>
        )}
        </div>
      )}

      {/* Profile Inspection Modal */}
      <ProfileModal
        userId={inspectUserId}
        isOpen={!!inspectUserId}
        onClose={() => setInspectUserId(null)}
      />

      {/* Create Account Pop Up Modal */}
      <CreateAccountModal
        isOpen={showCreateAccountModal}
        onClose={() => setShowCreateAccountModal(false)}
        onCreated={() => loadMonitorData()}
        currentUser={currentUser}
        allowedRoles={['super_admin']}
      />
    </div>
  );
};
