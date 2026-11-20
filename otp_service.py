import os
import random
import smtplib
import time
from email.message import EmailMessage
from pathlib import Path


def load_env_file():
    """Load key-value pairs from .env into os.environ if not already present."""
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass


load_env_file()


def generate_base_otp(email_id: str, base: int = 36, length: int = 6) -> str:
    """
    Generates an OTP by converting an email-derived integer into a target number base.
    Supports bases from 2 (binary) up to 36 (alphanumeric).
    """
    # 1. Convert email characters to a single large integer via ASCII values
    email_num = sum(ord(char) * (index + 1) for index, char in enumerate(email_id))

    # 2. Combine with current timestamp and random entropy so every OTP is unique
    unique_seed = email_num + int(time.time() * 1000) + random.randint(100000, 999999)

    # 3. Perform manual number base conversion
    digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    converted = ""

    while unique_seed > 0:
        remainder = unique_seed % base
        converted = digits[remainder] + converted
        unique_seed //= base

    # Return the last 'length' characters as the OTP
    return converted[-length:].zfill(length)


def send_otp_email(receiver_email: str, otp: str, sender_email: str = None, app_password: str = None):
    """
    Sends the generated OTP to the user's email using Gmail SMTP over TLS (Port 587).
    """
    sender_email = (
        sender_email
        or os.getenv("SMTP_USER")
        or os.getenv("EMAIL_USER")
        or "your_email@gmail.com"
    ).strip()
    app_password = (
        app_password
        or os.getenv("SMTP_PASSWORD")
        or os.getenv("EMAIL_PASS")
        or "your_16_char_app_password"
    ).strip().replace(" ", "")

    msg = EmailMessage()
    msg["Subject"] = "Your Verification OTP"
    msg["From"] = sender_email
    msg["To"] = receiver_email
    msg.set_content(f"Your One-Time Password (OTP) is: {otp}\n\nDo not share this code with anyone.")

    # Connect to Gmail SMTP server over TLS
    with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
        server.starttls()
        server.login(sender_email, app_password)
        server.send_message(msg)


if __name__ == "__main__":
    user_email = input("Enter your email ID: ").strip()

    if "@" not in user_email or "." not in user_email:
        print("Invalid email format.")
    else:
        # Change base to 16 for Hexadecimal, 8 for Octal, or 36 for Alphanumeric
        otp_code = generate_base_otp(user_email, base=36, length=6)

        print(f"Generated OTP (Base-36): {otp_code}")

        # Configured email dispatch block
        sender = os.getenv("SMTP_USER") or os.getenv("EMAIL_USER") or "your_email@gmail.com"
        passwd = os.getenv("SMTP_PASSWORD") or os.getenv("EMAIL_PASS") or ""
        if passwd and passwd != "your_16_char_app_password":
            try:
                send_otp_email(user_email, otp_code, sender_email=sender, app_password=passwd)
                print(f"OTP sent to your email ({user_email})!")
            except Exception as e:
                print(f"Failed to send email: {e}")
        else:
            print("To send email automatically, add your 16-character Google App Password in .env")

        # Verification step
        entered_otp = input("Enter the OTP received: ").strip().upper()
        if entered_otp == otp_code:
            print("Verification Successful!")
        else:
            print("Invalid OTP. Verification Failed.")
