import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth, formatRoleName } from '../context/AuthContext';
import { API } from '../api/api';

export const NotificationBoard = () => {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markRead,
    markAllRead
  } = useNotifications();

  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  if (!notifications || notifications.length === 0) {
    return (
      <div
        className="card"
        style={{
          marginBottom: '24px',
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div>
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>Announcements & Notifications</strong>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No active notices at this moment. You are all caught up!
            </div>
          </div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={loadNotifications}
          disabled={loading}
          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    );
  }

  const displayedNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <div
      className="notification-board-wrapper"
      style={{
        marginBottom: '28px',
        background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: unreadCount > 0 ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--border-color)',
        borderRadius: '14px',
        boxShadow: unreadCount > 0 ? '0 8px 32px rgba(99, 102, 241, 0.2)' : '0 6px 20px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Top Banner Header */}
      <div
        style={{
          padding: '16px 22px',
          background: unreadCount > 0
            ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.18) 0%, rgba(168, 85, 247, 0.14) 100%)'
            : 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '0.3px' }}>
                Announcements & Notifications
              </h2>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)'
                  }}
                >
                  {unreadCount} NEW UNREAD
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
              Official administrative notices and academic broadcasts visible to your portal
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Filter Pills */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              borderRadius: '8px',
              padding: '3px',
              border: '1px solid var(--border-color)'
            }}
          >
            <button
              onClick={() => setFilter('all')}
              style={{
                background: filter === 'all' ? 'var(--accent-primary)' : 'transparent',
                color: filter === 'all' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                background: filter === 'unread' ? '#ef4444' : 'transparent',
                color: filter === 'unread' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={markAllRead}
              style={{ padding: '5px 12px', fontSize: '0.75rem', fontWeight: 600 }}
              title="Mark all notifications as read"
            >
              Mark All Read
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={loadNotifications}
            disabled={loading}
            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
            title="Refresh notifications"
          >
            {loading ? '...' : 'Refresh'}
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsExpanded(prev => !prev)}
            style={{ padding: '5px 10px', fontSize: '0.75rem', minWidth: '70px' }}
          >
            {isExpanded ? 'Collapse' : `View (${notifications.length})`}
          </button>
        </div>
      </div>

      {/* Expanded Notification Cards List */}
      {isExpanded && (
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '500px', overflowY: 'auto' }}>
          {displayedNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No notifications matching the current filter.
            </div>
          ) : (
            displayedNotifications.map((notif) => {
              const isUnread = !notif.is_read;
              const formattedDate = notif.created_at
                ? new Date(notif.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Just now';

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (notif.id) {
                      markRead(notif.id);
                    }
                  }}
                  style={{
                    cursor: 'pointer',
                    background: isUnread
                      ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.12) 0%, rgba(30, 41, 59, 0.8) 100%)'
                      : 'rgba(255, 255, 255, 0.02)',
                    border: isUnread
                      ? '1px solid rgba(99, 102, 241, 0.45)'
                      : '1px solid var(--border-color)',
                    borderLeft: isUnread
                      ? '5px solid var(--accent-primary)'
                      : '5px solid #475569',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    boxShadow: isUnread ? '0 4px 16px rgba(99, 102, 241, 0.15)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {notif.title}
                      </h3>
                      {isUnread ? (
                        <span
                          style={{
                            background: 'rgba(239, 68, 68, 0.18)',
                            border: '1px solid #ef4444',
                            color: '#fca5a5',
                            padding: '1px 8px',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            letterSpacing: '0.5px'
                          }}
                        >
                          UNREAD
                        </span>
                      ) : (
                        <span
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-muted)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem'
                          }}
                        >
                          Read
                        </span>
                      )}
                      {notif.department_name && (
                        <span
                          style={{
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#0284c7',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            padding: '1px 8px',
                            borderRadius: '6px',
                            fontSize: '0.7rem'
                          }}
                        >
                          {notif.department_name}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {formattedDate}
                      </span>
                      {isUnread && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => markRead(notif.id)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            background: '#eef2ff',
                            borderColor: '#c7d2fe',
                            color: '#4338ca',
                            fontWeight: 700
                          }}
                          title="Mark this announcement as read"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Message Body - Fully Visible, Complete Typography */}
                  <p
                    style={{
                      color: isUnread ? '#f1f5f9' : 'var(--text-secondary)',
                      fontSize: '0.92rem',
                      lineHeight: '1.55',
                      margin: '8px 0 12px 0',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-line'
                    }}
                  >
                    {notif.message}
                  </p>

                  {/* Actions for Admin on Department Requests */}
                  {notif.type === 'department_request' && notif.reference_id && (user?.role === 'admin' || user?.role === 'super_admin') && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '10px 0 12px 0', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Action Required:</span>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{
                          background: '#10b981',
                          borderColor: '#059669',
                          color: '#fff',
                          fontWeight: 700,
                          padding: '4px 14px',
                          borderRadius: '6px'
                        }}
                        onClick={async () => {
                          try {
                            const res = await API.approveDepartmentRequest(notif.reference_id);
                            alert(res.message || 'Department approved and created successfully!');
                            markRead(notif.id);
                            loadNotifications();
                          } catch (e) {
                            alert(e.message || 'Approval failed');
                          }
                        }}
                      >
                        Approve Department
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          borderColor: '#ef4444',
                          color: '#fca5a5',
                          fontWeight: 700,
                          padding: '4px 14px',
                          borderRadius: '6px'
                        }}
                        onClick={async () => {
                          try {
                            const res = await API.rejectDepartmentRequest(notif.reference_id);
                            alert(res.message || 'Department request rejected');
                            markRead(notif.id);
                            loadNotifications();
                          } catch (e) {
                            alert(e.message || 'Rejection failed');
                          }
                        }}
                      >
                        Reject Department
                      </button>
                    </div>
                  )}

                  {/* Card Footer Details */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: '8px',
                      fontSize: '0.76rem',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <span>
                      <strong>From:</strong>{' '}
                      {notif.sender_name
                        ? `${notif.sender_name} (${formatRoleName(notif.sender_role)})`
                        : 'College Administration'}
                    </span>
                    <span>
                      <strong>Target Audience:</strong>{' '}
                      {notif.recipient_role ? formatRoleName(notif.recipient_role) : 'All Members'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
