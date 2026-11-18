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
  const [emailRegisteredNotice, setEmailRegisteredNotice] = useState('');
  const [regRole, setRegRole] = useState('student');
  const [regOtp, setRegOtp] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpLoading, setRegOtpLoading] = useState(false);
  const [regDevOtp, setRegDevOtp] = useState('');
  const [regCountdown, setRegCountdown] = useState(0);

  // Forgot password state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'verify'
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotOtpSentTo, setForgotOtpSentTo] = useState('');
  const [forgotCountdown, setForgotCountdown] = useState(0);
  const [forgotDevOtp, setForgotDevOtp] = useState('');

  // Resend OTP countdown timers
  useEffect(() => {
    let timer = null;
    if (forgotCountdown > 0) {
      timer = setInterval(() => {
        setForgotCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [forgotCountdown]);

  useEffect(() => {
    let timer = null;
    if (regCountdown > 0) {
      timer = setInterval(() => {
        setRegCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [regCountdown]);

  // 1. Submit Login
  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    const email = loginIdentifier.trim();
    if (!email || !loginPassword.trim()) {
      showAlert('Please enter your email and password', 'danger');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.includes('@') || !emailRegex.test(email)) {
      showAlert('Only email address is accepted for login. Full name, username, or phone number cannot be used.', 'danger');
      return;
    }

    try {
      setLoginLoading(true);
      await login(email, loginPassword.trim());
      showAlert('Signed in successfully!', 'success');
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setLoginLoading(false);
    }
  };

  // 2. Send OTP for Registration
  const handleSendRegisterOtp = async () => {
    const email = regContact.trim();
    if (!email || !email.includes('@')) {
      showAlert('Please enter a valid email address to receive the verification OTP', 'danger');
      return;
    }
    if (emailRegisteredNotice) {
      showAlert(emailRegisteredNotice, 'danger');
      return;
    }

    try {
      setRegOtpLoading(true);
      // Pre-check if already registered
      const checkRes = await API.checkEmail(email);
      if (checkRes && checkRes.registered) {
        setEmailRegisteredNotice(checkRes.message);
        showAlert(checkRes.message, 'danger');
        return;
      }

      const res = await API.sendRegisterOtp(email, regName.trim() || 'New User');
      setRegOtpSent(true);
      setRegDevOtp(res.dev_otp || '');
      setRegCountdown(30);
      showAlert(res.message || "OTP from INPAND has been sent to your email address.", 'success');
    } catch (err) {
      showAlert(err.message || 'Failed to send OTP. Please check your email address.', 'danger');
      if (err.message && err.message.toLowerCase().includes('already registered')) {
        setEmailRegisteredNotice(err.message);
      }
    } finally {
      setRegOtpLoading(false);
    }
  };

  // 3. Submit Register
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!regName.trim() || !regContact.trim() || !regPassword.trim() || !regUsername.trim()) {
      showAlert('All fields are required', 'danger');
      return;
    }
    if (nameEligibilityNotice) {
      showAlert(nameEligibilityNotice, 'danger');
      return;
    }
    if (emailRegisteredNotice) {
      showAlert(emailRegisteredNotice, 'danger');
      return;
    }
    if (regContactType === 'email' && !regOtpSent) {
      showAlert('Please click "Send Verification OTP" to verify your email address.', 'danger');
      return;
    }
    if (regContactType === 'email' && !regOtp.trim()) {
      showAlert('Please enter the 6-digit OTP from INPAND sent to your email.', 'danger');
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

      // Check email duplicate
      if (regContactType === 'email') {
        const emailCheck = await API.checkEmail(regContact.trim());
        if (emailCheck && emailCheck.registered) {
          setEmailRegisteredNotice(emailCheck.message);
          showAlert(emailCheck.message, 'danger');
          return;
        }
      }

      const res = await API.registerStudent(
        regName.trim(),
        regContact.trim(),
        regPassword.trim(),
        regRole || 'student',
        regContactType,
        regUsername.trim(),
        { otp: regOtp.trim() }
      );
      const registeredFullName = res.name || regName.trim();
      showAlert(res.message || `Account for ${registeredFullName} created successfully! You can sign in now with your email.`, 'success');
      setActiveTab('login');
      setLoginIdentifier(regContact.trim());
      setLoginPassword('');
      // Reset registration state
      setRegName('');
      setRegUsername('');
      setRegContact('');
      setRegPassword('');
      setRegOtp('');
      setRegOtpSent(false);
      setRegDevOtp('');
      setEmailRegisteredNotice('');
    } catch (err) {
      showAlert(err.message, 'danger');
      if (err.message && err.message.toLowerCase().includes('already registered')) {
        setEmailRegisteredNotice(err.message);
      }
      if (err.message && err.message.toLowerCase().includes('not eligible')) {
        setNameEligibilityNotice(err.message);
      }
    } finally {
      setRegLoading(false);
    }
  };

  // 3. Send OTP for Forgot Password
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    const idVal = forgotIdentifier.trim();
    if (!idVal) {
      showAlert('Please enter your registered Email or Username', 'danger');
      return;
    }

    try {
      setForgotLoading(true);
      const res = await API.sendForgotPasswordOtp(idVal);
      setForgotOtpSentTo(res.email_masked || idVal);
      setForgotDevOtp(res.dev_otp || '');
      setForgotStep('verify');
      setForgotCountdown(30);
      showAlert(res.message || "OTP from INPAND has been sent to your registered email address.", 'success');
    } catch (err) {
      showAlert(err.message || 'Failed to send OTP. Please check your email or username.', 'danger');
    } finally {
      setForgotLoading(false);
    }
  };

  // 4. Verify OTP & Reset Password
  const handleForgotSubmit = async (e) => {
    e?.preventDefault();
    const idVal = forgotIdentifier.trim();
    const otpVal = forgotOtp.trim();
    const newPass = forgotNewPass.trim();
    const confPass = forgotConfirmPass.trim();

    if (!idVal || !otpVal || !newPass || !confPass) {
      showAlert('All fields (email/username, OTP, new password, confirm password) are required', 'danger');
      return;
    }
    if (otpVal.length !== 6 || !/^\d{6}$/.test(otpVal)) {
      showAlert('Please enter the 6-digit numeric OTP from INPAND', 'danger');
      return;
    }
    if (newPass.length < 6) {
      showAlert('New password must be at least 6 characters long', 'danger');
      return;
    }
    if (newPass !== confPass) {
      showAlert('New password and confirmation do not match', 'danger');
      return;
    }

    try {
      setForgotLoading(true);
      const res = await API.resetForgotPasswordWithOtp(idVal, otpVal, newPass);
      showAlert(res.message || 'Password reset successfully! You can now sign in with your email and new password.', 'success');
      setActiveTab('login');
      if (res.email) {
        setLoginIdentifier(res.email);
      } else if (idVal.includes('@')) {
        setLoginIdentifier(idVal);
      }
      setLoginPassword('');
      // Reset forgot state
      setForgotStep('request');
      setForgotOtp('');
      setForgotNewPass('');
      setForgotConfirmPass('');
      setForgotDevOtp('');
    } catch (err) {
      showAlert(err.message || 'Failed to reset password. Please verify the OTP.', 'danger');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <section className="auth-wrapper">
      <div className="auth-card">
        {/* Top tab navigation pills removed as requested: clean single-card view */}

        {/* 1. SIGN IN FORM */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} autoComplete="off">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                College Portal Login
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Sign in with your registered Email address
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Email <span className="req">*</span>
              </label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="Enter your registered email address"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
              />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Only registered email address is accepted
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
                Create Portal Account
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600, marginTop: '4px' }}>
                Join the institutional portal for quizzes & academic management
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-role">
                Account Role <span className="req">*</span>
              </label>
              <select
                id="reg-role"
                className="form-select"
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                style={{
                  color: '#0284c7',
                  fontWeight: 700,
                  background: '#ffffff',
                  borderColor: '#cbd5e1'
                }}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent</option>
                <option value="class_leader">Class Leader</option>
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
                      onChange={() => {
                        setRegContactType('email');
                        setEmailRegisteredNotice('');
                      }}
                    /> Email
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input
                      type="radio"
                      name="contact-type"
                      value="phone"
                      checked={regContactType === 'phone'}
                      onChange={() => {
                        setRegContactType('phone');
                        setEmailRegisteredNotice('');
                      }}
                    /> Phone Number
                  </label>
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder={regContactType === 'email' ? 'Enter your email (e.g. user@gmail.com)' : 'e.g. 9876543210 (8-15 digits)'}
                  value={regContact}
                  style={{
                    borderColor: emailRegisteredNotice ? '#ef4444' : undefined,
                    boxShadow: emailRegisteredNotice ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : undefined
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRegContact(val);
                    if (emailRegisteredNotice) {
                      setEmailRegisteredNotice('');
                    }
                  }}
                  onBlur={() => {
                    if (regContactType === 'email' && regContact.trim() && regContact.includes('@')) {
                      API.checkEmail(regContact.trim()).then((res) => {
                        if (res && res.registered) {
                          setEmailRegisteredNotice(res.message);
                        } else {
                          setEmailRegisteredNotice('');
                        }
                      }).catch(() => {});
                    }
                  }}
                  maxLength={50}
                  required
                />

                {emailRegisteredNotice && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#ef4444',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    lineHeight: 1.4
                  }}>
                    <span>{emailRegisteredNotice}</span>
                  </div>
                )}

                {/* Email Verification OTP Section */}
                {regContactType === 'email' && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Email Verification (OTP) <span className="req">*</span>
                      </span>
                      <button
                        type="button"
                        disabled={regCountdown > 0 || regOtpLoading || !regContact.trim() || !!emailRegisteredNotice}
                        onClick={handleSendRegisterOtp}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: (regCountdown > 0 || !regContact.trim() || !!emailRegisteredNotice) ? 'var(--text-muted)' : 'var(--accent-primary)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: (regCountdown > 0 || !regContact.trim() || !!emailRegisteredNotice) ? 'default' : 'pointer'
                        }}
                      >
                        {regOtpLoading ? 'Sending OTP...' : regCountdown > 0 ? `Resend OTP in ${regCountdown}s` : (regOtpSent ? 'Resend OTP' : 'Send Verification OTP')}
                      </button>
                    </div>

                    {regDevOtp && (
                      <div style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '6px 12px', marginBottom: '8px', fontSize: '0.8rem', color: '#3730a3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>OTP from INPAND: <strong style={{ letterSpacing: '2px', fontFamily: 'monospace' }}>{regDevOtp}</strong></span>
                        <button
                          type="button"
                          onClick={() => setRegOtp(regDevOtp)}
                          style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.74rem', cursor: 'pointer' }}
                        >
                          Fill OTP
                        </button>
                      </div>
                    )}

                    {regOtpSent && (
                      <div>
                        <input
                          type="text"
                          maxLength={6}
                          className="form-input"
                          placeholder="Enter 6-digit OTP from INPAND"
                          value={regOtp}
                          onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ''))}
                          style={{ letterSpacing: '4px', fontSize: '1.05rem', fontWeight: 700, textAlign: 'center', fontFamily: 'monospace' }}
                          required
                        />
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Enter the OTP sent from INPAND to {regContact}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                {regLoading ? 'Creating Account...' : 'Create Account'}
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

        {/* 3. FORGOT PASSWORD FORM WITH OTP FROM INPAND */}
        {activeTab === 'forgot' && (
          <div>
            <div style={{ marginBottom: '18px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Reset Password
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                {forgotStep === 'request'
                  ? 'Enter your registered Email or Username to receive an OTP'
                  : 'Enter the OTP from INPAND sent to your registered email'}
              </p>
            </div>

            {forgotStep === 'request' ? (
              <form onSubmit={handleSendOtp}>
                <div className="alert alert-info" style={{ fontSize: '0.82rem', marginBottom: '16px', lineHeight: 1.5 }}>
                  Enter your registered <strong>Email</strong> or <strong>User Name</strong>. A 6-digit <strong>OTP from INPAND</strong> will be sent to your registered email address.
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Email or Username <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter registered Email or Username (e.g. admin or user@gmail.com)"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    required
                    autoFocus
                  />
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Email ID or username is enough to request OTP
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '10px', padding: '11px', fontWeight: 600 }}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? 'Sending OTP from INPAND...' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <div className="alert alert-success" style={{ fontSize: '0.82rem', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    OTP sent to: <strong>{forgotOtpSentTo}</strong>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Check your email with subject <em>OTP from INPAND</em>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    style={{ background: 'none', border: 'none', color: '#4338ca', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Change
                  </button>
                </div>

                {forgotDevOtp && (
                  <div style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '8px 12px', marginBottom: '14px', fontSize: '0.8rem', color: '#3730a3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>OTP from INPAND: <strong style={{ letterSpacing: '2px', fontFamily: 'monospace', fontSize: '0.95rem' }}>{forgotDevOtp}</strong></span>
                    <button
                      type="button"
                      onClick={() => setForgotOtp(forgotDevOtp)}
                      style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.74rem', cursor: 'pointer' }}
                    >
                      Fill OTP
                    </button>
                  </div>
                )}

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Enter 6-Digit OTP <span className="req">*</span>
                    </label>
                    <button
                      type="button"
                      disabled={forgotCountdown > 0 || forgotLoading}
                      onClick={handleSendOtp}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: forgotCountdown > 0 ? 'var(--text-muted)' : 'var(--accent-primary)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: forgotCountdown > 0 ? 'default' : 'pointer'
                      }}
                    >
                      {forgotCountdown > 0 ? `Resend OTP in ${forgotCountdown}s` : 'Resend OTP'}
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-input"
                    placeholder="Enter 6-digit OTP from INPAND"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    style={{ letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 700, textAlign: 'center', fontFamily: 'monospace' }}
                    required
                    autoFocus
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
                  style={{ width: '100%', marginTop: '10px', padding: '11px', fontWeight: 600 }}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? 'Verifying & Resetting...' : 'Reset & Update Password'}
                </button>
              </form>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.85rem', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setForgotStep('request'); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 700 }}
              >
                Remembered your password? Sign In
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setForgotStep('request'); }}
                style={{ background: 'none', border: 'none', color: '#7e22ce', cursor: 'pointer', fontWeight: 700 }}
              >
                Need an account? Create Account
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
