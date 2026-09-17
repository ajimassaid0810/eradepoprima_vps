#!/usr/bin/env python3
"""
Secure Internal Password Change Mediator for Roundcube & Docker Mailserver
Domain: eradepoprima.com
Listens strictly on the internal Docker network (mail_net).
Zero database exposure to Roundcube.
"""

import os
import re
import sys
import ssl
import time
import fcntl
import urllib.parse
import json
import imaplib
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from passlib.hash import sha512_crypt

# Environment Configuration
PORT = int(os.environ.get("PORT", "8000"))
IMAP_HOST = os.environ.get("IMAP_HOST", "mailserver")
IMAP_PORT = int(os.environ.get("IMAP_PORT", "993"))
DOMAIN_NAME = os.environ.get("DOMAIN_NAME", "eradepoprima.com").strip().lower()
ACCOUNTS_FILE = os.environ.get("ACCOUNTS_FILE", "/etc/mail-config/postfix-accounts.cf")

def log_event(level: str, message: str):
    """Safe logger that NEVER logs passwords or sensitive credentials."""
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level.upper()}] {message}", flush=True)

def validate_email_format(email: str) -> bool:
    """Validate email format and verify domain matches configured DOMAIN_NAME."""
    if not email or len(email) > 254:
        return False
    email_regex = re.compile(
        r"^[a-zA-Z0-9_.+-]+@" + re.escape(DOMAIN_NAME) + r"$",
        re.IGNORECASE
    )
    return bool(email_regex.match(email.strip()))

def validate_password_policy(password: str) -> tuple[bool, str]:
    """
    Enforces robust password policy:
    - Minimum 12 characters
    - At least one uppercase letter (A-Z)
    - At least one lowercase letter (a-z)
    - At least one number (0-9)
    - At least one symbol / special character
    """
    if not password:
        return False, "Password cannot be empty."
    if len(password) < 12:
        return False, "Password must be at least 12 characters long."
    if len(password) > 128:
        return False, "Password exceeds maximum allowable length (128 characters)."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter (A-Z)."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter (a-z)."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one numeric digit (0-9)."
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?~`]", password):
        return False, "Password must contain at least one special character / symbol."
    return True, ""

def verify_imap_credentials(email: str, password: str) -> bool:
    """
    Validates current user credentials against Dovecot IMAP.
    Passwords are tested in memory and never logged or stored.
    """
    try:
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE  # Internal bridge communication

        if IMAP_PORT == 993:
            mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT, ssl_context=ssl_ctx, timeout=10)
            mail.login(email, password)
            mail.logout()
            return True
        else:
            mail = imaplib.IMAP4(IMAP_HOST, IMAP_PORT, timeout=10)
            mail.starttls(ssl_context=ssl_ctx)
            mail.login(email, password)
            mail.logout()
            return True
    except imaplib.IMAP4.error:
        # Authentication rejected by Dovecot (invalid password)
        return False
    except Exception as exc:
        log_event("ERROR", f"IMAP connection failure during credential verification: {type(exc).__name__}")
        return False

def update_account_password(email: str, new_password: str) -> tuple[bool, str]:
    """
    Updates the password hash in postfix-accounts.cf with safe file locking.
    Uses SHA512-CRYPT scheme formatted for Dovecot: {SHA512-CRYPT}$6$...
    """
    if not os.path.exists(ACCOUNTS_FILE):
        return False, f"Accounts file not found at {ACCOUNTS_FILE}"

    clean_email = email.strip().lower()
    raw_hash = sha512_crypt.using(rounds=5000).hash(new_password)
    dovecot_hash = f"{{SHA512-CRYPT}}{raw_hash}"

    try:
        with open(ACCOUNTS_FILE, "r+", encoding="utf-8") as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            try:
                lines = f.readlines()
                updated = False
                new_lines = []

                for line in lines:
                    line_clean = line.strip()
                    if not line_clean or line_clean.startswith("#"):
                        new_lines.append(line)
                        continue

                    parts = line_clean.split("|")
                    account_email = parts[0].strip().lower()

                    if account_email == clean_email:
                        # Preserve any extra pipe-delimited fields if present
                        rest_of_line = parts[2:] if len(parts) > 2 else []
                        if rest_of_line:
                            new_line = f"{clean_email}|{dovecot_hash}|{'|'.join(rest_of_line)}\n"
                        else:
                            new_line = f"{clean_email}|{dovecot_hash}\n"
                        new_lines.append(new_line)
                        updated = True
                    else:
                        new_lines.append(line)

                if not updated:
                    return False, f"Account '{clean_email}' not found in accounts file."

                f.seek(0)
                f.writelines(new_lines)
                f.truncate()
                f.flush()
                os.fsync(f.fileno())
                return True, "Password updated successfully."
            finally:
                fcntl.flock(f, fcntl.LOCK_UN)
    except Exception as exc:
        log_event("ERROR", f"Failed to update accounts file: {exc}")
        return False, "Internal storage write error."

class PasswordChangeHandler(BaseHTTPRequestHandler):
    """HTTP request handler for Roundcube Password Plugin httpapi driver."""

    def log_message(self, format, *args):
        # Override default http.server logging to prevent logging query parameters or passwords
        pass

    def send_response_custom(self, status_code: int, message: str):
        self.send_response(status_code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(message.encode("utf-8"))))
        self.end_headers()
        self.wfile.write(message.encode("utf-8"))

    def do_GET(self):
        if self.path == "/healthz":
            self.send_response_custom(200, "OK")
            return
        self.send_response_custom(404, "Not Found")

    def do_POST(self):
        if self.path != "/password":
            self.send_response_custom(404, "Not Found")
            return

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0 or content_length > 65536:
            self.send_response_custom(400, "Invalid Request Body Length")
            return

        raw_body = self.rfile.read(content_length).decode("utf-8", errors="replace")
        content_type = self.headers.get("Content-Type", "")

        user = ""
        curpass = ""
        newpass = ""

        if "application/json" in content_type:
            try:
                data = json.loads(raw_body)
                user = data.get("user", "")
                curpass = data.get("curpass", "")
                newpass = data.get("newpass", "")
            except Exception:
                self.send_response_custom(400, "Malformed JSON")
                return
        else:
            parsed = urllib.parse.parse_qs(raw_body, keep_blank_values=True)
            user = parsed.get("user", [""])[0]
            curpass = parsed.get("curpass", [""])[0]
            newpass = parsed.get("newpass", [""])[0]

        user = user.strip().lower()

        # Step 1: Validate Email Format & Domain
        if not validate_email_format(user):
            log_event("WARNING", f"Rejected request: Invalid user format or foreign domain '{user}'")
            self.send_response_custom(400, "Invalid user email format or domain not permitted.")
            return

        # Step 2: Validate Password Policy
        policy_ok, policy_msg = validate_password_policy(newpass)
        if not policy_ok:
            log_event("INFO", f"Password change rejected for '{user}': policy validation failed.")
            self.send_response_custom(400, policy_msg)
            return

        # Step 3: Verify Current Password via IMAP (Anti-Tamper / Auth check)
        auth_ok = verify_imap_credentials(user, curpass)
        if not auth_ok:
            log_event("WARNING", f"Authentication failed for user '{user}': incorrect current password.")
            self.send_response_custom(401, "Current password is incorrect.")
            return

        # Step 4: Update Password Hash in Accounts File
        success, msg = update_account_password(user, newpass)
        if not success:
            log_event("ERROR", f"Failed updating password for user '{user}': {msg}")
            self.send_response_custom(500, "Internal error updating mailbox password.")
            return

        log_event("INFO", f"Password successfully changed for user '{user}'.")
        # Roundcube httpapi driver expects response matching /^ok$/i
        self.send_response_custom(200, "ok\n")

def run_server():
    log_event("INFO", f"Starting Secure Password Mediator on port {PORT}...")
    log_event("INFO", f"Target Domain: {DOMAIN_NAME}, IMAP Host: {IMAP_HOST}:{IMAP_PORT}")
    log_event("INFO", f"Accounts Database: {ACCOUNTS_FILE}")

    server = ThreadingHTTPServer(("0.0.0.0", PORT), PasswordChangeHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log_event("INFO", "Shutting down password mediator server...")
    finally:
        server.server_close()

if __name__ == "__main__":
    run_server()
