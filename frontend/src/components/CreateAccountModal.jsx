import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { API } from '../api/api';
import { useAlert } from '../context/AlertContext';

/**
 * Reusable Create Account Button inspired by the user's uploaded 3D glossy badge.
 * Supports "circle" (prominent circular badge) or "pill" (sleek toolbar capsule).
 */
export const CreateAccountButton = ({ onClick, variant = 'circle', className = '', style = {} }) => {
  if (variant === 'topbar') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`create-account-topbar-btn ${className}`}
        style={style}
        title="Create Account (Click to open pop-up)"
      >
        <div className="ca-topbar-icon-circle">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
        </div>
        <span className="ca-topbar-text">
          CREATE ACCOUNT
        </span>
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`create-account-pill-btn ${className}`}
        style={style}
        title="Click to open Create Account pop up"
      >
        <div className="ca-pill-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
        </div>
        <div className="ca-pill-text">
          <span className="ca-pill-title">CREATE</span>
          <span className="ca-pill-sub">ACCOUNT</span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`create-account-circle-btn ${className}`}
      style={style}
      title="Click to open Create Account pop up"
    >
      <div className="ca-inner-icon-circle">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="20" y1="8" x2="20" y2="14"></line>
          <line x1="23" y1="11" x2="17" y2="11"></line>
        </svg>
      </div>
      <span className="ca-label-text">
        CREATE<br />ACCOUNT
      </span>
    </button>
  );
};

export const CreateAccountModal = ({
  isOpen,
  onClose,
  onCreated,
  currentUser,
  allowedRoles = null
}) => {
  const { showAlert } = useAlert();
  const passwordInputId = useId();

  // Determine selectable roles based on logged-in user role
  const userRole = currentUser?.role || 'admin';
  const isStudentOrClassLeader = ['student', 'class_leader'].includes(userRole);
  // Teachers and Class Teachers can create students only for their own department
  const isTeacherCreator = ['teacher', 'class_teacher'].includes(userRole);
  const defaultRoles = React.useMemo(() => {
    if (isStudentOrClassLeader) return [];
    if (allowedRoles && allowedRoles.length) return allowedRoles;
    if (userRole === 'dean') return ['super_admin'];
    if (userRole === 'super_admin') {
      return ['admin', 'dean', 'principal', 'teacher', 'class_teacher', 'hod', 'student', 'class_leader', 'accountant', 'librarian'];
    }
    if (userRole === 'admin') {
      return ['teacher', 'class_teacher', 'hod', 'student', 'class_leader', 'accountant', 'librarian'];
    }
    if (userRole === 'teacher' || userRole === 'class_teacher') {
      return userRole === 'class_teacher' ? ['student', 'class_leader', 'teacher'] : ['student', 'class_leader'];
    }
    return [];
  }, [userRole, allowedRoles, isStudentOrClassLeader]);

  const [role, setRole] = useState(defaultRoles[0] || 'student');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [academicYear, setAcademicYear] = useState('1');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [designation, setDesignation] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [customBatch, setCustomBatch] = useState('');
  const [section, setSection] = useState('A');
  const [customSection, setCustomSection] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [nameEligibilityNotice, setNameEligibilityNotice] = useState('');

  // Dropdown lists
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [myDepartments, setMyDepartments] = useState([]);
  const [myDeptLoaded, setMyDeptLoaded] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [principalExists, setPrincipalExists] = useState(false);

  // Check if principal already exists when super_admin opens modal
  useEffect(() => {
    if (!isOpen) return;
    if (userRole === 'super_admin') {
      API.getPrincipalStatus()
        .then(res => {
          if (res && typeof res.exists === 'boolean') {
            setPrincipalExists(res.exists);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, userRole]);

  // If principal already exists, prevent selecting or keeping principal role
  useEffect(() => {
    if (principalExists && role === 'principal') {
      setRole('admin');
    }
  }, [principalExists, role]);

  // Sync role when defaultRoles changes or modal opens
  useEffect(() => {
    if (isOpen && defaultRoles.length && !defaultRoles.includes(role)) {
      setRole(defaultRoles[0]);
    }
  }, [isOpen, defaultRoles, role]);

  // Students created by a Teacher / Class Teacher must belong to the creator's own department.
  const restrictToOwnDept = isTeacherCreator && ['student', 'class_leader'].includes(role);
  const hasOwnDept = myDepartments.length > 0;
  const deptOptions = restrictToOwnDept && hasOwnDept ? myDepartments : departments;

  // Pre-select the department when the teacher has just one
  useEffect(() => {
    if (!isOpen || !restrictToOwnDept) return;
    if (myDepartments.length === 1 && String(departmentId) !== String(myDepartments[0].id)) {
      setDepartmentId(String(myDepartments[0].id));
    } else if (myDepartments.length > 1 && departmentId &&
               !myDepartments.some(d => String(d.id) === String(departmentId))) {
      setDepartmentId('');
    }
  }, [isOpen, restrictToOwnDept, myDepartments, departmentId]);

  // Load dropdown resources
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    (async () => {
      try {
        setLoadingLists(true);
        const [dRes, bRes, sRes, myRes] = await Promise.all([
          API.getDepartments().catch(() => ({ departments: [] })),
          API.getBatches().catch(() => ({ batches: [] })),
          API.getSections().catch(() => ({ sections: [] })),
          isTeacherCreator
            ? API.getMyDepartments().catch(() => ({ departments: [] }))
            : Promise.resolve({ departments: [] })
        ]);
        if (!isMounted) return;
        setMyDepartments(myRes.departments || []);
        setMyDeptLoaded(true);
        setDepartments(dRes.departments || []);
        setBatches(bRes.batches || []);
        setSectionsList(sRes.sections || []);
      } catch (e) {
        console.warn('Failed loading form dropdowns:', e);
      } finally {
        if (isMounted) setLoadingLists(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle Full Name input & real-time username/email suggestions
  const handleNameChange = async (e) => {
    const val = e.target.value;
    setName(val);
    const uval = val.trim().toLowerCase().replace(/\s+/g, '');
    const prevUval = name.trim().toLowerCase().replace(/\s+/g, '');

    if (!username || username === prevUval || !username.trim()) {
      setUsername(uval);
    }
    if (!contact || contact.includes('@inpand.com') || contact === `${prevUval}1@inpand.com` || !contact.trim()) {
      setContact(uval ? `${uval}1@inpand.com` : '');
    }

    if (val.trim().length >= 2) {
      try {
        const res = await API.checkName(val.trim());
        if (res && !res.eligible) {
          setNameEligibilityNotice(res.message);
        } else {
          setNameEligibilityNotice('');
        }
      } catch {
        setNameEligibilityNotice('');
      }
    } else {
      setNameEligibilityNotice('');
    }
  };

  const resetForm = () => {
    setName('');
    setUsername('');
    setAcademicYear('1');
    setContact('');
    setPassword('');
    setDesignation('');
    setDepartmentId('');
    setBatchId('');
    setCustomBatch('');
    setSection('A');
    setCustomSection('');
    setRollNumber('');
    setGuardianName('');
    setGuardianPhone('');
    setGuardianEmail('');
    setNameEligibilityNotice('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isStudentOrClassLeader) {
      showAlert('Students and Class Leaders do not have permission to create accounts.', 'danger');
      return;
    }
    if (!name.trim() || !contact.trim() || !password.trim() || !username.trim()) {
      showAlert('Please enter Name, Username, Contact/Email, and Password.', 'danger');
      return;
    }

    if (nameEligibilityNotice) {
      showAlert(nameEligibilityNotice, 'danger');
      return;
    }

    if (['student', 'class_leader'].includes(role) && !batchId) {
      showAlert('Academic Batch / Year is mandatory for student account creation. Please select an academic batch / year.', 'danger');
      return;
    }

    if (['student', 'class_leader'].includes(role) && batchId === 'custom' && !customBatch.trim()) {
      showAlert('Please enter the custom academic batch / year.', 'danger');
      return;
    }

    if (restrictToOwnDept && !departmentId) {
      showAlert(
        hasOwnDept
          ? 'Please select your department for this student.'
          : 'No department is assigned to you yet. Please select a department first, then create the account.',
        'danger'
      );
      return;
    }

    if (role === 'principal' && principalExists) {
      showAlert('Principal can only be created once. A Principal account already exists.', 'danger');
      return;
    }

    try {
      setSubmitting(true);
      const extra = {};
      if (designation.trim()) extra.designation = designation.trim();
      if (departmentId) extra.department_id = Number(departmentId);
      if (batchId === 'custom') {
        extra.batch_name = customBatch.trim();
        extra.custom_batch = customBatch.trim();
      } else if (batchId) {
        extra.batch_id = Number(batchId);
      }
      if (['student', 'class_leader', 'class_teacher'].includes(role) && academicYear) extra.academic_year = Number(academicYear);
      if (['student', 'class_leader'].includes(role)) {
        extra.section = section === 'custom' ? customSection.trim() : section;
        if (rollNumber.trim()) extra.roll_number = rollNumber.trim();
        if (guardianName.trim()) extra.guardian_name = guardianName.trim();
        if (guardianPhone.trim()) extra.guardian_phone = guardianPhone.trim();
        if (guardianEmail.trim()) extra.guardian_email = guardianEmail.trim();
      }

      const res = await API.createAccount(
        name.trim(),
        contact.trim(),
        password.trim(),
        role,
        username.trim(),
        extra
      );

      showAlert(res.message || `Account for "${name.trim()}" created successfully!`, 'success');
      if (role === 'principal') {
        setPrincipalExists(true);
      }
      resetForm();
      if (onCreated) onCreated(res);
      onClose();
    } catch (err) {
      showAlert(err.message || 'Failed to create account', 'danger');
      if (err.message && err.message.toLowerCase().includes('not eligible')) {
        setNameEligibilityNotice(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay active"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ zIndex: 1000000 }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '720px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          borderRadius: '16px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.45)',
          background: '#ffffff',
          position: 'relative'
        }}
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          title="Close"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', pointerEvents: 'none' }}>
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Modal Header with Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 25%, #334155 0%, #0f172a 70%, #000000 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              border: '2px solid rgba(255,255,255,0.2)'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Create Account
            </h2>
            <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
              Fill in the account details below to provision a new user in the institutional directory.
            </p>
          </div>
        </div>

        {/* Account Creation Form */}
        {isStudentOrClassLeader ? (
          <div style={{ padding: '36px 16px', textAlign: 'center' }}>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              Account Creation Restricted
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0, maxWidth: '400px', marginInline: 'auto' }}>
              Students and Class Leaders do not have permission to create accounts.
            </p>
            <div style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onClose}
                style={{ padding: '8px 24px' }}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '14px' }}>
            {/* Account Role */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Account Role <span className="req">*</span>
              </label>
              <select
                className="form-select"
                value={role}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'principal' && principalExists) {
                    showAlert('Principal can only be created once. A Principal account already exists.', 'warning');
                    return;
                  }
                  setRole(val);
                }}
                required
              >
                {defaultRoles.map(r => {
                  const isPrincipalDisabled = (r === 'principal' && principalExists);
                  return (
                    <option
                      key={r}
                      value={r}
                      disabled={isPrincipalDisabled}
                      style={isPrincipalDisabled ? { color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc' } : undefined}
                    >
                      {r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      {isPrincipalDisabled ? ' (Already Created - 1 Account Limit)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Full Name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Full Name <span className="req">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Teacher"
                value={name}
                onChange={handleNameChange}
                required
                style={{
                  borderColor: nameEligibilityNotice ? '#ef4444' : undefined,
                  boxShadow: nameEligibilityNotice ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                }}
              />
              {nameEligibilityNotice && (
                <div style={{ color: '#b91c1c', fontSize: '0.78rem', marginTop: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>{nameEligibilityNotice}</span>
                </div>
              )}
            </div>

            {/* User name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                User name <span className="req">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. teacher"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                required
              />
            </div>

            {/* Year dropdown: strictly for student, class leader, and class teacher only */}
            {['student', 'class_leader', 'class_teacher'].includes(role) && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Year <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  style={{ minWidth: '100%' }}
                >
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
              </div>
            )}

            {/* Contact Email / Phone */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Email Address or Phone <span className="req">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. teacher1@inpand.com"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor={passwordInputId}>
                Password <span className="req">*</span>
              </label>
              <input
                id={passwordInputId}
                type="password"
                className="form-input"
                placeholder="Set initial password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Optional Designation */}
            {['teacher', 'class_teacher', 'hod', 'admin', 'dean', 'accountant', 'librarian', 'principal'].includes(role) && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Designation / Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={role === 'principal' ? "e.g. Principal / Head of Institution" : "e.g. Senior Lecturer, Lab Head"}
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              </div>
            )}

            {/* Target Department */}
            {['teacher', 'class_teacher', 'hod', 'student', 'class_leader'].includes(role) && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Academic Department {restrictToOwnDept && <span className="req">*</span>}
                </label>
                <select
                  className="form-select"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  required={restrictToOwnDept}
                >
                  <option value="">-- Select Department --</option>
                  {deptOptions.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </option>
                  ))}
                </select>
                {restrictToOwnDept && myDeptLoaded && (
                  <div style={{ fontSize: '0.78rem', marginTop: '4px', fontWeight: 600, color: hasOwnDept ? '#475569' : '#b45309' }}>
                    {hasOwnDept
                      ? 'You can create students for your own department only.'
                      : 'No department is assigned to you yet. Select the department first; it will be assigned to you and the student account will be created in it.'}
                  </div>
                )}
              </div>
            )}

            {/* Student specific fields */}
            {['student', 'class_leader'].includes(role) && (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Academic Batch / Year <span className="req">*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      className="form-select"
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      style={{ flex: 1 }}
                      required
                    >
                      <option value="">-- Select Batch --</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.academic_year || 'Current'})
                        </option>
                      ))}
                      <option value="custom">+ Other / Custom Batch / Year</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setBatchId('custom')}
                      title="Add Custom Academic Batch / Year (+)"
                      style={{
                        padding: '0 12px',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        lineHeight: 1,
                        minWidth: '40px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px'
                      }}
                    >
                      +
                    </button>
                  </div>
                  {batchId === 'custom' && (
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter custom batch / year"
                      value={customBatch}
                      onChange={(e) => setCustomBatch(e.target.value)}
                      style={{ marginTop: '6px' }}
                      required
                      autoFocus
                    />
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Section</label>
                  <select
                    className="form-select"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                    {sectionsList.map(s => (
                      <option key={s.id || s.name} value={s.name}>
                        Section {s.name}
                      </option>
                    ))}
                    <option value="custom">Other / Custom Section</option>
                  </select>
                  {section === 'custom' && (
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter custom section"
                      value={customSection}
                      onChange={(e) => setCustomSection(e.target.value.toUpperCase())}
                      style={{ marginTop: '6px' }}
                    />
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Roll Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 24CS101"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Guardian Name (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Parent or Guardian Name"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Guardian Phone (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Parent Mobile Number"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '8px 18px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={submitting || !!nameEligibilityNotice}
              style={{
                padding: '8px 24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'radial-gradient(circle at 35% 25%, #475569 0%, #1e293b 50%, #090d16 90%, #000000 100%)',
                borderColor: '#1e293b'
              }}
            >
              <span>{submitting ? 'Creating Account...' : 'Confirm & Create Account'}</span>
            </button>
          </div>
        </form>
        )}
      </div>
    </div>,
    document.body
  );
};
