// Full-Stack Email OTP Authentication Client Engine
(function () {
  'use strict';

  // State
  let currentEmail = '';
  let countdownTimer = null;
  let remainingSeconds = 300; // 5 minutes default
  let resendCooldownTimer = null;

  // DOM Elements
  const screenLogin = document.getElementById('screen-login');
  const screenOtp = document.getElementById('screen-otp');
  const screenDashboard = document.getElementById('screen-dashboard');

  const formSendOtp = document.getElementById('form-send-otp');
  const inputEmail = document.getElementById('input-email');
  const btnSendOtp = document.getElementById('btn-send-otp');
  const loginAlert = document.getElementById('login-alert');

  const formVerifyOtp = document.getElementById('form-verify-otp');
  const targetEmailDisplay = document.getElementById('target-email-display');
  const otpAlert = document.getElementById('otp-alert');
  const devCodeBanner = document.getElementById('dev-code-banner');
  const otpBoxes = document.querySelectorAll('.otp-digit');
  const otpTimerDisplay = document.getElementById('otp-timer');
  const btnVerifyOtp = document.getElementById('btn-verify-otp');
  const btnResendOtp = document.getElementById('btn-resend-otp');
  const btnBackToLogin = document.getElementById('btn-back-to-login');

  const dashUserEmail = document.getElementById('dash-user-email');
  const dashAvatar = document.getElementById('dash-avatar');
  const detailEmail = document.getElementById('detail-email');
  const detailTimestamp = document.getElementById('detail-timestamp');
  const btnLogout = document.getElementById('btn-logout');

  // --- SCREEN ROUTING ---
  function showScreen(name) {
    [screenLogin, screenOtp, screenDashboard].forEach((s) => s.classList.remove('active'));
    clearAlerts();

    if (name === 'login') {
      screenLogin.classList.add('active');
      inputEmail.focus();
    } else if (name === 'otp') {
      screenOtp.classList.add('active');
      resetOtpBoxes();
      setTimeout(() => otpBoxes[0]?.focus(), 100);
    } else if (name === 'dashboard') {
      screenDashboard.classList.add('active');
    }
  }

  // --- ALERTS HELPER ---
  function showAlert(targetEl, message, type = 'danger') {
    if (!targetEl) return;
    targetEl.className = `alert-box alert-${type}`;
    targetEl.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        ${type === 'danger'
          ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
          : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
        }
      </svg>
      <span>${message}</span>
    `;
    targetEl.classList.remove('hidden');
  }

  function clearAlerts() {
    [loginAlert, otpAlert].forEach((el) => {
      if (el) {
        el.className = 'alert-box hidden';
        el.innerHTML = '';
      }
    });
    if (devCodeBanner) {
      devCodeBanner.className = 'dev-banner hidden';
      devCodeBanner.innerHTML = '';
    }
  }

  function setButtonLoading(button, isLoading, defaultText = 'Submit') {
    const textEl = button.querySelector('.btn-text');
    const loaderEl = button.querySelector('.btn-loader');
    const arrowEl = button.querySelector('.btn-arrow');

    button.disabled = isLoading;
    if (isLoading) {
      if (textEl) textEl.classList.add('hidden');
      if (loaderEl) loaderEl.classList.remove('hidden');
      if (arrowEl) arrowEl.classList.add('hidden');
    } else {
      if (textEl) {
        textEl.textContent = defaultText;
        textEl.classList.remove('hidden');
      }
      if (loaderEl) loaderEl.classList.add('hidden');
      if (arrowEl) arrowEl.classList.remove('hidden');
    }
  }

  // --- TIMER (5 MINUTES COUNTDOWN) ---
  function startCountdown(totalSeconds = 300) {
    if (countdownTimer) clearInterval(countdownTimer);
    remainingSeconds = totalSeconds;
    updateTimerText();

    countdownTimer = setInterval(() => {
      remainingSeconds--;
      if (remainingSeconds <= 0) {
        clearInterval(countdownTimer);
        otpTimerDisplay.textContent = 'Expired';
        otpTimerDisplay.style.color = 'var(--danger)';
        showAlert(otpAlert, 'This OTP code has expired. Please click "Resend OTP" to get a new code.', 'danger');
        btnVerifyOtp.disabled = true;
      } else {
        updateTimerText();
      }
    }, 1000);
  }

  function updateTimerText() {
    const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const secs = String(remainingSeconds % 60).padStart(2, '0');
    otpTimerDisplay.textContent = `${mins}:${secs}`;
    otpTimerDisplay.style.color = remainingSeconds < 60 ? 'var(--danger)' : 'var(--primary)';
  }

  function triggerResendCooldown(seconds = 30) {
    btnResendOtp.disabled = true;
    let count = seconds;
    btnResendOtp.textContent = `Resend in ${count}s`;

    if (resendCooldownTimer) clearInterval(resendCooldownTimer);
    resendCooldownTimer = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(resendCooldownTimer);
        btnResendOtp.disabled = false;
        btnResendOtp.textContent = 'Resend OTP';
      } else {
        btnResendOtp.textContent = `Resend in ${count}s`;
      }
    }, 1000);
  }

  // --- OTP INPUT DIGITS LOGIC ---
  function setupOtpInputs() {
    otpBoxes.forEach((input, idx) => {
      // 1. Input Handler (single digit + auto-advance)
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, ''); // Digits only
        input.value = val ? val[val.length - 1] : '';

        if (input.value) {
          input.classList.add('has-value');
          if (idx < otpBoxes.length - 1) {
            otpBoxes[idx + 1].focus();
          }
        } else {
          input.classList.remove('has-value');
        }

        // Auto verify if all 6 digits entered
        if (getEnteredOtp().length === 6) {
          formVerifyOtp.requestSubmit();
        }
      });

      // 2. Keydown Handler (Backspace & Arrows)
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
          if (!input.value && idx > 0) {
            otpBoxes[idx - 1].value = '';
            otpBoxes[idx - 1].classList.remove('has-value');
            otpBoxes[idx - 1].focus();
          } else {
            input.value = '';
            input.classList.remove('has-value');
          }
        } else if (e.key === 'ArrowLeft' && idx > 0) {
          otpBoxes[idx - 1].focus();
        } else if (e.key === 'ArrowRight' && idx < otpBoxes.length - 1) {
          otpBoxes[idx + 1].focus();
        }
      });

      // 3. Paste Event Handler (Pasting full 6 digits)
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = (e.clipboardData || window.clipboardData).getData('text');
        const digits = pastedData.replace(/\D/g, '').slice(0, 6);

        if (digits) {
          digits.split('').forEach((d, i) => {
            if (otpBoxes[i]) {
              otpBoxes[i].value = d;
              otpBoxes[i].classList.add('has-value');
            }
          });
          const focusIdx = Math.min(digits.length, otpBoxes.length - 1);
          otpBoxes[focusIdx].focus();

          if (digits.length === 6) {
            formVerifyOtp.requestSubmit();
          }
        }
      });
    });
  }

  function getEnteredOtp() {
    return Array.from(otpBoxes).map((b) => b.value).join('').trim();
  }

  function resetOtpBoxes() {
    otpBoxes.forEach((b) => {
      b.value = '';
      b.classList.remove('has-value');
    });
    btnVerifyOtp.disabled = false;
  }

  // --- API HANDLERS ---

  // 1. SEND OTP (SCREEN 1)
  formSendOtp.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    const email = inputEmail.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      showAlert(loginAlert, 'Please enter a valid email address (e.g., name@example.com).', 'danger');
      inputEmail.focus();
      return;
    }

    try {
      setButtonLoading(btnSendOtp, true, 'Send OTP');
      const response = await fetch('/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send verification OTP.');
      }

      currentEmail = data.email || email;
      targetEmailDisplay.textContent = currentEmail;

      // Switch to Screen 2
      showScreen('otp');
      startCountdown(data.expiresInSeconds || 300);
      triggerResendCooldown(30);

      // If in development/preview mode without active SMTP credentials:
      if (data.devCode) {
        devCodeBanner.innerHTML = `⚙️ <strong>Local Preview Code:</strong> <code>${data.devCode}</code> (SMTP credentials not yet set in .env)`;
        devCodeBanner.classList.remove('hidden');
      }
    } catch (err) {
      showAlert(loginAlert, err.message, 'danger');
    } finally {
      setButtonLoading(btnSendOtp, false, 'Send OTP');
    }
  });

  // 2. VERIFY OTP (SCREEN 2)
  formVerifyOtp.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    const otpCode = getEnteredOtp();

    if (!otpCode || otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      showAlert(otpAlert, 'Please enter all 6 digits of the OTP verification code.', 'danger');
      const firstEmpty = Array.from(otpBoxes).find((b) => !b.value);
      if (firstEmpty) firstEmpty.focus();
      return;
    }

    try {
      setButtonLoading(btnVerifyOtp, true, 'Verify OTP');
      const response = await fetch('/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentEmail,
          otp: otpCode
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Verification failed.');
      }

      // Store authenticated token in sessionStorage
      if (data.token) {
        sessionStorage.setItem('otp_auth_token', data.token);
        sessionStorage.setItem('otp_auth_email', data.user.email);
      }

      // Stop countdown
      if (countdownTimer) clearInterval(countdownTimer);

      // Load and display Dashboard
      await loadDashboardData();
      showScreen('dashboard');
    } catch (err) {
      showAlert(otpAlert, err.message, 'danger');
      // Highlight inputs with shake animation
      otpBoxes.forEach((b) => {
        b.style.borderColor = 'var(--danger)';
        setTimeout(() => (b.style.borderColor = ''), 1200);
      });
    } finally {
      setButtonLoading(btnVerifyOtp, false, 'Verify OTP');
    }
  });

  // 3. RESEND OTP
  btnResendOtp.addEventListener('click', async () => {
    if (!currentEmail) {
      showScreen('login');
      return;
    }
    clearAlerts();

    try {
      btnResendOtp.disabled = true;
      btnResendOtp.textContent = 'Sending...';

      const response = await fetch('/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not resend OTP.');
      }

      resetOtpBoxes();
      startCountdown(data.expiresInSeconds || 300);
      triggerResendCooldown(30);
      showAlert(otpAlert, `A new 6-digit OTP has been dispatched to ${currentEmail}.`, 'success');

      if (data.devCode) {
        devCodeBanner.innerHTML = `⚙️ <strong>New Preview Code:</strong> <code>${data.devCode}</code>`;
        devCodeBanner.classList.remove('hidden');
      }

      otpBoxes[0].focus();
    } catch (err) {
      showAlert(otpAlert, err.message, 'danger');
      btnResendOtp.disabled = false;
      btnResendOtp.textContent = 'Resend OTP';
    }
  });

  // 4. CHANGE EMAIL / BACK BUTTON
  btnBackToLogin.addEventListener('click', () => {
    if (countdownTimer) clearInterval(countdownTimer);
    showScreen('login');
  });

  // 5. PROTECTED DASHBOARD LOADER
  async function loadDashboardData() {
    const token = sessionStorage.getItem('otp_auth_token');
    if (!token) {
      showScreen('login');
      return;
    }

    try {
      const response = await fetch('/api/dashboard', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Session expired');
      }

      const resData = await response.json();
      const userEmail = resData.data.email;

      dashUserEmail.textContent = userEmail;
      detailEmail.textContent = userEmail;
      dashAvatar.textContent = (userEmail[0] || 'U').toUpperCase();
      detailTimestamp.textContent = resData.data.sessionStarted || new Date().toLocaleString();
    } catch (err) {
      sessionStorage.removeItem('otp_auth_token');
      sessionStorage.removeItem('otp_auth_email');
      showScreen('login');
      showAlert(loginAlert, 'Your session has expired. Please sign in with email OTP again.', 'danger');
    }
  }

  // 6. LOGOUT
  btnLogout.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {}
    sessionStorage.removeItem('otp_auth_token');
    sessionStorage.removeItem('otp_auth_email');
    currentEmail = '';
    inputEmail.value = '';
    showScreen('login');
    showAlert(loginAlert, 'You have signed out successfully.', 'success');
  });

  // --- INITIALIZATION ---
  setupOtpInputs();

  // Check if already authenticated
  const existingToken = sessionStorage.getItem('otp_auth_token');
  if (existingToken) {
    loadDashboardData().then(() => showScreen('dashboard'));
  } else {
    showScreen('login');
  }
})();
