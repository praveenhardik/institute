import React, { useEffect, useState, useCallback } from 'react';
import { API } from '../api/api';
import { useAlert } from '../context/AlertContext';
import { formatRoleName } from '../context/AuthContext';

export const CollegeSetup = ({ canManage = true }) => {
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [deptRequests, setDeptRequests] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [staff, setStaff] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [deptTeachers, setDeptTeachers] = useState(null);

  // Forms states
  const [newYear, setNewYear] = useState({ name: '', start_date: '', end_date: '' });
  const [newSem, setNewSem] = useState({ academic_year_id: '', name: '', start_date: '', end_date: '' });
  const [newDept, setNewDept] = useState({ name: '', code: '' });
  const [newProg, setNewProg] = useState({ department_id: '', name: '', degree: '', duration_years: 4 });
  
  // Batch form
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [newBatch, setNewBatch] = useState({ program_id: '', name: '', department_id: '', program_name: '', degree: 'B.Tech', duration_years: 4 });
  const [isNewProgForBatch, setIsNewProgForBatch] = useState(false);

  // Section form
  const [showSecAdd, setShowSecAdd] = useState(false);
  const [newSec, setNewSec] = useState({ batch_id: '', name: '' });

  // Holiday form
  const [newHol, setNewHol] = useState({ holiday_date: '', name: '' });

  // Selected HODs mapping
  const [selectedHods, setSelectedHods] = useState({});

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [y, s, d, p, b, sec, h, st, sh, reqs, dt] = await Promise.all([
        API.getAcademicYears(),
        API.getSemesters(),
        API.getDepartments(),
        API.getPrograms(),
        API.getBatches(),
        API.getSections(),
        API.getHolidays(),
        API.getCollegeStaff(),
        API.getAttendanceShortages(),
        API.getDepartmentRequests().catch(() => ({ requests: [] })),
        API.getDepartmentTeachers().catch(() => null)
      ]);

      setYears(y.years || []);
      setSemesters(s.semesters || []);
      setDepartments(d.departments || []);
      setPrograms(p.programs || []);
      setBatches(b.batches || []);
      setSections(sec.sections || []);
      setHolidays(h.holidays || []);
      setStaff(st.staff || []);
      setShortages(sh.shortages || []);
      setDeptRequests(reqs.requests || []);
      setDeptTeachers(dt);

      const hodMap = {};
      (d.departments || []).forEach(dept => {
        if (dept.hod_user_id) hodMap[dept.id] = dept.hod_user_id;
      });
      setSelectedHods(hodMap);
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const hodsList = staff.filter(s => s.role === 'hod');

  // Add Year
  const handleAddYear = async (e) => {
    e.preventDefault();
    if (!newYear.name || !newYear.start_date || !newYear.end_date) {
      showAlert('All academic year fields are required', 'danger');
      return;
    }
    try {
      const res = await API.createAcademicYear(newYear);
      showAlert(res.message || 'Academic year created', 'success');
      setNewYear({ name: '', start_date: '', end_date: '' });
      loadAll();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Add Semester
  const handleAddSem = async (e) => {
    e.preventDefault();
    if (!newSem.academic_year_id || !newSem.name || !newSem.start_date || !newSem.end_date) {
      showAlert('All semester fields are required', 'danger');
      return;
    }
    try {
      const res = await API.createSemester({
        ...newSem,
        academic_year_id: Number(newSem.academic_year_id)
      });
      showAlert(res.message || 'Semester created', 'success');
      setNewSem({ academic_year_id: '', name: '', start_date: '', end_date: '' });
      loadAll();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Add Department
  const handleAddDept = async (e) => {
    e.preventDefault();
    if (departments.length >= 10) {
      showAlert('Maximum limit of 10 departments reached for this college', 'warning');
      return;
    }
    if (!newDept.name || !newDept.code) {
      showAlert('Department name and code are required', 'danger');
      return;
    }
    try {
      const res = await API.createDepartment(newDept);
      showAlert(res.message || 'Department created', 'success');
      setNewDept({ name: '', code: '' });
      loadAll();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Assign HOD
  const handleAssignHod = async (deptId) => {
    const hodUserId = selectedHods[deptId];
    try {
      const res = await API.assignHod(deptId, hodUserId ? Number(hodUserId) : null);
      showAlert(res.message || 'HOD updated successfully', 'success');
      loadAll();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Approve / Reject Department Request
  const handleDeptRequest = async (reqId, decision) => {
    try {
      const res = decision === 'approve'
        ? await API.approveDepartmentRequest(reqId)
        : await API.rejectDepartmentRequest(reqId);
      showAlert(res.message || `Department request ${decision}d`, 'success');
      loadAll();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Add Program
  const handleAddProgram = async (e) => {
    e.preventDefault();
    if (!newProg.department_id || !newProg.name || !newProg.degree) {
      showAlert('All programme fields are required', 'danger');
      return;
    }
    try {
      const res = await API.createProgram({
        ...newProg,
        department_id: Number(newProg.department_id),
        duration_years: Number(newProg.duration_years)
      });
      showAlert(res.message || 'Programme created', 'success');
      setNewProg({ department_id: '', name: '', degree: '', duration_years: 4 });
      loadAll();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Add Batch
  const handleAddBatch = async (e) => {
    e.preventDefault();
    if (!newBatch.name) {
      showAlert('Batch name is required', 'danger');
      return;
    }
    if (isNewProgForBatch && (!newBatch.department_id || !newBatch.program_name || !newBatch.degree)) {
      showAlert('New programme details are required', 'danger');
      return;
    }
    if (!isNewProgForBatch && !newBatch.program_id) {
      showAlert('Select a programme for the batch', 'danger');
      return;
    }

    try {
      const payload = {
        name: newBatch.name,
        program_id: isNewProgForBatch ? undefined : Number(newBatch.program_id),
        department_id: isNewProgForBatch ? Number(newBatch.department_id) : undefined,
        program_name: isNewProgForBatch ? newBatch.program_name : undefined,
        degree: isNewProgForBatch ? newBatch.degree : undefined,
        duration_years: isNewProgForBatch ? Number(newBatch.duration_years) : undefined
      };
      const res = await API.createBatch(payload);
      showAlert(res.message || 'Batch created', 'success');
      setNewBatch({ program_id: '', name: '', department_id: '', program_name: '', degree: 'B.Tech', duration_years: 4 });
      setIsNewProgForBatch(false);
      setShowBatchAdd(false);
      loadAll();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Add Section
  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!newSec.batch_id || !newSec.name) {
      showAlert('Batch and section name are required', 'danger');
      return;
    }
    try {
      const res = await API.createSection({
        batch_id: Number(newSec.batch_id),
        name: newSec.name
      });
      showAlert(res.message || 'Section created', 'success');
      setNewSec({ batch_id: '', name: '' });
      setShowSecAdd(false);
      loadAll();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Delete Batch
  const handleDeleteBatch = async (batch) => {
    if (!window.confirm(`Are you sure you want to completely delete batch "${batch.name}"?\n\nThis will permanently delete this batch, all its sections, and detach enrolled students from it. This cannot be undone.`)) {
      return;
    }
    try {
      const res = await API.deleteBatch(batch.id);
      showAlert(res.message || 'Batch deleted completely', 'success');
      loadAll();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Delete Section
  const handleDeleteSection = async (section) => {
    if (!window.confirm(`Are you sure you want to permanently delete section "${section.name}"?\n\nThis will permanently remove this section and detach enrolled students from it. This cannot be undone.`)) {
      return;
    }
    try {
      const res = await API.deleteSection(section.id);
      showAlert(res.message || 'Section deleted permanently', 'success');
      loadAll();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Add Holiday
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHol.holiday_date || !newHol.name) {
      showAlert('Holiday date and name are required', 'danger');
      return;
    }
    try {
      const res = await API.createHoliday(newHol);
      showAlert(res.message || 'Holiday added', 'success');
      setNewHol({ holiday_date: '', name: '' });
      loadAll();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading college setup details...
      </div>
    );
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            College Academic Setup
          </h2>
          <p className="card-description">
            Configure academic years, semesters, departments, programmes, batches, sections, and holidays.
          </p>
        </div>
      </div>

      {/* 1. Academic Years */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
          Academic Years
        </h3>
        {canManage && (
          <form onSubmit={handleAddYear} style={{ marginBottom: '16px' }}>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Name <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 2026-27"
                  value={newYear.name}
                  onChange={(e) => setNewYear({ ...newYear, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Start Date <span className="req">*</span></label>
                <input
                  type="date"
                  className="form-input"
                  value={newYear.start_date}
                  onChange={(e) => setNewYear({ ...newYear, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date <span className="req">*</span></label>
                <input
                  type="date"
                  className="form-input"
                  value={newYear.end_date}
                  onChange={(e) => setNewYear({ ...newYear, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Add Academic Year
            </button>
          </form>
        )}

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Start Date</th>
                <th>End Date</th>
              </tr>
            </thead>
            <tbody>
              {years.length ? (
                years.map(y => (
                  <tr key={y.id}>
                    <td><strong>{y.name}</strong></td>
                    <td>{y.start_date}</td>
                    <td>{y.end_date}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No academic years yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Semesters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
          Semesters
        </h3>
        {canManage && (
          <form onSubmit={handleAddSem} style={{ marginBottom: '16px' }}>
            <div className="grid-4">
              <div className="form-group">
                <label className="form-label">Academic Year <span className="req">*</span></label>
                <select
                  className="form-select"
                  value={newSem.academic_year_id}
                  onChange={(e) => setNewSem({ ...newSem, academic_year_id: e.target.value })}
                  required
                >
                  <option value="">Choose academic year</option>
                  {years.map(y => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Semester Name <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Semester 1"
                  value={newSem.name}
                  onChange={(e) => setNewSem({ ...newSem, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Start Date <span className="req">*</span></label>
                <input
                  type="date"
                  className="form-input"
                  value={newSem.start_date}
                  onChange={(e) => setNewSem({ ...newSem, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date <span className="req">*</span></label>
                <input
                  type="date"
                  className="form-input"
                  value={newSem.end_date}
                  onChange={(e) => setNewSem({ ...newSem, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Add Semester
            </button>
          </form>
        )}

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Semester</th>
                <th>Academic Year</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {semesters.length ? (
                semesters.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.academic_year}</td>
                    <td>{s.start_date} → {s.end_date}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No semesters yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Departments & HODs */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
            Departments & HODs
          </h3>
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: '12px',
            background: departments.length >= 10 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
            color: departments.length >= 10 ? '#fca5a5' : '#4338ca',
            border: `1px solid ${departments.length >= 10 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`
          }}>
            {departments.length} / 10 Departments
          </span>
        </div>
        <p className="card-description" style={{ marginBottom: '14px' }}>
          Each department has a designated Head of Department (HOD) managing faculty and students. Up to 10 departments maximum per college.
        </p>

        {canManage && (
          departments.length >= 10 ? (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '6px',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '16px'
            }}>
              Maximum limit of 10 departments reached for this institution.
            </div>
          ) : (
            <form onSubmit={handleAddDept} style={{ marginBottom: '16px' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Department Name <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Computer Science Engineering"
                    value={newDept.name}
                    onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Code <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CSE"
                    value={newDept.code}
                    onChange={(e) => setNewDept({ ...newDept, code: e.target.value })}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                Add Department
              </button>
            </form>
          )
        )}

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Code</th>
                <th>HOD</th>
                {canManage && <th>Assign HOD</th>}
              </tr>
            </thead>
            <tbody>
              {departments.length ? (
                departments.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.name}</strong></td>
                    <td><span className="status-pill">{d.code}</span></td>
                    <td>{d.hod_name || <span style={{ color: 'var(--text-muted)' }}>Not assigned</span>}</td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select
                            className="form-select"
                            style={{ maxWidth: '200px' }}
                            value={selectedHods[d.id] || ''}
                            onChange={(e) => setSelectedHods({ ...selectedHods, [d.id]: e.target.value })}
                          >
                            <option value="">No HOD</option>
                            {hodsList.map(h => (
                              <option key={h.id} value={h.id}>{h.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleAssignHod(d.id)}
                          >
                            Assign
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No departments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Department Requests */}
      {deptRequests.length > 0 && (
        <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #f59e0b' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
            New Department Requests
          </h3>
          <p className="card-description" style={{ marginBottom: '14px' }}>
            Staff accounts requesting new departments. Approve to register the department.
          </p>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Staff Member</th>
                  <th>Requested By</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {deptRequests.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.name} ({r.code})</strong></td>
                    <td>{r.requested_user_name || '-'}</td>
                    <td>{r.requested_by_name || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleDeptRequest(r.id, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDeptRequest(r.id, 'reject')}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Programmes */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
          Programmes
        </h3>
        {canManage && (
          <form onSubmit={handleAddProgram} style={{ marginBottom: '16px' }}>
            <div className="grid-4">
              <div className="form-group">
                <label className="form-label">Department <span className="req">*</span></label>
                <select
                  className="form-select"
                  value={newProg.department_id}
                  onChange={(e) => setNewProg({ ...newProg, department_id: e.target.value })}
                  required
                >
                  <option value="">Choose department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Programme Name <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. B.Tech Computer Science"
                  value={newProg.name}
                  onChange={(e) => setNewProg({ ...newProg, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Degree <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. B.Tech"
                  value={newProg.degree}
                  onChange={(e) => setNewProg({ ...newProg, degree: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (Years) <span className="req">*</span></label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  className="form-input"
                  value={newProg.duration_years}
                  onChange={(e) => setNewProg({ ...newProg, duration_years: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Add Programme
            </button>
          </form>
        )}

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Programme</th>
                <th>Degree</th>
                <th>Duration</th>
                <th>Department</th>
              </tr>
            </thead>
            <tbody>
              {programs.length ? (
                programs.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.degree}</td>
                    <td>{p.duration_years} years</td>
                    <td>{p.department_name}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No programmes yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Batches */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Batches</h3>
            <p className="card-description">Intake batches (e.g. 2026-2030)</p>
          </div>
          {canManage && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowBatchAdd(p => !p)}
              style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', fontSize: '1.2rem', lineHeight: 1 }}
              title="Add a new batch"
            >
              +
            </button>
          )}
        </div>

        {showBatchAdd && canManage && (
          <form onSubmit={handleAddBatch} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Programme <span className="req">*</span></label>
                <select
                  className="form-select"
                  value={isNewProgForBatch ? 'new' : newBatch.program_id}
                  onChange={(e) => {
                    if (e.target.value === 'new') {
                      setIsNewProgForBatch(true);
                      setNewBatch({ ...newBatch, program_id: '' });
                    } else {
                      setIsNewProgForBatch(false);
                      setNewBatch({ ...newBatch, program_id: e.target.value });
                    }
                  }}
                  required
                >
                  <option value="">Choose programme</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name} · {p.department_name}</option>
                  ))}
                  <option value="new">New programme</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Batch Name <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 2026-2030"
                  value={newBatch.name}
                  onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
                  required
                />
              </div>
            </div>

            {isNewProgForBatch && (
              <div className="grid-3" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
                <div className="form-group">
                  <label className="form-label">Department <span className="req">*</span></label>
                  <select
                    className="form-select"
                    value={newBatch.department_id}
                    onChange={(e) => setNewBatch({ ...newBatch, department_id: e.target.value })}
                    required
                  >
                    <option value="">Choose department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Programme Name <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. B.Tech AI"
                    value={newBatch.program_name}
                    onChange={(e) => setNewBatch({ ...newBatch, program_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Degree <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. B.Tech"
                    value={newBatch.degree}
                    onChange={(e) => setNewBatch({ ...newBatch, degree: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}>
              Create Batch
            </button>
          </form>
        )}

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Programme</th>
                <th>Department</th>
                {canManage && <th style={{ width: '90px', textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {batches.length ? (
                batches.map(b => (
                  <tr key={b.id}>
                    <td><strong>{b.name}</strong></td>
                    <td>{b.program_name}</td>
                    <td>{b.department_name}</td>
                    {canManage && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            background: 'rgba(239, 68, 68, 0.18)',
                            color: '#f87171',
                            border: '1px solid #ef4444',
                            fontWeight: 600,
                            padding: '4px 12px',
                            fontSize: '0.8rem'
                          }}
                          onClick={() => handleDeleteBatch(b)}
                          title={`Delete batch "${b.name}" permanently`}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={canManage ? 4 : 3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No batches yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Sections */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Sections</h3>
            <p className="card-description">Class sections for batches</p>
          </div>
          {canManage && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowSecAdd(p => !p)}
              style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', fontSize: '1.2rem', lineHeight: 1 }}
              title="Add a new section"
            >
              +
            </button>
          )}
        </div>

        {showSecAdd && canManage && (
          <form onSubmit={handleAddSection} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div className="grid-2">
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Batch <span className="req">*</span></label>
                  {canManage && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowBatchAdd(p => !p)}
                      style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      title="Add new batch"
                    >
                      + ADD Batch
                    </button>
                  )}
                </div>
                <select
                  className="form-select"
                  value={newSec.batch_id}
                  onChange={(e) => setNewSec({ ...newSec, batch_id: e.target.value })}
                  required
                >
                  <option value="">Choose batch</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} · {b.program_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Section Name <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. A"
                  value={newSec.name}
                  onChange={(e) => setNewSec({ ...newSec, name: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}>
              Create Section
            </button>
          </form>
        )}

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Section</th>
                {canManage && <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sections.length ? (
                sections.map(s => (
                  <tr key={s.id}>
                    <td>{s.batch_name}</td>
                    <td><strong>Section {s.name}</strong></td>
                    {canManage && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            background: 'rgba(239, 68, 68, 0.18)',
                            color: '#f87171',
                            border: '1px solid #ef4444',
                            fontWeight: 600,
                            padding: '4px 12px',
                            fontSize: '0.8rem'
                          }}
                          onClick={() => handleDeleteSection(s)}
                          title={`Delete section "${s.name}" permanently`}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={canManage ? 3 : 2} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No sections yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Holidays */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
          Holidays
        </h3>
        {canManage && (
          <form onSubmit={handleAddHoliday} style={{ marginBottom: '16px' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Date <span className="req">*</span></label>
                <input
                  type="date"
                  className="form-input"
                  value={newHol.holiday_date}
                  onChange={(e) => setNewHol({ ...newHol, holiday_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Holiday Name <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Republic Day"
                  value={newHol.name}
                  onChange={(e) => setNewHol({ ...newHol, name: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Add Holiday
            </button>
          </form>
        )}

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Holiday</th>
              </tr>
            </thead>
            <tbody>
              {holidays.length ? (
                holidays.map(h => (
                  <tr key={h.id}>
                    <td>{h.holiday_date}</td>
                    <td><strong>{h.name}</strong></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No holidays yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 9. Attendance Shortages */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
          Attendance Shortages (&lt; 75%)
        </h3>
        <p className="card-description" style={{ marginBottom: '14px' }}>
          Students falling below minimum attendance requirements across subjects.
        </p>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Section</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {shortages.length ? (
                shortages.map(st => (
                  <tr key={st.id}>
                    <td>{st.roll_number || '-'}</td>
                    <td><strong>{st.name}</strong></td>
                    <td>{st.section_name || '-'}</td>
                    <td>
                      <span className="status-pill" style={{ color: '#fca5a5', borderColor: '#fca5a5' }}>
                        {st.percentage != null ? `${st.percentage}%` : 'No classes'} · Shortage
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: '#10b981', padding: '16px' }}>
                    No student is below 75% attendance.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
