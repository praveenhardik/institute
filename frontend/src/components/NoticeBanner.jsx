import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotifications } from '../context/NotificationContext';
import { useAuth, formatRoleName } from '../context/AuthContext';
import { NotificationComposer, canDispatchNotifications } from './NotificationComposer';

export const NoticeBanner = () => {
  const { notifications, unreadCount, markRead, markAllRead, loadNotifications } = useNotifications();
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('campus_notice_banner_dismissed') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [activeModalNotice, setActiveModalNotice] = useState(null);
  const activeNoticeIdRef = useRef(null);
  const [showAll, setShowAll] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);

  // Every notification (including account-created notices) appears in this top panel for every role.
  const filteredNotifications = notifications || [];

  // If no notifications in database, fallback to a campus broadcast notice
  const displayNotices = (filteredNotifications.length > 0)
    ? filteredNotifications
    : [
        {
          id: 'welcome-default',
          title: 'Campus Academic Notice',
          message: 'Welcome to the digital college portal. Timed assessments, syllabus reviews, and department activities are actively scheduled.',
          sender_name: 'College Administration',
          sender_role: 'admin',
          created_at: new Date().toISOString(),
          is_read: 1,
          type: 'broadcast'
        }
      ];

  // Keep current notice selected even when notifications reload via background polling
  useEffect(() => {
    if (activeNoticeIdRef.current != null) {
      const idx = displayNotices.findIndex((n) => n.id === activeNoticeIdRef.current);
      if (idx !== -1) {
        if (idx !== currentIndex) {
          setCurrentIndex(idx);
        }
        return;
      }
    }
    if (currentIndex >= displayNotices.length) {
      const safeIdx = Math.max(0, displayNotices.length - 1);
      setCurrentIndex(safeIdx);
      activeNoticeIdRef.current = displayNotices[safeIdx]?.id ?? null;
    } else if (displayNotices[currentIndex]) {
      activeNoticeIdRef.current = displayNotices[currentIndex]?.id ?? null;
    }
  }, [displayNotices, currentIndex]);

  const currentNotice = displayNotices[currentIndex] || displayNotices[0];

  // Automatically mark notice as read once it is seen on screen (stays on screen without auto-cycling)
  useEffect(() => {
    if (isDismissed || !currentNotice || currentNotice.is_read || typeof currentNotice.id !== 'number') {
      return;
    }
    const noticeId = currentNotice.id;
    // Mark as read after being seen for 1 second
    const timer = setTimeout(() => {
      markRead(noticeId);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentIndex, isDismissed, currentNotice?.id, currentNotice?.is_read, markRead]);

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => {
      const nextIdx = (prev + 1) % displayNotices.length;
      activeNoticeIdRef.current = displayNotices[nextIdx]?.id ?? null;
      return nextIdx;
    });
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => {
      const prevIdx = (prev - 1 + displayNotices.length) % displayNotices.length;
      activeNoticeIdRef.current = displayNotices[prevIdx]?.id ?? null;
      return prevIdx;
    });
  };

  const handleMarkAsRead = async (e, notice) => {
    e.stopPropagation();
    if (notice.id && typeof notice.id === 'number' && !notice.is_read) {
      await markRead(notice.id);
    }
  };

  const handleOpenDetails = (notice) => {
    if (!notice) return;
    setActiveModalNotice(notice);
    if (!notice.is_read && typeof notice.id === 'number') {
      markRead(notice.id);
      setActiveModalNotice((prev) => prev ? { ...prev, is_read: 1 } : prev);
    }
  };

  const handleMouseEnter = () => {
    if (currentNotice && !currentNotice.is_read && typeof currentNotice.id === 'number') {
      markRead(currentNotice.id);
    }
  };

  // If user dismissed the banner, remove it completely from the screen (no restore button)
  if (isDismissed) {
    return null;
  }

  const isUnread = currentNotice && !currentNotice.is_read;

  return (
    <>
      <div
        className="notice-banner"
        onMouseEnter={handleMouseEnter}
        style={{
          background: '#ffffff',
          border: isUnread ? '1px solid #f59e0b' : '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
          borderRadius: '10px',
          padding: '8px 16px',
          marginBottom: '10px',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          backdropFilter: 'blur(12px)',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}
      >
        {/* Left: Badge, Counter, Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: isUnread
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              fontSize: '0.74rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '4px 10px',
              borderRadius: '20px',
              boxShadow: isUnread ? '0 0 10px rgba(245, 158, 11, 0.4)' : '0 0 10px rgba(99, 102, 241, 0.3)'
            }}
          >
            <span>Notice</span>
          </div>

          {displayNotices.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handlePrev}
                title="Click arrow to view previous notice"
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#1e293b',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  padding: 0,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.4)';
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
              >
                ◀
              </button>
              <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, minWidth: '40px', textAlign: 'center' }}>
                {currentIndex + 1} / {displayNotices.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                title="Click arrow to view next notice"
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#1e293b',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  padding: 0,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.4)';
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
              >
                ▶
              </button>
            </div>
          )}
        </div>

        {/* Center: Notice Content */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer'
          }}
          onClick={() => handleOpenDetails(currentNotice)}
          title="Click to view full notice details"
        >
          {isUnread && (
            <span
              style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                flexShrink: 0
              }}
            >
              NEW
            </span>
          )}

          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.9rem',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <strong style={{ color: '#0f172a', fontWeight: 700 }}>
              {currentNotice.title}
            </strong>
            <span style={{ color: '#64748b' }}>—</span>
            <span style={{ color: '#334155' }}>
              {currentNotice.message}
            </span>
          </div>

          {currentNotice.sender_name && (
            <span
              style={{
                fontSize: '0.75rem',
                color: '#475569',
                background: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                flexShrink: 0
              }}
            >
              From {currentNotice.sender_name}
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenDetails(currentNotice)}
            style={{
              padding: '3px 10px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Read complete announcement"
          >
            <span>Details</span>
          </button>

          {isUnread && typeof currentNotice.id === 'number' ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={(e) => handleMarkAsRead(e, currentNotice)}
              style={{
                padding: '3px 9px',
                fontSize: '0.78rem',
                color: '#10b981',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                background: 'rgba(16, 185, 129, 0.1)'
              }}
              title="Mark this notice as read"
            >
              Mark Read
            </button>
          ) : (
            <span
              style={{
                fontSize: '0.72rem',
                color: '#10b981',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}
              title="This notice has been seen and marked as read"
            >
              Seen
            </span>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAll((p) => !p)}
            title="Show all notifications and announcements"
            style={{ padding: '4px 10px', fontSize: '0.80rem', color: '#4338ca', fontWeight: 700, borderColor: '#c7d2fe', background: '#eef2ff', whiteSpace: 'nowrap' }}
          >
            {showAll ? 'Hide All' : `All Notifications (${notifications.length})`}
          </button>

          {unreadCount > 1 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={markAllRead}
              style={{
                padding: '4px 10px',
                fontSize: '0.80rem',
                color: '#4338ca',
                fontWeight: 700,
                borderColor: '#c7d2fe',
                background: '#eef2ff'
              }}
              title="Mark all seen notices as read"
            >
              All Read
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (currentNotice && !currentNotice.is_read && typeof currentNotice.id === 'number') {
                markRead(currentNotice.id);
              }
              setIsDismissed(true);
              try {
                sessionStorage.setItem('campus_notice_banner_dismissed', 'true');
              } catch (_) {}
            }}
            title="Dismiss notice banner"
            style={{
              background: 'none',
              border: 'none',
              color: '#334155',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '2px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {showAll && (
        <div className="card" style={{ marginBottom: '10px', padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>📢 Notifications & Announcements</strong>
              <span className="user-role-pill" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.74rem' }}>
                {notifications.length} Total
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={loadNotifications} style={{ fontSize: '0.78rem', padding: '4px 10px' }} title="Refresh notifications">
                Refresh
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAll(false)} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                Close
              </button>
            </div>
          </div>

          {canDispatchNotifications(user?.role) && (
            <div style={{ marginBottom: '12px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowDispatch((p) => !p)}
                style={{ marginBottom: showDispatch ? '10px' : 0 }}
              >
                {showDispatch ? '✕ Close Dispatch' : '📢 Dispatch Notification'}
              </button>
              {showDispatch && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <NotificationComposer compact onSent={() => loadNotifications()} />
                </div>
              )}
            </div>
          )}

          <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {notifications.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.86rem' }}>
                No campus notifications or announcements posted yet.
              </div>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleOpenDetails(n)}
                style={{ padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', background: n.is_read ? 'transparent' : 'rgba(245, 158, 11, 0.06)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{n.title}</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{n.message}</p>
                {n.sender_name && (
                  <div style={{ fontSize: '0.72rem', color: '#6366f1' }}>From: {n.sender_name} ({formatRoleName(n.sender_role)})</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notice Details Modal */}
      {activeModalNotice && createPortal(
        <div
          className="modal-overlay active"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModalNotice(null);
          }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: '580px',
              width: '90%',
              maxHeight: '88vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '14px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem' }}>
                    {activeModalNotice.title}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '2px' }}>
                    Official College Notice
                  </div>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setActiveModalNotice(null)}
                style={{ fontSize: '1.3rem', color: '#334155', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  color: '#0f172a',
                  fontSize: '0.92rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {activeModalNotice.message}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  marginTop: '16px',
                  fontSize: '0.82rem'
                }}
              >
                {activeModalNotice.sender_name && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ color: '#334155' }}>Issued By</div>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {activeModalNotice.sender_name}{' '}
                      {activeModalNotice.sender_role ? `(${activeModalNotice.sender_role.replace('_', ' ').toUpperCase()})` : ''}
                    </strong>
                  </div>
                )}

                {activeModalNotice.department_name && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ color: '#334155' }}>Department</div>
                    <strong style={{ color: '#6366f1' }}>{activeModalNotice.department_name}</strong>
                  </div>
                )}

                {activeModalNotice.created_at && (
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#334155' }}>Date & Time</div>
                    <strong style={{ color: '#090d16' }}>
                      {new Date(activeModalNotice.created_at).toLocaleString()}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {displayNotices.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const prevIdx = (currentIndex - 1 + displayNotices.length) % displayNotices.length;
                        setCurrentIndex(prevIdx);
                        const prevNotice = displayNotices[prevIdx];
                        activeNoticeIdRef.current = prevNotice?.id ?? null;
                        setActiveModalNotice(prevNotice);
                        if (prevNotice && !prevNotice.is_read && typeof prevNotice.id === 'number') {
                          markRead(prevNotice.id);
                        }
                      }}
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      title="Previous notification"
                    >
                      Prev
                    </button>
                    <span style={{ fontSize: '0.78rem', color: '#334155', minWidth: '40px', textAlign: 'center' }}>
                      {currentIndex + 1} / {displayNotices.length}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const nextIdx = (currentIndex + 1) % displayNotices.length;
                        setCurrentIndex(nextIdx);
                        const nextNotice = displayNotices[nextIdx];
                        activeNoticeIdRef.current = nextNotice?.id ?? null;
                        setActiveModalNotice(nextNotice);
                        if (nextNotice && !nextNotice.is_read && typeof nextNotice.id === 'number') {
                          markRead(nextNotice.id);
                        }
                      }}
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      title="Next notification"
                    >
                      Next
                    </button>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Seen & Marked as Read
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveModalNotice(null)}
                >
                  Close Notice
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
