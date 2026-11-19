"""Check configured SMTP connectivity and authentication without sending mail."""

import os
import smtplib


def main() -> int:
    host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    port = int(os.getenv("SMTP_PORT", "465"))
    username = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip().replace(" ", "")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")

    if not username or not password:
        print("SMTP check failed: set SMTP_USER and SMTP_PASSWORD in the AWS SecureString.")
        return 1

    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=15) as server:
                server.ehlo()
                server.login(username, password)
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.ehlo()
                if use_tls:
                    server.starttls()
                    server.ehlo()
                server.login(username, password)
    except Exception as exc:
        print(f"SMTP check failed for {host}:{port}: {exc}")
        return 1

    print(f"SMTP authentication succeeded for {host}:{port} as {username}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
