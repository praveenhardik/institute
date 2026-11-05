import React, { useEffect, useState, useCallback } from 'react';
import { API } from '../api/api';
import { useAuth, formatRoleName } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { AccountantFees } from '../components/AccountantFees';
import { LibrarianBooks } from '../components/LibrarianBooks';

const PORTAL_META = {
  accountant: {
    title: 'Accountant Finance & Fees Portal',
    desc: 'Monitor institutional tuition fees, review overall and pending balances, enter tuition fee structures, and manage student payment statuses.'
  },
  librarian: {
    title: 'Librarian Portal',
    desc: 'Library circulation management and departmental notifications.'
  },
  parent: {
    title: 'Parent Portal',
    desc: 'Academic updates, notices, and attendance information from the college.'
  }
};

export const StaffView = () => {
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const isLibrarian = user?.role === 'librarian';
  const isAccountant = user?.role === 'accountant';
  const meta = PORTAL_META[user?.role] || { title: 'Staff Portal', desc: '' };

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Librarian notice form
  const [departments, setDepartments] = useState([]);
  const [targetDeptId, setTargetDeptId] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [librarianTab, setLibrarianTab] = useState('books');

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.getNotifications();
      setNotifications(res.notifications || []);
    } catch (e) {
      console.warn('Could not load staff notifications:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    if (!isLibrarian) return;
    try {
      const deptRes = await API.getDepartments();
      setDepartments(deptRes.departments || []);
    } catch (e) {
      console.warn('Could not load departments:', e);
    }
  }, [isLibrarian]);

  useEffect(() => {
    loadNotifications();
    loadDepartments();
  }, [loadNotifications, loadDepartments]);

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!targetDeptId) {
      showAlert('Please choose a Target Department', 'warning');
      return;
    }
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) {
      showAlert('Notice title and message are required', 'warning');
      return;
    }

    try {
      setSendingBroadcast(true);
      const res = await API.sendDepartmentMessage(
        Number(targetDeptId),
        broadcastTitle.trim(),
        broadcastMsg.trim(),
        null,
        'all'
      );
      showAlert(res.message || 'Notification broadcast sent to department!', 'success');
      setBroadcastTitle('');
      setBroadcastMsg('');
    } catch (err) {
      showAlert(err.message || 'Failed to send broadcast notice', 'danger');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await API.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <section>
      {/* Header */}
      <div className="card-header" style={{ marginBottom: '6px' }}>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {meta.title}
          </h1>
          <p className="card-description" style={{ fontSize: '0.78rem', margin: '2px 0 0' }}>
            {meta.desc} Use Change Password in the navigation bar to update your credentials.
          </p>
        </div>
      </div>

      {/* Accountant: Financial Ledger & Fees Management Hub */}
      {isAccountant && (
        <div style={{ marginBottom: 0 }}>
          <AccountantFees />
        </div>
      )}

      {/* Librarian: Tabs for Circulation vs Broadcast Notice */}
      {isLibrarian && (
        <div className="user-tabs-container" style={{ marginBottom: '6px', gap: '4px' }}>
          <button
            type="button"
            className={`user-tab-btn ${librarianTab === 'books' ? 'active' : ''}`}
            onClick={() => setLibrarianTab('books')}
            style={{ padding: '3px 10px', height: '26px', fontSize: '0.76rem' }}
          >
            📚 Student Library Circulation
          </button>
          <button
            type="button"
            className={`user-tab-btn ${librarianTab === 'notice' ? 'active' : ''}`}
            onClick={() => setLibrarianTab('notice')}
            style={{ padding: '3px 10px', height: '26px', fontSize: '0.76rem' }}
          >
            📢 Broadcast Library Notice
          </button>
        </div>
      )}

      {/* Librarian: Student Library Books Circulation */}
      {isLibrarian && librarianTab === 'books' && (
        <div style={{ marginBottom: 0 }}>
          <LibrarianBooks />
        </div>
      )}

      {/* Librarian: Send Department Notification */}
      {isLibrarian && librarianTab === 'notice' && (
        <div className="card" style={{ marginBottom: 0, padding: '10px 14px' }}>
          <div className="card-title" style={{ fontSize: '1rem', marginBottom: '2px' }}>
            Broadcast Library Notice to Department
          </div>
          <p className="card-description" style={{ fontSize: '0.78rem', marginBottom: '10px' }}>
            Send book availability, return reminders, and general resource notices to a specific academic department.
          </p>

          <form onSubmit={handleSendBroadcast}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Target Department <span className="req">*</span></label>
                <select
                  className="form-select"
                  value={targetDeptId}
                  onChange={(e) => setTargetDeptId(e.target.value)}
                  required
                >
                  <option value="">Choose department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Notice Title <span className="req">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. New Academic Books & Subscriptions Available"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Notice Message <span className="req">*</span></label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Enter details about resources, book arrival, or library policies..."
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  required
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', fontWeight: 600 }}
                  disabled={sendingBroadcast}
                >
                  {sendingBroadcast ? 'Sending Notice...' : 'Send Notice'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </section>
  );
};
