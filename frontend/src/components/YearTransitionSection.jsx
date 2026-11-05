import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { API } from '../api/api';

/**
 * Helper to compute preview credentials on client side based on student's current year
 */
function previewNewCredentials(name, username, email, currentYear, targetYearOverride = null) {
  const fy = Number(currentYear || 1);
  const isPassedOut = targetYearOverride === 'passed_out' || (!targetYearOverride && fy >= 4) || Number(targetYearOverride) >= 5;

  if (isPassedOut) {
    return { name, username, email, passedOut: true, nextYear: 'Passed Out' };
  }

  const ty = targetYearOverride ? Number(targetYearOverride) : (fy + 1);
  const fy_str = String(fy);
  const ty_str = String(ty);

  let newUsername = username || '';
  if (newUsername.startsWith(`stu${fy_str}`)) {
    newUsername = `stu${ty_str}` + newUsername.slice(`stu${fy_str}`.length);
  } else if (/leader[a-zA-Z]+[1-4]$/.test(newUsername)) {
    newUsername = newUsername.replace(/([1-4])$/, ty_str);
  } else {
    newUsername = newUsername.replace(new RegExp(`(stu|year|yr|leader)${fy_str}`, 'i'), `$1${ty_str}`);
  }

  let newName = name || '';
  if (newName.startsWith(`stu${fy_str}`)) {
    newName = `stu${ty_str}` + newName.slice(`stu${fy_str}`.length);
  } else if (/leader\s+[a-zA-Z]+[1-4]$/.test(newName)) {
    newName = newName.replace(/([1-4])$/, ty_str);
  } else if (/leader[a-zA-Z]+[1-4]$/.test(newName)) {
    newName = newName.replace(/([1-4])$/, ty_str);
  } else {
    newName = newName.replace(new RegExp(`(stu|year|yr|leader\\s*)${fy_str}`, 'i'), `$1${ty_str}`);
  }

  let newEmail = email || '';
  if (newEmail.includes('@')) {
    const [local, domain] = newEmail.split('@');
    let newLocal = local;
    if (local.startsWith(`stu${fy_str}`)) {
      newLocal = `stu${ty_str}` + local.slice(`stu${fy_str}`.length);
    } else if (/leader[a-zA-Z]+[1-4]\d*$/.test(local)) {
      newLocal = local.replace(/(leader[a-zA-Z]+)[1-4](\d*)$/, `$1${ty_str}$2`);
    } else {
      newLocal = newUsername;
    }
    newEmail = `${newLocal}@${domain}`;
  } else {
    newEmail = `${newUsername}@inpand.com`;
  }

  return { name: newName, username: newUsername, email: newEmail, passedOut: false, nextYear: `Year ${ty}` };
}

export default function YearTransitionSection({ isOpen, onClose, currentUser, onSuccess }) {
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  const isClassTeacher = currentUser?.role === 'class_teacher';

  const [fromYear, setFromYear] = useState(1);
  const [toYear, setToYear] = useState(2);
  const [selectionMode, setSelectionMode] = useState('specific'); // 'all' | 'specific'
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [yearFilterTab, setYearFilterTab] = useState('all'); // 'all' | 1 | 2 | 3 | 4

  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [callerDept, setCallerDept] = useState(null);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');

  // When fromYear changes, automatically choose sensible toYear
  const handleFromYearChange = (newFrom) => {
    const fy = Number(newFrom);
    setFromYear(fy);
    if (fy === 4) {
      setToYear('passed_out');
    } else {
      setToYear(fy + 1);
    }
  };

  // Load departments and caller dept on mount or when modal opens
  useEffect(() => {
    if (isOpen === false) return;
    loadStudentsAndDepts();
  }, [isOpen]);

  // Reload students whenever selectedDeptId changes (loads ALL students of that department)
  useEffect(() => {
    if (isOpen === false) return;
    if (selectedDeptId) {
      loadStudentsAndDepts();
    }
  }, [selectedDeptId, isOpen]);

  const loadStudentsAndDepts = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Pass null for year to fetch ALL students in the department
      const res = await API.getStudentsForYear(null, selectedDeptId || null);
      if (res && res.departments) {
        setDepartments(res.departments);
      }
      if (res && res.caller_department) {
        setCallerDept(res.caller_department);
        if (!isSuperAdmin && !selectedDeptId) {
          setSelectedDeptId(res.caller_department.id);
        }
      } else if (isSuperAdmin && !selectedDeptId && res.departments && res.departments.length > 0) {
        setSelectedDeptId(res.departments[0].id);
      }
      if (res && res.students) {
        setStudents(res.students);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error('Failed to load students for year transition:', err);
      setErrorMessage(err.message || 'Unable to load student list for year change');
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on yearFilterTab and studentSearch
  const displayedStudents = useMemo(() => {
    return students.filter((s) => {
      // 1. Year filter
      if (yearFilterTab !== 'all') {
        const sYear = Number(s.academic_year || 1);
        if (sYear !== Number(yearFilterTab)) return false;
      }
      // 2. Search query
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const matchesName = s.name && s.name.toLowerCase().includes(q);
        const matchesUsername = s.username && s.username.toLowerCase().includes(q);
        const matchesEmail = s.email && s.email.toLowerCase().includes(q);
        if (!matchesName && !matchesUsername && !matchesEmail) return false;
      }
      return true;
    });
  }, [students, yearFilterTab, studentSearch]);

  // Year counts in department
  const countY1 = useMemo(() => students.filter((s) => Number(s.academic_year) === 1).length, [students]);
  const countY2 = useMemo(() => students.filter((s) => Number(s.academic_year) === 2).length, [students]);
  const countY3 = useMemo(() => students.filter((s) => Number(s.academic_year) === 3).length, [students]);
  const countY4 = useMemo(() => students.filter((s) => Number(s.academic_year) === 4).length, [students]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(displayedStudents.map((s) => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmitTransition = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const isPassedOut = toYear === 'passed_out' || Number(toYear) >= 5;
    const targetCount = selectionMode === 'all' ? countY1 : selectedStudentIds.length;

    if (targetCount === 0) {
      setErrorMessage('Please select at least one student or choose "All Students".');
      return;
    }

    const confirmText =
      selectionMode === 'all'
        ? `Are you sure you want to transition all ${countY1} student(s) currently in Year ${fromYear} to ${isPassedOut ? 'PASSED OUT' : `Year ${toYear}`}?`
        : `Are you sure you want to transition the ${selectedStudentIds.length} selected student(s)?\n\nEach student's Full Name, User name, and Email Address will automatically update to their next academic year. Final year students will be marked as Passed Out.`;

    if (!window.confirm(confirmText)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.changeStudentYear(
        fromYear,
        toYear,
        selectionMode === 'specific' ? selectedStudentIds : [],
        selectionMode === 'all',
        selectedDeptId || undefined
      );

      setSuccessMessage(
        res.message ||
          `Successfully transitioned ${targetCount} student(s) to ${isPassedOut ? 'Passed Out' : `Year ${toYear}`}.`
      );
      setSelectedStudentIds([]);
      // Reload students
      await loadStudentsAndDepts();
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      console.error('Year transition failed:', err);
      setErrorMessage(err.message || 'Failed to update student academic year');
    } finally {
      setSubmitting(false);
    }
  };

  // Active department display
  const currentDeptObj = departments.find((d) => String(d.id) === String(selectedDeptId)) || callerDept;

  const cardContent = (
    <div
      className="card"
      style={{
        margin: 0,
        border: '1.5px solid #6366f1',
        borderRadius: '16px',
        background: '#ffffff',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
          padding: '18px 24px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.7rem' }}>🎓</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
              Student Academic Year Transition & Promotion
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.84rem', opacity: 0.9 }}>
              Move students from one year to the next. Dynamic Full Name & Email renaming, automatic history preservation, and passed out account protection.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(4px)',
              padding: '5px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            {isSuperAdmin ? '⚡ Super Admin Scope' : '🏫 Class Teacher Department Scope'}
          </span>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.25)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 900,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease'
              }}
              title="Close Modal"
              aria-label="Close"
              style={{
                background: 'rgba(255, 255, 255, 0.25)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', pointerEvents: 'none' }}>
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '22px 24px', maxHeight: '78vh', overflowY: 'auto' }}>
        {/* Alerts */}
        {successMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#ecfdf5',
              border: '1px solid #10b981',
              color: '#065f46',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 600
            }}
          >
            <span>✓ {successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 800 }}
            >
              ✕
            </button>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #ef4444',
              color: '#991b1b',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 600
            }}
          >
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 800 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Configuration Bar: Department, From Year, To Year */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            background: '#f8fafc',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            marginBottom: '18px'
          }}
        >
          {/* Department Selector / Display */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '6px'
              }}
            >
              Department <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {isSuperAdmin ? (
              <select
                className="form-input"
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem', fontWeight: 600 }}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <div
                style={{
                  padding: '9px 12px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontWeight: 700,
                  color: '#1e293b',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ color: '#6366f1' }}>🏢</span>
                <span>
                  {currentDeptObj ? `${currentDeptObj.code} - ${currentDeptObj.name}` : 'Your Assigned Department'}
                </span>
              </div>
            )}
            <small style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '4px', display: 'block' }}>
              Showing all <strong>{students.length} students</strong> belonging to {currentDeptObj?.code || 'this department'}.
            </small>
          </div>

          {/* From Year */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '6px'
              }}
            >
              From Year <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="form-input"
              value={fromYear}
              onChange={(e) => handleFromYearChange(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem', fontWeight: 600 }}
            >
              <option value={1}>Year 1 (First Year - {countY1} students)</option>
              <option value={2}>Year 2 (Second Year - {countY2} students)</option>
              <option value={3}>Year 3 (Third Year - {countY3} students)</option>
              <option value={4}>Year 4 (Final Year - {countY4} students)</option>
            </select>
            <small style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '4px', display: 'block' }}>
              Used when promoting an entire year cohort.
            </small>
          </div>

          {/* To Year */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '6px'
              }}
            >
              To Year <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="form-input"
              value={toYear}
              onChange={(e) => setToYear(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: toYear === 'passed_out' || Number(toYear) >= 5 ? '#b91c1c' : '#1e293b',
                background: toYear === 'passed_out' || Number(toYear) >= 5 ? '#fef2f2' : '#ffffff'
              }}
            >
              {fromYear < 4 && <option value={fromYear + 1}>Year {fromYear + 1}</option>}
              {fromYear === 1 && (
                <>
                  <option value={3}>Year 3</option>
                  <option value={4}>Year 4</option>
                </>
              )}
              {fromYear === 2 && <option value={4}>Year 4</option>}
              <option value="passed_out">Passed Out / Graduated (Login Disabled)</option>
            </select>
            <small
              style={{
                color: toYear === 'passed_out' ? '#dc2626' : '#64748b',
                fontSize: '0.74rem',
                marginTop: '4px',
                display: 'block',
                fontWeight: toYear === 'passed_out' ? 700 : 400
              }}
            >
              {toYear === 'passed_out'
                ? '🔒 Final year students will be marked passed out & logins permanently disabled.'
                : 'Target academic year after promotion.'}
            </small>
          </div>
        </div>

        {/* Selection Mode Toggle: All Students vs Select Specific Students */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            padding: '12px 18px',
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            marginBottom: '16px',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
            Selection Mode:
          </span>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: selectionMode === 'all' ? 700 : 500,
              color: selectionMode === 'all' ? '#4f46e5' : '#475569'
            }}
          >
            <input
              type="radio"
              name="selectionMode"
              value="all"
              checked={selectionMode === 'all'}
              onChange={() => setSelectionMode('all')}
              style={{ accentColor: '#4f46e5', width: '16px', height: '16px' }}
            />
            All Students in Year {fromYear} ({fromYear === 1 ? countY1 : fromYear === 2 ? countY2 : fromYear === 3 ? countY3 : countY4} found)
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: selectionMode === 'specific' ? 700 : 500,
              color: selectionMode === 'specific' ? '#4f46e5' : '#475569'
            }}
          >
            <input
              type="radio"
              name="selectionMode"
              value="specific"
              checked={selectionMode === 'specific'}
              onChange={() => setSelectionMode('specific')}
              style={{ accentColor: '#4f46e5', width: '16px', height: '16px' }}
            />
            Select Specific Students (Show all {students.length} department students below)
          </label>
        </div>

        {/* CONDITION 1: When All Students is selected -> Student select option is REMOVED */}
        {selectionMode === 'all' && (
          <div
            style={{
              padding: '16px 20px',
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1.5px dashed #6366f1',
              borderRadius: '10px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}
          >
            <span style={{ fontSize: '1.8rem' }}>ℹ️</span>
            <div>
              <strong style={{ color: '#3730a3', fontSize: '0.96rem', display: 'block' }}>
                All {fromYear === 1 ? countY1 : fromYear === 2 ? countY2 : fromYear === 3 ? countY3 : countY4} Students in Year {fromYear} ({currentDeptObj?.code || 'Department'}) Selected
              </strong>
              <p style={{ margin: '4px 0 0 0', color: '#4338ca', fontSize: '0.84rem' }}>
                {toYear === 'passed_out'
                  ? `All students currently in Year ${fromYear} will be marked as Passed Out. Their accounts will be locked from future portal logins.`
                  : `All students in Year ${fromYear} will be moved together to Year ${toYear}. Their Full Names, User names, and Email Addresses will automatically advance (e.g. stu${fromYear}1_${currentDeptObj?.code?.toLowerCase() || 'dept'} ➔ stu${toYear}1_${currentDeptObj?.code?.toLowerCase() || 'dept'}). All quiz submissions, attendance records, and history remain intact.`}
              </p>
            </div>
          </div>
        )}

        {/* CONDITION 2: When Specific Students is selected -> ALL students in that department are shown */}
        {selectionMode === 'specific' && (
          <div style={{ marginBottom: '18px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>
                  Students in Department ({currentDeptObj?.code || 'Department'}):
                </strong>
                <span
                  style={{
                    background: '#e0e7ff',
                    color: '#3730a3',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '12px'
                  }}
                >
                  {selectedStudentIds.length} of {displayedStudents.length} selected ({students.length} Total in Department)
                </span>
              </div>

              {/* Quick Search inside Department Students */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Filter students by name, user name, or email..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.84rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    width: '260px'
                  }}
                />
                {studentSearch && (
                  <button
                    type="button"
                    onClick={() => setStudentSearch('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Year Filter Tabs: All, Year 1, Year 2, Year 3, Year 4 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                flexWrap: 'wrap'
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>
                View Filter:
              </span>
              {[
                { key: 'all', label: `All Students (${students.length})` },
                { key: 1, label: `Year 1 (${countY1})` },
                { key: 2, label: `Year 2 (${countY2})` },
                { key: 3, label: `Year 3 (${countY3})` },
                { key: 4, label: `Year 4 (${countY4})` }
              ].map((tab) => {
                const isActive = yearFilterTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setYearFilterTab(tab.key)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 700 : 500,
                      borderRadius: '20px',
                      border: isActive ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                      background: isActive ? '#4f46e5' : '#ffffff',
                      color: isActive ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>
                Loading students for {currentDeptObj?.code || 'department'}...
              </div>
            ) : displayedStudents.length === 0 ? (
              <div
                style={{
                  padding: '28px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                  fontSize: '0.9rem'
                }}
              >
                No students match the current filter in {currentDeptObj?.code || 'this department'}.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: '380px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px', width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={
                            displayedStudents.length > 0 &&
                            displayedStudents.every((s) => selectedStudentIds.includes(s.id))
                          }
                          onChange={handleSelectAll}
                          style={{ accentColor: '#4f46e5', cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ padding: '10px 12px', width: '90px' }}>Current Year</th>
                      <th style={{ padding: '10px 12px' }}>Current Full Name ➔ Next Full Name</th>
                      <th style={{ padding: '10px 12px' }}>Current User name ➔ Next User name</th>
                      <th style={{ padding: '10px 12px' }}>Current Email ➔ Next Email</th>
                      <th style={{ padding: '10px 12px', width: '120px' }}>Target Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedStudents.map((s) => {
                      const isSelected = selectedStudentIds.includes(s.id);
                      const sYear = Number(s.academic_year || 1);
                      const overrideTo = (sYear === fromYear) ? toYear : null;
                      const preview = previewNewCredentials(s.name, s.username, s.email, sYear, overrideTo);

                      return (
                        <tr
                          key={s.id}
                          onClick={() => handleToggleStudent(s.id)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isSelected ? 'rgba(99, 102, 241, 0.08)' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '9px 12px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by tr onClick
                              style={{ accentColor: '#4f46e5', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <span
                              style={{
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid #bfdbfe'
                              }}
                            >
                              Year {sYear}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px', fontWeight: 600 }}>
                            <span style={{ color: '#1e293b' }}>{s.name}</span>
                            {!preview.passedOut && s.name !== preview.name && (
                              <span style={{ color: '#4f46e5', marginLeft: '6px' }}>➔ {preview.name}</span>
                            )}
                          </td>
                          <td style={{ padding: '9px 12px', color: '#475569' }}>
                            <code>{s.username}</code>
                            {!preview.passedOut && s.username !== preview.username && (
                              <span style={{ color: '#4f46e5', marginLeft: '6px' }}>
                                ➔ <code>{preview.username}</code>
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '9px 12px', color: '#475569' }}>
                            <span>{s.email}</span>
                            {!preview.passedOut && s.email !== preview.email && (
                              <span style={{ color: '#059669', marginLeft: '6px', fontWeight: 600 }}>
                                ➔ {preview.email}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            {preview.passedOut ? (
                              <span
                                style={{
                                  background: '#fee2e2',
                                  color: '#b91c1c',
                                  fontSize: '0.72rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 700
                                }}
                              >
                                Passed Out
                              </span>
                            ) : (
                              <span
                                style={{
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  fontSize: '0.72rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 700
                                }}
                              >
                                {preview.nextYear}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Action Button Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '16px'
          }}
        >
          <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
            {selectionMode === 'all'
              ? `Moving all ${fromYear === 1 ? countY1 : fromYear === 2 ? countY2 : fromYear === 3 ? countY3 : countY4} students from Year ${fromYear} (${currentDeptObj?.code || ''})`
              : `${selectedStudentIds.length} of ${students.length} student(s) selected for Year change in ${currentDeptObj?.code || 'Department'}`}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {onClose && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onClose}
                style={{ padding: '8px 16px' }}
              >
                Close
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadStudentsAndDepts}
              disabled={loading || submitting}
              style={{ padding: '8px 14px' }}
            >
              🔄 Refresh List
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSubmitTransition}
              disabled={
                submitting ||
                loading ||
                (selectionMode === 'all' && (fromYear === 1 ? countY1 : fromYear === 2 ? countY2 : fromYear === 3 ? countY3 : countY4) === 0) ||
                (selectionMode === 'specific' && selectedStudentIds.length === 0)
              }
              style={{
                padding: '9px 20px',
                fontWeight: 700,
                fontSize: '0.88rem',
                background:
                  selectionMode === 'all' && (toYear === 'passed_out' || Number(toYear) >= 5)
                    ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                    : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                borderColor:
                  selectionMode === 'all' && (toYear === 'passed_out' || Number(toYear) >= 5)
                    ? '#b91c1c'
                    : '#4f46e5',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
              }}
            >
              {submitting
                ? 'Processing Transition...'
                : selectionMode === 'all' && (toYear === 'passed_out' || Number(toYear) >= 5)
                ? `🎓 Mark ${fromYear === 1 ? countY1 : fromYear === 2 ? countY2 : fromYear === 3 ? countY3 : countY4} Students as Passed Out`
                : selectionMode === 'all'
                ? `🎓 Move ${fromYear === 1 ? countY1 : fromYear === 2 ? countY2 : fromYear === 3 ? countY3 : countY4} Students from Year ${fromYear} to Year ${toYear}`
                : `🎓 Move ${selectedStudentIds.length} Selected Student(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // If used as a modal pop up:
  if (isOpen !== undefined) {
    if (!isOpen) return null;
    return createPortal(
      <div
        className="modal-overlay active"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
        style={{
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '1050px',
            width: '100%',
            maxHeight: '92vh',
            padding: 0,
            borderRadius: '16px',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.45)',
            background: '#ffffff',
            position: 'relative',
            border: 'none',
            overflow: 'hidden'
          }}
        >
          {cardContent}
        </div>
      </div>,
      document.body
    );
  }

  // Standalone inline render
  return cardContent;
}
