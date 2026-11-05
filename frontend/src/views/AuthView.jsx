import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { API } from '../api/api';
import { PasswordInput } from '../components/PasswordInput';

export const AuthView = () => {
  const { login } = useAuth();
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register' | 'forgot'

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regContactType, setRegContactType] = useState('email');
  const [regContact, setRegContact] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [nameEligibilityNotice, setNameEligibilityNotice] = useState('');
  const [superAdminExists, setSuperAdminExists] = useState(false);

  useEffect(() => {
    API.getSuperAdminStatus()
      .then(res => {
        if (res && res.exists) {
          setSuperAdminExists(true);
        }
      })
      .catch(() => {});
  }, []);

  // Forgot password state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // 1. Submit Login
  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      showAlert('Please enter your user name and password', 'danger');
      return;
    }

    try {
      setLoginLoading(true);
      await login(loginIdentifier.trim(), loginPassword.trim());
      showAlert('Signed in successfully!', 'success');
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setLoginLoading(false);
    }
  };

  // 2. Submit Register (Super Admin)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (superAdminExists) {
      showAlert('Super Admin can only be created once. A Super Admin account already exists.', 'danger');
      return;
    }

    try {
      const statusRes = await API.getSuperAdminStatus();
      if (statusRes && statusRes.exists) {
        setSuperAdminExists(true);
        showAlert('Super Admin can only be created once. A Super Admin account already exists.', 'danger');
        return;
      }
    } catch {
      // Proceed if network call fails
    }

    if (!regName.trim() || !regContact.trim() || !regPassword.trim() || !regUsername.trim()) {
      showAlert('All fields are required', 'danger');
      return;
    }
    if (nameEligibilityNotice) {
      showAlert(nameEligibilityNotice, 'danger');
      return;
    }
    if (regPassword.length < 6) {
      showAlert('Password must be at least 6 characters long', 'danger');
      return;
    }

    try {
      setRegLoading(true);
      // Pre-check name eligibility
      const checkRes = await API.checkName(regName.trim());
      if (checkRes && !checkRes.eligible) {
        setNameEligibilityNotice(checkRes.message);
        showAlert(checkRes.message, 'danger');
        return;
      }

      const res = await API.registerStudent(
        regName.trim(),
        regContact.trim(),
        regPassword.trim(),
        'super_admin',
        regContactType,
        regUsername.trim()
      );
      const registeredFullName = res.name || regName.trim();
      showAlert(res.message || `Super Admin account for ${registeredFullName} created successfully! You can sign in now.`, 'success');
      setSuperAdminExists(true);
      setActiveTab('login');
      // Show whatever was mentioned in Full Name (Single Name) * in the login form display!
      setLoginIdentifier(registeredFullName);
      setLoginPassword('');
    } catch (err) {
      showAlert(err.message, 'danger');
      if (err.message && err.message.toLowerCase().includes('not eligible')) {
        setNameEligibilityNotice(err.message);
      }
    } finally {
      setRegLoading(false);
    }
  };

  // 3. Submit Forgot Password
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim() || !forgotNewPass.trim() || !forgotConfirmPass.trim()) {
      showAlert('All fields are required', 'danger');
      return;
    }
    if (forgotNewPass.length < 6) {
      showAlert('New password must be at least 6 characters long', 'danger');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      showAlert('New password and confirmation do not match', 'danger');
      return;
    }

    try {
      setForgotLoading(true);
      const res = await API.forgotPassword(forgotIdentifier.trim(), forgotNewPass.trim());
      showAlert(res.message || 'Password reset successfully! Please sign in with your new password.', 'success');
      setActiveTab('login');
      setLoginIdentifier(forgotIdentifier.trim());
      setLoginPassword('');
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <section className="auth-wrapper">
      <div className="auth-card">
        {/* Auth Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Sign In
          </button>
          <button
            className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Create Account
          </button>
          <button
            className={`auth-tab-btn ${activeTab === 'forgot' ? 'active' : ''}`}
            onClick={() => setActiveTab('forgot')}
          >
            Forgot Password
          </button>
        </div>

        {/* 1. SIGN IN FORM */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} autoComplete="off">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                College Portal Login
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Sign in with your Full Name, Email, or Mobile Phone
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-full-name">
                Full Name <span className="req">*</span>
              </label>
              <input
                id="login-full-name"
                type="text"
                className="form-input"
                placeholder="Enter your Full Name, username, or email"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
              />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                You can also enter your email or phone number
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Password <span className="req">*</span>
              </label>
              <PasswordInput
                id="login-password"
                placeholder="Enter your password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px' }}
              disabled={loginLoading}
            >
              {loginLoading ? 'Signing in...' : 'Sign In to Portal'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', fontSize: '0.85rem', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('forgot')}
                style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontWeight: 700 }}
              >
                Forgot Password?
              </button>
            </div>
          </form>
        )}

        {/* 2. CREATE ACCOUNT FORM */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit}>
            <div style={{ marginBottom: '18px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Create Super Admin Account
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600, marginTop: '4px' }}>
                Directly activates system administration privileges
              </p>
            </div>

            {superAdminExists ? (
              <div className="alert alert-warning" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '16px', borderLeft: '4px solid #f59e0b' }}>
                <strong>Notice:</strong> Super Admin is already active in the system. Super Admin can only be created once.
              </div>
            ) : (
              <div className="alert alert-info" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '16px' }}>
                <strong>Super Admin:</strong> This account is active straight away. You can sign in immediately after registration.
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="reg-role">
                Account Role <span className="req">*</span>
              </label>
              <select
                id="reg-role"
                className="form-select"
                value="super_admin"
                onChange={() => {}}
                style={{
                  color: '#0284c7',
                  fontWeight: 700,
                  background: '#ffffff',
                  borderColor: '#cbd5e1',
                  cursor: 'default'
                }}
              >
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

              <div className="form-group">
                <label className="form-label">
                  Full Name (Single Name) <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter full name (e.g. John, Watson...)"
                  value={regName}
                  style={{
                    borderColor: nameEligibilityNotice ? '#ef4444' : undefined,
                    boxShadow: nameEligibilityNotice ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : undefined
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRegName(val);
                    const uval = val.trim().toLowerCase().replace(/\s+/g, '');
                    const prevUval = regName.trim().toLowerCase().replace(/\s+/g, '');
                    if (!regUsername || regUsername === prevUval || !regUsername.trim()) {
                      setRegUsername(uval);
                    }
                    if (regContactType === 'email' && (!regContact || regContact.includes('@inpand.com') || regContact === `${prevUval}1@inpand.com` || !regContact.trim())) {
                      setRegContact(uval ? `${uval}1@inpand.com` : '');
                    }
                    if (val.trim()) {
                      API.checkName(val.trim()).then((res) => {
                        if (!res.eligible) {
                          setNameEligibilityNotice(res.message);
                        } else {
                          setNameEligibilityNotice('');
                        }
                      }).catch(() => {});
                    } else {
                      setNameEligibilityNotice('');
                    }
                  }}
                  onBlur={() => {
                    if (regName.trim()) {
                      API.checkName(regName.trim()).then((res) => {
                        if (!res.eligible) {
                          setNameEligibilityNotice(res.message);
                        } else {
                          setNameEligibilityNotice('');
                        }
                      }).catch(() => {});
                    }
                  }}
                  required
                />
                {nameEligibilityNotice && (
                  <div style={{
                    marginTop: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    fontSize: '0.82rem'
                  }}>
                    <span>{nameEligibilityNotice}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  User Name (Login ID) <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. watson"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Register With <span className="req">*</span></label>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input
                      type="radio"
                      name="contact-type"
                      value="email"
                      checked={regContactType === 'email'}
                      onChange={() => setRegContactType('email')}
                    /> Email
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input
                      type="radio"
                      name="contact-type"
                      value="phone"
                      checked={regContactType === 'phone'}
                      onChange={() => setRegContactType('phone')}
                    /> Phone Number
                  </label>
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder={regContactType === 'email' ? 'e.g. alex1@inpand.com' : 'e.g. 9876543210 (8-15 digits)'}
                  value={regContact}
                  onChange={(e) => setRegContact(e.target.value)}
                  maxLength={30}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Password <span className="req">*</span>
                </label>
                <PasswordInput
                  placeholder="Minimum 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '10px' }}
                disabled={regLoading}
              >
                {regLoading ? 'Creating Account...' : 'Create Super Admin Account'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.85rem', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 700 }}
                >
                  Already registered? Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('forgot')}
                  style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontWeight: 700 }}
                >
                  Forgot Password?
                </button>
              </div>
            </form>
        )}

        {/* 3. FORGOT PASSWORD FORM */}
        {activeTab === 'forgot' && (
          <form onSubmit={handleForgotSubmit}>
            <div style={{ marginBottom: '18px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Reset Password
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Enter your User Name or Email to set a new password
              </p>
            </div>

            <div className="alert alert-info" style={{ fontSize: '0.8rem', marginBottom: '16px' }}>
              Enter your registered Full Name or Email, followed by your new password.
            </div>

            <div className="form-group">
              <label className="form-label">
                Full Name or Email <span className="req">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter Full Name, username, or email"
                value={forgotIdentifier}
                onChange={(e) => setForgotIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                New Password <span className="req">*</span>
              </label>
              <PasswordInput
                placeholder="Minimum 6 characters"
                value={forgotNewPass}
                onChange={(e) => setForgotNewPass(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Confirm New Password <span className="req">*</span>
              </label>
              <PasswordInput
                placeholder="Re-enter new password"
                value={forgotConfirmPass}
                onChange={(e) => setForgotConfirmPass(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px' }}
              disabled={forgotLoading}
            >
              {forgotLoading ? 'Resetting Password...' : 'Reset & Update Password'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.85rem', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 700 }}
              >
                Remembered your password? Sign In
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                style={{ background: 'none', border: 'none', color: '#7e22ce', cursor: 'pointer', fontWeight: 700 }}
              >
                Need an account? Create Account
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};
