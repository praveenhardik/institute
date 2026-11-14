import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { API } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { PasswordInput } from './PasswordInput';

export const EditUserModal = ({ user, isOpen, onClose, onUpdated }) => {
  const { user: currentUser, refreshUser } = useAuth();
  const { showAlert } = useAlert();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [academicYear, setAcademicYear] = useState('1');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [designation, setDesignation] = useState('');
  const [singleDeptId, setSingleDeptId] = useState('');
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nameEligibilityNotice, setNameEligibilityNotice] = useState('');

  const [section, setSection] = useState('');
  const [customSection, setCustomSection] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [isClassLeader, setIsClassLeader] = useState(false);
  const [sectionsList, setSectionsList] = useState([]);

  // "New Password (leave blank to keep current)" should only be available for:
  // admin, teacher, class_teacher, super_admin, dean, hod.
  // It should NOT be available for entire students (student, class_leader).
  const ALLOWED_PASSWORD_ROLES = ['admin', 'teacher', 'class_teacher', 'super_admin', 'dean', 'hod', 'principal'];
  const isStudent = ['student', 'class_leader'].includes(user?.role) || ['student', 'class_leader'].includes(currentUser?.role);
  const canHaveNewPassword = !isStudent && (
    ALLOWED_PASSWORD_ROLES.includes(user?.role) || ALLOWED_PASSWORD_ROLES.includes(currentUser?.role)
  );

  const isSuperAdminOrAdmin = user && ['super_admin', 'admin', 'principal'].includes(user.role);
  const isTeacher = user && user.role === 'teacher';
  const isSingleDeptRole = user && ['class_teacher', 'student', 'class_leader', 'hod'].includes(user.role);
  const [deptToAdd, setDeptToAdd] = useState('');

  useEffect(() => {
    if (!isOpen || !user) return;
    setName(user.name || '');
    setUsername(user.username || '');
    setAcademicYear(String(user.academic_year || '1'));
    setEmailOrPhone(user.email || user.email_or_phone || '');
    setPassword('');
    setDesignation(user.designation || '');
    setDeptToAdd('');
    setNameEligibilityNotice('');

    setSection(user.section_id ? String(user.section_id) : (user.section_name || ''));
    setCustomSection('');
    setRollNumber(user.roll_number || '');
    setGuardianName(user.guardian_name || '');
    setGuardianPhone(user.guardian_phone || '');
    setGuardianEmail(user.guardian_email || '');
    setIsClassLeader(user.role === 'class_leader');

    const initSingle = user.department_id 
      || (user.department_ids && user.department_ids.length ? user.department_ids[0] : '');
    setSingleDeptId(initSingle ? String(initSingle) : '');

    const initDepts = user.department_ids && user.department_ids.length
      ? user.department_ids.map(Number)
      : (user.department_id ? [Number(user.department_id)] : []);
    setSelectedDeptIds(initDepts);

    API.getDepartments()
      .then(res => setDepartments(res.departments || []))
      .catch(() => {});

    API.getSections()
      .then(res => setSectionsList(res.sections || []))
      .catch(() => {});
  }, [isOpen, user]);

  if (!isOpen || !user || currentUser?.role === 'principal') return null;
  // Principal account can only be edited by Super Admin
  if (user.role === 'principal' && currentUser?.role !== 'super_admin') return null;

  const handleAddDepartment = () => {
    if (!deptToAdd) {
      showAlert('Please select a department from the dropdown to add', 'warning');
      return;
    }
    const idNum = Number(deptToAdd);
    if (selectedDeptIds.includes(idNum)) {
      showAlert('This department is already added', 'warning');
      return;
    }
    if (selectedDeptIds.length >= 10) {
      showAlert('You can assign up to 10 departments maximum', 'warning');
      return;
    }
    setSelectedDeptIds([...selectedDeptIds, idNum]);
    setDeptToAdd('');
  };

  const handleRemoveDepartment = (deptId) => {
    const idNum = Number(deptId);
    setSelectedDeptIds(selectedDeptIds.filter(id => id !== idNum));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showAlert('Full name is required', 'danger');
      return;
    }

    if (canHaveNewPassword && password.trim() && password.trim().length < 6) {
      showAlert('New password must be at least 6 characters long', 'danger');
      return;
    }

    if (isTeacher && selectedDeptIds.length === 0) {
      showAlert('Please select at least 1 department for this teacher', 'warning');
      return;
    }

    if (isSingleDeptRole && !singleDeptId) {
      showAlert(`Please select a department for this ${user.role ? user.role.replace('_', ' ') : 'user'}`, 'warning');
      return;
    }

    if (nameEligibilityNotice) {
      showAlert(nameEligibilityNotice, 'danger');
      return;
    }

    try {
      setLoading(true);
      if (name.trim().toLowerCase() !== (user.name || '').trim().toLowerCase()) {
        const checkRes = await API.checkName(name.trim(), user.id);
        if (checkRes && !checkRes.eligible) {
          setNameEligibilityNotice(checkRes.message);
          showAlert(checkRes.message, 'danger');
          return;
        }
      }
      const payload = {
        name: name.trim(),
        username: username.trim() || undefined,
        email_or_phone: emailOrPhone.trim() || undefined,
        designation: designation.trim() || undefined,
        academic_year: ['student', 'class_leader', 'class_teacher'].includes(user?.role) ? Number(academicYear || 1) : null
      };

      if (canHaveNewPassword && password.trim()) {
        payload.password = password.trim();
      }

      if (['student', 'class_leader'].includes(user.role)) {
        const finalSec = section === 'custom' ? customSection.trim() : section;
        payload.section_id = finalSec || null;
        payload.roll_number = rollNumber.trim() || null;
        payload.guardian_name = guardianName.trim() || null;
        payload.guardian_phone = guardianPhone.trim() || null;
        payload.guardian_email = guardianEmail.trim() || null;
        payload.role = isClassLeader ? 'class_leader' : 'student';
      }

      if (isTeacher) {
        payload.department_ids = selectedDeptIds;
        payload.department_id = selectedDeptIds.length ? selectedDeptIds[0] : null;
      } else if (isSingleDeptRole) {
        payload.department_ids = singleDeptId ? [Number(singleDeptId)] : [];
        payload.department_id = singleDeptId ? Number(singleDeptId) : null;
      }

      const res = await API.updateUserAccount(user.id, payload);

      const updatedUserObj = res.user || {
        ...user,
        ...payload,
        id: user.id,
        name: name.trim(),
        username: username.trim() || user.username || name.trim(),
        email: emailOrPhone.trim() || user.email
      };

      // If updating current user's session, sync sessionStorage and trigger AuthContext refresh
      const current = API.getCurrentUser();
      if (current && Number(current.id) === Number(user.id)) {
        API.setCurrentUser({
          ...current,
          ...updatedUserObj
        });
        if (typeof refreshUser === 'function') {
          await refreshUser();
        }
      }

      // Sync cached profiles in storage so other components see updated values
      try {
        const cachedRaw = sessionStorage.getItem("cached_registered_profiles") || localStorage.getItem("cached_registered_profiles");
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          const idx = cached.findIndex(u => Number(u.id) === Number(user.id));
          if (idx !== -1) {
            cached[idx] = { ...cached[idx], ...updatedUserObj };
            sessionStorage.setItem("cached_registered_profiles", JSON.stringify(cached));
            localStorage.setItem("cached_registered_profiles", JSON.stringify(cached));
          }
        }
      } catch {}

      showAlert(res.message || 'Login details updated successfully', 'success');
      if (typeof onUpdated === 'function') {
        onUpdated(updatedUserObj);
      }
      onClose();
    } catch (err) {
      showAlert(err.message, 'danger');
      if (err.message && err.message.toLowerCase().includes('not eligible')) {
        setNameEligibilityNotice(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="modal-overlay active"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{ maxWidth: '620px', maxHeight: '88vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose} title="Close" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', pointerEvents: 'none' }}>
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', marginBottom: '6px' }}>
          Edit Login Details: {user.name}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '18px' }}>
          Role: <strong style={{ color: '#a78bfa', textTransform: 'capitalize' }}>{user.role ? user.role.replace('_', ' ') : ''}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name (Single Name) <span className="req">*</span></label>
            <input
              type="text"
              className="form-input"
              value={name}
              style={{
                borderColor: nameEligibilityNotice ? '#ef4444' : undefined,
                boxShadow: nameEligibilityNotice ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : undefined
              }}
              onChange={(e) => {
                const val = e.target.value;
                setName(val);
                if (!username || username === name.trim().toLowerCase().replace(/\s+/g, '')) {
                  const newU = val.trim().toLowerCase().replace(/\s+/g, '');
                  setUsername(newU);
                  if (emailOrPhone.includes('@') || !emailOrPhone.trim()) {
                    const isTeacherOrClassTeacher = ['teacher', 'class_teacher'].includes(user?.role);
                    setEmailOrPhone(newU ? (isTeacherOrClassTeacher ? `${newU}@inpand.com` : `${newU}1@inpand.com`) : '');
                  }
                }
                if (val.trim()) {
                  if (val.trim().toLowerCase() === (user.name || '').trim().toLowerCase()) {
                    setNameEligibilityNotice('');
                  } else {
                    API.checkName(val.trim(), user.id).then((res) => {
                      if (!res.eligible) {
                        setNameEligibilityNotice(res.message);
                      } else {
                        setNameEligibilityNotice('');
                      }
                    }).catch(() => {});
                  }
                } else {
                  setNameEligibilityNotice('');
                }
              }}
              onBlur={() => {
                if (name.trim()) {
                  if (name.trim().toLowerCase() === (user.name || '').trim().toLowerCase()) {
                    setNameEligibilityNotice('');
                  } else {
                    API.checkName(name.trim(), user.id).then((res) => {
                      if (!res.eligible) {
                        setNameEligibilityNotice(res.message);
                      } else {
                        setNameEligibilityNotice('');
                      }
                    }).catch(() => {});
                  }
                }
              }}
              required
            />
            {nameEligibilityNotice && (
              <div style={{
                marginTop: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>{nameEligibilityNotice}</span>
              </div>
            )}
          </div>

          {/* User name & Year row (Year selection strictly for students and class teachers) */}
          {['student', 'class_leader', 'class_teacher'].includes(user?.role) ? (
            <div className="grid grid-2" style={{ gap: '12px', marginBottom: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">User name</label>
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => {
                    const newU = e.target.value;
                    setUsername(newU);
                    if (emailOrPhone.includes('@') || !emailOrPhone.trim()) {
                      const isTeacherOrClassTeacher = ['teacher', 'class_teacher'].includes(user?.role);
                      setEmailOrPhone(newU ? (isTeacherOrClassTeacher ? `${newU.toLowerCase()}@inpand.com` : `${newU.toLowerCase()}1@inpand.com`) : '');
                    }
                  }}
                  placeholder="e.g. jane.doe"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Year</label>
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
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">User name</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => {
                  const newU = e.target.value;
                  setUsername(newU);
                  if (emailOrPhone.includes('@') || !emailOrPhone.trim()) {
                    const isTeacherOrClassTeacher = ['teacher', 'class_teacher'].includes(user?.role);
                    setEmailOrPhone(newU ? (isTeacherOrClassTeacher ? `${newU.toLowerCase()}@inpand.com` : `${newU.toLowerCase()}1@inpand.com`) : '');
                  }
                }}
                placeholder="e.g. jane.doe"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email or Phone Number (8 to 15 digits) <span className="req">*</span></label>
            <input
              type="text"
              className="form-input"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder={['teacher', 'class_teacher'].includes(user?.role) ? "e.g. 9876543210 (8-15 digits) or username@inpand.com" : "e.g. 9876543210 (8-15 digits) or username1@inpand.com"}
              maxLength={30}
              required
            />
          </div>

          {canHaveNewPassword && (
            <div className="form-group">
              <label className="form-label">New Password (leave blank to keep current)</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters (optional)"
                required={false}
                minLength={6}
              />
            </div>
          )}

          {['teacher', 'class_teacher', 'hod', 'principal'].includes(user.role) && (
            <div className="form-group">
              <label className="form-label">Designation</label>
              <input
                type="text"
                className="form-input"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder={user.role === 'principal' ? "e.g. Principal / Head of Institution" : "e.g. Assistant Professor"}
              />
            </div>
          )}

          {/* 1. TEACHER: Can select MULTIPLE departments */}
          {isTeacher && (
            <div className="form-group" style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Departments <span className="req">*</span>
                </label>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: selectedDeptIds.length >= 10 ? '#f87171' : '#60a5fa',
                  background: 'rgba(255,255,255,0.06)',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {selectedDeptIds.length > 0 ? `${selectedDeptIds.length} Selected` : 'Select Departments'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Teachers can teach across multiple departments. Choose a department and click <strong>Add Department</strong>.
              </p>

              {/* Dropdown selector + Add Department button */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center' }}>
                <select
                  className="form-select"
                  value={deptToAdd}
                  onChange={(e) => setDeptToAdd(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">-- Choose Department to Add --</option>
                  {departments.map(d => {
                    const alreadyAdded = selectedDeptIds.includes(d.id);
                    return (
                      <option key={d.id} value={d.id} disabled={alreadyAdded}>
                        {d.name} ({d.code}) {alreadyAdded ? '(Already Added)' : ''}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddDepartment}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '10px 16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.9rem',
                    flexShrink: 0
                  }}
                >
                  Add Department
                </button>
              </div>

              {/* List of currently assigned departments with Remove button */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                maxHeight: '220px',
                overflowY: 'auto'
              }}>
                {selectedDeptIds.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No departments added yet. Select a department from the dropdown above and click <strong>Add Department</strong>.
                  </div>
                ) : (
                  selectedDeptIds.map(did => {
                    const dept = departments.find(d => d.id === did);
                    if (!dept) return null;
                    return (
                      <div
                        key={dept.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: 'rgba(99, 102, 241, 0.18)',
                          border: '1px solid rgba(99, 102, 241, 0.4)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {dept.name}
                          </span>
                          <span className="status-pill" style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.3)', color: '#4338ca' }}>
                            {dept.code}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDepartment(dept.id)}
                          title="Remove department"
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#f87171',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 2. CLASS TEACHER, STUDENT, CLASS LEADER, HOD: Can select ONLY ONE department */}
          {isSingleDeptRole && (
            <div className="form-group" style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Department <span className="req">*</span>
                </label>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  Single Department Only
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {user.role === 'class_teacher'
                  ? 'A Class Teacher can be assigned to only 1 department.'
                  : user.role === 'student' || user.role === 'class_leader'
                  ? 'A Student can belong to only 1 department.'
                  : 'Assigned to 1 department.'}
              </p>
              <select
                className="form-select"
                value={singleDeptId}
                onChange={(e) => setSingleDeptId(e.target.value)}
                required
              >
                <option value="">-- Choose Department --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. STUDENT & CLASS LEADER: Section, Roll Number & Guardian Details */}
          {['student', 'class_leader'].includes(user.role) && (
            <div style={{ background: 'rgba(56, 189, 248, 0.05)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(56, 189, 248, 0.2)', marginTop: '16px', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0284c7', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Section & Guardian Details
              </h4>

              <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-primary)', userSelect: 'none', margin: 0, fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={isClassLeader}
                    onChange={(e) => setIsClassLeader(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#0284c7', cursor: 'pointer' }}
                  />
                  <span>Class Leader (Optional)</span>
                </label>
              </div>

              <div className="grid grid-2" style={{ gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Section</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      className="form-select"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">-- Choose Section --</option>
                      {sectionsList.map(s => (
                        <option key={s.id} value={s.id}>
                          Section {s.name} {s.department_name ? `(${s.department_name})` : ''}
                        </option>
                      ))}
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                      <option value="D">Section D</option>
                      <option value="custom">Other / Custom Section...</option>
                    </select>
                    {section === 'custom' && (
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 1 }}
                        placeholder="Enter section (e.g. E)"
                        value={customSection}
                        onChange={(e) => setCustomSection(e.target.value)}
                      />
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Roll Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 720822104001"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px', marginTop: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
                  Guardian Information
                </label>
                <div className="grid grid-3" style={{ gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Guardian Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Robert Smith"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Guardian Phone</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 9876543210"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Guardian Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="e.g. guardian@gmail.com"
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. ADMIN & SUPER ADMIN: Cannot select department (hidden completely) */}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
