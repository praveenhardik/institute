import React, { useEffect, useState } from 'react';
import { formatUserId } from '../context/AuthContext';
import { createPortal } from 'react-dom';
import { API } from '../api/api';
import { formatRoleName } from '../context/AuthContext';

export const ProfileModal = ({ userId, isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !userId) {
      setData(null);
      setError('');
      return;
    }

    let isMounted = true;
    setLoading(true);
    API.getSingleProfile(userId)
      .then(res => {
        if (isMounted) setData(res);
      })
      .catch(err => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [userId, isOpen]);

  if (!isOpen) return null;

  const user = data?.user;
  const details = data?.details || {};

  return createPortal(
    <div
      className="modal-overlay active"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{ maxWidth: '650px', maxHeight: '88vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose} title="Close" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', pointerEvents: 'none' }}>
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading user profile details...
          </div>
        ) : error ? (
          <div className="alert alert-danger">
            <span>{error}</span>
          </div>
        ) : user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: '#fff'
                }}
              >
                {(user.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem' }}>{user.name}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {user.email} {user.username ? `(@${user.username})` : ''}
                </p>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span className={`user-role-pill role-${user.role}`}>
                  {formatRoleName(user.role)}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left' }}>STATUS</div>
                <div style={{ fontWeight: 600, color: user.status === 'active' ? '#10b981' : '#f59e0b', textTransform: 'capitalize', textAlign: 'right' }}>
                  {user.status}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left' }}>USER ID</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>{formatUserId(user.id)}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left' }}>REGISTERED ON</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
                  {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* LOG: Account Creation and Modification Details */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px', textAlign: 'left' }}>
                LOG
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.86rem', fontWeight: 600 }}>Created By</span>
                  <span style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem' }}>
                    {user.created_by_name ? `${user.created_by_name} (${formatRoleName(user.created_by_role)})` : 'Root System'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.86rem', fontWeight: 600 }}>Created On</span>
                  <span style={{ textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.88rem' }}>
                    {user.created_at ? new Date(user.created_at).toLocaleString() : '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.86rem', fontWeight: 600 }}>Edited By</span>
                  <span style={{ textAlign: 'right', color: user.edited_by_name ? '#059669' : '#334155', fontWeight: 600, fontSize: '0.88rem' }}>
                    {user.edited_by_name ? `${user.edited_by_name} (${formatRoleName(user.edited_by_role)})` : 'Not Edited Yet'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.86rem', fontWeight: 600 }}>Edited On</span>
                  <span style={{ textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.88rem' }}>
                    {user.last_edited_at ? new Date(user.last_edited_at).toLocaleString() : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Student specific stats */}
            {details.total_attempted !== undefined && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Assessment Activity</h4>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span className="status-pill" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', border: '1px solid #4f46e5' }}>
                    Attempted: {details.total_attempted}
                  </span>
                  <span className="status-pill" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
                    Correct: {details.correct_count}
                  </span>
                </div>
              </div>
            )}

            {/* Teacher specific stats */}
            {details.questions_count !== undefined && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Faculty Activity</h4>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span className="status-pill" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', border: '1px solid #4f46e5' }}>
                    Published Questions: {details.questions_count}
                  </span>
                  <span className="status-pill" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#7e22ce', border: '1px solid #7e22ce' }}>
                    Student Groups: {details.groups_count}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body
  );
};
