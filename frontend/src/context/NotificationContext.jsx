import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API } from '../api/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      setLoading(true);
      const res = await API.getNotifications();
      setNotifications(res.notifications || []);
    } catch (e) {
      console.warn('Could not load notifications:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 15000); // 15s refresh
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [user, loadNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = useCallback(async (id) => {
    if (!id) return;
    // Optimistic update so badge and seen status update instantly across all matching notifications
    setNotifications(prev => {
      const target = prev.find(n => n.id === id);
      return prev.map(n => {
        if (n.id === id) return { ...n, is_read: 1 };
        if (target?.reference_id && n.reference_id === target.reference_id) return { ...n, is_read: 1 };
        if (target?.title && n.title === target.title) return { ...n, is_read: 1 };
        return n;
      });
    });
    try {
      await API.markNotificationRead(id);
      // Synchronize with server to ensure all users/lists reflect the updated read status
      const res = await API.getNotifications();
      if (res && res.notifications) {
        setNotifications(res.notifications);
      }
    } catch (e) {
      console.warn('Failed to mark read:', e);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    try {
      await API.markAllNotificationsRead();
    } catch (e) {
      console.warn('Failed to mark all read:', e);
    }
  }, []);

  const toggleOpen = () => setIsOpen(prev => !prev);
  const close = () => setIsOpen(false);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isOpen,
        loading,
        toggleOpen,
        close,
        loadNotifications,
        markRead,
        markAllRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
