import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { API, parseTeacherDeptAndYear } from '../api/api';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { Pagination } from './Pagination';

export const StudentsByDepartment = ({ deptId = null, deptName = null, lockDepartment = false, showAttendance = null, showSection = null }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const isFaculty = ['teacher', 'class_teacher'].includes(user?.role);
  const facultyDeptYear = useMemo(() => {
    if (!isFaculty) return null;
    return parseTeacherDeptAndYear(user);
  }, [isFaculty, user]);

  const isHod = user?.role === 'hod' || lockDepartment || isFaculty;
  const isAllowedToMarkAttendance = ['super_admin', 'admin', 'principal', 'class_teacher'].includes(user?.role);
  const canShowAttendance = showAttendance !== null ? showAttendance : (!isHod && isAllowedToMarkAttendance);
  const canShowSection = showSection !== null ? showSection : !isHod;
  const effectiveDeptId = (user?.role === 'hod' || lockDepartment) ? (deptId || user?.department_id) : null;

  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(effectiveDeptId ? String(effectiveDeptId) : 'all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [showChangeYearModal, setShowChangeYearModal] = useState(false);
  const [fromYear, setFromYear] = useState('1');
  const [toYear, setToYear] = useState('2');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [changeYearLoading, setChangeYearLoading] = useState(false);

  useEffect(() => {
    API.getDepartments()
      .then(res => {
        const list = res.departments || [];
        if (isHod && effectiveDeptId) {
          setDepartments(list.filter(d => String(d.id) === String(effectiveDeptId)));
        } else {
          setDepartments(list);
        }
      })
      .catch(() => {});
  }, [isHod, effectiveDeptId]);

  const loadStudents = useCallback(async (dId) => {
    try {
      setLoading(true);
      const targetId = isHod ? (effectiveDeptId || dId) : dId;
      const url = targetId && targetId !== 'all'
        ? `/api/college/students/by-department?department_id=${targetId}`
        : '/api/college/students/by-department';
      const res = await API.request(url);
      setStudents(res.students || []);
    } catch (e) {
      console.warn('Failed to load students:', e);
    } finally {
      setLoading(false);
    }
  }, [isHod, effectiveDeptId]);

  useEffect(() => {
    loadStudents(selectedDeptId);
  }, [selectedDeptId, loadStudents]);

  const handleMarkAttendance = async (studentId, status, studentName) => {
    const prevStudents = [...students];
    // Immediate optimistic update
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, today_attendance: status } : s));
    setMarkingId(studentId);
    try {
      await API.markStudentDailyAttendance(studentId, status);
      if (showAlert) {
        showAlert(`Marked ${studentName || 'Student'} as ${status === 'P' ? 'Present' : 'Absent'} for today`, 'success');
      }
    } catch (err) {
      console.error('Failed to mark attendance:', err);
      // Revert optimistic update
      setStudents(prevStudents);
      if (showAlert) {
        showAlert(err.message || 'Failed to mark attendance', 'danger');
      } else {
        alert(err.message || 'Failed to mark attendance');
      }
    } finally {
      setMarkingId(null);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDeptId]);

  const filtered = students.filter(st => {
    if (selectedYear !== 'all') {
      const yr = String(st.academic_year || 1);
      if (yr !== String(selectedYear)) return false;
    }
    if (facultyDeptYear?.deptCode) {
      const stDeptCode = (st.department_code || '').toUpperCase() || (st.roll_number || '').toUpperCase().slice(0, facultyDeptYear.deptCode.length);
      if (stDeptCode && stDeptCode !== facultyDeptYear.deptCode) return false;
    }
    if (facultyDeptYear?.year) {
      const stYr = Number(st.academic_year || 1);
      if (stYr !== Number(facultyDeptYear.year)) return false;
    }
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (st.name && st.name.toLowerCase().includes(q)) ||
      (st.email && st.email.toLowerCase().includes(q)) ||
      (st.username && st.username.toLowerCase().includes(q)) ||
      (st.roll_number && st.roll_number.toLowerCase().includes(q)) ||
      (st.department_name && st.department_name.toLowerCase().includes(q)) ||
      (st.batch_name && st.batch_name.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  // Filter students matching fromYear for change modal
  const candidateStudents = students.filter(st => {
    const yr = String(st.academic_year || 1);
    return yr === String(fromYear);
  });

  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === candidateStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(candidateStudents.map(s => s.id));
    }
  };

  const handleToggleStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleChangeYearSubmit = async (e) => {
    e.preventDefault();
    if (fromYear === toYear) {
      showAlert('To Year must be different from From Year.', 'warning');
      return;
    }
    if (!selectedStudentIds.length) {
      showAlert('Please select at least one student to change year.', 'warning');
      return;
    }
    try {
      setChangeYearLoading(true);
      const res = await API.changeStudentYear(fromYear, toYear, selectedStudentIds);
      showAlert(res.message || `Successfully changed students from Year ${fromYear} to Year ${toYear}`, 'success');
      setShowChangeYearModal(false);
      setSelectedStudentIds([]);
      loadStudents(selectedDeptId);
    } catch (err) {
      showAlert(err.message || 'Failed to change student year', 'danger');
    } finally {
      setChangeYearLoading(false);
    }
  };

  const paginatedStudents = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <div className="card">
      <div className="card-header" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            Student Directory & Rosters
            <span
              className="status-pill"
              style={{
                fontSize: '0.80rem',
                padding: '3px 10px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#047857',
                borderColor: '#10b981'
              }}
            >
              {filtered.length} / {students.length} Total
            </span>
          </h2>
          <p className="card-description" style={{ fontSize: '0.85rem', margin: '4px 0 0' }}>
            {isHod
              ? `Complete roster of enrolled students in ${deptName || 'your department'} with daily attendance marking.`
              : 'Complete institutional roster of students across all academic departments with daily attendance marking.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search name, roll no, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ minWidth: '240px', padding: '7px 12px', paddingRight: '48px', fontSize: '0.88rem' }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
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
            type="button"
            className="btn btn-primary btn-sm"
            style={{ padding: '8px 16px' }}
          >
            Search
          </button>

          {searchTerm && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSearchTerm('')}
              style={{ padding: '8px 12px' }}
              title="Clear search filter"
            >
              Reset
            </button>
          )}

          {isHod ? (
            <div
              style={{
                padding: '7px 14px',
                fontSize: '0.86rem',
                fontWeight: 700,
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '6px',
                color: '#4338ca',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {deptName || departments[0]?.name || 'Department Roster'}
            </div>
          ) : (
            <select
              className="form-select"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              style={{ minWidth: '200px', padding: '8px 12px', fontSize: '0.88rem' }}
            >
              <option value="all">All Departments ({students.length})</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          )}

          <select
            className="form-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ width: 'auto', minWidth: '120px', padding: '8px 12px', fontSize: '0.88rem' }}
          >
            <option value="all">All Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
            <option value="5">Year 5</option>
          </select>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => loadStudents(selectedDeptId)}
            disabled={loading}
            style={{ padding: '8px 14px', fontSize: '0.84rem' }}
          >
            Refresh
          </button>

          {['class_teacher', 'super_admin', 'admin'].includes(user?.role) && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setShowChangeYearModal(true);
                if (user?.role === 'class_teacher') {
                  const m = (user.username || user.name || '').match(/([1-4])$/);
                  if (m) {
                    setFromYear(m[1]);
                    setToYear(String(Math.min(4, Number(m[1]) + 1)));
                  }
                }
              }}
              style={{
                padding: '8px 16px',
                fontSize: '0.84rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Change student academic year (From / To)"
            >
              <span>🎓</span>
              <span>Change Student Year</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Roll No</th>
              <th>Full Name</th>
              <th>Year</th>
              <th>Email Address</th>
              <th>Department</th>
              {canShowSection && <th>Section</th>}
              <th>Guardian Info</th>
              <th>Status</th>
              {canShowAttendance && (
                <th style={{ textAlign: 'center', minWidth: '190px' }}>Attendance</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.length ? (
              paginatedStudents.map(st => {
                const isPresent = st.today_attendance === 'P';
                const isAbsent = st.today_attendance === 'A';
                const isBusy = markingId === st.id;

                return (
                  <tr key={st.id}>
                    <td><strong>{st.roll_number || '-'}</strong></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.94rem' }}>{st.name}</strong>
                        <span
                          className="status-pill"
                          style={{
                            fontSize: '0.74rem',
                            padding: '2px 8px',
                            background: '#e0e7ff',
                            color: '#4338ca',
                            borderColor: '#a5b4fc',
                            fontWeight: 700
                          }}
                        >
                          Year {st.academic_year || 1}
                        </span>
                      </div>
                      {st.username && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>@{st.username}</div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        Year {st.academic_year || 1}
                      </span>
                      {st.previous_year && (
                        <div
                          className="status-pill"
                          style={{
                            marginTop: '3px',
                            fontSize: '0.70rem',
                            background: 'rgba(99, 102, 241, 0.12)',
                            color: '#4338ca',
                            borderColor: '#818cf8',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}
                          title={`Changed from Year ${st.previous_year} to Year ${st.academic_year}`}
                        >
                          From Yr {st.previous_year} → Yr {st.academic_year}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ color: '#4f46e5', fontWeight: 600 }}>
                        {st.email || '-'}
                      </span>
                    </td>
                    <td>
                      <span
                        className="status-pill"
                        style={{
                          fontSize: '0.78rem',
                          padding: '3px 8px',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#4338ca',
                          borderColor: 'rgba(99, 102, 241, 0.4)'
                        }}
                      >
                        {st.department_name || 'General'}
                      </span>
                    </td>
                    {canShowSection && <td>{st.section_name || '-'}</td>}
                    <td>{st.guardian_name ? `${st.guardian_name} ${st.guardian_phone ? `(${st.guardian_phone})` : ''}` : '-'}</td>
                    <td>
                      <span
                        className="status-pill"
                        style={{
                          fontSize: '0.78rem',
                          color: st.status === 'active' ? '#10b981' : '#f59e0b',
                          borderColor: st.status === 'active' ? '#10b981' : '#f59e0b',
                          background: st.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'
                        }}
                      >
                        {st.status || 'active'}
                      </span>
                    </td>
                    {canShowAttendance && (
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(st.id, 'P', st.name)}
                            disabled={isBusy}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: isBusy ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.18s ease',
                              border: isPresent ? '1px solid #10b981' : '1px solid rgba(16, 185, 129, 0.35)',
                              background: isPresent ? '#10b981' : 'rgba(16, 185, 129, 0.08)',
                              color: isPresent ? '#ffffff' : '#34d399',
                              boxShadow: isPresent ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none',
                              opacity: isBusy ? 0.7 : 1
                            }}
                            title={`Mark ${st.name} Present`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(st.id, 'A', st.name)}
                            disabled={isBusy}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: isBusy ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.18s ease',
                              border: isAbsent ? '1px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.35)',
                              background: isAbsent ? '#ef4444' : 'rgba(239, 68, 68, 0.08)',
                              color: isAbsent ? '#ffffff' : '#f87171',
                              boxShadow: isAbsent ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none',
                              opacity: isBusy ? 0.7 : 1
                            }}
                            title={`Mark ${st.name} Absent`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6 + (canShowSection ? 1 : 0) + (canShowAttendance ? 1 : 0)} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                  {searchTerm ? `No students found matching "${searchTerm}".` : 'No students found in this department.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 10 Students Pagination Bar */}
      {/* 10 Students per screen Pagination bar */}
      <Pagination
        currentPage={activePage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemLabel="students"
      />

      {/* Change Student Year Modal */}
      {showChangeYearModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '640px', width: '90%', animation: 'slideUp 0.25s ease-out' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎓</span>
                  <span>Change Student Academic Year</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Promote or transfer students from one academic year to another (e.g. Year 1 → Year 2).
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowChangeYearModal(false)}
                style={{ padding: '4px 10px', fontSize: '0.85rem' }}
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleChangeYearSubmit}>
              {/* From & To Year Selection */}
              <div className="grid grid-2" style={{ gap: '14px', marginBottom: '16px', background: 'rgba(99, 102, 241, 0.06)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    From Year <span className="req">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={fromYear}
                    onChange={(e) => {
                      const fY = e.target.value;
                      setFromYear(fY);
                      const nextY = Math.min(4, Number(fY) + 1);
                      if (String(nextY) !== fY) setToYear(String(nextY));
                      setSelectedStudentIds([]);
                    }}
                    required
                  >
                    <option value="1">Year 1 (1st Year)</option>
                    <option value="2">Year 2 (2nd Year)</option>
                    <option value="3">Year 3 (3rd Year)</option>
                    <option value="4">Year 4 (4th Year)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    To Year <span className="req">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={toYear}
                    onChange={(e) => setToYear(e.target.value)}
                    required
                  >
                    <option value="1">Year 1 (1st Year)</option>
                    <option value="2">Year 2 (2nd Year)</option>
                    <option value="3">Year 3 (3rd Year)</option>
                    <option value="4">Year 4 (4th Year)</option>
                  </select>
                </div>
              </div>

              {/* Students matching From Year */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                    Select Students in Year {fromYear} ({candidateStudents.length} available)
                  </label>
                  {candidateStudents.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleToggleSelectAll}
                      style={{ padding: '2px 8px', fontSize: '0.78rem' }}
                    >
                      {selectedStudentIds.length === candidateStudents.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {candidateStudents.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.88rem', border: '1px dashed #cbd5e1' }}>
                    No students found currently in Year {fromYear}.
                  </div>
                ) : (
                  <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', background: '#ffffff' }}>
                    {candidateStudents.map(st => {
                      const isChecked = selectedStudentIds.includes(st.id);
                      return (
                        <label
                          key={st.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderBottom: '1px solid rgba(0,0,0,0.05)',
                            cursor: 'pointer',
                            background: isChecked ? 'rgba(99, 102, 241, 0.06)' : 'transparent',
                            margin: 0
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleStudent(st.id)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <div>
                              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{st.name}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                @{st.username || '—'} {st.roll_number ? `• Roll: ${st.roll_number}` : ''}
                              </span>
                            </div>
                          </div>
                          <span className="status-pill" style={{ fontSize: '0.72rem' }}>
                            {st.department_name || 'General'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowChangeYearModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={changeYearLoading || selectedStudentIds.length === 0}
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    fontWeight: 700
                  }}
                >
                  {changeYearLoading
                    ? 'Updating Year...'
                    : `Change ${selectedStudentIds.length} Student${selectedStudentIds.length === 1 ? '' : 's'} to Year ${toYear}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
