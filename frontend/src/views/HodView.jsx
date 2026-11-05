import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { API } from '../api/api';
import { useAuth, formatRoleName, formatUserId } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { StudentsByDepartment } from '../components/StudentsByDepartment';
import { Pagination } from '../components/Pagination';
import { PendingPill } from '../components/ActionPills';

export const HodView = () => {
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [dept, setDept] = useState(null);
  const [deptNotice, setDeptNotice] = useState('');

  // Data
  const [staff, setStaff] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsPage, setStudentsPage] = useState(1);
  const [programs, setPrograms] = useState([]);
  const [activeTab, setActiveTab] = useState('students');
  const [studentSearch, setStudentSearch] = useState('');

  // Forms
  const [editStaff, setEditStaff] = useState({ user_id: '', designation: '', qualification: '' });
  const [editStudent, setEditStudent] = useState({
    user_id: '',
    roll_number: '',
    batch_id: '',
    section_id: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: ''
  });



  // Message teachers
  const [msgTitle, setMsgTitle] = useState('');
  const [msgText, setMsgText] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);

  // Quick modals/tools
  const [showProgAdd, setShowProgAdd] = useState(false);
  const [newProg, setNewProg] = useState({ name: '', degree: 'B.Tech', duration_years: 4 });

  // Pending approvals — HOD sees only their department's pending users
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [showPending, setShowPending] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allDepts, mineRes] = await Promise.all([
        API.getDepartments(),
        API.getMyDepartments()
      ]);

      const deptsList = allDepts.departments || [];
      let myD = deptsList.find(d => d.hod_user_id === user.id);
      if (!myD) {
        const mine = (mineRes.departments || []).find(d => d.relation === 'HOD');
        if (mine) myD = deptsList.find(d => d.id === mine.id);
      }

      if (!myD) {
        const waiting = mineRes.pending || [];
        setDeptNotice(
          waiting.length
            ? `Your department (${waiting[0].name}) is pending College Admin approval.`
            : 'You are not assigned as HOD of any department yet. The Super Admin or College Admin assigns HODs.'
        );
        setLoading(false);
        return;
      }

      setDept(myD);

      const [st, stud, p] = await Promise.all([
        API.getCollegeStaff(),
        API.getCollegeStudents(),
        API.getPrograms()
      ]);

      setStaff(st.staff || []);
      const deptStudents = (stud.students || []).filter(item => !myD || String(item.department_id) === String(myD.id));
      setStudents(deptStudents);
      setPrograms((p.programs || []).filter(item => item.department_id === myD.id));
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [user.id, showAlert]);

  // Load pending approvals for this HOD's department (defined BEFORE useEffect)
  const loadPending = useCallback(async () => {
    try {
      setPendingLoading(true);
      const res = await API.getPendingStudents();
      setPendingUsers(res.pending_students || res.students || []);
    } catch (e) {
      console.warn('Could not load pending users:', e);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadPending();
  }, [loadData, loadPending]);

  // Update staff profile
  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!editStaff.user_id) {
      showAlert('Choose a staff member', 'danger');
      return;
    }
    try {
      const res = await API.updateStaffProfile(editStaff.user_id, {
        department_id: dept.id,
        designation: editStaff.designation.trim() || undefined,
        qualification: editStaff.qualification.trim() || undefined
      });
      showAlert(res.message || 'Staff profile updated', 'success');
      loadData();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Update student profile
  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editStudent.user_id) {
      showAlert('Please select a student account using the checkbox', 'danger');
      return;
    }
    try {
      const payload = {
        roll_number: editStudent.roll_number.trim() || undefined,
        guardian_name: editStudent.guardian_name.trim() || undefined,
        guardian_phone: editStudent.guardian_phone.trim() || undefined,
        guardian_email: editStudent.guardian_email.trim() || undefined
      };
      if (editStudent.batch_id) {
        payload.batch_id = Number(editStudent.batch_id);
      }
      if (editStudent.section_id) {
        payload.section_id = Number(editStudent.section_id);
      }
      const res = await API.updateStudentProfile(editStudent.user_id, payload);
      showAlert(res.message || 'Student profile updated', 'success');
      loadData();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };



  // Message Department Teachers
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgTitle.trim() || !msgText.trim()) {
      showAlert('Title and message are required', 'danger');
      return;
    }
    try {
      setMsgLoading(true);
      const res = await API.sendDepartmentMessage(dept.id, msgTitle.trim(), msgText.trim());
      showAlert(res.message || 'Notification sent to department teachers', 'success');
      setMsgTitle('');
      setMsgText('');
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setMsgLoading(false);
    }
  };

  // Quick Add Program
  const handleAddProgram = async (e) => {
    e.preventDefault();
    try {
      const res = await API.createProgram({
        department_id: dept.id,
        name: newProg.name.trim(),
        degree: newProg.degree.trim(),
        duration_years: Number(newProg.duration_years)
      });
      showAlert(res.message || 'Programme created', 'success');
      setNewProg({ name: '', degree: 'B.Tech', duration_years: 4 });
      setShowProgAdd(false);
      loadData();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Approve pending user
  const handleApprove = async (id) => {
    try {
      const res = await API.approveStudent(id);
      showAlert(res.message || 'Account approved successfully', 'success');
      loadPending();
      loadData();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Reject pending user
  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this registration?')) return;
    try {
      const res = await API.rejectStudent(id);
      showAlert(res.message || 'Registration rejected', 'warning');
      loadPending();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };


  if (loading) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading HOD dashboard...
      </div>
    );
  }

  if (deptNotice) {
    return (
      <div className="alert alert-info">
        <span>{deptNotice}</span>
      </div>
    );
  }



  return (
    <section>
      {/* Header — title on the left, Approval Pending pill on the right */}
      <div className="card-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            HOD Dashboard · {dept.name} ({dept.code})
          </h1>
          <p className="card-description" style={{ fontSize: '0.88rem', margin: '4px 0 0' }}>
            Oversee departmental faculty, student cohort assignments, and broadcast notices to teachers.
          </p>
        </div>
        {/* Approval Pending pill — right side of header */}
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
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

      {/* Tab Navigation */}
      <div className="user-tabs-container" style={{ marginBottom: '16px', gap: '8px' }}>
        <button
          type="button"
          className={`user-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
          style={{ padding: '8px 16px', fontSize: '0.86rem', fontWeight: 700 }}
        >
          🎓 Student Directory &amp; Rosters
        </button>
        <button
          type="button"
          className={`user-tab-btn ${activeTab === 'cohort' ? 'active' : ''}`}
          onClick={() => setActiveTab('cohort')}
          style={{ padding: '8px 16px', fontSize: '0.86rem', fontWeight: 700 }}
        >
          📝 Student Profiles ({students.length})
        </button>
        <button
          type="button"
          className={`user-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
          style={{ padding: '8px 16px', fontSize: '0.86rem', fontWeight: 700 }}
        >
          👨‍🏫 Faculty Staff ({staff.length})
        </button>
        <button
          type="button"
          className={`user-tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
          style={{ padding: '8px 16px', fontSize: '0.86rem', fontWeight: 700 }}
        >
          📢 Message Teachers
        </button>
      </div>

      {/* 0. Student Directory & Rosters */}
      {activeTab === 'students' && (
        <StudentsByDepartment deptId={dept?.id} deptName={dept?.name} lockDepartment={true} showAttendance={false} showSection={false} />
      )}

      {/* 1. Department Staff */}
      {activeTab === 'staff' && (
      <div className="card" style={{ marginBottom: '4px', padding: '6px 10px' }}>
        <h3 style={{ fontSize: '0.98rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
          Department Staff
        </h3>
        <p className="card-description" style={{ marginBottom: '8px' }}>
          Update designations and qualifications of faculty in your department.
        </p>

        <form onSubmit={handleUpdateStaff} style={{ marginBottom: '8px' }}>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Staff Member <span className="req">*</span></label>
              <select
                className="form-select"
                value={editStaff.user_id}
                onChange={(e) => {
                  const uid = e.target.value;
                  const st = staff.find(s => String(s.id) === uid);
                  setEditStaff({
                    user_id: uid,
                    designation: st?.designation || '',
                    qualification: st?.qualification || ''
                  });
                }}
                required
              >
                <option value="">Choose staff member</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({formatRoleName(s.role)})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Designation</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Associate Professor"
                value={editStaff.designation}
                onChange={(e) => setEditStaff({ ...editStaff, designation: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Qualification</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Ph.D, M.Tech"
                value={editStaff.qualification}
                onChange={(e) => setEditStaff({ ...editStaff, qualification: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-sm">
            Save Staff Details
          </button>
        </form>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Designation</th>
                <th>Qualification</th>
              </tr>
            </thead>
            <tbody>
              {staff.length ? (
                staff.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>
                      <span className={`user-role-pill role-${s.role}`}>
                        {formatRoleName(s.role)}
                      </span>
                    </td>
                    <td>{s.designation || '-'}</td>
                    <td>{s.qualification || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No staff in this department yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* 2. Students Assignment without Batch & Section, with checkbox account selection near student name */}
      {activeTab === 'cohort' && (() => {
        const filteredStudents = students.filter(st => {
          if (!studentSearch.trim()) return true;
          const q = studentSearch.toLowerCase();
          return (st.name && st.name.toLowerCase().includes(q)) ||
                 (st.roll_number && st.roll_number.toLowerCase().includes(q)) ||
                 (st.email && st.email.toLowerCase().includes(q));
        });
        const paginatedStudents = filteredStudents.slice((studentsPage - 1) * 10, studentsPage * 10);
        const selectedStudent = students.find(s => String(s.id) === String(editStudent.user_id));

        return (
          <div className="card" style={{ marginBottom: '4px', padding: '10px 14px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '2px', fontWeight: 800 }}>
              Student Profile &amp; Guardian Details
            </h3>
            <p className="card-description" style={{ marginBottom: '12px', fontSize: '0.86rem' }}>
              Select a student account using the checkbox near their name to manage roll numbers and guardian contacts.
            </p>

            {/* Student Update Form without Batch and Section */}
            <form onSubmit={handleUpdateStudent} style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div className="grid-3" style={{ marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Account Selection <span className="req">*</span></label>
                  {selectedStudent ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 12px',
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.35)',
                      borderRadius: '6px',
                      minHeight: '38px'
                    }}>
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => setEditStudent({ user_id: '', roll_number: '', batch_id: '', section_id: '', guardian_name: '', guardian_phone: '', guardian_email: '' })}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#4f46e5' }}
                        title="Uncheck to clear selection"
                      />
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {selectedStudent.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditStudent({ user_id: '', roll_number: '', batch_id: '', section_id: '', guardian_name: '', guardian_phone: '', guardian_email: '' })}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px dashed var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-muted)',
                      fontSize: '0.84rem',
                      minHeight: '38px'
                    }}>
                      <input type="checkbox" disabled style={{ width: '16px', height: '16px', opacity: 0.35 }} />
                      <span>Check student box in table below</span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CS001"
                    value={editStudent.roll_number}
                    onChange={(e) => setEditStudent({ ...editStudent, roll_number: e.target.value })}
                    disabled={!editStudent.user_id}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Guardian Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Mary Doe"
                    value={editStudent.guardian_name}
                    onChange={(e) => setEditStudent({ ...editStudent, guardian_name: e.target.value })}
                    disabled={!editStudent.user_id}
                  />
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Guardian Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 9876543210"
                    value={editStudent.guardian_phone}
                    onChange={(e) => setEditStudent({ ...editStudent, guardian_phone: e.target.value })}
                    disabled={!editStudent.user_id}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Guardian Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. guardian@mail.com"
                    value={editStudent.guardian_email}
                    onChange={(e) => setEditStudent({ ...editStudent, guardian_email: e.target.value })}
                    disabled={!editStudent.user_id}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-sm" disabled={!editStudent.user_id}>
                Save Student Details
              </button>
            </form>

            {/* Student Table with search and checkbox near student name */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Department Students ({filteredStudents.length}):
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ minWidth: '220px', padding: '7px 12px', paddingRight: '48px', fontSize: '0.85rem' }}
                    placeholder="Search student or roll no..."
                    value={studentSearch}
                    onChange={(e) => { setStudentSearch(e.target.value); setStudentsPage(1); }}
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => { setStudentSearch(''); setStudentsPage(1); }}
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

                {studentSearch && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setStudentSearch(''); setStudentsPage(1); }}
                    style={{ padding: '8px 12px' }}
                    title="Clear search filter"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>Select</th>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Guardian Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.length ? (
                    paginatedStudents.map(st => {
                      const isSelected = String(editStudent.user_id) === String(st.id);
                      return (
                        <tr
                          key={st.id}
                          style={{
                            background: isSelected ? 'rgba(99, 102, 241, 0.08)' : undefined,
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setEditStudent({
                                    user_id: '',
                                    roll_number: '',
                                    batch_id: '',
                                    section_id: '',
                                    guardian_name: '',
                                    guardian_phone: '',
                                    guardian_email: ''
                                  });
                                } else {
                                  setEditStudent({
                                    user_id: String(st.id),
                                    roll_number: st.roll_number || '',
                                    batch_id: st.batch_id ? String(st.batch_id) : '',
                                    section_id: st.section_id ? String(st.section_id) : '',
                                    guardian_name: st.guardian_name || '',
                                    guardian_phone: st.guardian_phone || '',
                                    guardian_email: st.guardian_email || ''
                                  });
                                }
                              }}
                              style={{
                                cursor: 'pointer',
                                width: '16px',
                                height: '16px',
                                accentColor: '#4f46e5'
                              }}
                              title={`Select ${st.name}`}
                            />
                          </td>
                          <td><strong>{st.roll_number || '-'}</strong></td>
                          <td>
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                margin: 0
                              }}
                              onClick={() => {
                                if (isSelected) {
                                  setEditStudent({
                                    user_id: '',
                                    roll_number: '',
                                    batch_id: '',
                                    section_id: '',
                                    guardian_name: '',
                                    guardian_phone: '',
                                    guardian_email: ''
                                  });
                                } else {
                                  setEditStudent({
                                    user_id: String(st.id),
                                    roll_number: st.roll_number || '',
                                    batch_id: st.batch_id ? String(st.batch_id) : '',
                                    section_id: st.section_id ? String(st.section_id) : '',
                                    guardian_name: st.guardian_name || '',
                                    guardian_phone: st.guardian_phone || '',
                                    guardian_email: st.guardian_email || ''
                                  });
                                }
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by parent label onClick
                                style={{
                                  cursor: 'pointer',
                                  width: '16px',
                                  height: '16px',
                                  accentColor: '#4f46e5'
                                }}
                              />
                              <strong style={{ color: 'var(--text-primary)' }}>{st.name}</strong>
                              {st.username && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  @{st.username}
                                </span>
                              )}
                            </label>
                          </td>
                          <td>
                            {st.guardian_name ? (
                              <span>
                                {st.guardian_name} {st.guardian_phone || st.guardian_email ? `(${st.guardian_phone || st.guardian_email})` : ''}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                        {studentSearch ? `No students found matching "${studentSearch}".` : 'No students enrolled in this department yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 10 Students per screen Pagination bar */}
            <Pagination
              currentPage={studentsPage}
              totalItems={filteredStudents.length}
              pageSize={10}
              onPageChange={setStudentsPage}
              itemLabel="students"
            />
          </div>
        );
      })()}

      {/* 4. Message Department Teachers */}
      {activeTab === 'messages' && (
      <div className="card" style={{ marginBottom: '4px', padding: '6px 10px' }}>
        <h3 style={{ fontSize: '0.98rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
          Message Department Teachers
        </h3>
        <p className="card-description" style={{ marginBottom: '8px' }}>
          Broadcast a notice to every teacher and class teacher in {dept.name}.
        </p>

        <form onSubmit={handleSendMessage} style={{ maxWidth: '650px' }}>
          <div className="form-group">
            <label className="form-label">Subject / Title <span className="req">*</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Department Faculty Meeting on Friday"
              value={msgTitle}
              onChange={(e) => setMsgTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Message Details <span className="req">*</span></label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Enter meeting agenda or announcement details..."
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={msgLoading}
          >
            {msgLoading ? 'Sending...' : 'Send to Department Teachers'}
          </button>
        </form>
      </div>
      )}

      {/* Pending Approvals Modal — HOD sees only their department's pending users */}
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
              New account registrations from your department waiting for your review.
            </p>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email / Phone</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.length ? (
                    pendingUsers.map((u) => (
                      <tr key={u.id}>
                        <td>{formatUserId(u.id)}</td>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`user-role-pill role-${u.role}`}>{formatRoleName(u.role)}</span>
                        </td>
                        <td>{u.department_name || dept?.name || '-'}</td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleApprove(u.id)}>Approve</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleReject(u.id)}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                        No accounts from your department currently waiting for approval.
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
    </section>
  );
};
