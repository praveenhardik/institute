import React from 'react';
import { useAlert } from '../context/AlertContext';

export const AlertBox = () => {
  const { alerts, removeAlert } = useAlert();

  if (!alerts.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
        width: 'calc(100% - 48px)'
      }}
    >
      {alerts.map(a => (
        <div
          key={a.id}
          className={`alert alert-${a.type || 'info'}`}
          style={{
            animation: 'slideUp 0.3s ease-out',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{a.message}</div>
          </div>
          <button
            onClick={() => removeAlert(a.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '1.1rem',
              padding: '0 4px',
              lineHeight: 1
            }}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
