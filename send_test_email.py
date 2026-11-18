#!/usr/bin/env python3
"""
Test script to verify OTP email delivery to user inbox (e.g. praveeninpand@gmail.com).
Reads SMTP credentials from .env and attempts sending a real email via TLS/SSL.
"""
import os
import sys
import smtplib
import email.utils
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

def send_test_otp(to_email="praveeninpand@gmail.com", otp_code="123456"):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "465"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_pass = os.getenv("SMTP_PASSWORD", os.getenv("SMTP_PASS", "")).strip().replace(" ", "")
    smtp_from = os.getenv("SMTP_FROM", f"INPAND Security <{smtp_user or 'noreply@gmail.com'}>").strip()
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")

    print(f"==================================================")
    print(f"INPAND OTP Email Delivery Tester")
    print(f"==================================================")
    print(f"Recipient:  {to_email}")
    print(f"SMTP Host:  {smtp_host}:{smtp_port}")
    print(f"SMTP User:  {smtp_user or '(NOT SET - please set in .env)'}")
    print(f"Password:   {'*' * len(smtp_pass) if smtp_pass else '(NOT SET - please set in .env)'}")
    print(f"From:       {smtp_from}")
    print(f"==================================================")

    if not smtp_user or not smtp_pass:
        print("\n[!] ERROR: SMTP_USER and SMTP_PASSWORD are not configured.")
        print("\nTo send real emails to your Gmail inbox:")
        print("1. Go to https://myaccount.google.com/apppasswords")
        print("2. Generate a 16-character App Password (name it 'INPAND Portal')")
        print("3. Add them to your .env file:")
        print("   SMTP_HOST=smtp.gmail.com")
        print("   SMTP_PORT=465")
        print("   SMTP_USER=your_email@gmail.com")
        print("   SMTP_PASSWORD=xxxx xxxx xxxx xxxx")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = Header("OTP from INPAND", "utf-8")
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg["Date"] = email.utils.formatdate(localtime=True)
    msg["Message-ID"] = email.utils.make_msgid(domain="inpand-portal.edu")

    text = f"Hello,\n\nYour One-Time Password (OTP) from INPAND is: {otp_code}\n\nThis OTP is valid for 10 minutes.\n\nINPAND Institute of Engineering and Technology"
    html = f"""<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #f8fafc; padding: 24px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
    <h2 style="color: #1e293b; margin: 0; text-align: center;">INPAND Portal Security</h2>
    <p style="color: #64748b; text-align: center;">Email Verification</p>
    <p style="color: #334155;">Hello,</p>
    <p style="color: #334155;">Use the One-Time Password (OTP) below to complete your verification:</p>
    <div style="background: #f1f5f9; border: 2px dashed #6366f1; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
      <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #4338ca; font-family: monospace;">{otp_code}</div>
      <div style="font-size: 13px; color: #64748b; margin-top: 8px;">Valid for 10 minutes</div>
    </div>
    <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 INPAND Institute of Engineering and Technology</p>
  </div>
</body>
</html>"""

    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        print(f"Connecting to {smtp_host}:{smtp_port}...")
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12)
            server.ehlo()
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
            server.ehlo()
            if use_tls:
                server.starttls()
                server.ehlo()

        print(f"Authenticating as {smtp_user}...")
        server.login(smtp_user, smtp_pass)
        print(f"Sending message to {to_email}...")
        server.sendmail(smtp_from, [to_email], msg.as_string())
        server.quit()
        print(f"\n[✓] SUCCESS: Email successfully delivered to {to_email}!")
        print("Please check your email inbox (and Spam/Junk folder if not in primary inbox).")
        return True
    except Exception as e:
        print(f"\n[✗] Delivery failed: {e}")
        return False

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "praveeninpand@gmail.com"
    send_test_otp(target)
