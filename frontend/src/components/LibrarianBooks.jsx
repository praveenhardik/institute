import React, { useEffect, useState, useCallback } from 'react';
import { API } from '../api/api';
import { useAlert } from '../context/AlertContext';
import { Pagination } from './Pagination';

export const LibrarianBooks = () => {
  const { showAlert } = useAlert();

  // Student list & library status
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Stats
  const [totalStudents, setTotalStudents] = useState(0);
  const [issuedCount, setIssuedCount] = useState(0);
  const [noBooksCount, setNoBooksCount] = useState(1000);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'issued' | 'nobooks' | 'return'
  const [currentPage, setCurrentPage] = useState(1);

  // Per-student input state: { [studentId]: { bookName: string, validityDate: string } }
  const [rowInputs, setRowInputs] = useState({});
  const [actionInProgressId, setActionInProgressId] = useState(null);
  const [returnModalStudent, setReturnModalStudent] = useState(null);
  const [returningBookId, setReturningBookId] = useState(null);
  const [returnDateTimes, setReturnDateTimes] = useState({});
  const [modalReturnDateTime, setModalReturnDateTime] = useState('');

  // Helper for current date in YYYY-MM-DD
  const getTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - offset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const todayStr = getTodayStr();

  // Load departments
  const loadDepartments = useCallback(async () => {
    try {
      const res = await API.getDepartments();
      setDepartments(res.departments || []);
    } catch (e) {
      console.warn('Could not load departments:', e);
    }
  }, []);

  // Load students & books
  const loadBooks = useCallback(async () => {
    try {
      setLoading(true);
      const statusParam = activeTab === 'all' ? '' : (activeTab === 'return' ? 'return' : activeTab);
      const res = await API.getLibraryBooks({
        search: searchQuery.trim(),
        departmentId: selectedDeptId,
        status: statusParam
      });

      let stus = res.students || [];
      if (activeTab === 'return') {
        stus = stus.filter(s => s.has_book);
      }
      setStudents(stus);
      setTotalStudents(res.total_students || stus.length);
      setIssuedCount(res.issued_count || 0);
      setNoBooksCount(res.no_books_count || 0);
    } catch (e) {
      console.warn('Could not load library books:', e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedDeptId, activeTab]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDeptId, activeTab]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(students.length / pageSize));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginatedStudents = students.slice(startIndex, startIndex + pageSize);

  // Update input state for a specific student row
  const handleInputChange = (studentId, field, value) => {
    setRowInputs(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { bookName: '', validityDate: todayStr }),
        [field]: value
      }
    }));
  };

  // Issue Book handler
  const handleIssueBook = async (student) => {
    const studentId = student.student_id;
    const currentInput = rowInputs[studentId] || {};
    const bookName = (currentInput.bookName || '').trim();
    const validityDate = (currentInput.validityDate || todayStr).trim();

    if (!bookName) {
      showAlert(`Please enter a book name for ${student.student_name}.`, 'warning');
      return;
    }

    if (!validityDate) {
      showAlert('Please choose a validity date.', 'warning');
      return;
    }

    // Strict validation: validity date cannot be in the past
    if (validityDate < todayStr) {
      showAlert(`Validity period cannot be a past date. Please enter present date (${todayStr}) or a future date.`, 'danger');
      return;
    }

    try {
      setActionInProgressId(studentId);
      const res = await API.issueLibraryBook(studentId, bookName, validityDate);
      showAlert(res.message || `Book "${bookName}" issued to ${student.student_name}!`, 'success');

      // Clear row input
      setRowInputs(prev => {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });

      // Update student locally for immediate responsiveness
      setStudents(prev =>
        prev.map(s => {
          if (s.student_id === studentId) {
            const prevList = s.previous_books ? [...s.previous_books] : [];
            if (s.has_book && s.book_name) {
              prevList.unshift({
                book_name: s.book_name,
                validity_date: s.validity_date,
                status: 'returned',
                returned_at: new Date().toISOString()
              });
            }
            return {
              ...s,
              has_book: true,
              book_name: bookName,
              validity_date: validityDate,
              issued_at: new Date().toISOString(),
              is_overdue: false,
              previous_books: prevList
            };
          }
          return s;
        })
      );

      // Refresh stats
      setIssuedCount(prev => prev + (student.has_book ? 0 : 1));
      setNoBooksCount(prev => prev - (student.has_book ? 0 : 1));
      loadBooks();
    } catch (err) {
      showAlert(err.message || 'Failed to issue book', 'danger');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Open modal showing list of issued books for this student
  const handleOpenReturnModal = (student) => {
    setReturnModalStudent(student);
    setModalReturnDateTime(returnDateTimes[student.student_id] || getCurrentDateTimeLocal());
  };

  // Confirm Return Book handler for a specific book or all books with date and time
  const handleConfirmReturn = async (student, bookId = null, customDateTime = null) => {
    const studentId = student.student_id;
    const finalDateTime = customDateTime || modalReturnDateTime || returnDateTimes[studentId] || getCurrentDateTimeLocal();
    try {
      setReturningBookId(bookId || 'all');
      setActionInProgressId(studentId);
      const res = await API.returnLibraryBook(studentId, bookId, finalDateTime);
      showAlert(res.message || `Book returned successfully with marked date & time (${finalDateTime}).`, 'success');
      setReturnModalStudent(null);
      await loadBooks();
    } catch (err) {
      showAlert(err.message || 'Failed to return book', 'danger');
    } finally {
      setReturningBookId(null);
      setActionInProgressId(null);
    }
  };

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
            <span style={{ fontSize: '0.80rem', textTransform: 'uppercase', color: '#4f46e5', fontWeight: 800 }}>Total Students: </span>
            <strong style={{ fontSize: '1.15rem', color: '#090d16' }}>{totalStudents}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.80rem', textTransform: 'uppercase', color: '#059669', fontWeight: 800 }}>Books Issued: </span>
            <strong style={{ fontSize: '1.15rem', color: '#059669' }}>{issuedCount}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.80rem', textTransform: 'uppercase', color: '#334155', fontWeight: 800 }}>No Books Taken: </span>
            <strong style={{ fontSize: '1.15rem', color: '#090d16' }}>{noBooksCount !== undefined && noBooksCount !== null ? noBooksCount : 1000}</strong>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={loadBooks}
          style={{ padding: '6px 14px', fontSize: '0.84rem', height: '34px' }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Main Student Library Books Table Card */}
      <div className="card" style={{ marginBottom: 0 }}>
        {/* Header & Controls */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
          <div>
            <div className="card-title">
              Student Library Books & Validity Tracker
            </div>
            <p className="card-description">
              View all students and manage library circulation. Enter book names, specify validity dates (present or future only), and track students with no books.
            </p>
          </div>

          {/* Search & Department Filters */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search name, roll, or book..."
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
              <span className="user-tab-badge">{totalStudents}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'issued'}
              className={`user-tab-btn ${activeTab === 'issued' ? 'active' : ''}`}
              onClick={() => setActiveTab('issued')}
            >
              <span className="user-tab-label">Books Issued</span>
              <span className="user-tab-badge" style={{ background: 'rgba(16, 185, 129, 0.3)', color: '#047857' }}>
                {issuedCount}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'nobooks'}
              className={`user-tab-btn ${activeTab === 'nobooks' ? 'active' : ''}`}
              onClick={() => setActiveTab('nobooks')}
            >
              <span className="user-tab-label">Not Taken</span>
              <span className="user-tab-badge" style={{ background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1' }}>
                {noBooksCount !== undefined && noBooksCount !== null ? noBooksCount : 1000}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'return'}
              className={`user-tab-btn ${activeTab === 'return' ? 'active' : ''}`}
              onClick={() => setActiveTab('return')}
            >
              <span className="user-tab-label">Return Books</span>
              <span className="user-tab-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#dc2626' }}>
                {issuedCount}
              </span>
            </button>
          </div>
        </div>

        {/* Student Table */}
        <div className="table-responsive">
          <table className="custom-table" style={{ minWidth: '920px' }}>
              <thead>
                {activeTab === 'return' ? (
                  <tr>
                    <th style={{ width: '22%' }}>Student Details</th>
                    <th style={{ width: '13%' }}>Department</th>
                    <th style={{ width: '26%' }}>Active Issued Books</th>
                    <th style={{ width: '24%' }}>Return Date & Time</th>
                    <th style={{ width: '15%', minWidth: '120px' }}>Action</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ width: '22%' }}>Student Details</th>
                    <th style={{ width: '13%' }}>Department</th>
                    <th style={{ width: '22%' }}>Current Book Status</th>
                    <th style={{ width: '20%' }}>Enter Book Name</th>
                    <th style={{ width: '13%' }}>Validity Period</th>
                    <th style={{ width: '10%', minWidth: '110px' }}>Action</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {paginatedStudents.length ? (
                  paginatedStudents.map(st => {
                    const studentId = st.student_id;
                    const isBusy = actionInProgressId === studentId;
                    const inputState = rowInputs[studentId] || { bookName: '', validityDate: todayStr };

                    if (activeTab === 'return') {
                      return (
                        <tr key={studentId}>
                          {/* 1. Student Details */}
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.94rem' }}>
                              {st.student_name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Roll: <span style={{ color: '#1e293b', fontWeight: 700 }}>{st.roll_number}</span> • @{st.username || 'user'}
                            </div>
                          </td>

                          {/* 2. Department */}
                          <td>
                            <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                              {st.department_name || '-'}
                            </span>
                          </td>

                          {/* 3. Active Issued Books */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {(st.active_books && st.active_books.length > 0 ? st.active_books : [{ id: st.book_record_id, book_name: st.book_name, validity_date: st.validity_date, is_overdue: st.is_overdue }]).map((ab, abIdx) => (
                                <div key={ab.id || abIdx}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong style={{ color: '#059669', fontSize: '0.92rem' }}>
                                      {ab.book_name}
                                    </strong>
                                    {ab.is_overdue && (
                                      <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
                                        Overdue
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    Validity: <strong style={{ color: ab.is_overdue ? '#dc2626' : '#1e293b' }}>{ab.validity_date}</strong> {ab.issued_at && <span>• Issued: {ab.issued_at}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* 4. Mark Return Date & Time */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Mark Return Date & Time:</label>
                              <input
                                type="datetime-local"
                                className="form-input"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '0.86rem',
                                  background: '#ffffff',
                                  height: '36px'
                                }}
                                value={returnDateTimes[studentId] || getCurrentDateTimeLocal()}
                                onChange={(e) => setReturnDateTimes(prev => ({ ...prev, [studentId]: e.target.value }))}
                              />
                            </div>
                          </td>

                          {/* 5. Return Action */}
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={isBusy}
                              onClick={() => {
                                const dt = returnDateTimes[studentId] || getCurrentDateTimeLocal();
                                if (st.active_books && st.active_books.length > 1) {
                                  handleOpenReturnModal(st);
                                } else {
                                  const singleBookId = st.book_record_id || (st.active_books && st.active_books[0]?.id) || null;
                                  handleConfirmReturn(st, singleBookId, dt);
                                }
                              }}
                              style={{
                                fontSize: '0.82rem',
                                padding: '6px 14px',
                                whiteSpace: 'nowrap',
                                color: '#dc2626',
                                borderColor: '#fca5a5',
                                fontWeight: 700,
                                height: '34px'
                              }}
                              title="Return this book with marked date and time"
                            >
                              {isBusy ? 'Returning...' : 'Return Book'}
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={studentId}>
                        {/* 1. Student Details */}
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.94rem' }}>
                            {st.student_name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Roll: <span style={{ color: '#1e293b', fontWeight: 700 }}>{st.roll_number}</span> • @{st.username || 'user'}
                          </div>
                        </td>

                        {/* 2. Department */}
                        <td>
                          <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                            {st.department_name || '-'}
                          </span>
                        </td>

                        {/* 3. Current Book Status: "Not Taken" pill if not taken, or Book info + ALL previous books */}
                        <td>
                          {st.has_book ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {(st.active_books && st.active_books.length > 0 ? st.active_books : [{ id: st.book_record_id, book_name: st.book_name, validity_date: st.validity_date, is_overdue: st.is_overdue }]).map((ab, abIdx) => (
                                <div key={ab.id || abIdx}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong style={{ color: '#059669', fontSize: '0.92rem' }}>
                                      {ab.book_name}
                                    </strong>
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: ab.is_overdue ? '#dc2626' : 'var(--text-muted)', marginTop: '2px' }}>
                                    Validity: <strong style={{ color: ab.is_overdue ? '#dc2626' : '#1e293b' }}>{ab.validity_date}</strong>
                                    {ab.is_overdue && (
                                      <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: '6px' }}>
                                        Overdue
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span
                              className="status-pill"
                              style={{
                                fontSize: '0.8rem',
                                padding: '4px 10px',
                                fontWeight: 700,
                                background: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #cbd5e1'
                              }}
                            >
                              Not Taken
                            </span>
                          )}

                          {/* Show all previous books taken by the student */}
                          {st.previous_books && st.previous_books.length > 0 && (
                            <div style={{
                              marginTop: '8px',
                              paddingTop: '6px',
                              borderTop: '1px dashed #e2e8f0'
                            }}>
                              <div style={{
                                fontSize: '0.72rem',
                                color: '#334155',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                marginBottom: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}>
                                <span>Previous Books ({st.previous_books.length}):</span>
                              </div>
                              <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '5px',
                                maxHeight: '110px',
                                overflowY: 'auto'
                              }}>
                                {st.previous_books.map((pb, idx) => (
                                  <span
                                    key={pb.id || idx}
                                    style={{
                                      fontSize: '0.74rem',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      background: '#f1f5f9',
                                      border: '1px solid #cbd5e1',
                                      color: '#1e293b',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title={`Previous: "${pb.book_name}" ${pb.returned_at ? `(Returned: ${pb.returned_at})` : ''}`}
                                  >
                                    <span style={{ fontWeight: 700, color: '#090d16' }}>{pb.book_name}</span>
                                    {pb.validity_date && (
                                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                        ({pb.validity_date})
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 4. Text box to enter the book name */}
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.88rem',
                              background: '#ffffff',
                              height: '38px'
                            }}
                            placeholder="Enter book name..."
                            value={inputState.bookName}
                            onChange={(e) => handleInputChange(studentId, 'bookName', e.target.value)}
                          />
                        </td>

                        {/* 5. Validity period date picker (Present or Future Date only; Past Date disabled via min={todayStr}) */}
                        <td>
                          <input
                            type="date"
                            min={todayStr}
                            className="form-input"
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.88rem',
                              background: '#ffffff',
                              colorScheme: 'light',
                              height: '38px'
                            }}
                            title="Validity period: Select present date or a future date (past dates disabled)"
                            value={inputState.validityDate}
                            onChange={(e) => handleInputChange(studentId, 'validityDate', e.target.value)}
                          />
                        </td>

                        {/* 6. Action: Issue Book / Return Book */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={isBusy}
                              onClick={() => handleIssueBook(st)}
                              style={{
                                fontSize: '0.82rem',
                                padding: '6px 12px',
                                whiteSpace: 'nowrap',
                                fontWeight: 700,
                                height: '34px'
                              }}
                              title="Mark as book taken for the student with the specified validity period"
                            >
                              {isBusy ? 'Saving...' : st.has_book ? 'Issue Another' : 'Mark Book Taken'}
                            </button>

                            {st.has_book && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={isBusy}
                                onClick={() => handleOpenReturnModal(st)}
                                style={{
                                  fontSize: '0.80rem',
                                  padding: '5px 10px',
                                  whiteSpace: 'nowrap',
                                  color: '#dc2626',
                                  borderColor: '#fca5a5',
                                  height: '30px'
                                }}
                                title="Click to view list of issued books and return with date and time"
                              >
                                Return Book
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 20px' }}>
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
            totalItems={students.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="students"
          />
        </div>

      {/* Return Book Modal: Asks the user which book to return by displaying the list of issued books */}
      {returnModalStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '20px'
          }}
          onClick={() => !returningBookId && setReturnModalStudent(null)}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Return Issued Book
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Student: <strong style={{ color: 'var(--text-primary)' }}>{returnModalStudent.student_name}</strong> ({returnModalStudent.roll_number}) • {returnModalStudent.department_name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReturnModalStudent(null)}
                disabled={!!returningBookId}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              {/* Return Date & Time Input */}
              <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Mark Return Date & Time:
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  style={{ height: '36px', fontSize: '0.88rem', background: '#ffffff' }}
                  value={modalReturnDateTime}
                  onChange={(e) => setModalReturnDateTime(e.target.value)}
                />
              </div>

              <p style={{ margin: '0 0 14px 0', fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>
                Please select the book you want to return from the currently issued books:
              </p>

              {/* List of Issued Books */}
              {(() => {
                const activeList = returnModalStudent.active_books?.length
                  ? returnModalStudent.active_books
                  : (returnModalStudent.book_name
                    ? [{ id: returnModalStudent.book_record_id, book_name: returnModalStudent.book_name, validity_date: returnModalStudent.validity_date, is_overdue: returnModalStudent.is_overdue }]
                    : []);

                if (!activeList.length) {
                  return (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      No active issued books found for this student.
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeList.map((bk) => {
                      const isThisBookReturning = returningBookId === bk.id;
                      return (
                        <div
                          key={bk.id || bk.book_name}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '0.96rem', color: '#059669' }}>
                                {bk.book_name}
                              </strong>
                              {bk.is_overdue && (
                                <span style={{
                                  fontSize: '0.68rem',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: '1px solid #fca5a5',
                                  fontWeight: 700
                                }}>
                                  Overdue
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                              Validity: <strong style={{ color: bk.is_overdue ? '#dc2626' : '#1e293b' }}>{bk.validity_date}</strong>
                              {bk.issued_at && <span> • Issued: {bk.issued_at}</span>}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={!!returningBookId}
                            onClick={() => handleConfirmReturn(returnModalStudent, bk.id, modalReturnDateTime)}
                            style={{
                              fontSize: '0.80rem',
                              padding: '6px 12px',
                              color: '#dc2626',
                              borderColor: '#fca5a5',
                              whiteSpace: 'nowrap',
                              fontWeight: 700
                            }}
                          >
                            {isThisBookReturning ? 'Returning...' : 'Return Book'}
                          </button>
                        </div>
                      );
                    })}

                    {activeList.length > 1 && (
                      <div style={{ marginTop: '8px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={!!returningBookId}
                          onClick={() => handleConfirmReturn(returnModalStudent, 'all', modalReturnDateTime)}
                          style={{
                            fontSize: '0.80rem',
                            color: '#b91c1c',
                            borderColor: '#fca5a5',
                            fontWeight: 700
                          }}
                        >
                          {returningBookId === 'all' ? 'Returning All...' : 'Return All Issued Books'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'rgba(0, 0, 0, 0.2)'
            }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setReturnModalStudent(null)}
                disabled={!!returningBookId}
                style={{ padding: '6px 16px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
