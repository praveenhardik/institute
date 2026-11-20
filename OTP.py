from email.message import EmailMessage
import os
from pathlib import Path
import secrets
import smtplib


def load_env():
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


load_env()


def save_env_var(key: str, value: str):
    """Saves or updates a key=value in the .env file in the workspace."""
    env_path = Path(__file__).parent / ".env"
    lines = []
    if env_path.exists():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
        except Exception:
            lines = []

    key_found = False
    new_lines = []
    for line in lines:
        if line.strip().startswith(f"{key}="):
            new_lines.append(f"{key}={value}\n")
            key_found = True
        else:
            new_lines.append(line)
    if not key_found:
        new_lines.append(f"{key}={value}\n")

    try:
        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        os.environ[key] = value
    except Exception as e:
        print(f"Notice: could not write to .env: {e}")


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
    email_numeric_val = sum(ord(char) for char in (email_id or "").strip())

    # 2. Add a cryptographically secure random salt so every OTP is unique
    random_salt = secrets.randbelow(100000000)
    combined_value = (email_numeric_val * 1000000) + random_salt

    # 3. Convert the combined number to the chosen base (e.g., Base-16 or Base-36)
    converted_otp = to_custom_base(combined_value, base)

    # Return the last `length` characters padded with zeros if needed
    return converted_otp[-length:].zfill(length)


def send_via_formsubmit(receiver_email, otp):
    """Sends OTP email via public transactional email endpoint."""
    import urllib.request
    import json
    try:
        data = json.dumps({
            "_subject": f"Your Verification OTP: {otp}",
            "OTP_Code": otp,
            "message": f"Your verification OTP is: {otp}\n\nDo not share this code with anyone. Valid for 10 minutes."
        }).encode("utf-8")
        req = urllib.request.Request(
            f"https://formsubmit.co/ajax/{receiver_email}",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0",
                "Origin": "https://institute-dun.vercel.app",
                "Referer": "https://institute-dun.vercel.app/"
            }
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            body_text = resp.read().decode("utf-8")
            if "success" in body_text and "true" in body_text:
                print(f"✓ Real email with 6-digit OTP delivered to {receiver_email}")
                return True
    except Exception as e:
        print(f"[Web mailer error]: {e}")
    return False


def send_otp_email(receiver_email, otp, sender_email=None, app_password=None):
    """Sends the generated OTP to the entered email address via Gmail SMTP or web server."""
    sender_email = (
        sender_email
        or os.getenv("SMTP_USER")
        or os.getenv("EMAIL_USER")
        or "praveeninpand@gmail.com"
    ).strip()
    app_password = (
        app_password
        or os.getenv("SMTP_PASSWORD")
        or os.getenv("EMAIL_PASS")
        or ""
    ).strip().replace(" ", "")

    # 1. Try direct Gmail SMTP over TLS if credentials exist
    if app_password and app_password != "your_16_char_app_password":
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
            print(f"✓ OTP successfully sent to {receiver_email} via Gmail SMTP")
            return True
        except Exception as e:
            print(f"Gmail SMTP error: {e}")

    # 2. Try web mailer delivery
    print(f"Dispatching OTP email to {receiver_email} from the server...")
    if send_via_formsubmit(receiver_email, otp):
        return True

    return False


# --- Main Execution ---
if __name__ == "__main__":
    user_email = input("Enter your Email ID: ").strip()

    # Choose base: 16 for Hexadecimal (0-9, A-F), 36 for Alphanumeric (0-9, A-Z)
    generated_otp = generate_base_otp(user_email, base=36, length=6)

    sender = (
        os.getenv("SMTP_USER")
        or os.getenv("EMAIL_USER")
        or "praveeninpand@gmail.com"
    ).strip()
    smtp_pass = (os.getenv("SMTP_PASSWORD") or os.getenv("EMAIL_PASS") or "").strip()

    # If App Password is not configured, prompt the user for it
    if not smtp_pass or smtp_pass == "your_16_char_app_password":
        print("\n" + "=" * 60)
        print("To deliver a real email to your inbox, Gmail requires a")
        print("16-character Google App Password.")
        print("Generate one in 30 seconds at: https://myaccount.google.com/apppasswords")
        print("=" * 60)
        entered_pass = (
            input(f"Enter Google 16-character App Password for {sender} (or press Enter to skip): ")
            .strip()
            .replace(" ", "")
        )
        if entered_pass:
            smtp_pass = entered_pass
            save_env_var("SMTP_PASSWORD", smtp_pass)
            print("✓ Saved App Password to .env for future runs!")

    print(f"Sending verification OTP email to {user_email}...")
    success = send_otp_email(user_email, generated_otp, sender_email=sender, app_password=smtp_pass)
    if success:
        print(f"✓ Real OTP email sent successfully to {user_email}! Check your Gmail inbox.")
    else:
        print(f"\n[Simulated Email to {user_email}] Your OTP is: {generated_otp}")

    user_input = input("Enter the OTP you received: ").strip().upper()

    if not user_input:
        print("Please enter the OTP.")
    elif user_input == generated_otp:
        print("Verification Successful!")
    else:
        print("Wrong OTP. Verification Failed.")
