import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { API } from '../api/api';
import { useAuth, formatRoleName } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { QuizModal } from '../components/QuizModal';
import { Pagination } from '../components/Pagination';
import { NotificationComposer } from '../components/NotificationComposer';

export const StudentView = () => {
  const { user: currentUser } = useAuth();
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState('quizzes');

  // Department banner
  const [myDept, setMyDept] = useState(null);

  // Stats
  const [stats, setStats] = useState({ assigned: 0, completed: 0, accuracy: '0%' });

  // Tab 1: Questions
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [activeQuizQuestion, setActiveQuizQuestion] = useState(null);
  const [activeStudentTask, setActiveStudentTask] = useState('');
  const [openStudentTasks, setOpenStudentTasks] = useState({});

  // Search state for questions
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [activeGlobalSearch, setActiveGlobalSearch] = useState('');

  // Tab 2: History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  // Tab 3: Attendance
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attLoading, setAttLoading] = useState(false);
  const [dailyAttendancePage, setDailyAttendancePage] = useState(1);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Load Department info
  const loadDepartment = useCallback(async () => {
    try {
      const dRes = await API.getMyDepartments();
      const depts = dRes.departments || [];
      if (depts.length) {
        setMyDept(depts[0]);
      }
    } catch (e) {
      console.warn('Could not load student department:', e);
    }
  }, []);

  // Load Questions & History
  const loadQuestionsAndHistory = useCallback(async () => {
    try {
      setQuestionsLoading(true);
      setHistoryLoading(true);

      const [qRes, hRes] = await Promise.all([
        API.getStudentQuestions(),
        API.getStudentHistory()
      ]);

      const qList = qRes.questions || [];
      const hList = hRes.history || [];

      setQuestions(qList);
      setHistory(hList);

      const completed = hList.length;
      const correct = hList.filter(h => h.is_correct).length;
      const accuracy = completed > 0 ? `${Math.round((correct / completed) * 100)}%` : '0%';

      setStats({
        assigned: qList.length,
        completed,
        accuracy
      });
    } catch (e) {
      console.warn('Could not load student questions/history:', e);
    } finally {
      setQuestionsLoading(false);
      setHistoryLoading(false);
    }
  }, []);

  // Load Attendance
  const loadAttendance = useCallback(async () => {
    try {
      setAttLoading(true);
      const res = await API.getStudentAttendanceSummary();
      setAttendanceSummary(res);
    } catch (e) {
      console.warn('Could not load attendance summary:', e);
    } finally {
      setAttLoading(false);
    }
  }, []);

  // Load Notifications
  const loadNotifications = useCallback(async () => {
    try {
      setNotifLoading(true);
      const res = await API.getNotifications();
      setNotifications(res.notifications || []);
    } catch (e) {
      console.warn('Could not load student notifications:', e);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartment();
    loadQuestionsAndHistory();
    loadAttendance();
    loadNotifications();
  }, [loadDepartment, loadQuestionsAndHistory, loadAttendance, loadNotifications]);


  // Mark notification read
  const handleMarkNotifRead = async (id) => {
    try {
      await API.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    } catch (e) {
      console.warn(e);
    }
  };

  // Completed questions set for quick lookup
  const completedQuestionIds = new Set((history || []).map(h => h?.question_id));

  // Group questions by task_number
  const groupedStudentQuestions = useMemo(() => {
    const map = {};
    (questions || []).forEach(q => {
      const t = q?.task_number || 'Task 1';
      if (!map[t]) map[t] = [];
      map[t].push(q);
    });
    return map;
  }, [questions]);

  const studentTaskKeys = useMemo(() => Object.keys(groupedStudentQuestions), [groupedStudentQuestions]);

  const toggleStudentTask = (tKey) => {
    setOpenStudentTasks(prev => ({
      ...prev,
      [tKey]: !prev[tKey]
    }));
  };

  const expandAllStudentTasks = () => {
    const all = {};
    studentTaskKeys.forEach(k => { all[k] = true; });
    setOpenStudentTasks(all);
  };

  const collapseAllStudentTasks = () => {
    setOpenStudentTasks({});
  };



  const totalMatchingStudentQuestions = useMemo(() => {
    if (!activeGlobalSearch) return (questions || []).length;
    return (questions || []).filter(q => {
      const text = `${q.question_text || ''} ${q.option_a || ''} ${q.option_b || ''} ${q.option_c || ''} ${q.option_d || ''} ${q.teacher_name || ''} ${q.explanation || ''} ${q.id}`.toLowerCase();
      return text.includes(activeGlobalSearch);
    }).length;
  }, [questions, activeGlobalSearch]);

  const handleApplyGlobalSearch = () => {
    const q = (globalSearchQuery || '').trim().toLowerCase();
    setActiveGlobalSearch(q);
    if (q) {
      const newOpen = {};
      studentTaskKeys.forEach(tKey => {
        const tQs = groupedStudentQuestions[tKey] || [];
        const hasMatch = tQs.some(item => {
          const text = `${item.question_text || ''} ${item.option_a || ''} ${item.option_b || ''} ${item.option_c || ''} ${item.option_d || ''} ${item.teacher_name || ''} ${item.explanation || ''} ${item.id}`.toLowerCase();
          return text.includes(q);
        });
        if (hasMatch) {
          newOpen[tKey] = true;
        }
      });
      setOpenStudentTasks(newOpen);
    }
  };

  const handleClearGlobalSearch = () => {
    setGlobalSearchQuery('');
    setActiveGlobalSearch('');
  };

  const effectiveStudentTask = activeStudentTask && studentTaskKeys.includes(activeStudentTask)
    ? activeStudentTask
    : (studentTaskKeys[0] || 'Task 1');

  const currentStudentQuestions = groupedStudentQuestions[effectiveStudentTask] || [];

  return (
    <section>
      {/* Department Banner */}
      {myDept && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 'var(--radius-md)',
            padding: '14px 22px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', color: '#4f46e5', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              Department
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {myDept.name} ({myDept.code})
            </div>
          </div>
          {myDept.hod_name && (
            <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Head of Department: <strong style={{ color: 'var(--text-primary)' }}>{myDept.hod_name}</strong>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="card-header" style={{ marginBottom: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            Student Examination Center
          </h1>
          <p className="card-description" style={{ fontSize: '0.84rem', margin: '2px 0 0' }}>
            Take active timed assessments with live countdowns, inspect your performance review, monitor class attendance, and view faculty notices.
          </p>
        </div>
      </div>

      {/* Stat Tiles */}
      <div className="grid-3" style={{ marginBottom: '12px' }}>
        <div className="stat-card">
          <div>
            <div className="stat-val">{stats.assigned}</div>
            <div className="stat-label">Assigned Questions</div>
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-val">{stats.completed}</div>
            <div className="stat-label">Completed Assessments</div>
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-val">{stats.accuracy}</div>
            <div className="stat-label">Accuracy Rate</div>
          </div>
        </div>
      </div>

      {/* 2-Column Portal Layout: Left side vertical navigation, Right side content */}
      <div className="portal-layout">
        <div className="portal-sidebar">
          <button
            className={`tab-btn ${activeTab === 'quizzes' ? 'active' : ''}`}
            onClick={() => setActiveTab('quizzes')}
          >
            Available Questions
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            My Performance History
          </button>
          <button
            className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            My Attendance
          </button>
        </div>

        <div className="portal-main-content">
          {/* TAB 1: Available Questions */}
      {activeTab === 'quizzes' && (
        <div>
          {questionsLoading ? (
            <div style={{ color: 'var(--text-muted)', padding: '20px' }}>Loading questions...</div>
          ) : studentTaskKeys.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header with Task Count & Quick Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Assigned Tasks</span>
                    <span
                      className="status-pill"
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        color: '#7e22ce',
                        borderColor: '#4f46e5',
                        fontWeight: 700
                      }}
                    >
                      {studentTaskKeys.length} Task{studentTaskKeys.length === 1 ? '' : 's'}
                    </span>
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Click a task name to view and take available question assessments
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleApplyGlobalSearch();
                    }}
                    style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search questions..."
                        value={globalSearchQuery}
                        onChange={(e) => setGlobalSearchQuery(e.target.value)}
                        style={{ minWidth: '240px', padding: '7px 12px', paddingRight: '48px', fontSize: '0.88rem' }}
                      />
                      {globalSearchQuery && (
                        <button
                          type="button"
                          onClick={handleClearGlobalSearch}
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
                      type="submit"
                      className="btn btn-primary btn-sm"
                      style={{ padding: '8px 16px' }}
                    >
                      Search
                    </button>

                    {(activeGlobalSearch || globalSearchQuery) && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleClearGlobalSearch}
                        style={{ padding: '8px 12px' }}
                        title="Clear search filter"
                      >
                        Reset
                      </button>
                    )}
                  </form>

                  {studentTaskKeys.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={expandAllStudentTasks}
                        style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                      >
                        Expand All
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={collapseAllStudentTasks}
                        style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                      >
                        Collapse All
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Searched question not available banner */}
              {activeGlobalSearch && totalMatchingStudentQuestions === 0 && (
                <div
                  style={{
                    padding: '24px 20px',
                    textAlign: 'center',
                    background: '#ffffff',
                    borderRadius: '10px',
                    border: '1px dashed #f87171',
                    boxShadow: '0 2px 10px rgba(239, 68, 68, 0.08)',
                    marginBottom: '16px'
                  }}
                >
                  <p style={{ color: '#dc2626', fontWeight: 800, margin: '0 0 6px 0', fontSize: '1.05rem' }}>
                    searched question is not available
                  </p>
                  <p style={{ color: 'var(--text-secondary)', margin: '0 0 14px 0', fontSize: '0.88rem' }}>
                    No questions found matching "{activeGlobalSearch}".
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleClearGlobalSearch}
                    style={{ padding: '6px 16px', fontSize: '0.82rem' }}
                  >
                    Reset & View All Questions
                  </button>
                </div>
              )}

              {/* Tasks List - Each task provided by its Task Name, questions available inside */}
              {studentTaskKeys.map(tKey => {
                const isOpen = Boolean(openStudentTasks[tKey]);
                const taskQuestions = groupedStudentQuestions[tKey] || [];
                const qCount = taskQuestions.length;
                const doneCount = taskQuestions.filter(q => completedQuestionIds.has(q.id) || q.already_submitted).length;
                const isAllDone = doneCount === qCount && qCount > 0;

                return (
                  <div
                    key={tKey}
                    style={{
                      background: isOpen ? '#f8fafc' : '#ffffff',
                      border: isOpen ? '1px solid #4f46e5' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      boxShadow: isOpen ? '0 4px 20px rgba(99, 102, 241, 0.12)' : 'none'
                    }}
                  >
                    {/* Task Name Header Bar - Just providing task name is enough */}
                    <div
                      onClick={() => toggleStudentTask(tKey)}
                      style={{
                        padding: '16px 20px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '14px',
                        flexWrap: 'wrap',
                        background: isOpen ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isOpen) e.currentTarget.style.background = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (!isOpen) e.currentTarget.style.background = 'transparent';
                      }}
                      title={isOpen ? `Click to collapse ${tKey}` : `Click to view questions in ${tKey}`}
                    >
                      {/* Left: Task Name Icon & Title */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '200px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: isOpen
                              ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
                              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
                            border: '1px solid rgba(168, 85, 247, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.1rem',
                            color: '#fff',
                            flexShrink: 0
                          }}
                        >
                          📋
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '0.02em' }}>
                            {tKey}
                          </h3>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            Task Assessment
                          </span>
                        </div>
                      </div>

                      {/* Middle: Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          className="status-pill"
                          style={{
                            background: '#eef2ff',
                            color: '#4338ca',
                            borderColor: '#c7d2fe',
                            fontWeight: 700,
                            padding: '4px 10px'
                          }}
                        >
                          {qCount} Question{qCount === 1 ? '' : 's'}
                        </span>
                        <span
                          className="status-pill"
                          style={{
                            background: isAllDone ? '#dcfce7' : '#f1f5f9',
                            color: isAllDone ? '#166534' : 'var(--text-secondary)',
                            borderColor: isAllDone ? '#16a34a' : 'var(--border-color)',
                            fontWeight: 600,
                            padding: '4px 10px'
                          }}
                        >
                          {doneCount}/{qCount} Completed
                        </span>
                      </div>

                      {/* Right: Open/Close Toggle Button */}
                      <button
                        type="button"
                        className={`btn btn-sm ${isOpen ? 'btn-secondary' : 'btn-primary'}`}
                        style={{
                          padding: '6px 14px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          pointerEvents: 'none'
                        }}
                      >
                        <span>{isOpen ? 'Hide Questions' : 'View Questions'}</span>
                        <span style={{ fontSize: '0.75rem' }}>{isOpen ? '▲' : '▼'}</span>
                      </button>
                    </div>

                    {/* Inside That Task Name: Questions Are Available */}
                    {isOpen && (() => {
                      const currentSearch = (activeGlobalSearch || '').trim().toLowerCase();

                      const displayedQuestions = currentSearch
                        ? taskQuestions.filter(q => {
                            const text = `${q.question_text || ''} ${q.option_a || ''} ${q.option_b || ''} ${q.option_c || ''} ${q.option_d || ''} ${q.teacher_name || ''} ${q.explanation || ''} ${q.id}`.toLowerCase();
                            return text.includes(currentSearch);
                          })
                        : taskQuestions;

                      return (
                        <div
                          style={{
                            borderTop: '1px solid var(--border-color)',
                            padding: '20px',
                            background: '#f8fafc'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '16px',
                              flexWrap: 'wrap',
                              gap: '8px'
                            }}
                          >
                            <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>Questions in {tKey}</span>
                              <span
                                className="status-pill"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  background: 'rgba(99, 102, 241, 0.2)',
                                  color: '#7e22ce'
                                }}
                              >
                                {displayedQuestions.length}{displayedQuestions.length !== qCount ? ` of ${qCount}` : ''} Question{displayedQuestions.length === 1 ? '' : 's'}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {doneCount} of {qCount} completed
                            </span>
                          </div>

                          {currentSearch && (
                            <div
                              style={{
                                marginBottom: '14px',
                                padding: '8px 14px',
                                background: '#eef2ff',
                                borderRadius: '8px',
                                border: '1px solid #c7d2fe',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '8px'
                              }}
                            >
                              <span style={{ fontSize: '0.85rem', color: '#4338ca', fontWeight: 600 }}>
                                Search Results: {displayedQuestions.length} of {qCount} question{qCount === 1 ? '' : 's'} matching "{currentSearch}"
                              </span>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  handleClearGlobalSearch();
                                }}
                                style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                              >
                                Show All Questions
                              </button>
                            </div>
                          )}

                          {displayedQuestions.length > 0 ? (
                            <div className="grid-2">
                              {displayedQuestions.map((q, qIdx) => {
                              const isCompleted = completedQuestionIds.has(q.id) || q.already_submitted;
                              const submission = history.find(h => h.question_id === q.id);

                              return (
                                <div
                                  key={q.id}
                                  style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    transition: 'var(--transition)'
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span
                                          className="status-pill"
                                          style={{
                                            background: 'rgba(99, 102, 241, 0.18)',
                                            color: '#7e22ce',
                                            borderColor: '#4f46e5',
                                            fontWeight: 700,
                                            fontSize: '0.78rem'
                                          }}
                                        >
                                          Q{qIdx + 1}
                                        </span>
                                        <span className="timer-badge">{q.duration_seconds}s</span>
                                        <span className="target-badge">
                                          {q.target_type === 'all' ? 'All Department Students' : `Group: ${q.group_name || 'Assigned Group'}`}
                                        </span>
                                      </div>
                                      {isCompleted ? (
                                        <span
                                          className="status-pill"
                                          style={{
                                            color: submission?.is_correct ? '#10b981' : '#f87171',
                                            borderColor: submission?.is_correct ? '#10b981' : '#f87171',
                                            background: submission?.is_correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(248, 113, 113, 0.1)'
                                          }}
                                        >
                                          Completed
                                        </span>
                                      ) : (
                                        <span
                                          className="status-pill"
                                          style={{
                                            color: '#fbbf24',
                                            borderColor: '#d97706',
                                            background: 'rgba(251, 191, 36, 0.1)'
                                          }}
                                        >
                                          Pending
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <span>Created by:</span>
                                      <span style={{ color: '#7e22ce', fontWeight: 600 }}>{q.teacher_name || 'Faculty'}</span>
                                    </div>

                                    <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', lineHeight: '1.4', marginBottom: '16px' }}>
                                      {q.question_text}
                                    </h3>
                                  </div>

                                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                      Created by {q.teacher_name || 'Faculty'}
                                    </span>

                                    {!isCompleted ? (
                                      <button
                                        className="btn btn-primary"
                                        onClick={() => setActiveQuizQuestion(q)}
                                        style={{ padding: '8px 20px', fontSize: '0.9rem' }}
                                      >
                                        Take Assessment
                                      </button>
                                    ) : (
                                      <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setActiveQuizQuestion(q)}
                                      >
                                        Review Answers
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: '30px',
                              textAlign: 'center',
                              background: '#ffffff',
                              borderRadius: '8px',
                              border: currentSearch ? '1px dashed #fca5a5' : '1px dashed #cbd5e1'
                            }}
                          >
                            {currentSearch && (
                              <p style={{ color: '#dc2626', fontWeight: 700, margin: '0 0 6px 0', fontSize: '1rem' }}>
                                searched question is not available
                              </p>
                            )}
                            <p style={{ color: 'var(--text-secondary)', margin: '0 0 10px 0', fontSize: '0.88rem' }}>
                              {currentSearch
                                ? `No questions found matching "${currentSearch}" in ${tKey}.`
                                : `No questions available inside this task yet.`}
                            </p>
                            {currentSearch && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  handleClearGlobalSearch();
                                }}
                                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                              >
                                Clear Search & View All Questions
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );})()}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
              No active questions assigned right now. Please check back later!
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Performance History */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              Assessment History & Review
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={loadQuestionsAndHistory}
              disabled={historyLoading}
            >
              Refresh
            </button>
          </div>

          <div className="table-responsive" style={{ marginTop: '16px' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Your Choice</th>
                  <th>Correct Choice</th>
                  <th>Result</th>
                  <th>Time Taken</th>
                  <th>Submitted On</th>
                </tr>
              </thead>
              <tbody>
                {history.length ? (
                  history.slice((historyPage - 1) * 10, historyPage * 10).map(h => (
                    <tr key={h.id}>
                      <td style={{ maxWidth: '300px' }}><strong>{h.question_text}</strong></td>
                      <td>Option {h.selected_option}</td>
                      <td>Option {h.correct_option}</td>
                      <td>
                        <span
                          className="status-pill"
                          style={{
                            color: h.is_correct ? '#10b981' : '#ef4444',
                            borderColor: h.is_correct ? '#10b981' : '#ef4444'
                          }}
                        >
                          {h.is_correct ? 'Correct' : 'Incorrect'}
                        </span>
                      </td>
                      <td>{h.time_taken_seconds}s</td>
                      <td>{new Date(h.submitted_at).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                      No quiz assessments submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 10 Items per screen Pagination bar */}
          <Pagination
            currentPage={historyPage}
            totalItems={history.length}
            pageSize={10}
            onPageChange={setHistoryPage}
            itemLabel="quiz attempts"
          />
        </div>
      )}

      {/* TAB 3: My Attendance */}
      {activeTab === 'attendance' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              My Attendance Records
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={loadAttendance}
              disabled={attLoading}
            >
              Refresh
            </button>
          </div>

          {attendanceSummary ? (
            <div style={{ marginTop: '16px' }}>
              {/* Overall Percentage & Today's Attendance Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* Card 1: Overall Percentage */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#7e22ce', textTransform: 'uppercase', fontWeight: 600 }}>
                      Aggregate Attendance
                    </span>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', marginTop: '4px' }}>Overall Percentage</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>
                      {attendanceSummary.total_count ? `${attendanceSummary.attended_count} / ${attendanceSummary.total_count} sessions attended` : 'No sessions recorded yet'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '2.2rem',
                        fontWeight: 800,
                        color: attendanceSummary.overall_percentage == null
                          ? '#9ca3af'
                          : attendanceSummary.overall_percentage < 75
                          ? '#ef4444'
                          : '#10b981'
                      }}
                    >
                      {attendanceSummary.overall_percentage != null ? `${attendanceSummary.overall_percentage}%` : 'N/A'}
                    </div>
                    {attendanceSummary.overall_percentage != null && attendanceSummary.overall_percentage < 75 && (
                      <span className="status-pill" style={{ color: '#fca5a5', borderColor: '#fca5a5', fontSize: '0.75rem' }}>
                        Below 75%
                      </span>
                    )}
                  </div>
                </div>

                {/* Card 2: Today's Status */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#0284c7', textTransform: 'uppercase', fontWeight: 600 }}>
                      Daily Status
                    </span>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', marginTop: '4px' }}>
                      Today's Attendance
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>
                      {attendanceSummary.today_date ? `Date: ${attendanceSummary.today_date}` : 'Current Day'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {attendanceSummary.today_status === 'P' ? (
                      <span
                        className="status-pill"
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          padding: '6px 16px',
                          color: '#10b981',
                          borderColor: '#10b981',
                          background: 'rgba(16, 185, 129, 0.15)'
                        }}
                      >
                        Present
                      </span>
                    ) : attendanceSummary.today_status === 'A' ? (
                      <span
                        className="status-pill"
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          padding: '6px 16px',
                          color: '#ef4444',
                          borderColor: '#ef4444',
                          background: 'rgba(239, 68, 68, 0.15)'
                        }}
                      >
                        Absent
                      </span>
                    ) : (
                      <span
                        className="status-pill"
                        style={{
                          fontSize: '0.85rem',
                          padding: '6px 12px',
                          color: '#f59e0b',
                          borderColor: '#f59e0b',
                          background: 'rgba(245, 158, 11, 0.12)'
                        }}
                      >
                        Not Marked Yet
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Daily Attendance History */}
              {attendanceSummary.daily_records?.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Daily Attendance Log
                    <span className="status-pill" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                      {attendanceSummary.daily_records.length} Records
                    </span>
                  </h4>
                  <div className="table-responsive">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Attendance Status</th>
                          <th>Recorded By</th>
                          <th>Last Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceSummary.daily_records.slice((dailyAttendancePage - 1) * 10, dailyAttendancePage * 10).map(r => {
                          const isP = r.status === 'P';
                          const isA = r.status === 'A';
                          return (
                            <tr key={r.id || r.attendance_date}>
                              <td><strong>{r.attendance_date}</strong></td>
                              <td>
                                <span
                                  className="status-pill"
                                  style={{
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    color: isP ? '#10b981' : isA ? '#ef4444' : '#f59e0b',
                                    borderColor: isP ? '#10b981' : isA ? '#ef4444' : '#f59e0b',
                                    background: isP ? 'rgba(16, 185, 129, 0.12)' : isA ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)'
                                  }}
                                >
                                  {isP ? 'Present' : isA ? 'Absent' : r.status}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-secondary)' }}>
                                {r.marked_by_name || 'Faculty / Teacher'}
                              </td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {r.updated_at ? new Date(r.updated_at).toLocaleString() : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 10 Items per screen Pagination bar */}
                  <Pagination
                    currentPage={dailyAttendancePage}
                    totalItems={attendanceSummary.daily_records.length}
                    pageSize={10}
                    onPageChange={setDailyAttendancePage}
                    itemLabel="attendance logs"
                  />
                </div>
              )}

              {/* Subject-wise breakdown (if batch enrolled) */}
              {attendanceSummary.subjects?.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Subject-wise Attendance Breakdown
                  </h4>
                  <div className="table-responsive">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Subject Code</th>
                          <th>Subject Name</th>
                          <th>Attended Periods</th>
                          <th>Total Periods</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceSummary.subjects.map(s => {
                          const low = s.percentage != null && s.percentage < 75;
                          return (
                            <tr key={s.subject_id}>
                              <td><span className="status-pill">{s.subject_code}</span></td>
                              <td><strong>{s.subject_name}</strong></td>
                              <td>{s.attended_count}</td>
                              <td>{s.total_count}</td>
                              <td>
                                <span
                                  className="status-pill"
                                  style={{
                                    color: low ? '#fca5a5' : '#86efac',
                                    borderColor: low ? '#fca5a5' : '#86efac'
                                  }}
                                >
                                  {s.percentage != null ? `${s.percentage}%` : 'No classes'}
                                  {low && ' · Shortage'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!attendanceSummary.daily_records?.length && !attendanceSummary.subjects?.length && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                  No attendance sessions recorded yet. Once your faculty marks attendance, it will be reflected here.
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading attendance data...
            </div>
          )}
        </div>
      )}


      {/* TAB 5: Notifications & Notices */}
      {activeTab === 'notifications' && (
        <div className="card">
          {currentUser?.role === 'class_leader' && (
            <div style={{ padding: '16px', background: 'var(--bg-subtle, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', marginBottom: '16px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>
                📢 Post Announcement to Department Students
              </div>
              <NotificationComposer onSent={loadNotifications} />
            </div>
          )}
          <div className="card-header">
            <div>
              <div className="card-title">
                Teacher & Faculty Announcements
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Announcements sent to your cohort by teachers and college administration.
              </p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={loadNotifications}
              disabled={notifLoading}
            >
              Refresh
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {notifications.length ? (
              notifications.map(n => (
                <div
                  key={n.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>{n.title}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                      {!n.is_read && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleMarkNotifRead(n.id)}
                          style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '8px 0' }}>
                    {n.message}
                  </p>
                  <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>
                    From: {n.sender_name ? `${n.sender_name} (${formatRoleName(n.sender_role)})` : 'Administration'}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                No notifications or notices posted yet.
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Interactive Timed Quiz Modal */}
      <QuizModal
        question={activeQuizQuestion}
        isOpen={Boolean(activeQuizQuestion)}
        onClose={() => setActiveQuizQuestion(null)}
        onAnswerSubmitted={() => {
          loadQuestionsAndHistory();
        }}
      />
    </section>
  );
};
