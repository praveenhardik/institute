import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { API } from '../api/api';
import { useAuth, formatRoleName, formatUserId } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { AttendanceMarking } from '../components/AttendanceMarking';
import { StudentsByDepartment } from '../components/StudentsByDepartment';
import { PasswordInput } from '../components/PasswordInput';
import { Pagination } from '../components/Pagination';
import { CreateAccountModal, CreateAccountButton } from '../components/CreateAccountModal';
import { CreateAccountPill, PendingPill, YearTransitionPill } from '../components/ActionPills';
import { NotificationComposer } from '../components/NotificationComposer';
import YearTransitionSection from '../components/YearTransitionSection';

export const parseTeacherDeptAndYear = (u) => {
  if (!u) return { deptCode: null, year: null, deptName: null };
  const combined = [u.username, u.name, (u.email || '').split('@')[0]].filter(Boolean).join(' ').toLowerCase();
  const cleaned = combined.replace(/^(?:tec|teacher|class(?:_teacher)?|faculty)\s*\d*\s*/, '');
  
  let deptCode = null;
  const deptMap = {
    mect: { code: 'MECT', name: 'Mechatronics Engineering' },
    mech: { code: 'MECH', name: 'Mechanical Engineering' },
    aero: { code: 'AERO', name: 'Aeronautical Engineering' },
    cse: { code: 'CSE', name: 'Computer Science Engineering' },
    eee: { code: 'EEE', name: 'Electrical and Electronics Engineering' },
    ece: { code: 'ECE', name: 'Electrical and Communication Engineering' }
  };
  for (const k of ['mect', 'mech', 'aero', 'cse', 'eee', 'ece']) {
    if (cleaned.includes(k) || combined.includes(k)) {
      deptCode = deptMap[k].code;
      break;
    }
  }
  
  let year = null;
  const fields = [u.username || '', u.name || '', (u.email || '').split('@')[0]];
  for (const f of fields) {
    const mTeacher = f.toLowerCase().match(/(?:class\s*teacher|classteacher|teacher|tec|class)\s*([1-5])/);
    if (mTeacher) {
      year = Number(mTeacher[1]);
      break;
    }
    const mEnd = f.trim().toLowerCase().match(/([1-5])\s*$/);
    if (mEnd) {
      year = Number(mEnd[1]);
      break;
    }
  }
  if (year === null) {
    const mAny = combined.match(/\b([1-5])\b|([1-5])/);
    if (mAny) year = Number(mAny[1] || mAny[2]);
  }
  
  return {
    deptCode,
    deptName: deptCode ? Object.values(deptMap).find(d => d.code === deptCode)?.name : null,
    year
  };
};

export const parseStudentDeptAndYear = (st) => {
  if (!st) return { deptCode: null, year: null };
  const combined = [
    st.username,
    st.name,
    (st.email || '').split('@')[0],
    st.department_name,
    st.dept_code,
    st.roll_number,
    st.batch_name
  ].filter(Boolean).join(' ').toLowerCase();

  let deptCode = st.dept_code || null;
  const deptMap = {
    mect: 'MECT',
    mech: 'MECH',
    aero: 'AERO',
    cse: 'CSE',
    eee: 'EEE',
    ece: 'ECE'
  };
  if (!deptCode || deptCode === 'GEN') {
    for (const k of ['mect', 'mech', 'aero', 'cse', 'eee', 'ece']) {
      if (combined.includes(k)) {
        deptCode = deptMap[k];
        break;
      }
    }
  }

  let year = st.academic_year || null;
  if (!year) {
    const fields = [st.username || '', st.name || '', (st.email || '').split('@')[0]];
    for (const f of fields) {
      const mEnd = f.trim().toLowerCase().match(/([1-5])\s*$/);
      if (mEnd) {
        year = Number(mEnd[1]);
        break;
      }
    }
    if (year === null) {
      for (const f of fields) {
        const mMid = f.toLowerCase().match(/(?:stu|leader|tec|class)\s*([1-5])/);
        if (mMid) {
          year = Number(mMid[1]);
          break;
        }
      }
    }
    if (year === null) {
      const mAny = combined.match(/\b([1-5])\b|([1-5])/);
      if (mAny) year = Number(mAny[1] || mAny[2]);
    }
  }

  return { deptCode, year };
};

export const TeacherView = () => {
  const { user: currentUser } = useAuth();
  const { showAlert } = useAlert();

  const isClassTeacher = currentUser?.role === 'class_teacher';
  const isTeacher = currentUser?.role === 'teacher';

  const { deptCode: teacherDeptCode, deptName: teacherDeptName, year: teacherYear } = parseTeacherDeptAndYear(currentUser);

  const [activeTab, setActiveTab] = useState('create-q');
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showYearTransitionModal, setShowYearTransitionModal] = useState(false);

  // Department banner
  const [myDept, setMyDept] = useState(null);
  const [myDeptsList, setMyDeptsList] = useState([]);
  const [showDeptEditModal, setShowDeptEditModal] = useState(false);
  const [selectedDeptIdsForSelf, setSelectedDeptIdsForSelf] = useState([]);
  const [savingDepts, setSavingDepts] = useState(false);

  // Tab 1: Question Creation
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctOpt, setCorrectOpt] = useState('A');
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [targetType, setTargetType] = useState('all'); // 'all' | 'batch' | 'group'
  const [targetGroupId, setTargetGroupId] = useState('');
  const [targetBatchId, setTargetBatchId] = useState('');
  const [taskNumber, setTaskNumber] = useState('Task 1');
  const [availableTasks, setAvailableTasks] = useState(['Task 1']);
  const [showAddTaskInput, setShowAddTaskInput] = useState(false);
  const [newTaskNumberInput, setNewTaskNumberInput] = useState('');
  const [activeTeacherTask, setActiveTeacherTask] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [activeTeacherSearch, setActiveTeacherSearch] = useState('');
  const [explanation, setExplanation] = useState('');
  const [publishLoading, setPublishLoading] = useState(false);
  const [taskDetailsList, setTaskDetailsList] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [createTaskInput, setCreateTaskInput] = useState('');
  const [createTaskDesc, setCreateTaskDesc] = useState('');
  const [creatingTaskLoading, setCreatingTaskLoading] = useState(false);

  // Quick Add Batch in Question Creation
  const [batches, setBatches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [showQuickAddBatch, setShowQuickAddBatch] = useState(false);
  const [quickBatchName, setQuickBatchName] = useState('');
  const [quickBatchProgramId, setQuickBatchProgramId] = useState('');
  const [quickBatchLoading, setQuickBatchLoading] = useState(false);

  // Batches Tab State
  const [batchSearch, setBatchSearch] = useState('');
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [newBatchProgId, setNewBatchProgId] = useState('');
  const [newBatchNameInput, setNewBatchNameInput] = useState('');
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState(null);

  // Academic Batch Student Enrollment modal & form states
  const [enrollModalBatch, setEnrollModalBatch] = useState(null);
  const [enrollBatchStudentIds, setEnrollBatchStudentIds] = useState([]);
  const [enrollBatchLoading, setEnrollBatchLoading] = useState(false);
  const [enrollBatchSaving, setEnrollBatchSaving] = useState(false);
  const [enrollBatchSearch, setEnrollBatchSearch] = useState('');

  // Batch creation: student selection
  const [showBatchCreateStudents, setShowBatchCreateStudents] = useState(false);
  const [batchCreateStudentIds, setBatchCreateStudentIds] = useState([]);
  const [batchCreateSearch, setBatchCreateSearch] = useState('');

  // Quick Add Group in Question Creation
  const [showQuickAddGroup, setShowQuickAddGroup] = useState(false);
  const [quickGroupName, setQuickGroupName] = useState('');
  const [quickGroupDesc, setQuickGroupDesc] = useState('');
  const [quickGroupLoading, setQuickGroupLoading] = useState(false);
  const [quickSelectedStudentIds, setQuickSelectedStudentIds] = useState([]);
  const [showQuickStudentChecklist, setShowQuickStudentChecklist] = useState(false);
  const [quickStudentSearch, setQuickStudentSearch] = useState('');

  // Tab 2: Groups
  const [groups, setGroups] = useState([]);
  const [approvedStudents, setApprovedStudents] = useState(() => API.getCachedApprovedStudents());

  const scopedApprovedStudents = useMemo(() => {
    if (!teacherDeptCode || !teacherYear) return approvedStudents;
    return approvedStudents.filter(st => {
      const { deptCode, year } = parseStudentDeptAndYear(st);
      const deptMatches = !deptCode || deptCode === teacherDeptCode;
      const yearMatches = !year || Number(year) === Number(teacherYear);
      return deptMatches && yearMatches;
    });
  }, [approvedStudents, teacherDeptCode, teacherYear]);

  const departmentStudents = useMemo(() => {
    if (!teacherDeptCode) return approvedStudents;
    return approvedStudents.filter(st => {
      const { deptCode } = parseStudentDeptAndYear(st);
      return !deptCode || deptCode === teacherDeptCode;
    });
  }, [approvedStudents, teacherDeptCode]);

  const scopedPrograms = useMemo(() => {
    if (!teacherDeptCode) return programs;
    const tCode = teacherDeptCode.toLowerCase();
    const tName = (teacherDeptName || '').toLowerCase();
    const filtered = programs.filter(p => {
      const pDeptName = (p.department_name || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();
      return pDeptName.includes(tCode) || pName.includes(tCode) || (tName && pDeptName.includes(tName));
    });
    return filtered.length > 0 ? filtered : programs;
  }, [programs, teacherDeptCode, teacherDeptName]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [showStudentChecklist, setShowStudentChecklist] = useState(false);
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const [createStudentSearch, setCreateStudentSearch] = useState('');
  const [createdGroupSearch, setCreatedGroupSearch] = useState('');
  const [expandedGroupIds, setExpandedGroupIds] = useState([]);
  const [groupStudentSearchTerms, setGroupStudentSearchTerms] = useState({});
  const [groupViewModes, setGroupViewModes] = useState({}); // groupId -> 'questions' | 'members'

  // Add Students to Existing Created Groups
  const [assigningGroupId, setAssigningGroupId] = useState(null);
  const [groupAssignSelectedIds, setGroupAssignSelectedIds] = useState([]);
  const [assignStudentSearch, setAssignStudentSearch] = useState('');
  const [assigningLoading, setAssigningLoading] = useState(false);

  const getGroupViewMode = (groupId) => groupViewModes[groupId] || 'questions';
  const setGroupViewMode = (groupId, mode) => {
    setGroupViewModes(prev => ({ ...prev, [groupId]: mode }));
  };

  // Tab 3: Published Questions & Analytics
  const [myQuestions, setMyQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [expandedSubmissions, setExpandedSubmissions] = useState({}); // questionId -> submissions array
  const [openTeacherQuestionId, setOpenTeacherQuestionId] = useState(null); // questionId of clicked question in task list
  const [openTeacherTasks, setOpenTeacherTasks] = useState({});

  // Tab 4: Create Accounts (Teacher & Class Teacher)
  const [ctFacultyName, setCtFacultyName] = useState('');
  const [ctFacultyContact, setCtFacultyContact] = useState('');
  const [ctFacultyUsername, setCtFacultyUsername] = useState('');
  const [ctAcademicYear, setCtAcademicYear] = useState('1');
  const [ctFacultyPass, setCtFacultyPass] = useState('');
  const [ctFacultyRole, setCtFacultyRole] = useState('teacher');
  const [ctFacultyDeptId, setCtFacultyDeptId] = useState('');
  const [ctFacultyDeptIds, setCtFacultyDeptIds] = useState([]);
  const [ctFacultyLoading, setCtFacultyLoading] = useState(false);
  const [ctNameEligibilityNotice, setCtNameEligibilityNotice] = useState('');

  const [ctSection, setCtSection] = useState('');
  const [ctBatchId, setCtBatchId] = useState('');
  const [ctCustomSection, setCtCustomSection] = useState('');
  const [ctRollNumber, setCtRollNumber] = useState('');
  const [ctGuardianName, setCtGuardianName] = useState('');
  const [ctGuardianPhone, setCtGuardianPhone] = useState('');
  const [ctGuardianEmail, setCtGuardianEmail] = useState('');
  const [ctIsClassLeader, setCtIsClassLeader] = useState(false);
  const [sectionsList, setSectionsList] = useState([]);

  // Add Department Request (Faculty to Admin)
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [addingDeptLoading, setAddingDeptLoading] = useState(false);

  // Tab 5: Approvals (Teacher only)
  const [pendingStudents, setPendingStudents] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Tab 6: Send Notification
  const [notifTarget, setNotifTarget] = useState('student');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [sendNotifLoading, setSendNotifLoading] = useState(false);

  // Tab 7: My Notifications
  const [inboxNotifications, setInboxNotifications] = useState([]);
  const [inboxDeptFilter, setInboxDeptFilter] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  // Load Department info
  const loadMyDepartment = useCallback(async () => {
    try {
      const res = await API.getMyDepartments();
      const depts = res.departments || [];
      setMyDeptsList(depts);
      if (depts.length) {
        setMyDept(depts[0]);
      } else {
        setMyDept(null);
      }
    } catch (e) {
      console.warn('Could not load my department:', e);
    }
  }, []);

  const handleSaveMyDepartments = async (e) => {
    e.preventDefault();
    if (!selectedDeptIdsForSelf.length) {
      showAlert('Please select at least 1 department', 'warning');
      return;
    }
    if (selectedDeptIdsForSelf.length > 10) {
      showAlert('You can select up to 10 departments maximum', 'warning');
      return;
    }
    try {
      setSavingDepts(true);
      const res = await API.updateMyDepartments(selectedDeptIdsForSelf);
      showAlert(res.message || 'Departments updated successfully', 'success');
      setShowDeptEditModal(false);
      await loadMyDepartment();
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setSavingDepts(false);
    }
  };

  const toggleDeptForSelf = (deptId) => {
    const idNum = Number(deptId);
    if (isClassTeacher) {
      // Class Teacher can select only 1 department
      setSelectedDeptIdsForSelf([idNum]);
      return;
    }
    if (selectedDeptIdsForSelf.includes(idNum)) {
      setSelectedDeptIdsForSelf(selectedDeptIdsForSelf.filter(id => id !== idNum));
    } else {
      if (selectedDeptIdsForSelf.length >= 10) {
        showAlert('You can select up to 10 departments maximum', 'warning');
        return;
      }
      setSelectedDeptIdsForSelf([...selectedDeptIdsForSelf, idNum]);
    }
  };

  // Load Groups, Approved Students, Batches and Programs
  const loadGroupsAndStudents = useCallback(async () => {
    try {
      const [gRes, sRes, bRes, pRes] = await Promise.all([
        API.getTeacherGroups(),
        API.getApprovedStudents(),
        API.getBatches().catch(() => ({ batches: [] })),
        API.getPrograms().catch(() => ({ programs: [] }))
      ]);
      setGroups(gRes.groups || []);
      setApprovedStudents(sRes.students || []);
      setBatches(bRes.batches || []);
      setPrograms(pRes.programs || []);
    } catch (e) {
      console.warn('Could not load groups/students/batches:', e);
    }
  }, []);

  // Load Tasks
  const loadTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      const res = await API.getTasks();
      const serverTasks = res.tasks || [];
      const details = res.task_details || [];
      setTaskDetailsList(details);
      setAvailableTasks(prev => {
        const merged = Array.from(new Set([...serverTasks, ...prev, 'Task 1'])).filter(Boolean);
        return merged;
      });
    } catch (e) {
      console.warn('Could not load teacher tasks:', e);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const handleCreateNewTask = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanName = createTaskInput.trim();
    if (!cleanName) {
      showAlert('Please enter a task name or number (e.g. Task 2)', 'danger');
      return;
    }

    try {
      setCreatingTaskLoading(true);
      const res = await API.createTask(cleanName, createTaskDesc.trim());
      showAlert(res.message || `Task "${cleanName}" created successfully!`, 'success');
      setCreateTaskInput('');
      setCreateTaskDesc('');
      setShowCreateTaskModal(false);
      setTaskNumber(cleanName);
      if (!availableTasks.includes(cleanName)) {
        setAvailableTasks(prev => [...prev, cleanName]);
      }
      await loadTasks();
      await loadMyQuestions();
    } catch (err) {
      showAlert(err.message || 'Failed to create task', 'danger');
    } finally {
      setCreatingTaskLoading(false);
    }
  };

  // Load Questions
  const loadMyQuestions = useCallback(async () => {
    try {
      setQuestionsLoading(true);
      const res = await API.getTeacherQuestions();
      const qList = res.questions || [];
      setMyQuestions(qList);
      const qTasks = qList.map(q => q.task_number).filter(Boolean);
      if (qTasks.length > 0) {
        setAvailableTasks(prev => Array.from(new Set([...prev, ...qTasks, 'Task 1'])));
      }
    } catch (e) {
      console.warn('Could not load teacher questions:', e);
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  // Load Approvals
  const loadPending = useCallback(async () => {
    try {
      setPendingLoading(true);
      const res = await API.getPendingStudents();
      setPendingStudents(res.pending_students || res.students || []);
    } catch (e) {
      console.warn('Could not load pending students:', e);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  // Load Inbox Notifications
  const loadInbox = useCallback(async () => {
    try {
      setInboxLoading(true);
      const [nRes, dRes, sRes] = await Promise.all([
        API.getNotifications(),
        API.getDepartments(),
        API.getSections().catch(() => ({ sections: [] }))
      ]);
      setInboxNotifications(nRes.notifications || []);
      const depts = dRes.departments || [];
      setDepartments(depts);
      if (!notifTarget) {
        setNotifTarget('student');
      }
      setSectionsList(sRes.sections || []);
    } catch (e) {
      console.warn('Could not load inbox notifications:', e);
    } finally {
      setInboxLoading(false);
    }
  }, [notifTarget]);

  useEffect(() => {
    loadMyDepartment();
    loadGroupsAndStudents();
    loadMyQuestions();
    loadTasks();
    if (isTeacher || isClassTeacher) loadPending();
    loadInbox();
  }, [loadMyDepartment, loadGroupsAndStudents, loadMyQuestions, loadTasks, loadPending, loadInbox, isTeacher]);

  // Refresh departments dynamically whenever entering the Send Notification tab so newly created departments appear
  useEffect(() => {
    if (activeTab === 'send-notif') {
      API.getDepartments().then(res => {
        const list = res.departments || [];
        setDepartments(list);
        if (!notifTarget) {
          setNotifTarget('student');
        } else if (notifTarget !== 'student' && !list.some(d => String(d.id) === String(notifTarget))) {
          setNotifTarget('student');
        }
      }).catch(() => {});
    }
  }, [activeTab]);

  // Quick Add Batch action
  const handleQuickCreateBatch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!quickBatchName.trim()) {
      showAlert('Batch name is required (e.g. 2026-2030)', 'danger');
      return;
    }
    const progId = quickBatchProgramId || (programs[0]?.id || '');
    if (!progId) {
      showAlert('Please select or specify a programme for this batch', 'danger');
      return;
    }
    try {
      setQuickBatchLoading(true);
      const res = await API.createBatch({
        program_id: Number(progId),
        name: quickBatchName.trim()
      });
      showAlert(res.message || 'Batch created successfully!', 'success');
      const bRes = await API.getBatches();
      setBatches(bRes.batches || []);
      if (res.id) {
        setTargetBatchId(String(res.id));
      }
      setQuickBatchName('');
      setQuickBatchProgramId('');
      setShowQuickAddBatch(false);
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setQuickBatchLoading(false);
    }
  };

  // Delete Batch Permanently from All Users
  const handleDeleteBatch = async (batch) => {
    if (!window.confirm(`Are you sure you want to permanently delete batch "${batch.name}"?\n\nThis will permanently delete this batch, all its sections, and remove it from all enrolled students and users across the system. This cannot be undone.`)) {
      return;
    }
    try {
      setDeletingBatchId(batch.id);
      const res = await API.deleteBatch(batch.id);
      showAlert(res.message || `Batch "${batch.name}" deleted permanently from all users`, 'success');
      await Promise.all([
        loadGroupsAndStudents(),
        loadInbox()
      ]);
    } catch (err) {
      showAlert(err.message || 'Failed to delete batch', 'danger');
    } finally {
      setDeletingBatchId(null);
    }
  };

  // Create Batch from Batches Tab
  const handleCreateBatchInTab = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newBatchNameInput.trim()) {
      showAlert('Batch name is required (e.g. 2026-2030)', 'danger');
      return;
    }
    const progId = newBatchProgId || (scopedPrograms[0]?.id || programs[0]?.id || '');
    if (!progId) {
      showAlert('Please select a programme for this batch', 'danger');
      return;
    }
    try {
      setCreatingBatch(true);
      const res = await API.createBatch({
        program_id: Number(progId),
        name: newBatchNameInput.trim(),
        student_ids: batchCreateStudentIds
      });
      showAlert(res.message || 'Batch created successfully!', 'success');
      setNewBatchNameInput('');
      setNewBatchProgId('');
      setBatchCreateStudentIds([]);
      setShowBatchCreateStudents(false);
      setShowAddBatchModal(false);
      await Promise.all([
        loadGroupsAndStudents(),
        loadInbox()
      ]);
    } catch (err) {
      showAlert(err.message || 'Failed to create batch', 'danger');
    } finally {
      setCreatingBatch(false);
    }
  };

  const openEnrollBatchModal = async (batch) => {
    setEnrollModalBatch(batch);
    setEnrollBatchSearch('');
    setEnrollBatchLoading(true);
    try {
      const res = await API.getBatchStudents(batch.id);
      const ids = (res.students || []).map(s => s.id);
      setEnrollBatchStudentIds(ids);
    } catch (e) {
      setEnrollBatchStudentIds([]);
    } finally {
      setEnrollBatchLoading(false);
    }
  };

  const handleSaveBatchEnrollment = async () => {
    if (!enrollModalBatch) return;
    try {
      setEnrollBatchSaving(true);
      const res = await API.assignBatchStudents(enrollModalBatch.id, enrollBatchStudentIds, 'set');
      showAlert(res.message || `Successfully enrolled ${enrollBatchStudentIds.length} student(s) in batch ${enrollModalBatch.name}`, 'success');
      setEnrollModalBatch(null);
      await loadGroupsAndStudents();
    } catch (err) {
      showAlert(err.message || 'Failed to update batch student enrollment', 'danger');
    } finally {
      setEnrollBatchSaving(false);
    }
  };

  const filteredBatches = batches.filter(b => {
    if (!batchSearch.trim()) return true;
    const term = batchSearch.toLowerCase();
    return (
      (b.name && b.name.toLowerCase().includes(term)) ||
      (b.program_name && b.program_name.toLowerCase().includes(term)) ||
      (b.department_name && b.department_name.toLowerCase().includes(term))
    );
  });

  // Quick Add Group action
  const handleQuickCreateGroup = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!quickGroupName.trim()) {
      showAlert('Group name is required', 'danger');
      return;
    }
    try {
      setQuickGroupLoading(true);
      const res = await API.createGroup(quickGroupName.trim(), quickGroupDesc.trim(), quickSelectedStudentIds);
      showAlert(res.message || 'Group created successfully!', 'success');
      const newGid = res.group_id;
      const gRes = await API.getTeacherGroups();
      setGroups(gRes.groups || []);
      if (newGid) {
        setTargetGroupId(String(newGid));
      }
      setQuickGroupName('');
      setQuickGroupDesc('');
      setQuickSelectedStudentIds([]);
      setShowQuickStudentChecklist(false);
      setQuickStudentSearch('');
      setShowQuickAddGroup(false);
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setQuickGroupLoading(false);
    }
  };

  // 1. Publish Question
  const handlePublishQuestion = async (e) => {
    e.preventDefault();
    if (!qText.trim() || !optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
      showAlert('Question text and all four options are required', 'danger');
      return;
    }
    const cleanTaskNumber = (taskNumber || '').trim();
    if (!cleanTaskNumber) {
      showAlert('Task number is mandatory. Please select or add a task number.', 'danger');
      return;
    }
    if (targetType === 'group' && (!targetGroupId || targetGroupId === '')) {
      showAlert('Please select a target group from the list', 'danger');
      return;
    }
    if (targetType === 'batch' && (!targetBatchId || targetBatchId === '')) {
      showAlert('Please select a batch from the list', 'danger');
      return;
    }

    try {
      setPublishLoading(true);
      let effectiveTargetType = targetType;
      let effectiveGroupId = targetType === 'group' ? Number(targetGroupId) : null;

      if (targetType === 'batch') {
        const selectedBatch = batches.find(b => String(b.id) === String(targetBatchId));
        const batchName = selectedBatch ? selectedBatch.name : `Batch ${targetBatchId}`;
        const autoGroupName = `Batch ${batchName} Cohort`;

        let existingGrp = groups.find(g => g.name === autoGroupName);
        if (!existingGrp) {
          const batchStudents = scopedApprovedStudents.filter(st => String(st.batch_id) === String(targetBatchId));
          const studentIds = batchStudents.map(st => st.id);
          const grpRes = await API.createGroup(autoGroupName, `Cohort group for ${batchName}`, studentIds);
          effectiveGroupId = grpRes.group_id;
          await loadGroupsAndStudents();
        } else {
          effectiveGroupId = existingGrp.id;
        }
        effectiveTargetType = 'group';
      }

      const res = await API.createQuestion({
        question_text: qText.trim(),
        option_a: optA.trim(),
        option_b: optB.trim(),
        option_c: optC.trim(),
        option_d: optD.trim(),
        correct_option: correctOpt,
        duration_seconds: Number(durationSeconds),
        target_type: effectiveTargetType,
        target_group_id: effectiveGroupId,
        group_id: effectiveGroupId,
        task_number: cleanTaskNumber,
        explanation: null
      });

      showAlert(res.message || `Question published successfully under ${cleanTaskNumber}!`, 'success');
      setQText('');
      setOptA('');
      setOptB('');
      setOptC('');
      setOptD('');
      setExplanation('');
      setTargetType('all');
      setTargetGroupId('');
      setTargetBatchId('');
      if (!availableTasks.includes(cleanTaskNumber)) {
        setAvailableTasks(prev => [...prev, cleanTaskNumber]);
      }
      setActiveTeacherTask(cleanTaskNumber);
      loadMyQuestions();
      loadGroupsAndStudents();
      loadTasks();
      setActiveTab('analytics');
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setPublishLoading(false);
    }
  };

  // 2. Create Group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      showAlert('Group name is required', 'danger');
      return;
    }

    try {
      setCreateGroupLoading(true);
      const res = await API.createGroup(
        newGroupName.trim(),
        newGroupDesc.trim(),
        selectedStudentIds
      );
      showAlert(res.message || 'Group created successfully', 'success');
      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedStudentIds([]);
      setCreateStudentSearch('');
      setShowStudentChecklist(false);
      if (res.group_id) {
        setExpandedGroupIds(prev => [...prev, res.group_id]);
      }
      loadGroupsAndStudents();
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setCreateGroupLoading(false);
    }
  };

  // Toggle student assignment in checklist
  const toggleStudentSelection = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Select all / clear filtered students in create group checklist
  const handleSelectAllFilteredStudents = (filteredList) => {
    const ids = filteredList.map(s => s.id);
    setSelectedStudentIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const handleClearSelectedStudents = () => {
    setSelectedStudentIds([]);
  };

  // Add all available students to new group being created
  const handleAddAllAvailableToNewGroup = () => {
    const allIds = scopedApprovedStudents.map(s => s.id);
    setSelectedStudentIds(allIds);
    setShowStudentChecklist(true);
  };

  // Open / toggle Add Students panel for a created group
  const handleOpenAddStudents = (groupId) => {
    if (assigningGroupId === groupId) {
      setAssigningGroupId(null);
      setGroupAssignSelectedIds([]);
      setAssignStudentSearch('');
      return;
    }
    setAssigningGroupId(groupId);
    setGroupAssignSelectedIds([]);
    setAssignStudentSearch('');
    // Automatically ensure group is expanded and in members view
    if (!expandedGroupIds.includes(groupId)) {
      setExpandedGroupIds(prev => [...prev, groupId]);
    }
    setGroupViewMode(groupId, 'members');
  };

  // Select all available students (excluding already added members) for an existing group
  const handleAddAllAvailableToExistingGroup = (group) => {
    const currentMemberIds = new Set((group.students || group.members || []).map(s => s.id));
    // Constraint: added students must not be select!
    const availableIds = scopedApprovedStudents
      .filter(st => !currentMemberIds.has(st.id))
      .map(st => st.id);
    setGroupAssignSelectedIds(availableIds);
  };

  // Toggle selection of student when adding to existing group
  const handleToggleGroupAssignStudent = (stId, isAlreadyMember) => {
    // Constraint: added students must not be select!
    if (isAlreadyMember) return;
    setGroupAssignSelectedIds(prev =>
      prev.includes(stId) ? prev.filter(x => x !== stId) : [...prev, stId]
    );
  };

  // Save student additions to existing group
  const handleSaveAddStudentsToGroup = async (group) => {
    if (groupAssignSelectedIds.length === 0) {
      showAlert('Please select at least one available student to add.', 'warning');
      return;
    }
    try {
      setAssigningLoading(true);
      const currentMemberIds = (group.students || group.members || []).map(s => s.id);
      const combinedIds = Array.from(new Set([...currentMemberIds, ...groupAssignSelectedIds]));
      const res = await API.assignStudentsToGroup(group.id, combinedIds);
      showAlert(res.message || `Successfully added ${groupAssignSelectedIds.length} student(s) to "${group.name}".`, 'success');
      setAssigningGroupId(null);
      setGroupAssignSelectedIds([]);
      setAssignStudentSearch('');
      await loadGroupsAndStudents();
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setAssigningLoading(false);
    }
  };

  // Remove individual student from group
  const handleRemoveStudentFromGroup = async (groupId, groupName, studentId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from "${groupName}"?`)) return;
    try {
      const targetGrp = groups.find(g => g.id === groupId);
      const currentMemberIds = (targetGrp?.students || targetGrp?.members || []).map(s => s.id);
      const remainingIds = currentMemberIds.filter(id => id !== studentId);
      const res = await API.assignStudentsToGroup(groupId, remainingIds);
      showAlert(res.message || `Removed ${studentName} from "${groupName}".`, 'success');
      await loadGroupsAndStudents();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Toggle group expansion to view student list
  const toggleGroupExpand = (groupId) => {
    setExpandedGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  // Delete group
  const handleDeleteGroup = async (groupId, groupName) => {
    if (!window.confirm(`Are you sure you want to delete the group "${groupName}"?`)) {
      return;
    }
    try {
      const res = await API.deleteGroup(groupId);
      showAlert(res.message || 'Group deleted successfully', 'success');
      loadGroupsAndStudents();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Toggle submissions view for question
  const toggleSubmissions = async (questionId) => {
    if (expandedSubmissions[questionId]) {
      setExpandedSubmissions(prev => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });
      return;
    }

    try {
      const res = await API.getQuestionSubmissions(questionId);
      setExpandedSubmissions(prev => ({
        ...prev,
        [questionId]: res.submissions || []
      }));
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Delete question completely
  const handleDeleteQuestion = async (questionId, questionText) => {
    const preview = questionText && questionText.length > 50 ? questionText.slice(0, 50) + '...' : (questionText || 'this question');
    if (!window.confirm(`Are you sure you want to completely delete "${preview}"?\n\nThis will permanently delete the question and all associated submissions. This cannot be undone.`)) {
      return;
    }
    try {
      const res = await API.deleteQuestion(questionId);
      showAlert(res.message || 'Question deleted successfully', 'success');
      setExpandedSubmissions(prev => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });
      loadMyQuestions();
    } catch (err) {
      showAlert(err.message || 'Failed to delete question', 'danger');
    }
  };

  // Delete task completely
  const handleDeleteTask = async (taskNumber) => {
    if (!taskNumber) return;
    const questionsInTask = groupedTeacherQuestions[taskNumber] || [];
    const count = questionsInTask.length;
    if (!window.confirm(`Are you sure you want to completely delete "${taskNumber}"?\n\nThis will permanently delete all ${count} question(s) published under ${taskNumber} and all associated student submissions. This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await API.deleteTask(taskNumber);
      showAlert(res.message || `Task "${taskNumber}" and all associated questions deleted successfully`, 'success');
      if (activeTeacherTask === taskNumber) {
        setActiveTeacherTask('');
      }
      loadMyQuestions();
    } catch (err) {
      showAlert(err.message || `Failed to delete task "${taskNumber}"`, 'danger');
    }
  };

  // 3. Create Account (Teacher / Class Teacher can create Teachers, Class Leaders, Students)
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!ctFacultyName.trim() || !ctFacultyContact.trim() || !ctFacultyPass.trim() || !ctFacultyUsername.trim()) {
      showAlert('All mandatory fields are required', 'danger');
      return;
    }

    if (ctNameEligibilityNotice) {
      showAlert(ctNameEligibilityNotice, 'danger');
      return;
    }

    try {
      setCtFacultyLoading(true);
      const checkRes = await API.checkName(ctFacultyName.trim());
      if (checkRes && !checkRes.eligible) {
        setCtNameEligibilityNotice(checkRes.message);
        showAlert(checkRes.message, 'danger');
        return;
      }
      const extra = {};
      if (ctFacultyRole === 'teacher') {
        if (ctFacultyDeptIds.length === 0 && !ctFacultyDeptId) {
          showAlert('Department is mandatory. Please select at least one department for the teacher.', 'danger');
          return;
        }
        if (ctFacultyDeptIds.length > 10) {
          showAlert('A teacher can be assigned to a maximum of 10 departments.', 'warning');
          return;
        }
        const selIds = ctFacultyDeptIds.length > 0 ? ctFacultyDeptIds : [ctFacultyDeptId];
        extra.department_ids = selIds;
        extra.department_id = selIds[0];
      } else {
        if (!ctFacultyDeptId) {
          showAlert('Department is mandatory. Please select an assigned department.', 'danger');
          return;
        }
        extra.department_id = ctFacultyDeptId;
        extra.department_ids = [ctFacultyDeptId];
      }
      if (['student', 'class_leader'].includes(ctFacultyRole)) {
        if (!ctBatchId) {
          showAlert('Academic Batch / Year is mandatory when creating student accounts', 'danger');
          return;
        }
        extra.batch_id = Number(ctBatchId);
        extra.academic_year = Number(ctAcademicYear || 1);
        const finalSec = ctSection === 'custom' ? ctCustomSection.trim() : ctSection;
        if (finalSec) extra.section_id = finalSec;
        if (ctRollNumber.trim()) extra.roll_number = ctRollNumber.trim();
        if (ctGuardianName.trim()) extra.guardian_name = ctGuardianName.trim();
        if (ctGuardianPhone.trim()) extra.guardian_phone = ctGuardianPhone.trim();
        if (ctGuardianEmail.trim()) extra.guardian_email = ctGuardianEmail.trim();
      }
      const effectiveRole = (ctFacultyRole === 'student' && ctIsClassLeader) ? 'class_leader' : ctFacultyRole;
      const res = await API.createAccount(
        ctFacultyName.trim(),
        ctFacultyContact.trim(),
        ctFacultyPass.trim(),
        effectiveRole,
        ctFacultyUsername.trim(),
        extra
      );
      showAlert(res.message || `Account for ${ctFacultyName.trim()} created successfully!`, 'success');
      if (res.user && ['student', 'class_leader'].includes(effectiveRole)) {
        setApprovedStudents(prev => [{
          id: res.user.id,
          name: res.user.name || ctFacultyName.trim(),
          email: res.user.email || ctFacultyContact.trim(),
          username: ctFacultyUsername.trim(),
          roll_number: ctRollNumber.trim() || `REG-${res.user.id}`
        }, ...prev.filter(s => s.id !== res.user.id)]);
      }
      setCtFacultyName('');
      setCtNameEligibilityNotice('');
      setCtFacultyContact('');
      setCtFacultyUsername('');
      setCtAcademicYear('1');
      setCtFacultyPass('');
      setCtFacultyDeptIds([]);
      setCtFacultyDeptId('');
      setCtSection('');
      setCtBatchId('');
      setCtCustomSection('');
      setCtRollNumber('');
      setCtGuardianName('');
      setCtGuardianPhone('');
      setCtGuardianEmail('');
      setCtIsClassLeader(false);
      loadGroupsAndStudents();
    } catch (err) {
      showAlert(err.message, 'danger');
      if (err.message && err.message.toLowerCase().includes('not eligible')) {
        setCtNameEligibilityNotice(err.message);
      }
    } finally {
      setCtFacultyLoading(false);
    }
  };

  // Add Department Request (Faculty to Admin approval)
  const handleRequestAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim() || !newDeptCode.trim()) {
      showAlert('Department name and department code are required', 'warning');
      return;
    }
    try {
      setAddingDeptLoading(true);
      const res = await API.createDepartmentRequest(newDeptName.trim(), newDeptCode.trim().toUpperCase());
      showAlert(res.message || 'Department request submitted for Admin approval!', 'success');
      setNewDeptName('');
      setNewDeptCode('');
      setShowAddDeptModal(false);
      const dRes = await API.getDepartments();
      setDepartments(dRes.departments || []);
      await loadMyDepartment();
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setAddingDeptLoading(false);
    }
  };

  // 4. Approve / Reject Student (Teacher)
  const handleApproveStudent = async (id) => {
    try {
      const res = await API.approveStudent(id);
      showAlert(res.message || 'Student approved successfully', 'success');
      loadPending();
      loadGroupsAndStudents();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  const handleRejectStudent = async (id) => {
    if (!window.confirm('Reject this student registration?')) return;
    try {
      const res = await API.rejectStudent(id);
      showAlert(res.message || 'Student registration rejected', 'warning');
      loadPending();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // 5. Send Notification
  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifTarget) {
      showAlert('Please select a recipient department', 'danger');
      return;
    }
    if (!notifTitle.trim() || !notifMsg.trim()) {
      showAlert('Title and message are required', 'danger');
      return;
    }

    try {
      setSendNotifLoading(true);
      const res = await API.sendNotification(notifTarget, notifTitle.trim(), notifMsg.trim(), Number(notifTarget) || null);
      showAlert(res.message || 'Notification dispatched successfully!', 'success');
      setNotifTitle('');
      setNotifMsg('');
      loadInbox();
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setSendNotifLoading(false);
    }
  };

  const handleMarkInboxRead = async (id) => {
    try {
      await API.markNotificationRead(id);
      setInboxNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (e) {
      console.warn(e);
    }
  };

  const formatDurationDisplay = (seconds) => {
    if (seconds < 60) return `${seconds} seconds`;
    const mins = Math.floor(seconds / 60);
    const rem = seconds % 60;
    return rem > 0 ? `${mins}m ${rem}s` : `${mins} minutes`;
  };

  const filteredInbox = inboxNotifications.filter(n => {
    if (inboxDeptFilter === 'all') return true;
    return String(n.department_id) === inboxDeptFilter;
  });

  const filteredApprovedStudents = scopedApprovedStudents.filter(st => {
    if (!createStudentSearch.trim()) return true;
    const q = createStudentSearch.toLowerCase();
    return (
      (st.name && st.name.toLowerCase().includes(q)) ||
      (st.email && st.email.toLowerCase().includes(q)) ||
      (st.username && st.username.toLowerCase().includes(q)) ||
      (st.department_name && st.department_name.toLowerCase().includes(q)) ||
      (st.roll_number && st.roll_number.toLowerCase().includes(q))
    );
  });

  const filteredGroups = groups.filter(g => {
    if (!createdGroupSearch.trim()) return true;
    const q = createdGroupSearch.toLowerCase();
    const studentList = g.students || g.members || [];
    return (
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.description && g.description.toLowerCase().includes(q)) ||
      studentList.some(st =>
        (st.name && st.name.toLowerCase().includes(q)) ||
        (st.email && st.email.toLowerCase().includes(q)) ||
        (st.username && st.username.toLowerCase().includes(q)) ||
        (st.department_name && st.department_name.toLowerCase().includes(q)) ||
        (st.roll_number && st.roll_number.toLowerCase().includes(q))
      )
    );
  });

  const groupedTeacherQuestions = useMemo(() => {
    const map = {};
    myQuestions.forEach(q => {
      const t = q.task_number || 'Task 1';
      if (!map[t]) map[t] = [];
      map[t].push(q);
    });
    return map;
  }, [myQuestions]);

  const teacherTaskKeys = useMemo(() => Object.keys(groupedTeacherQuestions), [groupedTeacherQuestions]);

  const effectiveTeacherTask = activeTeacherTask && teacherTaskKeys.includes(activeTeacherTask)
    ? activeTeacherTask
    : (teacherTaskKeys[0] || 'Task 1');

  const currentTeacherQuestions = groupedTeacherQuestions[effectiveTeacherTask] || [];

  const handleApplyTeacherSearch = () => {
    const q = (teacherSearchQuery || '').trim().toLowerCase();
    setActiveTeacherSearch(q);
    if (q) {
      // If current task doesn't have a match, switch to first task that does
      const currentHasMatch = (currentTeacherQuestions || []).some(item => {
        const text = `${item.question_text || ''} ${item.option_a || ''} ${item.option_b || ''} ${item.option_c || ''} ${item.option_d || ''} ${item.explanation || ''} ${item.task_number || ''} ${item.id}`.toLowerCase();
        return text.includes(q);
      });
      if (!currentHasMatch) {
        const foundTask = teacherTaskKeys.find(tKey => {
          const tQs = groupedTeacherQuestions[tKey] || [];
          return tQs.some(item => {
            const text = `${item.question_text || ''} ${item.option_a || ''} ${item.option_b || ''} ${item.option_c || ''} ${item.option_d || ''} ${item.explanation || ''} ${item.task_number || ''} ${item.id}`.toLowerCase();
            return text.includes(q);
          });
        });
        if (foundTask) {
          setActiveTeacherTask(foundTask);
        }
      }
    }
  };

  const handleClearTeacherSearch = () => {
    setTeacherSearchQuery('');
    setActiveTeacherSearch('');
  };

  const displayedTeacherQuestions = useMemo(() => {
    if (!activeTeacherSearch) return currentTeacherQuestions;
    return currentTeacherQuestions.filter(q => {
      const text = `${q.question_text || ''} ${q.option_a || ''} ${q.option_b || ''} ${q.option_c || ''} ${q.option_d || ''} ${q.explanation || ''} ${q.task_number || ''} ${q.id}`.toLowerCase();
      return text.includes(activeTeacherSearch);
    });
  }, [currentTeacherQuestions, activeTeacherSearch]);

  const handleNextTeacherTask = () => {
    if (!teacherTaskKeys.length) return;
    const curIdx = teacherTaskKeys.indexOf(effectiveTeacherTask);
    const nextIdx = (curIdx + 1) % teacherTaskKeys.length;
    setActiveTeacherTask(teacherTaskKeys[nextIdx]);
  };

  const handlePrevTeacherTask = () => {
    if (!teacherTaskKeys.length) return;
    const curIdx = teacherTaskKeys.indexOf(effectiveTeacherTask);
    const prevIdx = (curIdx - 1 + teacherTaskKeys.length) % teacherTaskKeys.length;
    setActiveTeacherTask(teacherTaskKeys[prevIdx]);
  };

  const allAvailableTasksList = useMemo(() => {
    const names = Array.from(new Set([
      ...(availableTasks || []),
      ...Object.keys(groupedTeacherQuestions || {}),
      ...(taskDetailsList || []).map(t => typeof t === 'string' ? t : t?.task_number),
      'Task 1'
    ])).filter(Boolean);

    names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    return names.map(tName => {
      const questions = (groupedTeacherQuestions && groupedTeacherQuestions[tName]) || [];
      const fromDetails = (taskDetailsList || []).find(t => (typeof t === 'object' && t?.task_number === tName)) || {};
      const qCount = questions.length || fromDetails.question_count || 0;
      const totalSubs = questions.reduce((acc, q) => acc + (q?.total_submissions || 0), 0) || fromDetails.total_submissions || 0;
      return {
        task_number: tName,
        questions,
        question_count: qCount,
        total_submissions: totalSubs
      };
    });
  }, [availableTasks, groupedTeacherQuestions, taskDetailsList]);

  const suggestedNextTaskName = useMemo(() => {
    let maxNum = 1;
    allAvailableTasksList.forEach(t => {
      const match = (t.task_number || '').match(/^Task\s+(\d+)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    return `Task ${maxNum + 1}`;
  }, [allAvailableTasksList]);

  return (
    <section>
      {/* Department Banner */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: 'var(--radius-md)',
          padding: '16px 22px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#4f46e5', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              {isClassTeacher ? 'Assigned Department' : 'Assigned Departments'}
            </span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{
                padding: '3px 12px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderColor: '#059669'
              }}
              onClick={() => setShowAddDeptModal(true)}
              title="Request to add a new department for admin approval"
            >
              Add Department
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {myDeptsList.length > 0 ? (
              myDeptsList.map(d => (
                <span
                  key={d.id}
                  className="status-pill"
                  style={{
                    fontSize: '0.88rem',
                    padding: '4px 12px',
                    background: '#eef2ff',
                    color: '#4338ca',
                    border: '1px solid #c7d2fe',
                    fontWeight: 700
                  }}
                >
                  {d.name} ({d.code})
                </span>
              ))
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No departments assigned yet. Contact administrator if department assignment is needed.
              </span>
            )}
          </div>
        </div>
        {myDept && myDept.hod_name && (
          <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Head of Department: <strong style={{ color: 'var(--text-primary)' }}>{myDept.hod_name}</strong>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="card-header" style={{ marginBottom: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            Faculty & Examination Dashboard
            {teacherDeptCode && teacherYear && (
              <span style={{ fontSize: '0.8rem', fontWeight: 600, background: 'rgba(56, 189, 248, 0.15)', color: '#0284c7', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '9999px', padding: '2px 10px' }}>
                {teacherDeptCode} · Year {teacherYear}
              </span>
            )}
          </h1>
          <p className="card-description" style={{ fontSize: '0.84rem', margin: '2px 0 0' }}>
            Author timed quiz assessments (30s to 1hr), organize cohort groups, evaluate live analytics, and mark attendance.
          </p>
        </div>
      </div>

      {/* 2-Column Portal Layout: Left side vertical navigation, Right side content */}
      <div className="portal-layout">
        <div className="portal-sidebar">
          <button
            className={`tab-btn ${activeTab === 'create-q' ? 'active' : ''}`}
            onClick={() => setActiveTab('create-q')}
          >
            Create & Publish Question
          </button>
          <button
            className={`tab-btn ${activeTab === 'batches' ? 'active' : ''}`}
            onClick={() => setActiveTab('batches')}
          >
            Batches
          </button>
          <button
            className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            Manage Student Groups
          </button>
          <button
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Published Questions & Analytics
          </button>
          {isClassTeacher && (
            <button
              className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              Attendance
            </button>
          )}
          <button
            className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('tasks');
              loadTasks();
            }}
          >
            Tasks
          </button>
          <button
            className={`tab-btn ${activeTab === 'dept-students' ? 'active' : ''}`}
            onClick={() => setActiveTab('dept-students')}
          >
            Students by Department
          </button>
          <button
            className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('approvals');
              loadPending();
            }}
          >
            Registration Approvals {pendingStudents.length > 0 ? `(${pendingStudents.length})` : ''}
          </button>
        </div>

        {/* Create Account Modal Popup */}
        <CreateAccountModal
          isOpen={showCreateAccountModal}
          onClose={() => setShowCreateAccountModal(false)}
          onCreated={() => loadGroupsAndStudents()}
          currentUser={currentUser}
        />

        {/* Pending Approvals Modal Popup for Teacher */}
        {showPendingModal && createPortal(
          <div
            className="modal-overlay active"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowPendingModal(false);
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
                    {pendingStudents.length} Pending
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={loadPending} disabled={pendingLoading}>
                    Refresh Queue
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPendingModal(false)}>
                    ✕ Close
                  </button>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 12px 0' }}>
                Student and Class Leader account registrations waiting for your approval or rejection.
              </p>

              <div className="table-responsive">
                <table className="custom-table dark-header-table">
                  <thead className="dark-header-thead" style={{ background: '#1e293b' }}>
                    <tr>
                      <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>User ID</th>
                      <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Name</th>
                      <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Email / Phone</th>
                      <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Role</th>
                      <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Department</th>
                      <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Registered</th>
                      <th style={{ textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingStudents.length ? (
                      pendingStudents.map((st) => (
                        <tr key={st.id}>
                          <td style={{ textAlign: 'center' }}>{formatUserId(st.id)}</td>
                          <td style={{ textAlign: 'center' }}><strong>{st.name}</strong></td>
                          <td style={{ textAlign: 'center' }}>{st.email}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`user-role-pill role-${st.role}`}>{formatRoleName(st.role)}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>{st.department_name || 'General'}</td>
                          <td style={{ textAlign: 'center' }}>{st.created_at ? new Date(st.created_at).toLocaleDateString() : '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleApproveStudent(st.id)}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleRejectStudent(st.id)}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                          No pending registrations waiting for review.
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

        <div className="portal-main-content">
          {/* Right-side tools (moved out of the left menu): create accounts and dispatch notices */}
          {(isTeacher || isClassTeacher) && (
            <>
              <div className="card" style={{ marginBottom: '16px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div className="card-title" style={{ marginBottom: 0 }}>Create Account & Approvals</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {isClassTeacher && (
                      <YearTransitionPill onClick={() => setShowYearTransitionModal(true)} />
                    )}
                    <PendingPill
                      label="Approval pending"
                      count={pendingStudents.length}
                      onClick={() => {
                        loadPending();
                        setShowPendingModal(true);
                      }}
                    />
                    <CreateAccountPill onClick={() => setShowCreateAccountModal(true)} />
                  </div>
                </div>
              </div>

              <details className="card" style={{ marginBottom: '16px', padding: '12px 16px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  📢 Dispatch Notification (students or department)
                </summary>
                <div style={{ marginTop: '12px' }}>
                  <NotificationComposer />
                </div>
              </details>
            </>
          )}

          {/* TAB 1: Create Question */}
      {activeTab === 'create-q' && (
        <>
          {isClassTeacher && showYearTransitionModal && (
            <YearTransitionSection
              isOpen={showYearTransitionModal}
              onClose={() => setShowYearTransitionModal(false)}
              currentUser={currentUser}
              onSuccess={() => {
                if (typeof loadGroupsAndStudents === 'function') loadGroupsAndStudents();
                if (typeof loadMyQuestions === 'function') loadMyQuestions();
              }}
            />
          )}
        <div className="card">
          <div className="card-title">
            Author New Assessment Question
          </div>
          <p className="card-description" style={{ marginBottom: '20px' }}>
            Set question text, 4 choices, active countdown timer limit (30s to 1 hour), and select target audience.
          </p>

          {teacherDeptCode && teacherYear && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '1.4rem' }}>🎯</span>
              <div>
                <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '0.95rem' }}>
                  Target Assessment Scope: {teacherDeptName || teacherDeptCode} (Year {teacherYear} Only)
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Based on your faculty profile (<strong>{currentUser?.username || currentUser?.name}</strong>), questions and student cohorts are designated exclusively to <strong>{teacherDeptCode}</strong> students in <strong>Year {teacherYear}</strong>.
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handlePublishQuestion}>
            <div className="form-group">
              <label className="form-label">Question Text <span className="req">*</span></label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Enter your assessment question here..."
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Option A <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Answer option A"
                  value={optA}
                  onChange={(e) => setOptA(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Option B <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Answer option B"
                  value={optB}
                  onChange={(e) => setOptB(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Option C <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Answer option C"
                  value={optC}
                  onChange={(e) => setOptC(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Option D <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Answer option D"
                  value={optD}
                  onChange={(e) => setOptD(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Correct Answer Option <span className="req">*</span></label>
                <select
                  className="form-select"
                  value={correctOpt}
                  onChange={(e) => setCorrectOpt(e.target.value)}
                  required
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>

              {/* Timer Duration Slider */}
              <div className="form-group">
                <label className="form-label">
                  Question Time Limit:{' '}
                  <span style={{ color: '#0284c7', fontWeight: 700 }}>
                    {formatDurationDisplay(durationSeconds)}
                  </span>{' '}
                  <span className="req">*</span>
                </label>
                <input
                  type="range"
                  min="30"
                  max="3600"
                  step="15"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>Min: 30s</span>
                  <span>5 mins (300s)</span>
                  <span>Max: 1 hour (3600s)</span>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Publish Target <span className="req">*</span></label>
                <select
                  className="form-select"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  required
                >
                  <option value="all">
                    {teacherDeptCode && teacherYear ? `All ${teacherDeptCode} (Year ${teacherYear}) Students` : 'All Department Students'}
                  </option>
                  <option value="batch">Batch (Academic Cohort)</option>
                  <option value="group">Specific Student Group</option>
                </select>
              </div>

              {/* Batch Selector with ADD Button */}
              {targetType === 'batch' && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Batch <span className="req">*</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowQuickAddBatch(p => !p)}
                      style={{ padding: '3px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>{showQuickAddBatch ? 'Cancel' : 'ADD Batch'}</span>
                    </button>
                  </div>

                  {!showQuickAddBatch ? (
                    <select
                      className="form-select"
                      value={targetBatchId}
                      onChange={(e) => setTargetBatchId(e.target.value)}
                      required={!showQuickAddBatch}
                    >
                      <option value="">-- Choose a batch --</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} · {b.program_name || b.department_name || 'Academic Batch'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff', marginBottom: '8px' }}>
                        Quick Add New Batch
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <select
                          className="form-select"
                          value={quickBatchProgramId}
                          onChange={e => setQuickBatchProgramId(e.target.value)}
                          style={{ fontSize: '0.88rem' }}
                        >
                          <option value="">-- Select Programme --</option>
                          {programs.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.degree})</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Batch Name (e.g. 2026-2030) *"
                          value={quickBatchName}
                          onChange={e => setQuickBatchName(e.target.value)}
                          style={{ fontSize: '0.88rem', padding: '8px 12px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={quickBatchLoading || !quickBatchName.trim()}
                            onClick={handleQuickCreateBatch}
                          >
                            {quickBatchLoading ? 'Saving...' : 'Save & Select Batch'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setShowQuickAddBatch(false);
                              setQuickBatchName('');
                              setQuickBatchProgramId('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {batches.length === 0 && !showQuickAddBatch && (
                    <div style={{ marginTop: '6px', fontSize: '0.82rem', color: '#b45309' }}>
                      No batches found. Click <strong>ADD Batch</strong> above to create one.
                    </div>
                  )}
                </div>
              )}

              {/* Select Target Group with ADD Button */}
              {targetType === 'group' && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Select Target Group <span className="req">*</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowQuickAddGroup(p => !p)}
                      style={{ padding: '3px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>{showQuickAddGroup ? 'Cancel' : 'ADD Group'}</span>
                    </button>
                  </div>

                  {!showQuickAddGroup ? (
                    <select
                      className="form-select"
                      value={targetGroupId}
                      onChange={(e) => setTargetGroupId(e.target.value)}
                      required={!showQuickAddGroup}
                    >
                      <option value="">-- Choose a group --</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.students?.length ?? g.members?.length ?? g.student_count ?? 0} students)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff', marginBottom: '8px' }}>
                        Quick Add New Group
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Group Name (e.g. Algorithms Cohort B) *"
                          value={quickGroupName}
                          onChange={e => setQuickGroupName(e.target.value)}
                          style={{ fontSize: '0.88rem', padding: '8px 12px' }}
                        />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Description (Optional)"
                          value={quickGroupDesc}
                          onChange={e => setQuickGroupDesc(e.target.value)}
                          style={{ fontSize: '0.88rem', padding: '8px 12px' }}
                        />
                        {/* Student assignment section in Quick Add Group */}
                        <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <label style={{ margin: 0, fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>
                              Assign Students:
                              {quickSelectedStudentIds.length > 0 && (
                                <span style={{ color: '#10b981', marginLeft: '6px', fontWeight: 600 }}>
                                  ({quickSelectedStudentIds.length} selected)
                                </span>
                              )}
                            </label>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  const allIds = scopedApprovedStudents.map(s => s.id);
                                  setQuickSelectedStudentIds(allIds);
                                  setShowQuickStudentChecklist(true);
                                }}
                                style={{
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  borderColor: 'rgba(16, 185, 129, 0.4)',
                                  color: '#047857',
                                  padding: '3px 8px',
                                  fontSize: '0.74rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Add all available students to this group"
                              >
                                <span>Add All Available Students ({scopedApprovedStudents.length})</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setShowQuickStudentChecklist(p => !p)}
                                style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                              >
                                {showQuickStudentChecklist ? 'Hide List' : `Pick Students (${quickSelectedStudentIds.length})`}
                              </button>
                            </div>
                          </div>

                          {showQuickStudentChecklist && (
                            <div
                              style={{
                                background: '#f8fafc',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '8px',
                                marginTop: '6px'
                              }}
                            >
                              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Search available students..."
                                  value={quickStudentSearch}
                                  onChange={(e) => setQuickStudentSearch(e.target.value)}
                                  style={{ padding: '4px 8px', fontSize: '0.78rem', flex: 1 }}
                                />
                                {quickStudentSearch && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setQuickStudentSearch('')}
                                    style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                                  >
                                    ✕
                                  </button>
                                )}
                                {quickSelectedStudentIds.length > 0 && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setQuickSelectedStudentIds([])}
                                    style={{ color: '#f87171', padding: '2px 6px', fontSize: '0.72rem' }}
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>

                              <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {scopedApprovedStudents
                                  .filter(st => {
                                    if (!quickStudentSearch.trim()) return true;
                                    const q = quickStudentSearch.toLowerCase();
                                    return (
                                      (st.name && st.name.toLowerCase().includes(q)) ||
                                      (st.email && st.email.toLowerCase().includes(q)) ||
                                      (st.username && st.username.toLowerCase().includes(q)) ||
                                      (st.department_name && st.department_name.toLowerCase().includes(q)) ||
                                      (st.roll_number && st.roll_number.toLowerCase().includes(q))
                                    );
                                  })
                                  .map(st => {
                                    const isChecked = quickSelectedStudentIds.includes(st.id);
                                    return (
                                      <label
                                        key={st.id}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          gap: '6px',
                                          padding: '4px 6px',
                                          borderRadius: '3px',
                                          cursor: 'pointer',
                                          background: isChecked ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                          fontSize: '0.78rem'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              setQuickSelectedStudentIds(prev =>
                                                prev.includes(st.id) ? prev.filter(x => x !== st.id) : [...prev, st.id]
                                              );
                                            }}
                                            style={{ accentColor: '#10b981', cursor: 'pointer', width: '14px', height: '14px' }}
                                          />
                                          <span style={{ color: '#fff', fontWeight: isChecked ? 600 : 400 }}>
                                            {st.name} {st.roll_number ? `(${st.roll_number})` : ''}
                                          </span>
                                        </div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                          {st.department_name || ''}
                                        </span>
                                      </label>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={quickGroupLoading || !quickGroupName.trim()}
                            onClick={handleQuickCreateGroup}
                          >
                            {quickGroupLoading ? 'Saving...' : 'Save & Select Group'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setShowQuickAddGroup(false);
                              setQuickGroupName('');
                              setQuickGroupDesc('');
                              setQuickSelectedStudentIds([]);
                              setShowQuickStudentChecklist(false);
                              setQuickStudentSearch('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {groups.length === 0 && !showQuickAddGroup && (
                    <div style={{ marginTop: '6px', fontSize: '0.82rem', color: '#b45309' }}>
                      No student groups found. Click <strong>ADD Group</strong> above to create one.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group" style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginTop: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <label className="form-label" style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Task Number</span>
                  <span className="req">*</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7e22ce', background: 'rgba(192, 132, 252, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                    Mandatory
                  </span>
                </label>

                {!showAddTaskInput && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setShowAddTaskInput(true);
                      setNewTaskNumberInput('');
                    }}
                    style={{
                      padding: '5px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      background: 'rgba(99, 102, 241, 0.25)',
                      borderColor: '#4f46e5',
                      color: '#7e22ce',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Add or create a new task number"
                  >
                    <span>+ ADD Task</span>
                  </button>
                )}
              </div>

              {!showAddTaskInput ? (
                <div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select
                      className="form-select"
                      value={taskNumber}
                      onChange={(e) => {
                        if (e.target.value === '__add_new__') {
                          setShowAddTaskInput(true);
                          setNewTaskNumberInput('');
                        } else {
                          setTaskNumber(e.target.value);
                        }
                      }}
                      style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}
                      required
                    >
                      {availableTasks.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="__add_new__">+ Create / Enter New Task Number...</option>
                    </select>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Select an existing task to add this question to the present task, or click <strong>+ ADD Task</strong> above to create a new task number.
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.45)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '0.84rem', color: '#7e22ce', marginBottom: '8px', fontWeight: 600 }}>
                    Enter New Task Number (e.g. Task 2, Task 3, Task A):
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter Task Number (e.g. Task 2)"
                      value={newTaskNumberInput}
                      onChange={(e) => setNewTaskNumberInput(e.target.value)}
                      style={{ flex: 1, minWidth: '180px' }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const trimmed = newTaskNumberInput.trim();
                        if (!trimmed) {
                          showAlert('Please enter a valid task number name (e.g. Task 2)', 'danger');
                          return;
                        }
                        if (!availableTasks.includes(trimmed)) {
                          setAvailableTasks(prev => [...prev, trimmed]);
                        }
                        setTaskNumber(trimmed);
                        setShowAddTaskInput(false);
                        setNewTaskNumberInput('');
                        showAlert(`Selected "${trimmed}" as Task Number`, 'success');
                      }}
                      style={{ padding: '8px 16px', fontWeight: 600 }}
                    >
                      Save Task
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setShowAddTaskInput(false);
                        setNewTaskNumberInput('');
                      }}
                      style={{ padding: '8px 12px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '14px 28px' }}
              disabled={publishLoading}
            >
              {publishLoading ? 'Publishing Question...' : 'Publish Question'}
            </button>
          </form>
        </div>
        </>
      )}

      {/* TAB 2: Manage Groups */}
      {activeTab === 'groups' && (
        <div className="card">
          <div className="card-title">
            Student Groups Management
          </div>
          <p className="card-description" style={{ marginBottom: '20px' }}>
            Create student cohort groups and assign approved students for targeted assessments.
          </p>

          <div className="grid-2" style={{ marginBottom: '24px' }}>
            {/* Create Group Form */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '12px' }}>
                Create New Group
              </h3>

              <form onSubmit={handleCreateGroup}>
                <div className="form-group">
                  <label className="form-label">Group Name <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Computer Science - Year 2"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Advanced Algorithms study group"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Assign Students to Group
                      {selectedStudentIds.length > 0 && (
                        <span style={{ marginLeft: '8px', color: '#10b981', fontWeight: 600, fontSize: '0.82rem' }}>
                          ({selectedStudentIds.length} selected)
                        </span>
                      )}
                    </label>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleAddAllAvailableToNewGroup}
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          borderColor: 'rgba(16, 185, 129, 0.4)',
                          color: '#047857',
                          padding: '4px 10px',
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Add all available students to this group"
                      >
                        <span>Add All Available Students</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowStudentChecklist(p => !p)}
                      >
                        {showStudentChecklist ? 'Hide List' : `Pick Students (${selectedStudentIds.length})`}
                      </button>
                    </div>
                  </div>

                  {showStudentChecklist && (
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px'
                      }}
                    >
                      {/* Search box for selecting students */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Search students by name, email, roll no, department..."
                          value={createStudentSearch}
                          onChange={(e) => setCreateStudentSearch(e.target.value)}
                          style={{ padding: '6px 10px', fontSize: '0.82rem', flex: 1 }}
                        />
                        {createStudentSearch && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setCreateStudentSearch('')}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Select All Filtered / Clear Quick Buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          Showing {filteredApprovedStudents.length} of {scopedApprovedStudents.length} students
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={handleAddAllAvailableToNewGroup}
                            style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                          >
                            Add All Available ({scopedApprovedStudents.length})
                          </button>
                          <span style={{ color: 'var(--text-muted)' }}>|</span>
                          <button
                            type="button"
                            onClick={() => handleSelectAllFilteredStudents(filteredApprovedStudents)}
                            style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                          >
                            Select Filtered
                          </button>
                          <span style={{ color: 'var(--text-muted)' }}>|</span>
                          <button
                            type="button"
                            onClick={handleClearSelectedStudents}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Student list checklist */}
                      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {filteredApprovedStudents.length ? (
                          filteredApprovedStudents.map(st => {
                            const isChecked = selectedStudentIds.includes(st.id);
                            return (
                              <label
                                key={st.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  background: isChecked ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                  transition: 'background 0.12s ease'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleStudentSelection(st.id)}
                                    style={{ accentColor: '#6366f1', cursor: 'pointer', width: '15px', height: '15px' }}
                                  />
                                  <div>
                                    <div style={{ color: '#fff', fontSize: '0.86rem', fontWeight: isChecked ? 600 : 400 }}>
                                      {st.name} {st.username ? <span style={{ fontSize: '0.75rem', color: '#4338ca' }}>@{st.username}</span> : ''}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                      {st.email}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {st.department_name && (
                                    <span className="status-pill" style={{ fontSize: '0.68rem', padding: '1px 6px', background: 'rgba(99, 102, 241, 0.15)', color: '#4338ca', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                                      {st.department_name}
                                    </span>
                                  )}
                                  {st.roll_number && (
                                    <span className="status-pill" style={{ fontSize: '0.68rem', padding: '1px 6px', background: 'rgba(16, 185, 129, 0.12)', color: '#047857', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                                      Roll: {st.roll_number}
                                    </span>
                                  )}
                                </div>
                              </label>
                            );
                          })
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '12px', textAlign: 'center' }}>
                            {createStudentSearch ? `No students found matching "${createStudentSearch}".` : 'No approved students available.'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '8px' }}
                  disabled={createGroupLoading}
                >
                  {createGroupLoading ? 'Creating Group...' : 'Create Group'}
                </button>
              </form>
            </div>
          </div>

          {/* Groups List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Created Groups
                  <span
                    className="status-pill"
                    style={{
                      fontSize: '0.78rem',
                      padding: '2px 8px',
                      background: 'rgba(99, 102, 241, 0.18)',
                      color: '#4338ca',
                      borderColor: 'rgba(99, 102, 241, 0.35)'
                    }}
                  >
                    {filteredGroups.length} / {groups.length} Groups
                  </span>
                </h3>
                <p className="card-description" style={{ margin: '4px 0 0 0' }}>
                  All groups created and assigned students. Click any group or student badge to inspect the list of students.
                </p>
              </div>

              {groups.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (expandedGroupIds.length === groups.length) {
                      setExpandedGroupIds([]);
                    } else {
                      setExpandedGroupIds(groups.map(g => g.id));
                    }
                  }}
                  style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                >
                  {expandedGroupIds.length === groups.length ? 'Collapse All' : 'Expand All'}
                </button>
              )}
            </div>

            {/* Search created groups */}
            {groups.length > 0 && (
              <div style={{ marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search groups by name, description, or student member..."
                    value={createdGroupSearch}
                    onChange={(e) => setCreatedGroupSearch(e.target.value)}
                    style={{ padding: '7px 12px', paddingRight: '48px', fontSize: '0.88rem', width: '100%' }}
                  />
                  {createdGroupSearch && (
                    <button
                      type="button"
                      onClick={() => setCreatedGroupSearch('')}
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
                {createdGroupSearch && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCreatedGroupSearch('')}
                    style={{ padding: '8px 12px' }}
                    title="Clear search filter"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredGroups.length ? (
                filteredGroups.map(g => {
                  const studentList = g.students || g.members || [];
                  const isExpanded = expandedGroupIds.includes(g.id);
                  const stSearch = (groupStudentSearchTerms[g.id] || '').trim().toLowerCase();

                  const filteredGroupStudents = studentList.filter(st => {
                    if (!stSearch) return true;
                    return (
                      (st.name && st.name.toLowerCase().includes(stSearch)) ||
                      (st.email && st.email.toLowerCase().includes(stSearch)) ||
                      (st.username && st.username.toLowerCase().includes(stSearch)) ||
                      (st.roll_number && st.roll_number.toLowerCase().includes(stSearch)) ||
                      (st.department_name && st.department_name.toLowerCase().includes(stSearch))
                    );
                  });

                  return (
                    <div
                      key={g.id}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: isExpanded ? '1px solid #4f46e5' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        transition: 'border 0.2s ease, box-shadow 0.2s ease',
                        boxShadow: isExpanded ? '0 4px 20px rgba(0,0,0,0.35)' : undefined
                      }}
                    >
                      {/* Group Header - Clickable */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          userSelect: 'none',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                        onClick={() => toggleGroupExpand(g.id)}
                        title="Click to view or hide students in this group"
                      >
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <strong style={{ fontSize: '1.15rem', color: '#fff' }}>{g.name}</strong>
                            {g.created_at && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {new Date(g.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {g.description && (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                              {g.description}
                            </p>
                          )}
                          {g.teacher_name && (
                            <div style={{ fontSize: '0.74rem', color: '#7e22ce', marginTop: '2px' }}>
                              Created by: {g.teacher_name} ({g.teacher_role})
                            </div>
                          )}
                        </div>

                        {/* Right side: Clickable student count button & Delete button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            className="status-pill"
                            style={{
                              background: 'rgba(16, 185, 129, 0.12)',
                              borderColor: 'rgba(16, 185, 129, 0.35)',
                              color: '#047857',
                              padding: '6px 12px',
                              fontSize: '0.84rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span>{g.questions?.length || 0} Questions</span>
                          </span>

                          <button
                            type="button"
                            className="status-pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroupExpand(g.id);
                            }}
                            style={{
                              cursor: 'pointer',
                              background: isExpanded ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.12)',
                              borderColor: isExpanded ? '#4f46e5' : 'rgba(99, 102, 241, 0.35)',
                              color: '#7e22ce',
                              padding: '6px 14px',
                              fontSize: '0.84rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease'
                            }}
                            title="Click to view details, questions, and answers for this group"
                          >
                            <span>{studentList.length} Students</span>
                            <span style={{ fontSize: '0.72rem', color: '#4338ca' }}>
                              {isExpanded ? 'Hide' : 'View'}
                            </span>
                          </button>

                          <button
                            type="button"
                            className="status-pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddStudents(g.id);
                            }}
                            style={{
                              cursor: 'pointer',
                              background: assigningGroupId === g.id ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.15)',
                              borderColor: assigningGroupId === g.id ? '#10b981' : 'rgba(16, 185, 129, 0.4)',
                              color: '#047857',
                              padding: '6px 14px',
                              fontSize: '0.84rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease'
                            }}
                            title={`Add available students to "${g.name}"`}
                          >
                            <span>{assigningGroupId === g.id ? 'Close Add Form' : 'Add Students'}</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '5px 10px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(g.id, g.name);
                            }}
                            title="Delete this group"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Expanded View: Questions & Submissions OR Member List */}
                      {isExpanded && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                          {/* Sub-view Navigation inside Group */}
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${getGroupViewMode(g.id) === 'questions' ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setGroupViewMode(g.id, 'questions')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.84rem' }}
                            >
                              Questions & Answers ({g.questions?.length || 0})
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${getGroupViewMode(g.id) === 'members' ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setGroupViewMode(g.id, 'members')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.84rem' }}
                            >
                              Group Members ({studentList.length})
                            </button>
                          </div>

                          {/* 1. Questions & Submissions View */}
                          {getGroupViewMode(g.id) === 'questions' && (
                            <div>
                              {g.questions && g.questions.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  {g.questions.map((q, qIdx) => (
                                    <div
                                      key={q.id}
                                      style={{
                                        background: '#f8fafc',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '16px'
                                      }}
                                    >
                                      {/* Question Header */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, minWidth: '220px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 700, textTransform: 'uppercase' }}>
                                              Question {qIdx + 1}
                                            </span>
                                            {q.created_at && (
                                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                                • Published {new Date(q.created_at).toLocaleDateString()}
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', lineHeight: '1.4' }}>
                                            {q.question_text}
                                          </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                          <span className="timer-badge">{q.duration_seconds}s</span>
                                          <span
                                            className="status-pill"
                                            style={{
                                              color: '#10b981',
                                              borderColor: 'rgba(16, 185, 129, 0.4)',
                                              background: 'rgba(16, 185, 129, 0.1)',
                                              fontSize: '0.78rem'
                                            }}
                                          >
                                            {q.submitted_count || 0} / {q.total_members || studentList.length} Answered ({q.correct_count || 0} Correct)
                                          </span>
                                        </div>
                                      </div>

                                      {/* Options preview */}
                                      <div className="grid-2" style={{ gap: '8px', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                        <div style={{ padding: '6px 10px', borderRadius: '4px', background: q.correct_option === 'A' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)', border: q.correct_option === 'A' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent' }}>
                                          <strong>A:</strong> {q.option_a} {q.correct_option === 'A' && '(Correct)'}
                                        </div>
                                        <div style={{ padding: '6px 10px', borderRadius: '4px', background: q.correct_option === 'B' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)', border: q.correct_option === 'B' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent' }}>
                                          <strong>B:</strong> {q.option_b} {q.correct_option === 'B' && '(Correct)'}
                                        </div>
                                        <div style={{ padding: '6px 10px', borderRadius: '4px', background: q.correct_option === 'C' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)', border: q.correct_option === 'C' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent' }}>
                                          <strong>C:</strong> {q.option_c} {q.correct_option === 'C' && '(Correct)'}
                                        </div>
                                        <div style={{ padding: '6px 10px', borderRadius: '4px', background: q.correct_option === 'D' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)', border: q.correct_option === 'D' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent' }}>
                                          <strong>D:</strong> {q.option_d} {q.correct_option === 'D' && '(Correct)'}
                                        </div>
                                      </div>

                                      {/* Correct Answer Highlight Box */}
                                      <div
                                        style={{
                                          background: 'rgba(16, 185, 129, 0.08)',
                                          border: '1px solid rgba(16, 185, 129, 0.35)',
                                          borderRadius: 'var(--radius-sm)',
                                          padding: '10px 14px',
                                          marginBottom: '14px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          flexWrap: 'wrap',
                                          gap: '8px'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#047857', fontWeight: 700 }}>
                                            Correct Answer:
                                          </span>
                                          <strong style={{ fontSize: '1rem', color: '#10b981' }}>
                                            Option {q.correct_option}: {q.correct_answer_text}
                                          </strong>
                                        </div>
                                        {q.explanation && (
                                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                            <em>{q.explanation}</em>
                                          </div>
                                        )}
                                      </div>

                                      {/* Student Submissions Table */}
                                      <div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                          Submitted Answers by Group Students ({q.student_results?.length || 0})
                                        </div>

                                        <div className="table-responsive">
                                          <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                                            <thead>
                                              <tr>
                                                <th>Student</th>
                                                <th>Department / Roll</th>
                                                <th>Submitted Answer</th>
                                                <th>Correct Answer</th>
                                                <th>Result</th>
                                                <th>Time Taken</th>
                                                <th>Submitted At</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {(q.student_results || []).map(sr => (
                                                <tr key={sr.student_id}>
                                                  <td>
                                                    <div style={{ fontWeight: 600, color: '#fff' }}>
                                                      {sr.student_name}
                                                    </div>
                                                    {sr.student_email && (
                                                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                        {sr.student_email}
                                                      </div>
                                                    )}
                                                  </td>
                                                  <td>
                                                    <div>{sr.department_name || 'General'}</div>
                                                    {sr.roll_number && (
                                                      <div style={{ fontSize: '0.72rem', color: '#4338ca' }}>
                                                        Roll: {sr.roll_number}
                                                      </div>
                                                    )}
                                                  </td>
                                                  <td>
                                                    {sr.status === 'submitted' ? (
                                                      <span
                                                        style={{
                                                          fontWeight: 700,
                                                          color: sr.is_correct ? '#10b981' : '#f87171'
                                                        }}
                                                      >
                                                        Option {sr.selected_option}: {sr.selected_answer_text}
                                                      </span>
                                                    ) : (
                                                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                        Not submitted yet
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td>
                                                    <span style={{ fontWeight: 700, color: '#10b981' }}>
                                                      Option {sr.correct_option}: {sr.correct_answer_text}
                                                    </span>
                                                  </td>
                                                  <td>
                                                    {sr.status === 'submitted' ? (
                                                      sr.is_correct ? (
                                                        <span
                                                          className="status-pill"
                                                          style={{
                                                            color: '#10b981',
                                                            borderColor: 'rgba(16, 185, 129, 0.4)',
                                                            background: 'rgba(16, 185, 129, 0.1)',
                                                            padding: '2px 8px',
                                                            fontSize: '0.75rem'
                                                          }}
                                                        >
                                                          Correct
                                                        </span>
                                                      ) : (
                                                        <span
                                                          className="status-pill"
                                                          style={{
                                                            color: '#f87171',
                                                            borderColor: 'rgba(239, 68, 68, 0.4)',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            padding: '2px 8px',
                                                            fontSize: '0.75rem'
                                                          }}
                                                        >
                                                          Incorrect
                                                        </span>
                                                      )
                                                    ) : (
                                                      <span
                                                        className="status-pill"
                                                        style={{
                                                          color: '#9ca3af',
                                                          borderColor: 'rgba(156, 163, 175, 0.3)',
                                                          padding: '2px 8px',
                                                          fontSize: '0.75rem'
                                                        }}
                                                      >
                                                        Pending
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td>
                                                    {sr.time_taken_seconds != null ? `${sr.time_taken_seconds}s` : '-'}
                                                  </td>
                                                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {sr.submitted_at ? new Date(sr.submitted_at).toLocaleString() : '-'}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div
                                  style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px dashed var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '24px',
                                    textAlign: 'center'
                                  }}
                                >
                                  <h4 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>No Questions Published to this Group Yet</h4>
                                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px', maxWidth: '460px', margin: '0 auto 14px auto' }}>
                                    Publish a targeted question for "{g.name}" to view correct answers and student submissions here.
                                  </p>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => {
                                      setTargetType('group');
                                      setTargetGroupId(g.id);
                                      setActiveTab('create-q');
                                    }}
                                  >
                                    Publish Question to "{g.name}"
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 2. Group Members View */}
                          {getGroupViewMode(g.id) === 'members' && (
                            <div>
                              {/* Search bar inside group & Add Students Action */}
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder={`Search students in "${g.name}" by name, email, roll no, department...`}
                                  value={groupStudentSearchTerms[g.id] || ''}
                                  onChange={(e) => setGroupStudentSearchTerms({ ...groupStudentSearchTerms, [g.id]: e.target.value })}
                                  style={{ padding: '7px 12px', fontSize: '0.84rem', flex: 1, minWidth: '220px' }}
                                />
                                {groupStudentSearchTerms[g.id] && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setGroupStudentSearchTerms({ ...groupStudentSearchTerms, [g.id]: '' })}
                                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                  >
                                    Clear
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleOpenAddStudents(g.id)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '7px 14px',
                                    fontSize: '0.84rem',
                                    background: assigningGroupId === g.id ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    borderColor: assigningGroupId === g.id ? 'rgba(239, 68, 68, 0.4)' : '#10b981',
                                    color: '#fff',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap'
                                  }}
                                  title={`Add students to "${g.name}"`}
                                >
                                  <span>{assigningGroupId === g.id ? 'Close Add Form' : 'Add Students'}</span>
                                </button>
                              </div>

                              {/* Interactive Add Students Panel (When open for this group) */}
                              {assigningGroupId === g.id && (() => {
                                const currentMemberIds = new Set(studentList.map(s => s.id));
                                const unassignedCount = scopedApprovedStudents.filter(s => !currentMemberIds.has(s.id)).length;
                                const qSearch = assignStudentSearch.trim().toLowerCase();
                                const filteredStudentsForAssign = scopedApprovedStudents.filter(st => {
                                  if (!qSearch) return true;
                                  return (
                                    (st.name && st.name.toLowerCase().includes(qSearch)) ||
                                    (st.email && st.email.toLowerCase().includes(qSearch)) ||
                                    (st.username && st.username.toLowerCase().includes(qSearch)) ||
                                    (st.department_name && st.department_name.toLowerCase().includes(qSearch)) ||
                                    (st.roll_number && st.roll_number.toLowerCase().includes(qSearch))
                                  );
                                });

                                return (
                                  <div
                                    style={{
                                      background: 'rgba(16, 185, 129, 0.05)',
                                      border: '1px solid rgba(16, 185, 129, 0.35)',
                                      borderRadius: 'var(--radius-md)',
                                      padding: '14px',
                                      marginBottom: '16px',
                                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <strong style={{ fontSize: '0.96rem', color: '#047857' }}>
                                          Add Available Students to "{g.name}"
                                        </strong>
                                        <span className="status-pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontSize: '0.72rem', padding: '2px 8px' }}>
                                          {studentList.length} Already in Group
                                        </span>
                                        <span className="status-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#047857', fontSize: '0.72rem', padding: '2px 8px' }}>
                                          {unassignedCount} Available to Add
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => {
                                          setAssigningGroupId(null);
                                          setGroupAssignSelectedIds([]);
                                          setAssignStudentSearch('');
                                        }}
                                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                      >
                                        Close
                                      </button>
                                    </div>

                                    {/* Action row with Add All Available Students button */}
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                      <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Filter available students by name, email, roll, department..."
                                        value={assignStudentSearch}
                                        onChange={(e) => setAssignStudentSearch(e.target.value)}
                                        style={{ padding: '6px 10px', fontSize: '0.82rem', flex: 1, minWidth: '200px' }}
                                      />
                                      {assignStudentSearch && (
                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm"
                                          onClick={() => setAssignStudentSearch('')}
                                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                        >
                                          ✕
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleAddAllAvailableToExistingGroup(g)}
                                        style={{
                                          background: 'rgba(16, 185, 129, 0.2)',
                                          borderColor: 'rgba(16, 185, 129, 0.5)',
                                          color: '#047857',
                                          fontWeight: 600,
                                          fontSize: '0.8rem',
                                          padding: '6px 12px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                        title="Select all students who are not yet members of this group"
                                      >
                                        <span>Add All Available Students ({unassignedCount})</span>
                                      </button>
                                      {groupAssignSelectedIds.length > 0 && (
                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm"
                                          onClick={() => setGroupAssignSelectedIds([])}
                                          style={{ color: '#f87171', padding: '6px 10px', fontSize: '0.78rem' }}
                                        >
                                          Clear ({groupAssignSelectedIds.length})
                                        </button>
                                      )}
                                    </div>

                                    {/* Notice for "added students must not be select" */}
                                    <div style={{ fontSize: '0.75rem', color: '#4338ca', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>
                                        Added students cannot be selected. Only unassigned students can be selected and enrolled.
                                      </span>
                                    </div>

                                    {/* Student checklist */}
                                    <div
                                      style={{
                                        maxHeight: '220px',
                                        overflowY: 'auto',
                                        background: '#f8fafc',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                      }}
                                    >
                                      {filteredStudentsForAssign.length > 0 ? (
                                        filteredStudentsForAssign.map(st => {
                                          const isAlreadyMember = currentMemberIds.has(st.id);
                                          const isSelected = groupAssignSelectedIds.includes(st.id);

                                          return (
                                            <div
                                              key={st.id}
                                              onClick={() => {
                                                if (!isAlreadyMember) {
                                                  handleToggleGroupAssignStudent(st.id, false);
                                                }
                                              }}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '10px',
                                                padding: '6px 10px',
                                                borderRadius: '4px',
                                                cursor: isAlreadyMember ? 'not-allowed' : 'pointer',
                                                background: isAlreadyMember
                                                  ? 'rgba(255,255,255,0.02)'
                                                  : isSelected
                                                  ? 'rgba(16, 185, 129, 0.18)'
                                                  : 'transparent',
                                                border: isSelected ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                                                opacity: isAlreadyMember ? 0.6 : 1,
                                                transition: 'all 0.12s ease'
                                              }}
                                              title={isAlreadyMember ? 'Already a member of this group (cannot be selected)' : 'Click to select / unselect'}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                  type="checkbox"
                                                  checked={isAlreadyMember || isSelected}
                                                  disabled={isAlreadyMember}
                                                  onChange={() => {
                                                    if (!isAlreadyMember) {
                                                      handleToggleGroupAssignStudent(st.id, false);
                                                    }
                                                  }}
                                                  style={{
                                                    accentColor: isAlreadyMember ? '#64748b' : '#10b981',
                                                    cursor: isAlreadyMember ? 'not-allowed' : 'pointer',
                                                    width: '16px',
                                                    height: '16px'
                                                  }}
                                                />
                                                <div>
                                                  <div style={{ color: isAlreadyMember ? '#334155' : '#fff', fontSize: '0.86rem', fontWeight: isSelected ? 600 : 400 }}>
                                                    {st.name} {st.username ? <span style={{ fontSize: '0.75rem', color: '#4338ca' }}>@{st.username}</span> : ''}
                                                  </div>
                                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    {st.email}
                                                  </div>
                                                </div>
                                              </div>

                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                {st.department_name && (
                                                  <span className="status-pill" style={{ fontSize: '0.68rem', padding: '1px 6px', background: 'rgba(99, 102, 241, 0.15)', color: '#4338ca', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                                                    {st.department_name}
                                                  </span>
                                                )}
                                                {st.roll_number && (
                                                  <span className="status-pill" style={{ fontSize: '0.68rem', padding: '1px 6px', background: 'rgba(16, 185, 129, 0.12)', color: '#047857', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                                                    Roll: {st.roll_number}
                                                  </span>
                                                )}
                                                {isAlreadyMember ? (
                                                  <span
                                                    style={{
                                                      fontSize: '0.72rem',
                                                      padding: '2px 8px',
                                                      borderRadius: '4px',
                                                      background: 'rgba(100, 116, 139, 0.25)',
                                                      color: '#334155',
                                                      border: '1px solid rgba(100, 116, 139, 0.4)',
                                                      fontWeight: 600,
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '4px'
                                                    }}
                                                  >
                                                    Already in Group (Cannot select)
                                                  </span>
                                                ) : isSelected ? (
                                                  <span
                                                    style={{
                                                      fontSize: '0.72rem',
                                                      padding: '2px 8px',
                                                      borderRadius: '4px',
                                                      background: 'rgba(16, 185, 129, 0.2)',
                                                      color: '#047857',
                                                      border: '1px solid rgba(16, 185, 129, 0.4)',
                                                      fontWeight: 600
                                                    }}
                                                  >
                                                    Selected to Add
                                                  </span>
                                                ) : (
                                                  <span
                                                    style={{
                                                      fontSize: '0.72rem',
                                                      padding: '2px 8px',
                                                      borderRadius: '4px',
                                                      background: 'rgba(99, 102, 241, 0.1)',
                                                      color: '#4338ca',
                                                      border: '1px solid rgba(99, 102, 241, 0.25)'
                                                    }}
                                                  >
                                                    Available
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '14px', textAlign: 'center' }}>
                                          {assignStudentSearch ? `No students found matching "${assignStudentSearch}".` : 'No students found.'}
                                        </div>
                                      )}
                                    </div>

                                    {/* Action buttons */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => {
                                          setAssigningGroupId(null);
                                          setGroupAssignSelectedIds([]);
                                          setAssignStudentSearch('');
                                        }}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        disabled={assigningLoading || groupAssignSelectedIds.length === 0}
                                        onClick={() => handleSaveAddStudentsToGroup(g)}
                                        style={{
                                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                          borderColor: '#10b981',
                                          fontWeight: 600,
                                          padding: '6px 14px'
                                        }}
                                      >
                                        {assigningLoading
                                          ? 'Adding Students...'
                                          : `Save & Add ${groupAssignSelectedIds.length} Student${groupAssignSelectedIds.length === 1 ? '' : 's'} to "${g.name}"`}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                <span>
                                  Showing {filteredGroupStudents.length} of {studentList.length} students assigned to this group
                                </span>
                              </div>

                              {/* Student List */}
                              {filteredGroupStudents.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {filteredGroupStudents.map(st => (
                                    <div
                                      key={st.id}
                                      style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '10px 14px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '12px',
                                        flexWrap: 'wrap'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div
                                          style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: 'rgba(99, 102, 241, 0.25)',
                                            color: '#7e22ce',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 700,
                                            fontSize: '0.85rem'
                                          }}
                                        >
                                          {(st.name || 'S')[0].toUpperCase()}
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                                            {st.name}
                                            {st.username && (
                                              <span style={{ fontSize: '0.78rem', color: '#4338ca', marginLeft: '6px' }}>
                                                @{st.username}
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                            {st.email}
                                          </div>
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        {st.department_name && (
                                          <span
                                            className="status-pill"
                                            style={{
                                              fontSize: '0.72rem',
                                              padding: '2px 8px',
                                              background: 'rgba(99, 102, 241, 0.15)',
                                              color: '#4338ca',
                                              borderColor: 'rgba(99, 102, 241, 0.35)'
                                            }}
                                          >
                                            {st.department_name}
                                          </span>
                                        )}
                                        {st.roll_number && (
                                          <span
                                            className="status-pill"
                                            style={{
                                              fontSize: '0.72rem',
                                              padding: '2px 8px',
                                              background: 'rgba(16, 185, 129, 0.12)',
                                              color: '#047857',
                                              borderColor: 'rgba(16, 185, 129, 0.3)'
                                            }}
                                          >
                                            Roll: {st.roll_number}
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm"
                                          style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.25)', padding: '2px 8px', fontSize: '0.74rem' }}
                                          onClick={() => handleRemoveStudentFromGroup(g.id, g.name, st.id, st.name)}
                                          title={`Remove ${st.name} from "${g.name}"`}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)' }}>
                                  {studentList.length === 0 ? (
                                    <div>
                                      <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#4338ca' }}>
                                        No students assigned to this group yet.
                                      </p>
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleOpenAddStudents(g.id)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '8px 16px',
                                          fontSize: '0.86rem',
                                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                          borderColor: '#10b981',
                                          color: '#fff',
                                          fontWeight: 600
                                        }}
                                      >
                                        <span>Add Students</span>
                                      </button>
                                    </div>
                                  ) : (
                                    `No students matching "${groupStudentSearchTerms[g.id]}" found in this group.`
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                  {createdGroupSearch ? `No groups found matching "${createdGroupSearch}".` : 'No groups created yet.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Published Questions & Analytics */}
      {activeTab === 'analytics' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div className="card-title">
                Published Questions & Submissions Analytics
              </div>
              <p className="card-description" style={{ marginTop: '4px' }}>
                All questions are grouped inside their respective Task Number. Navigate between tasks using the Next Task button.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApplyTeacherSearch();
                }}
                style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}
              >
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search questions..."
                    value={teacherSearchQuery}
                    onChange={(e) => setTeacherSearchQuery(e.target.value)}
                    style={{ minWidth: '240px', padding: '7px 12px', paddingRight: '48px', fontSize: '0.88rem' }}
                  />
                  {teacherSearchQuery && (
                    <button
                      type="button"
                      onClick={handleClearTeacherSearch}
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

                {(activeTeacherSearch || teacherSearchQuery) && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleClearTeacherSearch}
                    style={{ padding: '8px 12px' }}
                    title="Clear search filter"
                  >
                    Reset
                  </button>
                )}
              </form>
            </div>
          </div>

          {teacherTaskKeys.length > 0 ? (
            <div style={{ marginTop: '16px' }}>
              {/* Task Switcher Bar with Next/Prev Buttons */}
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', color: '#7e22ce', fontWeight: 700, textTransform: 'uppercase' }}>
                    Tasks ({teacherTaskKeys.length}):
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {teacherTaskKeys.map(tKey => {
                      const isActive = tKey === effectiveTeacherTask;
                      const count = groupedTeacherQuestions[tKey]?.length || 0;
                      return (
                        <button
                          key={tKey}
                          type="button"
                          className="status-pill"
                          onClick={() => setActiveTeacherTask(tKey)}
                          style={{
                            cursor: 'pointer',
                            background: isActive ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 'rgba(255,255,255,0.04)',
                            borderColor: isActive ? '#a855f7' : 'var(--border-color)',
                            color: isActive ? '#fff' : 'var(--text-secondary)',
                            fontWeight: isActive ? 700 : 500,
                            padding: '6px 14px',
                            fontSize: '0.86rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>{tKey}</span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '1px 6px',
                              borderRadius: '9999px',
                              background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                              color: '#fff'
                            }}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Next / Previous Task Navigation Buttons + Task Search Bar */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {teacherTaskKeys.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handlePrevTeacherTask}
                        style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                        title="Go to previous task"
                      >
                        ← Previous Task
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleNextTeacherTask}
                        style={{
                          padding: '6px 16px',
                          fontSize: '0.84rem',
                          fontWeight: 600,
                          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                          borderColor: '#a855f7'
                        }}
                        title="Go to next task"
                      >
                        Next Task →
                      </button>
                    </>
                  )}


                  {effectiveTeacherTask && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => handleDeleteTask(effectiveTeacherTask)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.18)',
                        border: '1px solid #ef4444',
                        color: '#f87171',
                        fontWeight: 600,
                        padding: '6px 14px',
                        fontSize: '0.82rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                      title={`Permanently delete ${effectiveTeacherTask} completely`}
                    >
                      🗑️ Delete {effectiveTeacherTask}
                    </button>
                  )}
                </div>
              </div>

              {/* Current Task Banner */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                padding: '0 4px',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Questions in {effectiveTeacherTask}</span>
                  <span className="status-pill" style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(99, 102, 241, 0.2)', color: '#7e22ce' }}>
                    {displayedTeacherQuestions.length}{displayedTeacherQuestions.length !== currentTeacherQuestions.length ? ` of ${currentTeacherQuestions.length}` : ''} Question{displayedTeacherQuestions.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {teacherTaskKeys.length > 1 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Task {teacherTaskKeys.indexOf(effectiveTeacherTask) + 1} of {teacherTaskKeys.length}
                    </span>
                  )}
                  {effectiveTeacherTask && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => handleDeleteTask(effectiveTeacherTask)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.18)',
                        border: '1px solid #ef4444',
                        color: '#f87171',
                        fontWeight: 600,
                        padding: '4px 12px',
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                      title={`Permanently delete ${effectiveTeacherTask} completely`}
                    >
                      🗑️ Delete Task
                    </button>
                  )}
                </div>
              </div>

              {/* Search results banner if search active */}
              {activeTeacherSearch && (
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
                    Search Results: {displayedTeacherQuestions.length} of {currentTeacherQuestions.length} question{currentTeacherQuestions.length === 1 ? '' : 's'} matching "{activeTeacherSearch}" in {effectiveTeacherTask}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleClearTeacherSearch}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    Show All Questions
                  </button>
                </div>
              )}

              {/* Questions List for the Current Task */}
              {displayedTeacherQuestions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {displayedTeacherQuestions.map((q, idx) => {
                  const isOpen = openTeacherQuestionId === q.id;
                  return (
                    <div
                      key={q.id}
                      style={{
                        background: isOpen ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)',
                        border: isOpen ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        boxShadow: isOpen ? '0 4px 18px rgba(99, 102, 241, 0.12)' : 'none'
                      }}
                    >
                      {/* Clickable Question Row / List Item */}
                      <div
                        onClick={() => setOpenTeacherQuestionId(prev => prev === q.id ? null : q.id)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '14px 18px',
                          cursor: 'pointer',
                          background: isOpen ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                          transition: 'background 0.2s ease',
                          flexWrap: 'wrap'
                        }}
                        onMouseEnter={(e) => {
                          if (!isOpen) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isOpen) e.currentTarget.style.background = 'transparent';
                        }}
                        title={isOpen ? 'Click to collapse question' : 'Click to show question'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '220px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: isOpen ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 'rgba(255, 255, 255, 0.06)',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.85rem'
                            }}
                          >
                            Q{idx + 1}
                          </span>
                          <span
                            style={{
                              fontSize: '1rem',
                              fontWeight: 600,
                              color: isOpen ? '#7e22ce' : '#fff',
                              lineHeight: 1.4,
                              wordBreak: 'break-word'
                            }}
                          >
                            {q.question_text}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                          <span className="status-pill" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#7e22ce', borderColor: '#4f46e5', fontWeight: 700 }}>
                            {q.task_number || 'Task 1'}
                          </span>
                          <span className="timer-badge">{q.duration_seconds}s</span>
                          <span className="target-badge">
                            {q.target_type === 'all'
                              ? (q.target_department_name || q.target_year
                                  ? `${q.target_department_name || 'Dept'} (Year ${q.target_year || 'All'})`
                                  : 'All Department Students')
                              : `Group: ${q.group_name || 'Assigned Group'}`}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuestion(q.id, q.question_text);
                            }}
                            title="Delete question completely"
                            aria-label="Delete question completely"
                            style={{
                              background: 'rgba(239, 68, 68, 0.16)',
                              border: '1px solid rgba(239, 68, 68, 0.55)',
                              color: '#f87171',
                              borderRadius: '9999px',
                              padding: '4px 10px',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                              lineHeight: 1
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                              e.currentTarget.style.borderColor = '#ef4444';
                              e.currentTarget.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)';
                              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.55)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            🗑️
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              padding: '4px 12px',
                              fontSize: '0.8rem',
                              background: isOpen ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                              border: isOpen ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.15)',
                              color: isOpen ? '#6b21a8' : '#334155',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600
                            }}
                          >
                            {isOpen ? '▲ Hide' : '▼ View Question'}
                          </button>
                        </div>
                      </div>

                      {/* If clicked, THEN ONLY show the question details */}
                      {isOpen && (
                        <div
                          style={{
                            padding: '16px 20px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                            background: '#f8fafc',
                            animation: 'slideUp 0.25s ease-out'
                          }}
                        >
                          <div className="grid-2" style={{ gap: '10px', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                            <div style={{ padding: '8px 12px', borderRadius: '6px', background: q.correct_option === 'A' ? '#dcfce7' : '#ffffff', border: q.correct_option === 'A' ? '1px solid #86efac' : '1px solid #e2e8f0' }}>
                              <strong style={{ color: q.correct_option === 'A' ? '#15803d' : 'var(--text-primary)' }}>A:</strong> {q.option_a} {q.correct_option === 'A' && <span style={{ color: '#15803d', fontWeight: 700 }}>(Correct)</span>}
                            </div>
                            <div style={{ padding: '8px 12px', borderRadius: '6px', background: q.correct_option === 'B' ? '#dcfce7' : '#ffffff', border: q.correct_option === 'B' ? '1px solid #86efac' : '1px solid #e2e8f0' }}>
                              <strong style={{ color: q.correct_option === 'B' ? '#15803d' : 'var(--text-primary)' }}>B:</strong> {q.option_b} {q.correct_option === 'B' && <span style={{ color: '#15803d', fontWeight: 700 }}>(Correct)</span>}
                            </div>
                            <div style={{ padding: '8px 12px', borderRadius: '6px', background: q.correct_option === 'C' ? '#dcfce7' : '#ffffff', border: q.correct_option === 'C' ? '1px solid #86efac' : '1px solid #e2e8f0' }}>
                              <strong style={{ color: q.correct_option === 'C' ? '#15803d' : 'var(--text-primary)' }}>C:</strong> {q.option_c} {q.correct_option === 'C' && <span style={{ color: '#15803d', fontWeight: 700 }}>(Correct)</span>}
                            </div>
                            <div style={{ padding: '8px 12px', borderRadius: '6px', background: q.correct_option === 'D' ? '#dcfce7' : '#ffffff', border: q.correct_option === 'D' ? '1px solid #86efac' : '1px solid #e2e8f0' }}>
                              <strong style={{ color: q.correct_option === 'D' ? '#15803d' : 'var(--text-primary)' }}>D:</strong> {q.option_d} {q.correct_option === 'D' && <span style={{ color: '#15803d', fontWeight: 700 }}>(Correct)</span>}
                            </div>
                          </div>

                          {q.explanation && (
                            <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '6px', background: '#eef2ff', border: '1px solid #c7d2fe', fontSize: '0.85rem', color: '#1e293b' }}>
                              <strong>Explanation:</strong> {q.explanation}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '8px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Published on {new Date(q.created_at).toLocaleDateString()}
                            </span>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSubmissions(q.id);
                              }}
                            >
                              {expandedSubmissions[q.id] ? 'Hide Submissions' : 'View Submissions'}
                            </button>
                          </div>

                          {/* Expanded Submissions Table */}
                          {expandedSubmissions[q.id] && (
                            <div style={{ marginTop: '14px', animation: 'slideUp 0.3s ease-out' }}>
                              <div className="table-responsive">
                                <table className="custom-table">
                                  <thead>
                                    <tr>
                                      <th>Student</th>
                                      <th>Selected</th>
                                      <th>Result</th>
                                      <th>Time Taken</th>
                                      <th>Submitted On</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {expandedSubmissions[q.id].length ? (
                                      expandedSubmissions[q.id].map(sub => (
                                        <tr key={sub.id}>
                                          <td><strong>{sub.student_name}</strong></td>
                                          <td>Option {sub.selected_option}</td>
                                          <td>
                                            <span
                                              className="status-pill"
                                              style={{
                                                color: sub.is_correct ? '#10b981' : '#ef4444',
                                                borderColor: sub.is_correct ? '#10b981' : '#ef4444'
                                              }}
                                            >
                                              {sub.is_correct ? 'Correct' : 'Incorrect'}
                                            </span>
                                          </td>
                                          <td>{sub.time_taken_seconds}s</td>
                                          <td>{new Date(sub.submitted_at).toLocaleString()}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px' }}>
                                          No student submissions recorded yet.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              ) : (
                <div
                  style={{
                    padding: '36px',
                    textAlign: 'center',
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1',
                    marginBottom: '16px'
                  }}
                >
                  {activeTeacherSearch && (
                    <p style={{ color: '#dc2626', fontWeight: 700, margin: '0 0 6px 0', fontSize: '1rem' }}>
                      searched question is not available
                    </p>
                  )}
                  <p style={{ color: 'var(--text-secondary)', margin: '0 0 10px 0', fontSize: '0.95rem' }}>
                    {activeTeacherSearch
                      ? `No questions found matching "${activeTeacherSearch}" in ${effectiveTeacherTask}.`
                      : `No questions available inside ${effectiveTeacherTask} yet.`}
                  </p>
                  {activeTeacherSearch && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleClearTeacherSearch}
                      style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                    >
                      Clear Search & View All Questions
                    </button>
                  )}
                </div>
              )}

              {/* Footer Next Task Navigation */}
              {teacherTaskKeys.length > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '20px',
                  padding: '16px 20px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)'
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Finished reviewing <strong>{effectiveTeacherTask}</strong>?
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleNextTeacherTask}
                    style={{
                      padding: '8px 22px',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                      borderColor: '#a855f7',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>Proceed to Next Task</span>
                    <span>→</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
              You have not published any questions yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Attendance Marking */}
      {isClassTeacher && activeTab === 'attendance' && (
        <AttendanceMarking />
      )}

      {/* TAB: Tasks - View All Available Tasks & Add New Task */}
      {activeTab === 'tasks' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Academic Tasks Directory</span>
                <span className="user-role-pill" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#7e22ce', borderColor: '#4f46e5', fontWeight: 700 }}>
                  {allAvailableTasksList.length} Available Task{allAvailableTasksList.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="card-description" style={{ marginTop: '4px' }}>
                View all available tasks, see published questions, track student engagement, and add new task numbers.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowCreateTaskModal(prev => !prev);
                  if (!createTaskInput) setCreateTaskInput(suggestedNextTaskName);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  padding: '9px 18px',
                  fontSize: '0.92rem',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  borderColor: '#a855f7',
                  boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)',
                  cursor: 'pointer'
                }}
                title="Create a new task number"
              >
                <span>➕</span>
                <span>ADD Task</span>
              </button>
            </div>
          </div>

          {/* Add Task Creator Form / Box */}
          {showCreateTaskModal && (
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '20px 22px',
                marginBottom: '24px',
                animation: 'slideUp 0.25s ease-out'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✨</span> Create New Task
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                  title="Close form"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateNewTask}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 260px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '6px', fontWeight: 700 }}>
                      Task Number / Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Task 2, Task 3, Quiz 1..."
                      value={createTaskInput}
                      onChange={(e) => setCreateTaskInput(e.target.value)}
                      autoFocus
                      required
                      style={{ background: '#f8fafc', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                    />
                  </div>

                  <div style={{ flex: '2 1 320px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Optional Description
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Assessment topic or syllabus notes"
                      value={createTaskDesc}
                      onChange={(e) => setCreateTaskDesc(e.target.value)}
                      style={{ background: '#f8fafc' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={creatingTaskLoading}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        fontWeight: 700,
                        padding: '9px 20px',
                        fontSize: '0.9rem'
                      }}
                    >
                      {creatingTaskLoading ? 'Creating...' : '✓ Create Task'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowCreateTaskModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {/* Quick Suggestion Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Quick Suggestion:</span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setCreateTaskInput(suggestedNextTaskName)}
                    style={{ padding: '2px 8px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)' }}
                  >
                    ⚡ Use {suggestedNextTaskName}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Available Tasks Cards Directory */}
          {allAvailableTasksList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1rem', color: '#fff', marginBottom: '8px' }}>No Tasks Available</p>
              <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>Click the button below to create your first task.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowCreateTaskModal(true);
                  setCreateTaskInput('Task 1');
                }}
              >
                ➕ ADD Task
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {allAvailableTasksList.map((t, idx) => {
                const qCount = t.question_count;
                const subCount = t.total_submissions;
                const hasQuestions = qCount > 0;
                return (
                  <div
                    key={t.task_number}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
                              border: '1px solid rgba(168, 85, 247, 0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.1rem'
                            }}
                          >
                            📋
                          </div>
                          <div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                              {t.task_number}
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Task #{idx + 1}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t.task_number)}
                          title={`Delete ${t.task_number} completely`}
                          style={{
                            background: 'rgba(239, 68, 68, 0.14)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#f87171',
                            borderRadius: '8px',
                            padding: '5px 8px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            lineHeight: 1
                          }}
                        >
                          🗑️
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span
                            className="status-pill"
                            style={{
                              background: hasQuestions ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                              color: hasQuestions ? '#7e22ce' : 'var(--text-muted)',
                              borderColor: hasQuestions ? '#4f46e5' : 'var(--border-color)',
                              fontWeight: 700
                            }}
                          >
                            {qCount} Question{qCount === 1 ? '' : 's'}
                          </span>
                          <span
                            className="status-pill"
                            style={{
                              background: subCount > 0 ? 'rgba(34, 197, 94, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                              color: subCount > 0 ? '#4ade80' : 'var(--text-muted)',
                              borderColor: subCount > 0 ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-color)'
                            }}
                          >
                            {subCount} Submission{subCount === 1 ? '' : 's'}
                          </span>
                        </div>

                        {hasQuestions && (
                          <button
                            type="button"
                            className={`btn btn-sm ${openTeacherTasks[t.task_number] ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => setOpenTeacherTasks(prev => ({ ...prev, [t.task_number]: !prev[t.task_number] }))}
                            style={{ padding: '4px 10px', fontSize: '0.78rem', fontWeight: 600 }}
                          >
                            {openTeacherTasks[t.task_number] ? 'Hide Questions ▲' : `View Questions (${qCount}) ▼`}
                          </button>
                        )}
                      </div>

                      {/* Questions Available Inside That Task Name when Opened */}
                      {hasQuestions ? (
                        openTeacherTasks[t.task_number] && (
                          <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(99, 102, 241, 0.04)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                            <div style={{ fontSize: '0.78rem', color: '#7e22ce', fontWeight: 700, marginBottom: '8px' }}>
                              Questions in {t.task_number}:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {t.questions.map((q, qIdx) => (
                                <div
                                  key={q.id}
                                  style={{
                                    fontSize: '0.82rem',
                                    color: '#fff',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                >
                                  <div>
                                    <strong style={{ color: '#7e22ce' }}>Q{qIdx + 1}:</strong> {q.question_text}
                                  </div>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                                    ⏱️ {q.duration_seconds}s
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ) : (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '16px', padding: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px' }}>
                          No questions published under this task yet.
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setTaskNumber(t.task_number);
                          setActiveTab('create-q');
                        }}
                        style={{ flex: 1, minWidth: '120px', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 600 }}
                        title={`Author a question under ${t.task_number}`}
                      >
                        ➕ Add Question
                      </button>
                      {hasQuestions && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setActiveTeacherTask(t.task_number);
                            setActiveTab('analytics');
                          }}
                          style={{ flex: 1, minWidth: '120px', padding: '6px 10px', fontSize: '0.8rem' }}
                          title={`View questions and analytics for ${t.task_number}`}
                        >
                          👁️ View Analytics
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Students by Department */}
      {activeTab === 'dept-students' && (
        <StudentsByDepartment />
      )}

      {/* TAB: Batches */}
      {activeTab === 'batches' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Academic Batches</span>
                <span className="user-role-pill" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                  {batches.length} Batches
                </span>
              </div>
              <p className="card-description" style={{ marginTop: '4px' }}>
                Manage cohorts across academic programmes. Deleting a batch permanently removes it from all enrolled students, sections, and users across the system.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddBatchModal(p => !p)}
              style={{ fontWeight: 600 }}
            >
              {showAddBatchModal ? 'Close Form' : '+ Add Batch'}
            </button>
          </div>

          {showAddBatchModal && (
            <form onSubmit={handleCreateBatchInTab} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '12px', fontWeight: 600 }}>Create New Academic Batch</h4>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Programme <span className="req">*</span></label>
                  <select
                    className="form-select"
                    value={newBatchProgId}
                    onChange={(e) => setNewBatchProgId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Programme --</option>
                    {scopedPrograms.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.degree})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Batch Name / Year <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 2026-2030"
                    value={newBatchNameInput}
                    onChange={(e) => setNewBatchNameInput(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* + Icon to Add Students to Batch during creation */}
              <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                      Enroll Department Students ({batchCreateStudentIds.length} Selected)
                    </label>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      All available students in {teacherDeptName || teacherDeptCode || 'department'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowBatchCreateStudents(p => !p)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '4px 10px' }}
                  >
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>+</span>
                    {showBatchCreateStudents ? 'Hide Students' : '+ Add Students'}
                  </button>
                </div>

                {showBatchCreateStudents && (
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search students by name, email, roll number..."
                        value={batchCreateSearch}
                        onChange={(e) => setBatchCreateSearch(e.target.value)}
                        style={{ flex: 1, minWidth: '200px', fontSize: '0.82rem', padding: '6px 10px' }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const allIds = departmentStudents.map(s => s.id);
                          setBatchCreateStudentIds(allIds);
                        }}
                        style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                      >
                        Select All ({departmentStudents.length})
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setBatchCreateStudentIds([])}
                        style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                      >
                        Clear
                      </button>
                    </div>

                    <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {departmentStudents
                        .filter(st => {
                          if (!batchCreateSearch.trim()) return true;
                          const q = batchCreateSearch.toLowerCase();
                          return (
                            (st.name && st.name.toLowerCase().includes(q)) ||
                            (st.email && st.email.toLowerCase().includes(q)) ||
                            (st.username && st.username.toLowerCase().includes(q)) ||
                            (st.roll_number && st.roll_number.toLowerCase().includes(q))
                          );
                        })
                        .map(st => {
                          const isChecked = batchCreateStudentIds.includes(st.id);
                          return (
                            <label
                              key={st.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                background: isChecked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                                border: isChecked ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                                cursor: 'pointer',
                                fontSize: '0.84rem'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setBatchCreateStudentIds(prev =>
                                    isChecked ? prev.filter(id => id !== st.id) : [...prev, st.id]
                                  );
                                }}
                                style={{ accentColor: '#10b981', cursor: 'pointer' }}
                              />
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{st.name}</span>
                              {st.roll_number && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({st.roll_number})</span>
                              )}
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                {st.email || st.username}
                              </span>
                            </label>
                          );
                        })}
                      {departmentStudents.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          No department students found.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={creatingBatch}>
                  {creatingBatch ? 'Creating...' : 'Create Batch'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowAddBatchModal(false);
                    setNewBatchNameInput('');
                    setNewBatchProgId('');
                    setBatchCreateStudentIds([]);
                    setShowBatchCreateStudents(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search batches by name, programme, or department..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                style={{ minWidth: '280px', padding: '7px 12px', paddingRight: '48px', fontSize: '0.88rem' }}
              />
              {batchSearch && (
                <button
                  type="button"
                  onClick={() => setBatchSearch('')}
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
            {batchSearch && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setBatchSearch('')}
                style={{ padding: '8px 12px' }}
                title="Clear search filter"
              >
                Reset
              </button>
            )}
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Batch Name</th>
                  <th>Programme</th>
                  <th>Department</th>
                  <th style={{ textAlign: 'center' }}>Sections</th>
                  <th style={{ textAlign: 'center' }}>Enrolled Students</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.length > 0 ? (
                  filteredBatches.map(b => (
                    <tr key={b.id}>
                      <td>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{b.name}</strong>
                      </td>
                      <td>{b.program_name || '-'}</td>
                      <td>{b.department_name || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="user-role-pill" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 700 }}>
                          {b.section_count ?? 0} {Number(b.section_count) === 1 ? 'Section' : 'Sections'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          <span className="user-role-pill" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontWeight: 700 }}>
                            {b.student_count ?? 0} {Number(b.student_count) === 1 ? 'Student' : 'Students'}
                          </span>
                          <button
                            type="button"
                            onClick={() => openEnrollBatchModal(b)}
                            title={`Add students to batch "${b.name}"`}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: '#10b981',
                              color: '#ffffff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '17px',
                              fontWeight: 800,
                              lineHeight: 1,
                              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                              transition: 'transform 0.1s'
                            }}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            background: 'rgba(239, 68, 68, 0.18)',
                            color: '#f87171',
                            border: '1px solid #ef4444',
                            fontWeight: 600,
                            padding: '5px 14px',
                            fontSize: '0.82rem',
                            cursor: deletingBatchId === b.id ? 'not-allowed' : 'pointer'
                          }}
                          disabled={deletingBatchId === b.id}
                          onClick={() => handleDeleteBatch(b)}
                          title={`Permanently delete batch "${b.name}" from all users`}
                        >
                          {deletingBatchId === b.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      {batchSearch ? `No batches matching "${batchSearch}"` : 'No batches created yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: Create Accounts (Teacher & Class Teacher) */}
      {(isTeacher || isClassTeacher) && activeTab === 'create-faculty' && (
        <div className="card">
          <div className="card-title">
            Provision Accounts: Teachers, Class Leaders & Students
          </div>
          <div className="alert alert-info" style={{ fontSize: '0.85rem', margin: '12px 0' }}>
            <strong>Faculty Authority:</strong> Can provision <strong>Teacher</strong>, <strong>Class Leader</strong>, and <strong>Student</strong> accounts{isClassTeacher ? ' and Class Teacher accounts' : ''}. Class Leaders are activated immediately with no approval required.
          </div>

          <form onSubmit={handleCreateAccount} style={{ maxWidth: '600px' }}>
            <div className="form-group">
              <label className="form-label">Full Name (Single Name) <span className="req">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Hopper, Maya, Watson..."
                value={ctFacultyName}
                style={{
                  borderColor: ctNameEligibilityNotice ? '#ef4444' : undefined,
                  boxShadow: ctNameEligibilityNotice ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : undefined
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setCtFacultyName(val);
                  const uval = val.trim().toLowerCase().replace(/\s+/g, '');
                  const prevUval = ctFacultyName.trim().toLowerCase().replace(/\s+/g, '');
                  if (!ctFacultyUsername || ctFacultyUsername === prevUval || !ctFacultyUsername.trim()) {
                    setCtFacultyUsername(uval);
                  }
                  const isTeacherOrClassTeacher = ['teacher', 'class_teacher'].includes(ctFacultyRole);
                  const targetContact = uval ? (isTeacherOrClassTeacher ? `${uval}@inpand.com` : `${uval}1@inpand.com`) : '';
                  if (!ctFacultyContact || ctFacultyContact.includes('@inpand.com') || ctFacultyContact === `${prevUval}1@inpand.com` || ctFacultyContact === `${prevUval}@inpand.com` || !ctFacultyContact.trim()) {
                    setCtFacultyContact(targetContact);
                  }
                  if (val.trim()) {
                    API.checkName(val.trim()).then((res) => {
                      if (!res.eligible) {
                        setCtNameEligibilityNotice(res.message);
                      } else {
                        setCtNameEligibilityNotice('');
                      }
                    }).catch(() => {});
                  } else {
                    setCtNameEligibilityNotice('');
                  }
                }}
                onBlur={() => {
                  if (ctFacultyName.trim()) {
                    API.checkName(ctFacultyName.trim()).then((res) => {
                      if (!res.eligible) {
                        setCtNameEligibilityNotice(res.message);
                      } else {
                        setCtNameEligibilityNotice('');
                      }
                    }).catch(() => {});
                  }
                }}
                required
              />
              {ctNameEligibilityNotice && (
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
                  <span>{ctNameEligibilityNotice}</span>
                </div>
              )}
            </div>

            <div className="grid grid-2" style={{ gap: '12px', marginBottom: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">User name <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. hopper, maya"
                  value={ctFacultyUsername}
                  onChange={(e) => setCtFacultyUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Year {['student', 'class_leader'].includes(ctFacultyRole) && <span className="req">*</span>}
                </label>
                <select
                  className="form-select"
                  value={ctAcademicYear}
                  onChange={(e) => setCtAcademicYear(e.target.value)}
                  style={{ minWidth: '100%' }}
                >
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email or Phone Number (8 to 15 digits) <span className="req">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder={['teacher', 'class_teacher'].includes(ctFacultyRole) ? "e.g. 9876543210 (8-15 digits) or user@inpand.com" : "e.g. 9876543210 (8-15 digits) or user1@inpand.com"}
                value={ctFacultyContact}
                onChange={(e) => setCtFacultyContact(e.target.value)}
                maxLength={30}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Phone numbers are accepted up to 15 digits from 8 characters. Official email ends with @inpand.com.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Temporary Password <span className="req">*</span></label>
              <PasswordInput
                placeholder="Minimum 6 characters"
                value={ctFacultyPass}
                onChange={(e) => setCtFacultyPass(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Select Account Role <span className="req">*</span></label>
              <select
                className="form-select"
                value={ctFacultyRole}
                onChange={(e) => {
                  const r = e.target.value;
                  setCtFacultyRole(r);
                  const uval = ctFacultyName.trim().toLowerCase().replace(/\s+/g, '');
                  if (uval && (!ctFacultyContact || ctFacultyContact.includes('@inpand.com'))) {
                    const isTeacherOrClassTeacher = ['teacher', 'class_teacher'].includes(r);
                    setCtFacultyContact(isTeacherOrClassTeacher ? `${uval}@inpand.com` : `${uval}1@inpand.com`);
                  }
                }}
                required
              >
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                {isClassTeacher && (
                  <option value="class_teacher">Class Teacher</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  {ctFacultyRole === 'teacher' ? 'Assigned Departments' : 'Assigned Department'} <span className="req">*</span>
                </label>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: ctFacultyRole === 'teacher' 
                    ? (ctFacultyDeptIds.length >= 10 ? '#f87171' : '#60a5fa')
                    : (ctFacultyDeptId ? '#10b981' : '#f87171'),
                  background: 'rgba(255,255,255,0.06)',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {ctFacultyRole === 'teacher'
                    ? (ctFacultyDeptIds.length > 0 ? `${ctFacultyDeptIds.length} Selected` : 'Select Departments')
                    : (ctFacultyDeptId ? '1 Selected' : 'Select Department')}
                </span>
              </div>

              {ctFacultyRole === 'teacher' ? (
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '8px' }}>
                    Select which departments this teacher teaches or manages. At least 1 department is mandatory.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      background: '#f8fafc',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      marginBottom: '8px'
                    }}
                  >
                    {departments.map(d => {
                      const isChecked = ctFacultyDeptIds.includes(d.id);
                      return (
                        <label
                          key={d.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            background: isChecked ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            border: isChecked ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setCtFacultyDeptIds(prev => prev.filter(id => id !== d.id));
                                } else {
                                  if (ctFacultyDeptIds.length >= 10) {
                                    showAlert('Maximum 10 departments allowed.', 'warning');
                                    return;
                                  }
                                  setCtFacultyDeptIds(prev => [...prev, d.id]);
                                }
                              }}
                              style={{ cursor: 'pointer', accentColor: '#6366f1', width: '16px', height: '16px' }}
                            />
                            <span style={{ fontSize: '0.9rem', color: isChecked ? '#fff' : 'var(--text-secondary)' }}>
                              {d.name}
                            </span>
                          </div>
                          <span className="status-pill" style={{ fontSize: '0.75rem' }}>
                            {d.code}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <select
                  className="form-select"
                  value={ctFacultyDeptId}
                  onChange={(e) => setCtFacultyDeptId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Department (Mandatory) --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Department assignment is mandatory during account creation.
              </span>
            </div>

            {['student', 'class_leader'].includes(ctFacultyRole) && (
              <div style={{ background: 'rgba(56, 189, 248, 0.05)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '14px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0284c7', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Student Batch, Section & Guardian Details
                </h4>

                {/* Academic Batch / Year (Mandatory) */}
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Academic Batch / Year <span className="req">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={ctBatchId}
                    onChange={(e) => setCtBatchId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Academic Batch / Year (Mandatory) --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.program_name ? `(${b.program_name})` : ''}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Selecting the academic batch / year is mandatory for student account creation.
                  </span>
                </div>

                <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-primary)', userSelect: 'none', margin: 0, fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={ctIsClassLeader}
                      onChange={(e) => setCtIsClassLeader(e.target.checked)}
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
                        value={ctSection}
                        onChange={(e) => setCtSection(e.target.value)}
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
                      {ctSection === 'custom' && (
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 1 }}
                          placeholder="Enter section (e.g. E)"
                          value={ctCustomSection}
                          onChange={(e) => setCtCustomSection(e.target.value)}
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
                      value={ctRollNumber}
                      onChange={(e) => setCtRollNumber(e.target.value)}
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
                        value={ctGuardianName}
                        onChange={(e) => setCtGuardianName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Guardian Phone</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 9876543210"
                        value={ctGuardianPhone}
                        onChange={(e) => setCtGuardianPhone(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Guardian Email</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="e.g. guardian@gmail.com"
                        value={ctGuardianEmail}
                        onChange={(e) => setCtGuardianEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px' }}
              disabled={ctFacultyLoading}
            >
              {ctFacultyLoading ? 'Creating Account...' : `Create ${formatRoleName(ctFacultyRole)} Account`}
            </button>
          </form>
        </div>
      )}

      {/* TAB 7: Student Approvals (Teacher only) */}
      {(isTeacher || isClassTeacher) && activeTab === 'approvals' && (
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="card-header">
            <div className="card-title">
              Student & Class Leader Registration Approvals
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={loadPending}
              disabled={pendingLoading}
            >
              Refresh Queue
            </button>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
            Student and Class Leader self-registrations wait here for your approval or rejection.
          </p>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email / Phone</th>
                  <th>Role</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingStudents.length ? (
                  pendingStudents.slice((pendingCurrentPage - 1) * 10, pendingCurrentPage * 10).map(st => (
                    <tr key={st.id}>
                      <td>{formatUserId(st.id)}</td>
                      <td><strong>{st.name}</strong></td>
                      <td>{st.email}</td>
                      <td>
                        <span className={`user-role-pill role-${st.role}`}>
                          {formatRoleName(st.role)}
                        </span>
                      </td>
                      <td>{new Date(st.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApproveStudent(st.id)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleRejectStudent(st.id)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                      No student registration requests pending.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 10 Students per screen Pagination bar */}
          <Pagination
            currentPage={pendingCurrentPage}
            totalItems={pendingStudents.length}
            pageSize={10}
            onPageChange={setPendingCurrentPage}
            itemLabel="pending requests"
          />
        </div>
      )}

      {/* TAB 8: Send Notification */}
      {activeTab === 'send-notif' && (
        <div className="card">
          <div className="card-title">
            Send Notification
          </div>
          <p className="card-description" style={{ marginBottom: '16px' }}>
            Dispatch real-time announcements to all students or by department.
          </p>

          <form onSubmit={handleSendNotification} style={{ maxWidth: '650px' }}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Recipient Department <span className="req">*</span></label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}
                  onClick={async () => {
                    try {
                      const res = await API.getDepartments();
                      const list = res.departments || [];
                      setDepartments(list);
                      if (list.length > 0 && (!notifTarget || !list.some(d => String(d.id) === String(notifTarget)))) {
                        setNotifTarget(String(list[0].id));
                      }
                      showAlert('Department list refreshed', 'success');
                    } catch (e) {
                      showAlert('Failed to refresh departments', 'danger');
                    }
                  }}
                  title="Refresh available departments"
                >
                  Refresh List
                </button>
              </div>
              <select
                className="form-select"
                value={notifTarget}
                onFocus={() => {
                  API.getDepartments().then(res => {
                    const list = res.departments || [];
                    setDepartments(list);
                  }).catch(() => {});
                }}
                onChange={(e) => setNotifTarget(e.target.value)}
                required
              >
                <option value="student">All Students</option>
                {departments.map(d => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name} {d.code ? `(${d.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Announcement Title <span className="req">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Midterm Quiz Timetable and Instructions"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notification Message <span className="req">*</span></label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Type the message that will display in the recipient portal..."
                value={notifMsg}
                onChange={(e) => setNotifMsg(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '12px 28px' }}
              disabled={sendNotifLoading}
            >
              {sendNotifLoading ? 'Dispatching...' : 'Dispatch Notification'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 9: My Notifications Inbox */}
      {activeTab === 'inbox' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              Notifications Inbox
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                className="form-select"
                style={{ minWidth: '200px' }}
                value={inboxDeptFilter}
                onChange={(e) => setInboxDeptFilter(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {filteredInbox.length ? (
              filteredInbox.map(n => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read && typeof n.id === 'number') {
                      handleMarkInboxRead(n.id);
                    }
                  }}
                  style={{
                    background: n.is_read ? 'rgba(255,255,255,0.03)' : 'rgba(99, 102, 241, 0.08)',
                    border: n.is_read ? '1px solid var(--border-color)' : '1px solid rgba(99, 102, 241, 0.4)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px',
                    cursor: n.is_read ? 'default' : 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{n.title}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '6px 0' }}>
                    {n.message}
                  </p>
                  <div style={{ fontSize: '0.75rem', color: '#7e22ce' }}>
                    From: {n.sender_name ? `${n.sender_name} (${formatRoleName(n.sender_role)})` : 'Administration'}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                No notifications received yet.
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      </div>


      {/* Modal: Request Add New Department */}
      {showAddDeptModal && createPortal(
        <div
          className="modal-overlay active"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddDeptModal(false);
          }}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '500px', maxHeight: '88vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Request Add New Department
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddDeptModal(false)}
                style={{ padding: '2px 8px' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRequestAddDepartment} style={{ marginTop: '16px' }}>
              <div className="alert alert-info" style={{ fontSize: '0.82rem', marginBottom: '14px' }}>
                Submitting a new department will immediately dispatch an approval notification to the College Administrator. Once approved, it will be registered across the system.
              </div>
              <div className="form-group">
                <label className="form-label">Department Name <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Biomedical Engineering"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Department Code <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. BME"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddDeptModal(false)}
                  disabled={addingDeptLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={addingDeptLoading}
                >
                  {addingDeptLoading ? 'Submitting...' : 'Submit Department Request'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Enroll Department Students in Existing Batch */}
      {enrollModalBatch && createPortal(
        <div
          className="modal-overlay active"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEnrollModalBatch(null);
          }}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>
                  Enroll Students in Batch: <span style={{ color: '#38bdf8' }}>{enrollModalBatch.name}</span>
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {enrollModalBatch.program_name || 'Academic Batch'} &bull; Department Students
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setEnrollModalBatch(null)}
                style={{ padding: '2px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: '16px' }}>
              {enrollBatchLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Loading enrolled students...
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search students by name, email, roll number..."
                      value={enrollBatchSearch}
                      onChange={(e) => setEnrollBatchSearch(e.target.value)}
                      style={{ flex: 1, minWidth: '180px' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const allIds = departmentStudents.map(s => s.id);
                        setEnrollBatchStudentIds(allIds);
                      }}
                    >
                      Select All ({departmentStudents.length})
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEnrollBatchStudentIds([])}
                    >
                      Clear
                    </button>
                  </div>

                  <div style={{ fontSize: '0.84rem', color: '#38bdf8', marginBottom: '10px', fontWeight: 600 }}>
                    {enrollBatchStudentIds.length} student(s) selected for enrollment in this batch
                  </div>

                  <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {departmentStudents
                      .filter(st => {
                        if (!enrollBatchSearch.trim()) return true;
                        const q = enrollBatchSearch.toLowerCase();
                        return (
                          (st.name && st.name.toLowerCase().includes(q)) ||
                          (st.email && st.email.toLowerCase().includes(q)) ||
                          (st.username && st.username.toLowerCase().includes(q)) ||
                          (st.roll_number && st.roll_number.toLowerCase().includes(q))
                        );
                      })
                      .map(st => {
                        const isChecked = enrollBatchStudentIds.includes(st.id);
                        return (
                          <label
                            key={st.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              background: isChecked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                              border: isChecked ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                              cursor: 'pointer',
                              transition: 'all 0.12s'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setEnrollBatchStudentIds(prev =>
                                  isChecked ? prev.filter(id => id !== st.id) : [...prev, st.id]
                                );
                              }}
                              style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.9rem' }}>
                                {st.name}
                                {st.roll_number && (
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                    ({st.roll_number})
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {st.email || st.username}
                              </div>
                            </div>
                            {st.batch_name && (
                              <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                                Current: {st.batch_name}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    {departmentStudents.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No department students found to enroll.
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEnrollModalBatch(null)}
                      disabled={enrollBatchSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveBatchEnrollment}
                      disabled={enrollBatchSaving || enrollBatchLoading}
                      style={{ background: '#10b981', borderColor: '#10b981' }}
                    >
                      {enrollBatchSaving ? 'Saving Enrollment...' : `Save Enrollment (${enrollBatchStudentIds.length})`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};
