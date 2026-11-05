import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { API } from '../api/api';
import { useAlert } from '../context/AlertContext';
import { PasswordInput } from './PasswordInput';

export const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { showAlert } = useAlert();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert('All fields are required', 'danger');
      return;
    }
    if (newPassword.length < 6) {
      showAlert('New password must be at least 6 characters long', 'danger');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('New password and confirmation do not match', 'danger');
      return;
    }
    if (newPassword === currentPassword) {
      showAlert('New password must be different from current password', 'danger');
      return;
    }

    try {
      setLoading(true);
      const res = await API.changePassword(currentPassword, newPassword, confirmPassword);
      showAlert(res.message || 'Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="modal-overlay active"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{ maxWidth: '480px', maxHeight: '88vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose} title="Close" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', pointerEvents: 'none' }}>
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', marginBottom: '4px' }}>
          Change Password
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '18px' }}>
          Enter your current password, then your new password twice.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Current Password <span className="req">*</span>
            </label>
            <PasswordInput
              placeholder="Your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              New Password <span className="req">*</span>
            </label>
            <PasswordInput
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Confirm New Password <span className="req">*</span>
            </label>
            <PasswordInput
              placeholder="Re-enter the new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '12px' }}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};
