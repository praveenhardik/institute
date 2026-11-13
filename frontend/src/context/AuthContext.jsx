import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API } from '../api/api';

const AuthContext = createContext(null);

export const DEMO_USERS = [];

export const formatRoleName = (role) => {
  switch (role) {
    case 'dean': return 'Dean';
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'College Admin';
    case 'principal': return 'Principal';
    case 'hod': return 'HOD';
    case 'class_teacher': return 'Class Teacher';
    case 'teacher': return 'Teacher';
    case 'class_leader': return 'Class Leader';
    case 'student': return 'Student';
    case 'accountant': return 'Accountant';
    case 'librarian': return 'Librarian';
    case 'parent': return 'Parent';
    default: return role ? role.replace('_', ' ').toUpperCase() : '';
  }
};

export const formatUserId = (id) => {
  if (id === null || id === undefined || id === '') return '';
  const num = parseInt(id, 10);
  if (isNaN(num)) return `ID #${id}`;
  return `ID #${String(num).padStart(4, '0')}`;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(API.getCurrentUser());
  const [token, setToken] = useState(API.getToken());
  const [loading, setLoading] = useState(true);
  const [collegeName, setCollegeName] = useState('INPAND institute of Engineering and Technology');

  const fetchCollegeName = useCallback(async () => {
    try {
      const res = await API.getCollegeName();
      if (res && res.name) {
        setCollegeName(res.name);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await API.getMe();
      if (res && res.user) {
        setUser(res.user);
        API.setCurrentUser(res.user);
        return res.user;
      }
    } catch (e) {
      console.warn('refreshUser failed:', e);
    }
    return null;
  }, []);

  const checkSession = useCallback(async () => {
    // If autoRole parameter exists in URL, clear it so URL stays clean
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('login_role')) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.warn('Auto-role clean failed:', e);
    }

    const storedToken = API.getToken();
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const res = await API.getMe();
      if (res && res.user) {
        setUser(res.user);
        setToken(storedToken);
        API.setCurrentUser(res.user);
      } else {
        API.logout();
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.warn('Session check failed:', err);
      API.logout();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollegeName();
    checkSession();
  }, [fetchCollegeName, checkSession]);

  // Update browser tab title dynamically with role and name
  useEffect(() => {
    if (user) {
      const roleTitle = formatRoleName(user.role);
      if (user.role === 'super_admin' || user.name === 'Super Admin' || user.name === roleTitle) {
        document.title = `${roleTitle} - ${collegeName || 'EduPortal'}`;
      } else {
        document.title = `${roleTitle} (${user.name}) - ${collegeName || 'EduPortal'}`;
      }
    } else {
      document.title = `Sign In - ${collegeName || 'EduPortal'}`;
    }
  }, [user, collegeName]);

  const login = async (identifier, password) => {
    const data = await API.login(identifier, password);
    setUser(data.user);
    setToken(data.token);
    return data;
  };

  const logout = async () => {
    await API.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        collegeName,
        setCollegeName,
        login,
        logout,
        refreshUser,
        fetchCollegeName,
        formatRoleName,
        demoUsers: DEMO_USERS
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
