import React, { useEffect, useState, useCallback } from 'react';
import { API } from '../api/api';
import { useAlert } from '../context/AlertContext';
import { Pagination } from './Pagination';

const MINIMUM_FEE = 10000;

export const AccountantFees = () => {
  const { showAlert } = useAlert();

  // Summary metrics
  const [summary, setSummary] = useState({
    overall_fees: 0,
    collected_fees: 0,
    pending_fees: 0,
    total_students: 0,
    paid_students: 0,
    unpaid_students: 0,
    partial_students: 0,
    collection_rate: 0
  });
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Student list
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unpaid' | 'partial' | 'paid'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Fee entry form (Set bulk or department fee)
  const [bulkFeeAmount, setBulkFeeAmount] = useState('15000');
  const [bulkTargetDeptId, setBulkTargetDeptId] = useState('');
  const [settingBulkFee, setSettingBulkFee] = useState(false);
  const [showConfigureFee, setShowConfigureFee] = useState(false);

  // Action in progress (studentId and target status being toggled)
  const [togglingStudentId, setTogglingStudentId] = useState(null);
  const [togglingTarget, setTogglingTarget] = useState(null);

  // Paid Partial Amount state
  const [partialInputs, setPartialInputs] = useState({});
  const [editingPartial, setEditingPartial] = useState({});
  const [savingPartialId, setSavingPartialId] = useState(null);

  // Load summary
  const loadSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const res = await API.getFeesSummary();
      setSummary({
        overall_fees: res.overall_fees || 0,
        collected_fees: res.collected_fees || 0,
        pending_fees: res.pending_fees || 0,
        total_students: res.total_students || 0,
        paid_students: res.paid_students || 0,
        unpaid_students: res.unpaid_students || 0,
        partial_students: res.partial_students || 0,
        collection_rate: res.collection_rate || 0
      });
    } catch (e) {
      console.warn('Could not load fees summary:', e);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // Load departments
  const loadDepartments = useCallback(async () => {
    try {
      setDepartments([]);
      const res = await API.getDepartments();
      setDepartments(res.departments || []);
    } catch (e) {
      console.warn('Could not load departments:', e);
    }
  }, []);

  // Load student fees list
  const loadStudents = useCallback(async () => {
    try {
      setLoadingStudents(true);
      const statusParam = activeTab === 'all' ? '' : activeTab;
      const res = await API.getStudentFees({
        search: searchQuery.trim(),
        status: statusParam,
        departmentId: selectedDeptId
      });
      setStudents(res.students || []);
    } catch (e) {
      console.warn('Could not load student fees:', e);
    } finally {
      setLoadingStudents(false);
    }
  }, [activeTab, searchQuery, selectedDeptId]);

  useEffect(() => {
    loadSummary();
    loadDepartments();
  }, [loadSummary, loadDepartments]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Handle direct Paid or Not Paid button click
  const handleSetFeeStatus = async (student, targetStatus) => {
    if (student.status === targetStatus) {
      showAlert(`Student '${student.student_name}' is already marked as ${targetStatus.toUpperCase()}.`, 'info');
      return;
    }

    try {
      setTogglingStudentId(student.student_id);
      setTogglingTarget(targetStatus);
      const res = await API.toggleStudentFeeStatus(student.student_id, targetStatus);
      
      showAlert(res.message || `Fee status updated to ${targetStatus.toUpperCase()}`, 'success');

      // Update student locally for immediate responsiveness
      setStudents(prev =>
        prev.map(s => {
          if (s.student_id === student.student_id) {
            const isNowPaid = res.status === 'paid';
            return {
              ...s,
              status: res.status,
              paid_amount: isNowPaid ? s.fee_amount : 0,
              pending_amount: isNowPaid ? 0 : s.fee_amount,
              paid_at: isNowPaid ? new Date().toISOString() : null
            };
          }
          return s;
        })
      );

      // Synchronize partial input state
      setPartialInputs(prev => ({
        ...prev,
        [student.student_id]: targetStatus === 'paid' ? String(student.fee_amount) : '0'
      }));
      setEditingPartial(prev => ({ ...prev, [student.student_id]: targetStatus !== 'paid' }));

      // Refresh overall summary metrics
      loadSummary();
    } catch (e) {
      showAlert(e.message || 'Failed to update fee status', 'danger');
    } finally {
      setTogglingStudentId(null);
      setTogglingTarget(null);
    }
  };

  // Handle partial amount input change
  const handlePartialInputChange = (studentId, val) => {
    setPartialInputs(prev => ({ ...prev, [studentId]: val }));
  };

  // Click "Edit" option: enable entering number and switch button to Done
  const handleStartEditPartial = (student) => {
    setEditingPartial(prev => ({ ...prev, [student.student_id]: true }));
    setPartialInputs(prev => ({
      ...prev,
      [student.student_id]: prev[student.student_id] !== undefined
        ? prev[student.student_id]
        : (student.paid_amount !== undefined && student.paid_amount !== null ? String(student.paid_amount) : '')
    }));
  };

  // Click "Done" option: save the partial amount entered
  const handleSavePartialAmount = async (student) => {
    const rawVal = partialInputs[student.student_id] !== undefined
      ? partialInputs[student.student_id]
      : (student.paid_amount !== undefined && student.paid_amount !== null ? String(student.paid_amount) : '');

    const numVal = Number(rawVal);
    if (isNaN(numVal) || numVal < 0) {
      showAlert('Please enter a valid partial fee amount (₹0 or greater).', 'danger');
      return;
    }

    if (numVal > student.fee_amount) {
      showAlert(`Partial amount cannot exceed the total fee of ₹${student.fee_amount.toLocaleString('en-IN')}.`, 'danger');
      return;
    }

    try {
      setSavingPartialId(student.student_id);
      const res = await API.recordPartialFeePayment(student.student_id, numVal);
      showAlert(res.message || 'Partial fee payment recorded successfully!', 'success');

      // Update student locally in list
      setStudents(prev =>
        prev.map(s => {
          if (s.student_id === student.student_id) {
            return {
              ...s,
              paid_amount: res.paid_amount,
              status: res.status,
              pending_amount: res.pending_amount,
              paid_at: res.paid_at || s.paid_at
            };
          }
          return s;
        })
      );

      // Lock input and switch button to Edit
      setEditingPartial(prev => ({ ...prev, [student.student_id]: false }));
      setPartialInputs(prev => ({ ...prev, [student.student_id]: String(res.paid_amount) }));

      loadSummary();
    } catch (e) {
      showAlert(e.message || 'Failed to record partial payment', 'danger');
    } finally {
      setSavingPartialId(null);
    }
  };

  // Submit bulk or department fee structure
  const handleSetBulkFee = async (e) => {
    e.preventDefault();
    const numAmount = Number(bulkFeeAmount);
    if (isNaN(numAmount) || numAmount < MINIMUM_FEE) {
      showAlert(`Policy Error: Fee amount must be at least ₹${MINIMUM_FEE.toLocaleString('en-IN')}`, 'danger');
      return;
    }

    try {
      setSettingBulkFee(true);
      const res = await API.setBulkFee(numAmount, bulkTargetDeptId || null);
      showAlert(res.message || 'Tuition fee structure applied successfully!', 'success');
      loadSummary();
      loadStudents();
    } catch (e) {
      showAlert(e.message || 'Failed to set fee structure', 'danger');
    } finally {
      setSettingBulkFee(false);
    }
  };

  // Reset pagination to first page when any search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedDeptId]);

  // Filtered displayed students in case of local search
  const displayedStudents = students.filter(s => {
    if (activeTab === 'paid' && s.status !== 'paid') return false;
    if (activeTab === 'unpaid' && s.status !== 'unpaid') return false;
    if (activeTab === 'partial' && s.status !== 'partial') return false;
    if (selectedDeptId && String(s.department_id) !== String(selectedDeptId)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (s.student_name && s.student_name.toLowerCase().includes(q)) ||
      (s.roll_number && s.roll_number.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.username && s.username.toLowerCase().includes(q)) ||
      (s.department_name && s.department_name.toLowerCase().includes(q))
    );
  });

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(displayedStudents.length / pageSize));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginatedStudents = displayedStudents.slice(startIndex, startIndex + pageSize);

  const isBulkFeeValid = Number(bulkFeeAmount) >= MINIMUM_FEE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Metrics Strip */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.80rem', textTransform: 'uppercase', color: '#4f46e5', fontWeight: 800 }}>Overall: </span>
            <strong style={{ fontSize: '1.15rem', color: '#090d16' }}>₹{summary.overall_fees.toLocaleString('en-IN')}</strong>
            <span style={{ fontSize: '0.80rem', color: '#64748b', marginLeft: '4px' }}>({summary.total_students})</span>
          </div>
          <div>
            <span style={{ fontSize: '0.80rem', textTransform: 'uppercase', color: '#b45309', fontWeight: 800 }}>Pending: </span>
            <strong style={{ fontSize: '1.15rem', color: '#b45309' }}>₹{summary.pending_fees.toLocaleString('en-IN')}</strong>
            <span style={{ fontSize: '0.80rem', color: '#b45309', marginLeft: '4px' }}>
              ({summary.unpaid_students} unpaid{summary.partial_students > 0 ? `, ${summary.partial_students} partial` : ''})
            </span>
          </div>
          <div>
            <span style={{ fontSize: '0.80rem', textTransform: 'uppercase', color: '#059669', fontWeight: 800 }}>Collected: </span>
            <strong style={{ fontSize: '1.15rem', color: '#059669' }}>₹{summary.collected_fees.toLocaleString('en-IN')}</strong>
            <span style={{ fontSize: '0.80rem', color: '#059669', marginLeft: '4px' }}>({summary.paid_students} full)</span>
          </div>
          <div>
            <span style={{ fontSize: '0.80rem', textTransform: 'uppercase', color: '#334155', fontWeight: 800 }}>Rate: </span>
            <strong style={{ fontSize: '1.15rem', color: '#090d16' }}>{summary.collection_rate}%</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowConfigureFee(p => !p)}
            style={{ padding: '6px 14px', fontSize: '0.84rem', height: '34px' }}
          >
            {showConfigureFee ? '▲ Hide Fee Form' : '⚙ Set Tuition Fee'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              loadSummary();
              loadStudents();
            }}
            disabled={loadingSummary || loadingStudents}
            style={{ padding: '6px 14px', fontSize: '0.84rem', height: '34px' }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Optional Collapsible Fee Form */}
      {showConfigureFee && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 0 }}>
          <div className="card-title" style={{ fontSize: '1.05rem', marginBottom: '8px' }}>
            Configure Student Tuition Fees (Min. ₹10,000)
          </div>
          <form onSubmit={handleSetBulkFee}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.84rem' }}>Target Department</label>
                <select
                  className="form-select"
                  value={bulkTargetDeptId}
                  onChange={(e) => setBulkTargetDeptId(e.target.value)}
                  style={{ height: '38px', fontSize: '0.88rem' }}
                >
                  <option value="">All Students Across College</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.84rem' }}>Tuition Fee Amount (₹)</label>
                <input
                  type="number"
                  min="10000"
                  step="500"
                  className="form-input"
                  style={{ height: '38px', fontSize: '0.88rem' }}
                  value={bulkFeeAmount}
                  onChange={(e) => setBulkFeeAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={settingBulkFee || !isBulkFeeValid}
                  style={{ height: '38px', padding: '0 16px', fontSize: '0.88rem', fontWeight: 700 }}
                >
                  {settingBulkFee ? 'Saving...' : 'Apply Fee Structure'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Student Fees Directory & Payment Status Manager */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
          <div>
            <div className="card-title">
              Student Fee Ledger & Status Controller
            </div>
            <p className="card-description">
              View all student fee accounts, update tuition amounts, and toggle payment statuses between Paid and Not Paid.
            </p>
          </div>

          {/* Search & Department Filters */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search name, roll no, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ minWidth: '240px', padding: '7px 12px', paddingRight: '48px', fontSize: '0.88rem' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
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

            {(searchQuery || selectedDeptId) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDeptId('');
                }}
                style={{ padding: '8px 12px' }}
                title="Clear search filter"
              >
                Reset
              </button>
            )}

            <select
              className="form-select"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              style={{ width: 'auto', padding: '7px 12px', fontSize: '0.85rem' }}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="user-tabs-wrapper" style={{ marginTop: 0 }}>
          <div className="user-tabs-container" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              className={`user-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span className="user-tab-label">All Students</span>
              <span className="user-tab-badge">{summary.total_students}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'unpaid'}
              className={`user-tab-btn ${activeTab === 'unpaid' ? 'active' : ''}`}
              onClick={() => setActiveTab('unpaid')}
            >
              <span className="user-tab-label">Unpaid Fees</span>
              <span className="user-tab-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#b91c1c' }}>
                {summary.unpaid_students}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'partial'}
              className={`user-tab-btn ${activeTab === 'partial' ? 'active' : ''}`}
              onClick={() => setActiveTab('partial')}
            >
              <span className="user-tab-label">Partial Paid</span>
              <span className="user-tab-badge" style={{ background: 'rgba(245, 158, 11, 0.25)', color: '#b45309' }}>
                {summary.partial_students || 0}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'paid'}
              className={`user-tab-btn ${activeTab === 'paid' ? 'active' : ''}`}
              onClick={() => setActiveTab('paid')}
            >
              <span className="user-tab-label">Collected / Paid</span>
              <span className="user-tab-badge" style={{ background: 'rgba(16, 185, 129, 0.3)', color: '#047857' }}>
                {summary.paid_students}
              </span>
            </button>
          </div>
        </div>

        {/* Table of Students & Fee Actions */}
        <div className="table-responsive">
          <table className="custom-table" style={{ minWidth: '1040px' }}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Roll Number</th>
                  <th>Department</th>
                  <th>Fee Amount</th>
                  <th>Payment Status</th>
                  <th>Settled Date</th>
                  <th style={{ minWidth: '180px' }}>Payment Action</th>
                  <th style={{ minWidth: '220px' }}>Paid Partial Amount</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.length ? (
                  paginatedStudents.map(st => {
                    const isPaid = st.status === 'paid';
                    const isPartial = st.status === 'partial';
                    const isToggling = togglingStudentId === st.student_id;
                    const isSavingPartial = savingPartialId === st.student_id;

                    // Partial amount entered / recorded
                    const partialVal = partialInputs[st.student_id] !== undefined
                      ? partialInputs[st.student_id]
                      : (st.paid_amount !== undefined && st.paid_amount !== null ? String(st.paid_amount) : '');

                    // In edit mode: if explicitly toggled in editingPartial use it; otherwise if paid_amount is 0 or unrecorded, default to editable
                    const isEditingPartial = editingPartial[st.student_id] !== undefined
                      ? editingPartial[st.student_id]
                      : (!st.paid_amount || st.paid_amount === 0);

                    return (
                      <tr key={st.student_id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.96rem' }}>
                            {st.student_name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            @{st.username || 'user'} • {st.email}
                          </div>
                        </td>
                        <td>
                          <span style={{ color: '#1e293b', fontWeight: 700, fontSize: '0.9rem' }}>
                            {st.roll_number || `REG-${st.student_id}`}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 600 }}>
                            {st.department_name || '-'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: '1.02rem', color: 'var(--text-primary)' }}>
                            ₹{st.fee_amount.toLocaleString('en-IN')}
                          </strong>
                        </td>
                        <td>
                          <span
                            className="status-pill"
                            style={{
                              fontSize: '0.8rem',
                              padding: '4px 10px',
                              fontWeight: 700,
                              background: isPaid ? '#dcfce7' : isPartial ? '#fef3c7' : '#fee2e2',
                              color: isPaid ? '#15803d' : isPartial ? '#b45309' : '#b91c1c',
                              borderColor: isPaid ? '#86efac' : isPartial ? '#fcd34d' : '#fca5a5'
                            }}
                          >
                            {isPaid ? 'Paid' : isPartial ? 'Partial Paid' : 'Not Paid'}
                          </span>
                          {isPartial && (
                            <div style={{ fontSize: '0.74rem', color: '#92400e', marginTop: '2px', fontWeight: 600 }}>
                              (₹{(st.paid_amount || 0).toLocaleString('en-IN')} / ₹{st.fee_amount.toLocaleString('en-IN')})
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {(isPaid || isPartial) && st.paid_at ? new Date(st.paid_at).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {/* Dedicated Paid and Not Paid Action Buttons */}
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            {/* 1. PAID Button */}
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => handleSetFeeStatus(st, 'paid')}
                              title={isPaid ? 'Currently marked as Paid' : 'Click to mark fee as Paid'}
                              style={{
                                padding: '6px 14px',
                                fontSize: '0.82rem',
                                fontWeight: isPaid ? 700 : 600,
                                borderRadius: '6px',
                                cursor: isToggling ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                background: isPaid ? '#10b981' : 'rgba(16, 185, 129, 0.12)',
                                color: isPaid ? '#ffffff' : '#34d399',
                                border: isPaid ? '1px solid #059669' : '1px solid rgba(16, 185, 129, 0.45)',
                                boxShadow: isPaid ? '0 0 10px rgba(16, 185, 129, 0.45)' : 'none'
                              }}
                            >
                              {isToggling && togglingTarget === 'paid' ? 'Updating...' : 'Paid'}
                            </button>

                            {/* 2. NOT PAID Button */}
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => handleSetFeeStatus(st, 'unpaid')}
                              title={!isPaid && !isPartial ? 'Currently marked as Not Paid' : 'Click to mark fee as Not Paid'}
                              style={{
                                padding: '6px 14px',
                                fontSize: '0.82rem',
                                fontWeight: !isPaid && !isPartial ? 700 : 600,
                                borderRadius: '6px',
                                cursor: isToggling ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                background: !isPaid && !isPartial ? '#ef4444' : 'rgba(239, 68, 68, 0.12)',
                                color: !isPaid && !isPartial ? '#ffffff' : '#f87171',
                                border: !isPaid && !isPartial ? '1px solid #dc2626' : '1px solid rgba(239, 68, 68, 0.45)',
                                boxShadow: !isPaid && !isPartial ? '0 0 10px rgba(239, 68, 68, 0.45)' : 'none'
                              }}
                            >
                              {isToggling && togglingTarget === 'unpaid' ? 'Updating...' : 'Not Paid'}
                            </button>
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {/* Next to Payment Action: Paid Partial Amount section with number input, Done option, and Edit option */}
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span
                                  style={{
                                    position: 'absolute',
                                    left: '10px',
                                    color: isEditingPartial ? '#6366f1' : '#64748b',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    pointerEvents: 'none'
                                  }}
                                >
                                  ₹
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  max={st.fee_amount}
                                  step="500"
                                  value={partialVal}
                                  onChange={(e) => handlePartialInputChange(st.student_id, e.target.value)}
                                  disabled={!isEditingPartial || isSavingPartial}
                                  placeholder="0"
                                  title={isEditingPartial ? "Enter partial amount in ₹ and click Done" : "Click Edit to change partial amount"}
                                  style={{
                                    width: '105px',
                                    height: '34px',
                                    paddingLeft: '22px',
                                    paddingRight: '6px',
                                    fontSize: '0.88rem',
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    border: isEditingPartial ? '1.5px solid #6366f1' : '1px solid #cbd5e1',
                                    background: isEditingPartial ? '#ffffff' : '#f8fafc',
                                    color: isEditingPartial ? '#0f172a' : '#334155',
                                    outline: 'none',
                                    boxShadow: isEditingPartial ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && isEditingPartial) {
                                      handleSavePartialAmount(st);
                                    }
                                  }}
                                />
                              </div>

                              {isEditingPartial ? (
                                <button
                                  type="button"
                                  disabled={isSavingPartial}
                                  onClick={() => handleSavePartialAmount(st)}
                                  title="Click Done to save the partial amount"
                                  style={{
                                    padding: '6px 14px',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    cursor: isSavingPartial ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    background: '#4f46e5',
                                    color: '#ffffff',
                                    border: '1px solid #4338ca',
                                    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  {isSavingPartial ? 'Saving...' : '✓ Done'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isSavingPartial}
                                  onClick={() => handleStartEditPartial(st)}
                                  title="Click Edit to modify the partial amount"
                                  style={{
                                    padding: '6px 14px',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    background: '#f1f5f9',
                                    color: '#1e293b',
                                    border: '1px solid #cbd5e1',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  ✎ Edit
                                </button>
                              )}
                            </div>

                            {/* Remaining balance indicator */}
                            {isPartial && st.pending_amount > 0 && (
                              <span style={{ fontSize: '0.74rem', color: '#b45309', fontWeight: 600 }}>
                                Balance: ₹{st.pending_amount.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 20px' }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>No students found in this category</div>
                      <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                        Try clearing search terms or selecting a different filter tab.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 10 Students per screen Pagination bar */}
          <Pagination
            currentPage={activePage}
            totalItems={displayedStudents.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="students"
          />
        </div>
      </div>
    );
  };
