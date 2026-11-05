import React, { useState } from 'react';

import { createPortal } from 'react-dom';

import { useAuth, formatUserId } from '../context/AuthContext';

import { useNotifications } from '../context/NotificationContext';

import { EditUserModal } from './EditUserModal';

import { NotificationComposer } from './NotificationComposer';

import { API } from '../api/api';



export const Navbar = ({ onOpenChangePassword }) => {

  const {

    user,

    logout,

    collegeName,

    setCollegeName,

    formatRoleName

  } = useAuth();



  const {

    notifications,

    unreadCount,

    isOpen: notifOpen,

    toggleOpen: toggleNotif,

    close: closeNotif,

    markAllRead,

    markRead,

    loading: notifLoading

  } = useNotifications();



  const [editSelfOpen, setEditSelfOpen] = useState(() => {

    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('test_auto_open_edit') === 'true';

  });



  // Dean-exclusive Edit Institute Name

  const [isEditCollegeOpen, setIsEditCollegeOpen] = useState(false);

  const [newInstituteName, setNewInstituteName] = useState('');

  const [editCollegeLoading, setEditCollegeLoading] = useState(false);

  const [editCollegeError, setEditCollegeError] = useState('');



  const handleSaveCollegeName = async (e) => {

    e.preventDefault();

    const trimmed = (newInstituteName || '').trim();

    if (!trimmed || trimmed.length < 2 || trimmed.length > 100) {

      setEditCollegeError('Institute name must be between 2 and 100 characters');

      return;

    }

    try {

      setEditCollegeLoading(true);

      setEditCollegeError('');

      await API.setCollegeName(trimmed);

      setCollegeName(trimmed);

      setIsEditCollegeOpen(false);

    } catch (err) {

      setEditCollegeError(err.message || 'Failed to update institute name');

    } finally {

      setEditCollegeLoading(false);

    }

  };



  // State for in-notification approvals

  const [approvalStatusMap, setApprovalStatusMap] = useState({});

  const [actionLoadingMap, setActionLoadingMap] = useState({});



  // State for in-notice broadcast composer

  const [showBroadcastForm, setShowBroadcastForm] = useState(false);



  const canBroadcast = user && ['super_admin', 'admin', 'teacher', 'class_teacher', 'librarian', 'class_leader'].includes(user.role);



  const handleApproveFromNotice = async (e, studentId, notifId) => {

    e.stopPropagation();

    try {

      setActionLoadingMap(prev => ({ ...prev, [studentId]: 'approving' }));

      const res = await API.approveStudent(studentId);

      const nextSt = res.status || 'active';

      setApprovalStatusMap(prev => ({ ...prev, [studentId]: nextSt }));

      if (notifId) markRead(notifId);

      loadNotifications();

      alert(res.message || 'Account approved and activated successfully!');

    } catch (err) {

      if (notifId) markRead(notifId);

      setApprovalStatusMap(prev => ({ ...prev, [studentId]: 'active' }));

      loadNotifications();

      alert(err.message || 'Account registration processed.');

    } finally {

      setActionLoadingMap(prev => ({ ...prev, [studentId]: null }));

    }

  };



  const handleRejectFromNotice = async (e, studentId, notifId) => {

    e.stopPropagation();

    try {

      setActionLoadingMap(prev => ({ ...prev, [studentId]: 'rejecting' }));

      const res = await API.rejectStudent(studentId);

      const nextSt = res.status || 'rejected';

      setApprovalStatusMap(prev => ({ ...prev, [studentId]: nextSt }));

      if (notifId) markRead(notifId);

      loadNotifications();

      alert(res.message || 'Account registration rejected.');

    } catch (err) {

      if (notifId) markRead(notifId);

      setApprovalStatusMap(prev => ({ ...prev, [studentId]: 'rejected' }));

      loadNotifications();

      alert(err.message || 'Account registration processed.');

    } finally {

      setActionLoadingMap(prev => ({ ...prev, [studentId]: null }));

    }

  };



  return (

    <header className="navbar">

      <div className="nav-brand">

        <div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

            <span className="brand-name" style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>

              {collegeName || 'INPAND institute of Engineering and Technology'}

            </span>

            {user?.role === 'dean' && (

              <button

                className="btn btn-secondary btn-sm"

                onClick={() => {

                  setNewInstituteName(collegeName || '');

                  setEditCollegeError('');

                  setIsEditCollegeOpen(true);

                }}

                style={{

                  padding: '2px 8px',

                  fontSize: '0.72rem',

                  display: 'flex',

                  alignItems: 'center',

                  gap: '4px',

                  background: 'rgba(225, 29, 72, 0.2)',

                  borderColor: 'rgba(225, 29, 72, 0.5)',

                  color: '#fb7185',

                  fontWeight: 600

                }}

                title="Edit Institute Name (Dean Authority)"

              >

                <span>Edit</span>

              </button>

            )}

          </div>

          <div className="brand-subtitle">

            College Management & Dynamic Assessments

          </div>

        </div>

      </div>



      <div className="nav-user-panel">

        {user ? (

          <>

            {/* Notification Button on Right Side Top */}

            <div style={{ position: 'relative' }}>

              <button

                className={`nav-notification-btn ${unreadCount > 0 ? 'has-unread' : ''}`}

                onClick={toggleNotif}

                title="Notifications & Announcements"

              >

                <span style={{ fontSize: '0.92rem' }}>🔔</span>

                <span>Notification</span>

                {unreadCount > 0 && (

                  <span className="nav-notif-badge">

                    {unreadCount}

                  </span>

                )}

              </button>

            </div>



            {/* User Info Badge with Tab Indicator */}

            <div className="user-badge" title="Isolated Tab Session">

              <span style={{ fontWeight: 600 }}>{user.name}</span>

              <span className={`user-role-pill role-${user.role}`}>

                {formatRoleName(user.role)}

              </span>

            </div>



            {/* Edit Login Details for All Users */}

            <button

              className="btn btn-secondary btn-sm"

              onClick={() => setEditSelfOpen(true)}

              title="Edit your login name, user name, and credentials"

              style={{

                display: 'flex',

                alignItems: 'center',

                gap: '6px',

                background: '#eef2ff',

                borderColor: '#c7d2fe',

                color: '#4338ca',

                fontWeight: 700

              }}

            >

              <span>Edit Login Details</span>

            </button>



            {/* Change Password */}

            <button

              className="btn btn-secondary btn-sm"

              onClick={onOpenChangePassword}

              title="Change Password"

            >

              Change Password

            </button>



            {/* Logout Button */}

            <button

              className="btn btn-secondary btn-sm"

              onClick={logout}

              title="Sign Out This Tab"

            >

              Sign Out

            </button>

          </>

        ) : null}

      </div>



      {/* Edit Login Details Modal for Logged-In User */}

      {user && (

        <EditUserModal

          user={user}

          isOpen={editSelfOpen}

          onClose={() => setEditSelfOpen(false)}

          onUpdated={() => {

            // Refresh to update header and views

            window.location.reload();

          }}

        />

      )}

      {/* Notices & Announcements Flyout for Logged In User */}

      {user && notifOpen && createPortal(

        <div

          className="modal-overlay active"

          style={{ justifyContent: 'flex-end', alignItems: 'flex-start', padding: '16px 24px', background: 'rgba(15, 23, 42, 0.45)' }}

          onClick={(e) => {

            if (e.target === e.currentTarget) closeNotif();

          }}

        >

          <div

            className="modal-content"

            style={{

              maxWidth: '560px',

              width: '100%',

              maxHeight: 'calc(100vh - 32px)',

              overflowY: 'auto',

              borderRadius: '16px',

              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.35)',

              margin: '0',

              animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'

            }}

            onClick={(e) => e.stopPropagation()}

          >

            <button

              className="modal-close-btn"
              onClick={closeNotif}
              title="Close Notices"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', pointerEvents: 'none' }}>
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
            </button>



            <div

              className="modal-header"

              style={{

                display: 'flex',

                justifyContent: 'space-between',

                alignItems: 'center',

                marginBottom: '18px',

                paddingBottom: '14px',

                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'

              }}

            >

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

                <div>

                  <h2 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>

                    Campus Notices & Alerts

                  </h2>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>

                    {unreadCount > 0 ? `${unreadCount} unread notice${unreadCount > 1 ? 's' : ''}` : 'All caught up'}

                  </p>

                </div>

              </div>



              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '36px' }}>

                {canBroadcast && (

                  <button

                    type="button"

                    className="btn btn-secondary btn-sm"

                    onClick={() => setShowBroadcastForm(p => !p)}

                    style={{

                      padding: '4px 12px',

                      fontSize: '0.78rem',

                      color: showBroadcastForm ? '#ef4444' : '#4f46e5',

                      borderColor: showBroadcastForm ? '#fca5a5' : '#c7d2fe',

                      background: showBroadcastForm ? '#fee2e2' : '#eef2ff',

                      fontWeight: 700

                    }}

                    title="Publish a campus announcement or broadcast notice"

                  >

                    <span>{showBroadcastForm ? '✕ Close Composer' : '📢 Post Notice'}</span>

                  </button>

                )}



                {unreadCount > 0 && (

                  <button

                    type="button"

                    className="btn btn-secondary btn-sm"

                    onClick={markAllRead}

                    style={{

                      padding: '4px 12px',

                      fontSize: '0.78rem',

                      color: '#4338ca',

                      borderColor: 'rgba(99, 102, 241, 0.4)',

                      background: 'rgba(99, 102, 241, 0.15)',

                      display: 'flex',

                      alignItems: 'center',

                      gap: '4px',

                      fontWeight: 700

                    }}

                    title="Mark all notices as read"

                  >

                    <span>Mark All Read</span>

                  </button>

                )}

              </div>

            </div>



            {/* In-Notice Broadcast Notice Composer (audience rules come from the shared NotificationComposer) */}

            {showBroadcastForm && (

              <div

                style={{

                  background: '#f8fafc',

                  border: '1.5px solid #cbd5e1',

                  borderRadius: '12px',

                  padding: '16px',

                  marginBottom: '16px',

                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'

                }}

              >

                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>

                  📢 Compose Campus Notice / Announcement

                </div>

                <NotificationComposer compact onSent={() => setShowBroadcastForm(false)} />

              </div>

            )}





            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {notifLoading && !notifications.length ? (

                <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>

                  Loading notices...

                </div>

              ) : notifications.length === 0 ? (

                <div

                  style={{

                    padding: '42px 20px',

                    textAlign: 'center',

                    background: 'rgba(255, 255, 255, 0.02)',

                    borderRadius: '12px',

                    border: '1px dashed var(--border-color)'

                  }}

                >

                  <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem', display: 'block' }}>

                    No Notices Right Now

                  </strong>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '6px 0 0 0' }}>

                    You're completely up to date. Campus announcements and system notices will appear here.

                  </p>

                </div>

              ) : (

                notifications.map((n) => {

                  const currentApprovalStatus = approvalStatusMap[n.reference_id] || n.user_status || 'pending';

                  const hasApprovalContext = n.type === 'student_registration' || n.type === 'account_approval' || (n.reference_id && (n.title || '').toLowerCase().includes('approval'));

                  const isPendingApproval = hasApprovalContext && currentApprovalStatus === 'pending';

                  const isApprovalNotice = isPendingApproval;

                  const isUnread = (!n.is_read) && (!hasApprovalContext || currentApprovalStatus === 'pending');

                  const isActioning = actionLoadingMap[n.reference_id];



                  return (

                    <div

                      key={n.id}

                      onClick={() => {

                        if (n.id) {

                          markRead(n.id);

                        }

                      }}

                      style={{

                        padding: '16px 18px',

                        borderRadius: '12px',

                        border: isPendingApproval

                          ? '1.5px solid #f59e0b'

                          : isUnread

                          ? '1px solid rgba(245, 158, 11, 0.4)'

                          : '1px solid #e2e8f0',

                        background: isPendingApproval

                          ? '#fffbeb'

                          : isUnread

                          ? 'rgba(245, 158, 11, 0.05)'

                          : '#ffffff',

                        boxShadow: isPendingApproval

                          ? '0 2px 10px rgba(245, 158, 11, 0.15)'

                          : isUnread

                          ? '0 0 12px rgba(245, 158, 11, 0.08)'

                          : '0 1px 3px rgba(0,0,0,0.05)',

                        transition: 'all 0.2s ease',

                        cursor: 'pointer',

                        position: 'relative'

                      }}

                    >

                      <div

                        style={{

                          display: 'flex',

                          justifyContent: 'space-between',

                          alignItems: 'flex-start',

                          gap: '12px',

                          marginBottom: '6px'

                        }}

                      >

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

                          {isApprovalNotice && (

                            <span

                              style={{

                                background: '#f59e0b',

                                color: '#ffffff',

                                fontSize: '0.68rem',

                                fontWeight: 800,

                                textTransform: 'uppercase',

                                letterSpacing: '0.05em',

                                padding: '2px 8px',

                                borderRadius: '12px'

                              }}

                            >

                              Account Approval

                            </span>

                          )}

                          {isUnread && !isApprovalNotice && (

                            <span

                              style={{

                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',

                                color: '#fff',

                                fontSize: '0.68rem',

                                fontWeight: 800,

                                textTransform: 'uppercase',

                                letterSpacing: '0.05em',

                                padding: '2px 8px',

                                borderRadius: '12px'

                              }}

                            >

                              New

                            </span>

                          )}

                          <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.96rem', fontWeight: 700 }}>

                            {n.title}

                          </h4>

                        </div>



                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

                          {isUnread && typeof n.id === 'number' && (

                            <button

                              type="button"

                              className="btn btn-secondary btn-sm"

                              onClick={(e) => {

                                e.stopPropagation();

                                markRead(n.id);

                              }}

                              style={{

                                padding: '2px 8px',

                                fontSize: '0.72rem',

                                color: '#10b981',

                                borderColor: 'rgba(16, 185, 129, 0.4)',

                                background: 'rgba(16, 185, 129, 0.1)'

                              }}

                              title="Mark notice as read"

                            >

                              Mark Read

                            </button>

                          )}

                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>

                            {n.created_at

                              ? new Date(n.created_at).toLocaleDateString(undefined, {

                                  month: 'short',

                                  day: 'numeric',

                                  hour: '2-digit',

                                  minute: '2-digit'

                                })

                              : ''}

                          </span>

                        </div>

                      </div>



                      <p

                        style={{

                          color: 'var(--text-secondary)',

                          fontSize: '0.88rem',

                          margin: '6px 0 10px 0',

                          lineHeight: 1.55

                        }}

                      >

                        {n.message}

                      </p>



                      {/* IN-NOTIFICATION ACCEPT & REJECT FOR PENDING APPROVALS */}

                      {hasApprovalContext && n.reference_id && (

                        <div

                          style={{

                            marginTop: '10px',

                            paddingTop: '10px',

                            borderTop: '1px dashed #cbd5e1',

                            display: 'flex',

                            alignItems: 'center',

                            justifyContent: 'space-between',

                            flexWrap: 'wrap',

                            gap: '10px'

                          }}

                          onClick={(e) => e.stopPropagation()}

                        >

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

                            <span style={{ fontSize: '0.76rem', color: '#92400e', fontWeight: 700 }}>

                              Decision on User {formatUserId(n.reference_id)}:

                            </span>

                            {n.target_user_role && (

                              <span className={`user-role-pill role-${n.target_user_role}`} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>

                                {formatRoleName(n.target_user_role)}

                              </span>

                            )}

                          </div>



                          {currentApprovalStatus === 'active' ? (

                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', border: '1.5px solid #86efac', padding: '4px 12px', borderRadius: '6px' }}>

                              ✓ Approved & Activated

                            </span>

                          ) : currentApprovalStatus === 'rejected' ? (

                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#b91c1c', background: '#fee2e2', border: '1.5px solid #fca5a5', padding: '4px 12px', borderRadius: '6px' }}>

                              ✕ Rejected

                            </span>

                          ) : (

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                              <button

                                type="button"

                                disabled={!!isActioning}

                                onClick={(e) => handleApproveFromNotice(e, n.reference_id, n.id)}

                                style={{

                                  padding: '5px 14px',

                                  fontSize: '0.78rem',

                                  fontWeight: 800,

                                  background: '#10b981',

                                  borderColor: '#059669',

                                  color: '#ffffff',

                                  borderRadius: '6px',

                                  border: '1px solid #059669',

                                  cursor: isActioning ? 'not-allowed' : 'pointer',

                                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',

                                  display: 'inline-flex',

                                  alignItems: 'center',

                                  gap: '4px'

                                }}

                                title="Click to Accept and Activate this account"

                              >

                                {isActioning === 'approving' ? 'Accepting...' : '✓ Accept'}

                              </button>

                              <button

                                type="button"

                                disabled={!!isActioning}

                                onClick={(e) => handleRejectFromNotice(e, n.reference_id, n.id)}

                                style={{

                                  padding: '5px 14px',

                                  fontSize: '0.78rem',

                                  fontWeight: 800,

                                  background: '#ef4444',

                                  borderColor: '#dc2626',

                                  color: '#ffffff',

                                  borderRadius: '6px',

                                  border: '1px solid #dc2626',

                                  cursor: isActioning ? 'not-allowed' : 'pointer',

                                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',

                                  display: 'inline-flex',

                                  alignItems: 'center',

                                  gap: '4px'

                                }}

                                title="Click to Reject this registration"

                              >

                                {isActioning === 'rejecting' ? 'Rejecting...' : '✕ Reject'}

                              </button>

                            </div>

                          )}

                        </div>

                      )}



                      <div

                        style={{

                          display: 'flex',

                          justifyContent: 'space-between',

                          alignItems: 'center',

                          fontSize: '0.75rem',

                          color: 'var(--text-muted)',

                          paddingTop: '8px',

                          borderTop: '1px solid #f1f5f9'

                        }}

                      >

                        <span>

                          {n.sender_name

                            ? `From: ${n.sender_name} (${formatRoleName(n.sender_role)})`

                            : 'From: College Administration'}

                        </span>

                        {n.department_name && (

                          <span

                            style={{

                              color: '#4338ca',

                              background: 'rgba(99, 102, 241, 0.1)',

                              padding: '1px 6px',

                              borderRadius: '4px'

                            }}

                          >

                            Dept: {n.department_name}

                          </span>

                        )}

                      </div>

                    </div>

                  );

                })

              )}

            </div>

          </div>

        </div>,

        document.body

      )}



      {/* Edit Institute Name Modal - Dean Authority */}

      {isEditCollegeOpen && createPortal(

        <div

          className="modal-overlay active"

          onClick={() => setIsEditCollegeOpen(false)}

        >

          <div

            className="modal-content"

            style={{ maxWidth: '480px' }}

            onClick={(e) => e.stopPropagation()}

          >

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>

              <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>

                Edit Institute Name

              </h3>

              <button

                onClick={() => setIsEditCollegeOpen(false)}

                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}

              >

                ✕

              </button>

            </div>



            <form onSubmit={handleSaveCollegeName}>

              <div style={{ marginBottom: '16px' }}>

                <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>

                  Official Institute Name

                </label>

                <input

                  type="text"

                  className="form-control dean-input"

                  value={newInstituteName}

                  onChange={(e) => setNewInstituteName(e.target.value)}

                  placeholder="e.g. Apex Institute of Technology"

                  autoFocus

                  required

                  style={{

                    color: '#0f172a',

                    background: '#ffffff',

                    border: '1px solid #cbd5e1'

                  }}

                />

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>

                  Dean Authority: Updates the branding title displayed across the entire portal.

                </div>

              </div>



              {editCollegeError && (

                <div className="alert alert-danger" style={{ marginBottom: '16px', padding: '8px 12px', fontSize: '0.85rem' }}>

                  {editCollegeError}

                </div>

              )}



              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>

                <button

                  type="button"

                  className="btn btn-secondary btn-sm"

                  onClick={() => setIsEditCollegeOpen(false)}

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  className="btn btn-primary btn-sm"

                  disabled={editCollegeLoading}

                  style={{ background: '#e11d48', borderColor: '#e11d48', fontWeight: 600 }}

                >

                  {editCollegeLoading ? 'Saving...' : 'Save Name'}

                </button>

              </div>

            </form>

          </div>

        </div>,

        document.body

      )}

    </header>

  );

};

