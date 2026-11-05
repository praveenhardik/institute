import React, { useEffect, useState } from 'react';
import { API } from '../api/api';
import { useAlert } from '../context/AlertContext';
import { Pagination } from './Pagination';

export const AttendanceMarking = () => {
  const { showAlert } = useAlert();

  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [period, setPeriod] = useState('1');
  const [loading, setLoading] = useState(false);

  // Roster state
  const [roster, setRoster] = useState(null);
  const [studentStatuses, setStudentStatuses] = useState({});
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    API.getTeacherSubjects()
      .then(res => {
        setSubjects(res.subjects || []);
        if (res.subjects?.length) {
          setSubjectId(String(res.subjects[0].id));
        }
      })
      .catch(() => {});
  }, []);

  const handleLoadStudents = async (e) => {
    e.preventDefault();
    if (!subjectId) {
      showAlert('Please choose a subject', 'danger');
      return;
    }

    try {
      setLoading(true);
      const res = await API.getAttendanceRoster(subjectId, attendanceDate, period);
      setRoster(res);

      const initial = {};
      (res.students || []).forEach(st => {
        initial[st.id] = st.status || 'P'; // Default to Present if not marked
      });
      setStudentStatuses(initial);
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [subjectId, attendanceDate, period]);

  const pageSize = 10;
  const totalStudents = roster?.students?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalStudents / pageSize));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginatedStudents = (roster?.students || []).slice(startIndex, startIndex + pageSize);

  const handleStatusChange = (studentId, status) => {
    setStudentStatuses(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleMarkAll = (status) => {
    if (!roster?.students) return;
    const updated = {};
    roster.students.forEach(st => {
      updated[st.id] = status;
    });
    setStudentStatuses(updated);
  };

  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    if (!roster?.students?.length) return;

    const records = [];
    const missing = [];
    roster.students.forEach(st => {
      const status = studentStatuses[st.id];
      if (status) {
        records.push({ student_id: st.id, status });
      } else {
        missing.push(st.name);
      }
    });

    if (missing.length) {
      showAlert(`Please mark attendance for all students (Missing: ${missing.slice(0, 3).join(', ')})`, 'danger');
      return;
    }

    try {
      setSaving(true);
      const res = await API.saveAttendanceRoster({
        subject_id: Number(subjectId),
        date: attendanceDate,
        period: Number(period),
        records
      });
      showAlert(res.message || 'Attendance saved successfully', 'success');
      // Refresh roster
      const updated = await API.getAttendanceRoster(subjectId, attendanceDate, period);
      setRoster(updated);
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div className="card" style={{ padding: '8px 12px', marginBottom: 0 }}>
      <div className="card-header" style={{ marginBottom: '6px' }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Mark Attendance
          </h2>
          <p className="card-description" style={{ fontSize: '0.76rem', margin: '2px 0 0' }}>
            Mark Present (P), Absent (A), On Duty (OD) or Leave (L). Saved attendance can be modified within 24 hours.
          </p>
        </div>
      </div>

      {!subjects.length ? (
        <div className="alert alert-info">
          <span>No subjects are assigned to you yet. The HOD assigns subjects to teachers.</span>
        </div>
      ) : (
        <>
          <form onSubmit={handleLoadStudents} style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
              <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: '1px' }}>Subject <span className="req">*</span></label>
              <select
                className="form-select"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                style={{ height: '28px', fontSize: '0.78rem' }}
                required
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0, width: '130px' }}>
              <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: '1px' }}>Date <span className="req">*</span></label>
              <input
                type="date"
                className="form-input"
                max={today}
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                style={{ height: '28px', fontSize: '0.78rem' }}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0, width: '110px' }}>
              <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: '1px' }}>Period <span className="req">*</span></label>
              <select
                className="form-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{ height: '28px', fontSize: '0.78rem' }}
                required
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                  <option key={p} value={p}>Period {p}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading}
              style={{ height: '28px', padding: '0 12px', fontSize: '0.76rem', fontWeight: 700 }}
            >
              {loading ? 'Loading...' : 'Load Students'}
            </button>
          </form>

          {roster && (
            <div style={{ animation: 'slideUp 0.3s ease-out' }}>
              {!roster.students?.length ? (
                <div className="alert alert-info">
                  <span>No students are enrolled in this subject yet.</span>
                </div>
              ) : (
                <>
                  {!roster.editable && (
                    <div className="alert alert-warning" style={{ marginBottom: '6px', padding: '4px 10px', fontSize: '0.78rem' }}>
                      <span>{roster.message || 'Attendance for this session is locked.'}</span>
                    </div>
                  )}

                  {roster.editable && (
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleMarkAll('P')}
                        style={{ padding: '2px 8px', fontSize: '0.75rem', height: '24px' }}
                      >
                        All Present (P)
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleMarkAll('A')}
                        style={{ padding: '2px 8px', fontSize: '0.75rem', height: '24px' }}
                      >
                        All Absent (A)
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSaveAttendance}>
                    <div className="table-responsive">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Roll No</th>
                            <th>Name</th>
                            <th>P</th>
                            <th>A</th>
                            <th>OD</th>
                            <th>L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedStudents.map((st, i) => (
                            <tr key={st.id}>
                              <td>{startIndex + i + 1}</td>
                              <td><strong>{st.roll_number || '-'}</strong></td>
                              <td>{st.name}</td>
                              {['P', 'A', 'OD', 'L'].map(v => (
                                <td key={v}>
                                  <label style={{ cursor: roster.editable ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input
                                      type="radio"
                                      name={`st-${st.id}`}
                                      value={v}
                                      checked={studentStatuses[st.id] === v}
                                      onChange={() => handleStatusChange(st.id, v)}
                                      disabled={!roster.editable}
                                    />
                                    <span style={{
                                      color: v === 'P' ? '#10b981' : v === 'A' ? '#ef4444' : v === 'OD' ? '#0284c7' : '#fbbf24',
                                      fontWeight: studentStatuses[st.id] === v ? 700 : 400
                                    }}>
                                      {v}
                                    </span>
                                  </label>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 10 Students per screen Pagination bar */}
                    <Pagination
                      currentPage={activePage}
                      totalItems={totalStudents}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      itemLabel="students"
                    />

                    {roster.editable && (
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ marginTop: '16px', padding: '10px 24px' }}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Attendance'}
                      </button>
                    )}
                  </form>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
