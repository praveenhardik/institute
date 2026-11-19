require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_me_12345';
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000; // 5 minutes

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Temporary Store for OTPs
// Map: email -> { otp: string, expiresAt: number, attempts: number, createdAt: number }
const otpStore = new Map();

// Periodic cleanup of expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt + 60000) {
      otpStore.delete(email);
    }
  }
}, 60000);

// Helper: Setup Nodemailer Transporter using EMAIL_USER & EMAIL_PASS (or SMTP_USER & SMTP_PASS)
function createTransporter() {
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.SMTP_PORT || '465', 10);

  if (!user || !pass) {
    return null; // SMTP credentials not fully configured
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });
}

// Helper: Email HTML Template
function buildOtpHtml(otp, email) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your One-Time Password</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
    <tr>
      <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">🔐 Portal Verification</div>
        <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">Email Authentication Service</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 28px;">
        <p style="font-size: 15px; color: #334155; margin: 0 0 16px;">Hello,</p>
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 24px;">
          We received an authentication request for <strong>${email}</strong>. Use the 6-digit One-Time Password (OTP) below to complete your login.
        </p>

        <div style="background: #f8fafc; border: 2px dashed #6366f1; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #4338ca; font-family: 'Courier New', Courier, monospace;">
            ${otp}
          </div>
          <div style="font-size: 13px; color: #dc2626; font-weight: 600; margin-top: 10px;">
            ⏳ Valid for ${OTP_EXPIRY_MINUTES} minutes only
          </div>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0;">
          <strong>Security Note:</strong> Never share this code with anyone. Our support team will never ask for your OTP. If you did not request this code, you can safely ignore this email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background: #f8fafc; padding: 18px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        Sent automatically via Nodemailer Email OTP Service.
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------
// ROUTE HANDLERS
// ---------------------------

// 1. Send OTP Handler
async function handleSendOtp(req, res) {
  try {
    const { email } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Cooldown check: minimum 10 seconds between OTP requests
    const existing = otpStore.get(normalizedEmail);
    if (existing && Date.now() - existing.createdAt < 10000) {
      const waitSeconds = Math.ceil((10000 - (Date.now() - existing.createdAt)) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSeconds} seconds before requesting a new OTP.`
      });
    }

    // Generate random 6-digit numeric OTP (100000 - 999999)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    // Store temporarily in memory mapped to email
    otpStore.set(normalizedEmail, {
      otp,
      expiresAt,
      attempts: 0,
      createdAt: Date.now()
    });

    console.log(`[OTP Generated] For ${normalizedEmail}: ${otp} (expires in ${OTP_EXPIRY_MINUTES} min)`);

    // Dispatch via Nodemailer
    const transporter = createTransporter();
    let emailSent = false;
    let mailError = null;

    if (transporter) {
      try {
        const sender = process.env.EMAIL_USER || process.env.SMTP_USER;
        await transporter.sendMail({
          from: `"OTP Authentication" <${sender}>`,
          to: normalizedEmail,
          subject: `Your ${otp} Verification Code - Valid for ${OTP_EXPIRY_MINUTES} min`,
          text: `Your 6-digit One-Time Password (OTP) is: ${otp}. It will expire in ${OTP_EXPIRY_MINUTES} minutes.`,
          html: buildOtpHtml(otp, normalizedEmail)
        });
        emailSent = true;
        console.log(`[Email Sent] Successfully dispatched OTP to ${normalizedEmail}`);
      } catch (err) {
        mailError = err.message;
        console.error(`[Nodemailer Error] ${err.message}`);
      }
    } else {
      console.warn(`[Nodemailer] EMAIL_USER or EMAIL_PASS not set in .env. Exposing devCode for local browser testing.`);
    }

    return res.status(200).json({
      success: true,
      message: emailSent
        ? `✓ Success! A 6-digit OTP has been sent to your Gmail inbox (${normalizedEmail}). Please check your inbox or spam.`
        : (mailError
            ? `⚠️ Email delivery failed (${mailError}). Please check your 16-character Google App Password in .env.`
            : `⚠️ Email not delivered to inbox: EMAIL_PASS is empty in .env. Enter your 16-character Google App Password in .env to receive real emails.`),
      email: normalizedEmail,
      expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
      emailSent,
      mailError,
      devCode: !emailSent ? otp : undefined
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send OTP. Please try again later.'
    });
  }
}

// 2. Verify OTP Handler
function handleVerifyOtp(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Both email address and 6-digit OTP code are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        error: 'OTP must be exactly 6 digits.'
      });
    }

    const record = otpStore.get(normalizedEmail);

    // 1. Check if OTP exists
    if (!record) {
      return res.status(400).json({
        success: false,
        error: 'No active OTP found for this email. Please click "Resend OTP" to request a new code.'
      });
    }

    // 2. Check 5-minute Expiration
    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        expired: true,
        error: 'This OTP has expired (5-minute limit exceeded). Please click "Resend OTP" to receive a new code.'
      });
    }

    // 3. Brute-force attempt defense
    if (record.attempts >= 5) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        error: 'Too many incorrect attempts. For security reasons, this OTP has been invalidated. Please request a new code.'
      });
    }

    // 4. Verify OTP Code match
    if (record.otp !== cleanOtp) {
      record.attempts += 1;
      const remainingAttempts = 5 - record.attempts;
      return res.status(400).json({
        success: false,
        error: `Invalid OTP code. Please check your email and try again. (${remainingAttempts} attempts remaining)`
      });
    }

    // 5. Success: Delete used OTP from memory immediately (single use guarantee)
    otpStore.delete(normalizedEmail);

    // Generate authenticated JWT session token (valid 2 hours)
    const token = jwt.sign(
      {
        email: normalizedEmail,
        authTime: Date.now()
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully!',
      token,
      user: {
        email: normalizedEmail,
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected server error occurred during verification.'
    });
  }
}

// 3. Protected Dashboard Middleware & Handler
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Access token missing or invalid.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid. Please sign in again.'
    });
  }
}

function handleDashboard(req, res) {
  return res.status(200).json({
    success: true,
    data: {
      email: req.user.email,
      sessionStarted: new Date(req.user.authTime).toLocaleString(),
      authMethod: 'Email OTP (Nodemailer SMTP)',
      status: 'Active & Verified',
      metrics: {
        lastLogin: new Date().toLocaleTimeString(),
        securityLevel: 'Enhanced (2-Factor OTP)',
        sessionValidHours: 2
      }
    }
  });
}

// ---------------------------
// ENDPOINTS
// ---------------------------
// Core required endpoints
app.post('/send-otp', handleSendOtp);
app.post('/verify-otp', handleVerifyOtp);

// API aliases for flexibility
app.post('/api/send-otp', handleSendOtp);
app.post('/api/verify-otp', handleVerifyOtp);
app.post('/resend-otp', handleSendOtp);
app.post('/api/resend-otp', handleSendOtp);

// Check SMTP configuration status
app.get('/api/smtp-status', (req, res) => {
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || '').trim();
  res.json({
    configured: !!(user && pass),
    emailUser: user || null,
    hasPassword: !!pass
  });
});

// Configure and test Gmail App Password dynamically
app.post('/api/save-credentials', async (req, res) => {
  try {
    const { emailUser, emailPass } = req.body;
    if (!emailUser || !emailPass) {
      return res.status(400).json({ success: false, error: 'Both Gmail address and 16-character App Password are required.' });
    }

    const cleanUser = emailUser.trim();
    const cleanPass = emailPass.trim().replace(/\s+/g, '');

    // Test connection with Nodemailer
    const testTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: true,
      auth: { user: cleanUser, pass: cleanPass },
      tls: { rejectUnauthorized: false }
    });

    try {
      await testTransporter.verify();
    } catch (verifyErr) {
      return res.status(400).json({
        success: false,
        error: `Gmail connection failed: ${verifyErr.message}. Make sure 2-Step Verification is ON in your Google Account and you generated an App Password from https://myaccount.google.com/apppasswords`
      });
    }

    // Update in-memory environment
    process.env.EMAIL_USER = cleanUser;
    process.env.EMAIL_PASS = cleanPass;

    // Update .env file on disk
    const fs = require('fs');
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    if (envContent.includes('EMAIL_USER=')) {
      envContent = envContent.replace(/^EMAIL_USER=.*$/m, `EMAIL_USER=${cleanUser}`);
    } else {
      envContent += `\nEMAIL_USER=${cleanUser}`;
    }

    if (envContent.includes('EMAIL_PASS=')) {
      envContent = envContent.replace(/^EMAIL_PASS=.*$/m, `EMAIL_PASS=${cleanPass}`);
    } else {
      envContent += `\nEMAIL_PASS=${cleanPass}`;
    }

    fs.writeFileSync(envPath, envContent, 'utf8');

    console.log(`[SMTP Configured] Successfully verified and saved credentials for ${cleanUser}`);
    return res.json({
      success: true,
      message: `✓ Connected to Gmail SMTP! OTP emails will now be sent directly to real inboxes.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/dashboard', requireAuth, handleDashboard);
app.post('/api/logout', (req, res) => res.json({ success: true, message: 'Logged out successfully' }));

// Serve Single Page App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Email OTP Authentication Server running!`);
  console.log(`🌐 Open in browser: http://localhost:${PORT}`);
  console.log(`⏱️ OTP Expiration: ${OTP_EXPIRY_MINUTES} minutes`);
  console.log(`📧 Nodemailer User: ${process.env.EMAIL_USER || process.env.SMTP_USER || '(Not configured)'}`);
  console.log(`=======================================================`);
});
