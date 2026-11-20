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
  const [loginEmailStatus, setLoginEmailStatus] = useState(''); // '' | 'not_registered' | 'registered'
  const [loginOtp, setLoginOtp] = useState('');
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginOtpLoading, setLoginOtpLoading] = useState(false);
  const [loginOtpError, setLoginOtpError] = useState(''); // '' | 'Wrong OTP' | 'Please enter the OTP'
  const [loginCountdown, setLoginCountdown] = useState(0);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regContactType, setRegContactType] = useState('email');
  const [regContact, setRegContact] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [nameEligibilityNotice, setNameEligibilityNotice] = useState('');
  const [emailRegisteredNotice, setEmailRegisteredNotice] = useState('');
  const [regRole, setRegRole] = useState('owner');
  const [regOtp, setRegOtp] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpLoading, setRegOtpLoading] = useState(false);
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

  useEffect(() => {
    let timer = null;
    if (loginCountdown > 0) {
      timer = setInterval(() => {
        setLoginCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [loginCountdown]);

  // Handle incoming verification link parameters (?otp=...&email=...&tab=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlOtp = params.get('otp') || params.get('code') || params.get('oobCode');
      const urlEmail = params.get('email');
      const urlTab = params.get('tab') || params.get('mode');

      if (urlEmail) {
        setLoginIdentifier(urlEmail);
        setRegContact(urlEmail);
        setForgotIdentifier(urlEmail);
      }
      if (urlTab === 'register' || urlTab === 'signUp') {
        setActiveTab('login');
      } else if (urlTab === 'forgot' || urlTab === 'resetPassword') {
        setActiveTab('forgot');
        if (urlOtp) setForgotStep('verify');
      } else if (urlTab === 'login' || urlTab === 'signIn') {
        setActiveTab('login');
      }

      if (urlOtp) {
        setLoginOtp(urlOtp);
        setRegOtp(urlOtp);
        setForgotOtp(urlOtp);
        setLoginOtpSent(true);
        setRegOtpSent(true);
        showAlert(`✓ Verification link opened! Your OTP is ${urlOtp}. You can now proceed.`, 'success');
      }
    } catch (e) {
      console.warn('URL param parse error:', e);
    }
  }, []);

  // 1. Send OTP for Login
  const handleSendLoginOtp = async () => {
    let raw = loginIdentifier.trim();
    if (!raw) {
      showAlert('Please enter your registered email address or admin username to receive OTP', 'danger');
      return false;
    }
    const isKarurAdmin = raw.toLowerCase().replace(/[^a-z0-9]/g, '') === 'adminkarur' || raw.toLowerCase() === 'admin';
    const email = isKarurAdmin ? 'praveeninpand@gmail.com' : raw;

    if (!isKarurAdmin && (!email.includes('@') || !email.includes('.'))) {
      showAlert('Please enter your registered email address or admin username to receive OTP', 'danger');
      return false;
    }
    try {
      setLoginOtpLoading(true);
      setLoginOtpError('');
      if (!isKarurAdmin) {
        const checkRes = await API.checkEmail(email);
        if (checkRes && !checkRes.registered) {
          setLoginEmailError('This email is not registered. Please contact administrator.');
          showAlert('❌ This email is not registered. Please contact administrator.', 'danger');
          return false;
        }
      }
      setLoginEmailError('');

      const res = await API.sendLoginOtp(email);
      setLoginOtpSent(true);
      setLoginCountdown(120);
      setLoginOtp('');
      setLoginOtpError('');
      showAlert(`✓ Verification OTP sent immediately! Please check your email (${email}) within 2 minutes and enter the OTP.`, 'success');
      return true;
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('not registered') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no registered')) {
        setLoginEmailError('This email is not registered. Please contact administrator.');
      }
      showAlert(msg || 'Failed to send OTP. Please check your email.', 'danger');
      return false;
    } finally {
      setLoginOtpLoading(false);
    }
  };

  // 2. Submit Login
  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    setLoginOtpError('');
    const raw = loginIdentifier.trim();
    if (!raw || !loginPassword.trim()) {
      showAlert('Please enter your email or admin username and password', 'danger');
      return;
    }

    const isKarurAdmin = raw.toLowerCase().replace(/[^a-z0-9]/g, '') === 'adminkarur' || raw.toLowerCase() === 'admin';
    const email = isKarurAdmin ? 'praveeninpand@gmail.com' : raw;

    if (!isKarurAdmin) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.includes('@') || !emailRegex.test(email)) {
        showAlert('Please enter a valid registered email address or admin username.', 'danger');
        return;
      }
    }

    // STRICT CHECK: OTP is mandatory. If not entered, show error notification and text next to OTP box
    if (!loginOtp.trim()) {
      setLoginOtpError('Please enter the OTP');
      showAlert('Please enter the OTP to log in', 'danger');
      return;
    }

    const targetEmail = email.toLowerCase().trim();
    let expectedOtp = null;
    try {
      expectedOtp = sessionStorage.getItem("active_login_otp_" + targetEmail) || localStorage.getItem("active_login_otp_" + targetEmail) ||
                    sessionStorage.getItem("active_login_otp_praveeninpand@gmail.com") || localStorage.getItem("active_login_otp_praveeninpand@gmail.com");
    } catch {}

    if (expectedOtp && loginOtp.trim().toUpperCase() !== String(expectedOtp).toUpperCase()) {
      setLoginOtpError('Wrong OTP');
      showAlert('❌ Wrong OTP! The OTP code entered does not match. Access Denied.', 'danger');
      return;
    }

    try {
      setLoginLoading(true);
      await login(email, loginPassword.trim(), loginOtp.trim());
      setLoginOtpError('');
      showAlert('Signed in successfully!', 'success');
    } catch (err) {
      const msg = err.message || 'Login failed';
      if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('wrong') || msg.toLowerCase().includes('mismatch') || msg.toLowerCase().includes('code')) {
        setLoginOtpError('Wrong OTP');
        showAlert(msg.startsWith('❌') ? msg : '❌ Wrong OTP! The OTP code entered does not match. Please enter the correct OTP sent to your email.', 'danger');
      } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no account') || msg.toLowerCase().includes('not registered')) {
        showAlert(`❌ This email or username is not registered in the portal. Please Create Account first.`, 'danger');
      } else {
        showAlert(msg, 'danger');
      }
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
      setRegCountdown(120);
      setRegOtp('');
      showAlert(`✓ Verification OTP sent immediately! Please check your entered email (${email}) within 2 minutes and enter the OTP.`, 'success');
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
    if (!regOtp.trim()) {
      if (!regOtpSent) {
        await handleSendRegisterOtp();
        showAlert('OTP has been sent to your email! Please check your received mail and enter the OTP.', 'info');
        return;
      }
      showAlert('Please enter the OTP from your received mail to create your account.', 'danger');
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
      setEmailRegisteredNotice('');
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('wrong') || msg.toLowerCase().includes('mismatch') || msg.toLowerCase().includes('code')) {
        showAlert(msg.startsWith('❌') ? msg : '❌ Wrong OTP! The OTP code entered does not match. Please enter the correct OTP sent to your email.', 'danger');
      } else {
        showAlert(err.message, 'danger');
      }
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
      setForgotStep('verify');
      setForgotCountdown(30);
      setForgotOtp('');
      showAlert(`✓ Verification OTP has been sent to your registered email (${res.email_masked || idVal}). Please enter the 6-digit OTP received in your mail.`, 'success');
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no account') || msg.toLowerCase().includes('not registered')) {
        showAlert(`❌ Email / Username "${idVal}" is not registered in the portal. Please check and try again, or Create Account.`, 'danger');
      } else {
        showAlert(msg || 'Failed to send OTP. Please check your email or username.', 'danger');
      }
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
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('wrong') || msg.toLowerCase().includes('mismatch') || msg.toLowerCase().includes('code')) {
        showAlert(msg.startsWith('❌') ? msg : '❌ Wrong OTP! The OTP code entered does not match. Please enter the correct OTP sent to your email.', 'danger');
      } else {
        showAlert(msg || 'Failed to reset password. Please verify the OTP.', 'danger');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  // Login email check state
  const [loginEmailError, setLoginEmailError] = useState('');

  return (
    <section className="auth-wrapper">
      <div className="auth-card">
        {/* Top tab navigation pills removed as requested: clean single-card view */}

        {/* 1. SIGN IN FORM */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} autoComplete="off">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                🏛️ Campus Portal
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Institutional Management & Academic Portal
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Email or Admin Username <span className="req">*</span>
              </label>
              <input
                id="login-email"
                type="text"
                className="form-input"
                placeholder="Enter email or admin username"
                value={loginIdentifier}
                onChange={(e) => {
                  const val = e.target.value;
                  setLoginIdentifier(val);
                  setLoginEmailError('');
                  const isAdm = val.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === 'adminkarur' || val.trim().toLowerCase() === 'admin';
                  if (val.trim() && val.includes('@') && val.includes('.') && !isAdm) {
                    API.checkEmail(val.trim()).then((res) => {
                      if (!res.registered) {
                        setLoginEmailError('This email is not registered. Please contact administrator.');
                      } else {
                        setLoginEmailError('');
                      }
                    }).catch(() => {});
                  }
                }}
                onBlur={() => {
                  const val = loginIdentifier.trim();
                  const isAdm = val.toLowerCase().replace(/[^a-z0-9]/g, '') === 'adminkarur' || val.toLowerCase() === 'admin';
                  if (val && val.includes('@') && val.includes('.') && !isAdm) {
                    API.checkEmail(val).then((res) => {
                      if (!res.registered) {
                        setLoginEmailError('This email is not registered. Please contact administrator.');
                      } else {
                        setLoginEmailError('');
                      }
                    }).catch(() => {});
                  }
                }}
                style={{
                  borderColor: loginEmailError ? '#ef4444' : undefined,
                  boxShadow: loginEmailError ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : undefined
                }}
                required
              />
              {loginEmailError ? (
                <div style={{ marginTop: '5px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#dc2626', fontSize: '0.80rem', fontWeight: 600 }}>
                  <span>❌ {loginEmailError}</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Enter your registered email address or admin username
                </div>
              )}
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

            {/* Email Verification OTP Section for Login */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Email Verification OTP <span className="req">*</span>
                </label>
                <button
                  type="button"
                  disabled={loginCountdown > 0 || loginOtpLoading || !loginIdentifier.trim() || !!loginEmailError}
                  onClick={handleSendLoginOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: (loginCountdown > 0 || !loginIdentifier.trim() || !!loginEmailError) ? 'var(--text-muted)' : '#4338ca',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: (loginCountdown > 0 || !loginIdentifier.trim() || !!loginEmailError) ? 'default' : 'pointer'
                  }}
                >
                  {loginOtpLoading ? 'Sending OTP to Mail...' : loginCountdown > 0 ? `Resend OTP in ${Math.floor(loginCountdown / 60)}:${String(loginCountdown % 60).padStart(2, '0')}` : (loginOtpSent ? 'Resend OTP to Mail' : 'Send OTP to Mail')}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  maxLength={6}
                  className="form-input"
                  placeholder="Enter 6-digit OTP"
                  value={loginOtp}
                  onChange={(e) => {
                    setLoginOtp(e.target.value.toUpperCase());
                    setLoginOtpError('');
                  }}
                  style={{
                    letterSpacing: loginOtp ? '4px' : 'normal',
                    fontSize: loginOtp ? '1.15rem' : '0.95rem',
                    fontWeight: 600,
                    textAlign: 'center',
                    fontFamily: loginOtp ? 'monospace' : 'inherit',
                    width: '100%',
                    boxSizing: 'border-box',
                    borderColor: loginOtpError ? '#ef4444' : undefined,
                    borderWidth: loginOtpError ? '2px' : undefined,
                    boxShadow: loginOtpError ? '0 0 0 3px rgba(239, 68, 68, 0.25)' : undefined
                  }}
                />
              </div>

              {loginOtpError ? (
                <div style={{ marginTop: '6px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', border: '1.5px solid #ef4444', color: '#b91c1c', fontSize: '0.86rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>❌ {loginOtpError === 'Wrong OTP' ? 'Wrong OTP. Please enter the correct OTP sent to your mail.' : loginOtpError}</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '5px', lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {loginOtpSent ? (
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ OTP sent! Enter the 6-digit OTP received at your entered email ({loginIdentifier})</span>
                  ) : (
                    <span>Click "Send OTP to Mail", then enter the 6-digit OTP received within 2 minutes</span>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px' }}
              disabled={loginLoading}
            >
              {loginLoading ? 'Signing in...' : 'Sign In to Portal'}
            </button>

            {/* Forgot password button at the bottom of login form */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setActiveTab('forgot')}
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#0284c7',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <span>🔑</span> Forgot Password?
              </button>
            </div>
          </form>
        )}

        {/* 2. FORGOT PASSWORD FORM WITH OTP FROM INPAND */}
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
                    placeholder="Enter 6-digit OTP"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    style={{
                      letterSpacing: forgotOtp ? '4px' : 'normal',
                      fontSize: forgotOtp ? '1.15rem' : '0.95rem',
                      fontWeight: 600,
                      textAlign: 'center',
                      fontFamily: forgotOtp ? 'monospace' : 'inherit',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                    required
                    autoFocus
                  />
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '5px', lineHeight: 1.4, wordBreak: 'break-word' }}>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ OTP sent! Enter the 6-digit OTP received from noreply@iiet at {forgotOtpSentTo || forgotIdentifier}</span>
                  </div>
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

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '16px', fontSize: '0.85rem', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setForgotStep('request'); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 700 }}
              >
                Remembered your password? Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
