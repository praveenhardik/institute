# Full-Stack Email OTP Authentication Web Application

A full-stack web application featuring **Email OTP (One-Time Password) Authentication** built with **Node.js, Express, and Nodemailer**.

---

## 🌟 Key Features

1. **Screen 1: Clean Email Login**
   - Clean, modern, responsive input interface.
   - Client and server-side email validation.
   - **Send OTP** button with loading spinner state and rate-limiting cooldown.

2. **Backend OTP Engine with Nodemailer**
   - Cryptographically secure 6-digit random OTP generation (`crypto.randomInt`).
   - Temporary in-memory storage with automatic expiration cleanup.
   - **Strict 5-Minute Expiry** (`OTP_EXPIRY_MINUTES=5`).
   - Dispatches branded, responsive HTML verification emails via **Nodemailer SMTP** (Gmail, Outlook, Amazon SES, or custom SMTP).

3. **Screen 2: 6-Digit OTP Verification**
   - 6 individual digit input boxes with **auto-advance**, **backspace navigation**, and full **copy-paste** support.
   - **Live 5-Minute Countdown Timer** (`05:00` ticking down).
   - Instant error messaging for **invalid codes** or **expired codes**.
   - **Resend OTP** button with 30-second cooldown timer.
   - **Change Email** back button to return to Screen 1.

4. **Screen 3: Protected Welcome Dashboard**
   - Protected route requiring a verified JWT authentication token.
   - Displays authenticated email, session metrics, and security status.
   - **Sign Out** button that clears the session and returns to the login screen.
   - Single-use OTP guarantee (consumed codes are immediately purged to prevent replay attacks).

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd email-otp-auth
npm install
```

### 2. Configure Environment Variables (`.env`)
Create or edit `.env` in the `email-otp-auth` directory:
```env
PORT=4000
JWT_SECRET=your_super_secret_jwt_key_here

# Nodemailer SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_character_app_password
FROM_EMAIL="OTP Portal Auth" <your_email@gmail.com>

# 5 Minutes Expiry
OTP_EXPIRY_MINUTES=5
```

> **How to generate a Gmail App Password:**
> 1. Go to your [Google Account Security](https://myaccount.google.com/security).
> 2. Enable **2-Step Verification**.
> 3. Visit [Google App Passwords](https://myaccount.google.com/apppasswords).
> 4. Create an App Name (e.g. `OTP Auth`) and copy the generated 16-character password into `SMTP_PASS` (remove spaces).

### 3. Start the Server
```bash
npm start
```
The application will be live at **http://localhost:4000**.

---

## 📡 API Endpoints

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/send-otp` | Generates 6-digit OTP & sends email via Nodemailer | No |
| `POST` | `/api/verify-otp` | Validates 6-digit code against 5-min expiry & issues JWT | No |
| `POST` | `/api/resend-otp` | Generates and sends a fresh 5-minute OTP code | No |
| `GET` | `/api/dashboard` | Returns protected dashboard data for authenticated user | **Yes (Bearer JWT)** |
| `POST` | `/api/logout` | Clears active authentication session | **Yes** |

---

## 🧪 Testing

Run the included automated test suite:
```bash
node test/test-otp.js
```
The test verifies:
- Invalid email format rejection (400)
- 6-digit OTP generation and 300s expiry
- Invalid OTP rejection with clear message
- Successful verification issuing JWT token
- Protected dashboard access with token
- Single-use replay protection
- Unauthorized access rejection (401)
