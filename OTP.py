from email.message import EmailMessage
import os
from pathlib import Path
import secrets
import smtplib


def load_env():
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


load_env()


def to_custom_base(number, base=36):
    """Converts a base-10 integer into a custom base (up to Base-36)."""
    chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    if number == 0:
        return "0"

    result = ""
    while number > 0:
        number, remainder = divmod(number, base)
        result = chars[remainder] + result
    return result


def generate_base_otp(email_id, base=36, length=6):
    """Generates an OTP by converting the email's ASCII sum + random salt to a target base."""
    # 1. Sum the ASCII values of all characters in the email ID
    email_numeric_val = sum(ord(char) for char in email_id.strip())

    # 2. Add a cryptographically secure random salt so every OTP is unique
    random_salt = secrets.randbelow(100000000)
    combined_value = (email_numeric_val * 1000000) + random_salt

    # 3. Convert the combined number to the chosen base (e.g., Base-16 or Base-36)
    converted_otp = to_custom_base(combined_value, base)

    # Return the last `length` characters padded with zeros if needed
    return converted_otp[-length:].zfill(length)


def send_otp_email(receiver_email, otp, sender_email=None, app_password=None):
    """Sends the generated OTP to the entered email address via Gmail SMTP."""
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
    msg.set_content(
        f"Your verification OTP is: {otp}\n\nDo not share this code with anyone."
    )
    msg["Subject"] = "Your Verification OTP"
    msg["From"] = sender_email
    msg["To"] = receiver_email

    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
            server.starttls()
            server.login(sender_email, app_password)
            server.send_message(msg)
        print(f"OTP successfully sent to {receiver_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


# --- Main Execution ---
if __name__ == "__main__":
    user_email = input("Enter your Email ID: ").strip()

    # Choose base: 16 for Hexadecimal (0-9, A-F), 36 for Alphanumeric (0-9, A-Z)
    generated_otp = generate_base_otp(user_email, base=36, length=6)

    # Send real email if SMTP credentials configured
    smtp_pass = os.getenv("SMTP_PASSWORD") or os.getenv("EMAIL_PASS") or ""
    if smtp_pass and smtp_pass != "your_16_char_app_password":
        send_otp_email(user_email, generated_otp)
    else:
        # Simulated delivery for testing without SMTP credentials
        print(f"[Simulated Email to {user_email}] Your OTP is: {generated_otp}")

    user_input = input("Enter the OTP you received: ").strip().upper()

    if user_input == generated_otp:
        print("Verification Successful!")
    else:
        print("Invalid OTP. Verification Failed.")
