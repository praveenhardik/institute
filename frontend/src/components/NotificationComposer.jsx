import React, { useEffect, useMemo, useState } from 'react';
import { API } from '../api/api';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';

// Who each role may notify. Must mirror the rules enforced in backend/routes_notifications.py (/send).
// For Principal: Selected Students, Whole Department Students, Teachers, or Admin only.
const AUDIENCES_BY_ROLE = {
  principal: [
    { value: 'selected_students', label: 'Selected Students' },
    { value: 'department', label: 'Whole Department Students' },
    { value: 'teacher', label: 'Teachers' },
    { value: 'admin', label: 'Admin' }
  ],
  super_admin: [
    { value: 'admin', label: 'All College Admins' },
    { value: 'teacher', label: 'All Teachers' },
    { value: 'class_teacher', label: 'All Class Teachers' },
    { value: 'student', label: 'All Students' },
    { value: 'department', label: 'Department-wise' }
  ],
  admin: [
    { value: 'teacher', label: 'All Teachers' },
    { value: 'class_teacher', label: 'All Class Teachers' },
    { value: 'student', label: 'All Students' },
    { value: 'department', label: 'Department-wise' }
  ],
  class_teacher: [
    { value: 'teacher', label: 'All Teachers' },
    { value: 'student', label: 'All Students' },
    { value: 'department', label: 'Department' }
  ],
  teacher: [
    { value: 'student', label: 'All Students' },
    { value: 'department', label: 'Department' }
  ],
  class_leader: [
    { value: 'department', label: 'Department' }
  ]
};

/**
 * Notification composer used by Principal, Super Admin, Admin, Class Teacher and Teacher.
 * - Principal: Selected Students (with view all / department filter), Whole Department Students, Teachers, Admin.
 * - Other roles: role-dependent broadcasts and department-wise notifications.
 * compact: smaller layout for the notification drop-down panel.
 */
export const canDispatchNotifications = (role) => Boolean(AUDIENCES_BY_ROLE[role]);

export const NotificationComposer = ({ compact = false, onSent }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const audiences = useMemo(() => AUDIENCES_BY_ROLE[user?.role] || [], [user?.role]);
  const [audience, setAudience] = useState(audiences[0]?.value || '');
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [deptScope, setDeptScope] = useState('students');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Student selection state (for selected_students audience)
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentViewFilter, setStudentViewFilter] = useState('all'); // 'all' or department_id
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  useEffect(() => {
    if (!audiences.length) return;
    if (!audience || !audiences.some((a) => a.value === audience)) {
      setAudience(audiences[0].value);
    }
    API.getDepartments()
      .then((res) => setDepartments(res.departments || []))
      .catch(() => setDepartments([]));
  }, [audiences, audience]);

  const isDepartmentScopedRole = ['teacher', 'class_teacher', 'class_leader'].includes(user?.role);
  const isClassLeader = user?.role === 'class_leader';
  const isPrincipal = user?.role === 'principal';
  const isSelectedStudents = audience === 'selected_students';
  const isDepartment = audience === 'department';
  // Teachers, class teachers, class leaders (and principal for department audience) only notify students
  const studentsOnly = ['teacher', 'class_teacher', 'principal', 'class_leader'].includes(user?.role);
  const effectiveScope = studentsOnly ? 'students' : deptScope;

  const [assignedDepts, setAssignedDepts] = useState([]);

  // Auto-fetch department(s) for teacher, class_teacher, and class_leader
  useEffect(() => {
    if (!isDepartmentScopedRole) return;
    API.getMyDepartments()
      .then((res) => {
        const depts = res.departments || [];
        setAssignedDepts(depts);
        if (depts.length > 0) {
          setDepartmentId(String(depts[0].id));
        }
      })
      .catch((err) => console.warn('Failed to load user departments:', err));
  }, [isDepartmentScopedRole]);

  useEffect(() => {
    if (isDepartmentScopedRole && user?.department_id && !departmentId) {
      setDepartmentId(String(user.department_id));
    }
  }, [isDepartmentScopedRole, user?.department_id, departmentId]);

  const userDeptNames = useMemo(() => {
    if (assignedDepts.length > 0) {
      return assignedDepts.map((d) => d.name + (d.code ? ` (${d.code})` : '')).join(', ');
    }
    if (user?.department_name) {
      return user.department_name + (user.department_code ? ` (${user.department_code})` : '');
    }
    if (user?.department) {
      return user.department;
    }
    const matched = departments.find((d) => String(d.id) === String(departmentId) || String(d.id) === String(user?.department_id));
    if (matched) {
      return matched.name + (matched.code ? ` (${matched.code})` : '');
    }
    return '';
  }, [assignedDepts, user, departments, departmentId]);

  const selectedDept = departments.find((d) => String(d.id) === String(departmentId));

  // Load students when selected_students is active
  useEffect(() => {
    if (!isSelectedStudents) return;
    setLoadingStudents(true);
    API.getStudentsByDepartment(studentViewFilter === 'all' ? null : studentViewFilter)
      .then((res) => {
        setStudents(res.students || []);
      })
      .catch((err) => {
        console.warn('Failed to load students:', err);
        setStudents([]);
      })
      .finally(() => setLoadingStudents(false));
  }, [isSelectedStudents, studentViewFilter]);

  // Client-side filter for student list
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase().trim();
    return students.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.roll_number && s.roll_number.toLowerCase().includes(q)) ||
        (s.username && s.username.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.department_name && s.department_name.toLowerCase().includes(q))
    );
  }, [students, studentSearch]);

  const toggleStudentSelection = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map((s) => s.id);
    setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  if (!audiences.length) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle || !cleanMessage) {
      showAlert('Notice title and message are both required.', 'danger');
      return;
    }
    if (isSelectedStudents && !selectedStudentIds.length) {
      showAlert('Please select at least one student to send this notification to.', 'danger');
      return;
    }
    const effectiveDeptId = isDepartmentScopedRole
      ? (departmentId || assignedDepts[0]?.id || user?.department_id)
      : departmentId;

    if (isDepartment && !effectiveDeptId && !isDepartmentScopedRole) {
      showAlert('Choose a department to send this notice to.', 'danger');
      return;
    }

    try {
      setSending(true);
      let res;
      if (isSelectedStudents) {
        res = await API.sendNotification(
          'selected_students',
          cleanTitle,
          cleanMessage,
          null,
          'students',
          selectedStudentIds
        );
      } else if (isDepartment) {
        res = await API.sendNotification(
          String(effectiveDeptId || 'department'),
          cleanTitle,
          cleanMessage,
          Number(effectiveDeptId) || null,
          effectiveScope
        );
      } else {
        res = await API.sendNotification(audience, cleanTitle, cleanMessage);
      }

      showAlert(res.message || 'Notice sent successfully.', 'success');
      setTitle('');
      setMessage('');
      if (isSelectedStudents) {
        setSelectedStudentIds([]);
      }
      if (onSent) onSent(res);
    } catch (err) {
      showAlert(err.message || 'Failed to send notice.', 'danger');
    } finally {
      setSending(false);
    }
  };

  const labelStyle = { fontSize: '0.8rem', marginBottom: '4px' };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: compact ? '8px' : '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={labelStyle}>Send To <span className="req">*</span></label>
          <select
            className="form-select"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            required
          >
            {audiences.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        {isDepartment && !isDepartmentScopedRole && (
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={labelStyle}>Department <span className="req">*</span></label>
            <select
              className="form-select"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
            >
              <option value="">-- Select department --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* For Teacher, Class Teacher, and Class Leader: show their assigned department(s) below as fixed text instead of a dropdown */}
      {isDepartment && isDepartmentScopedRole && (
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--bg-subtle, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>
            Department: <span style={{ color: '#2563eb' }}>{userDeptNames || 'Your Department'}</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
            Notification will be delivered to all active students in <strong>{userDeptNames || 'your department'}</strong>.
          </div>
        </div>
      )}

      {/* Selected Students Selection Section */}
      {isSelectedStudents && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'var(--bg-subtle, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            padding: compact ? '8px' : '12px'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={labelStyle}>
                View Students <span className="req">*</span>
              </label>
              <select
                className="form-select"
                value={studentViewFilter}
                onChange={(e) => setStudentViewFilter(e.target.value)}
              >
                <option value="all">View All Students</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>Department: {d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={labelStyle}>Search Student</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search name, roll no, email..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{ paddingRight: '48px' }}
                />
                {studentSearch && (
                  <button
                    type="button"
                    onClick={() => setStudentSearch('')}
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
            </div>
          </div>

          {/* Selection Counts and Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px',
              fontSize: '0.82rem'
            }}
          >
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {filteredStudents.length} student{filteredStudents.length === 1 ? '' : 's'} displayed
              </span>
              <span
                style={{
                  marginLeft: '8px',
                  fontWeight: 700,
                  color: selectedStudentIds.length ? '#4f46e5' : 'var(--text-muted)'
                }}
              >
                ({selectedStudentIds.length} selected)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSelectAllFiltered}
                disabled={!filteredStudents.length}
                style={{ padding: '3px 8px', fontSize: '0.76rem' }}
              >
                Select All Filtered
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleDeselectAll}
                disabled={!selectedStudentIds.length}
                style={{ padding: '3px 8px', fontSize: '0.76rem' }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Student Checklist Container */}
          <div
            style={{
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '6px',
              maxHeight: compact ? '160px' : '220px',
              overflowY: 'auto',
              background: '#ffffff',
              padding: '4px'
            }}
          >
            {loadingStudents ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                Loading students...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                No students found for this department / search criteria.
              </div>
            ) : (
              filteredStudents.map((st) => {
                const isChecked = selectedStudentIds.includes(st.id);
                return (
                  <div
                    key={st.id}
                    onClick={() => toggleStudentSelection(st.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background: isChecked ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // Handled by row onClick
                      style={{ cursor: 'pointer' }}
                    />
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        minWidth: '55px'
                      }}
                    >
                      {st.roll_number || `#${st.id}`}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)', flex: 1 }}>
                      {st.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '1px 7px',
                        borderRadius: '12px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: '#4338ca',
                        fontWeight: 600
                      }}
                    >
                      {st.department_name || 'General'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {isDepartment && !isDepartmentScopedRole && (isPrincipal || studentsOnly) && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Recipients: all active students of the selected department.
        </div>
      )}

      {isDepartment && !studentsOnly && (
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={labelStyle}>Department Audience</label>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.86rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="notif-dept-scope"
                value="students"
                checked={deptScope === 'students'}
                onChange={() => setDeptScope('students')}
              />
              Students only
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="notif-dept-scope"
                value="all"
                checked={deptScope === 'all'}
                onChange={() => setDeptScope('all')}
              />
              Students + faculty of department
            </label>
          </div>
          {selectedDept && (
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Recipients: all active students of {selectedDept.name}
              {deptScope === 'all' ? ' and its teachers and class teachers' : ''}.
            </div>
          )}
        </div>
      )}

      {audience === 'teacher' && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Recipients: all faculty teachers and class teachers across the institution.
        </div>
      )}

      {audience === 'admin' && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Recipients: college administration and system administrators.
        </div>
      )}

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" style={labelStyle}>Notice Title <span className="req">*</span></label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Midterm Examination Schedule"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={150}
          required
        />
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" style={labelStyle}>Notice Message <span className="req">*</span></label>
        <textarea
          className="form-textarea"
          rows={compact ? 2 : 4}
          placeholder="Type the notice details here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={sending} style={{ minWidth: '180px' }}>
          {sending ? 'Sending...' : '📢 Send Notice'}
        </button>
      </div>
    </form>
  );
};
