#!/usr/bin/env bash
# ==============================================================================
# SCRIPT PENGAMANAN FIREWALL VPS (UFW & DOCKER HARDENING)
# ==============================================================================
# Jalankan sebagai root: sudo bash security/ufw-setup.sh

set -euo pipefail

echo "======================================================"
echo " [SECURITY] Mengonfigurasi UFW Firewall untuk VPS..."
echo "======================================================"

# 1. Pastikan UFW terinstall
if ! command -v ufw &> /dev/null; then
    echo "[INFO] Menginstall ufw..."
    apt-get update && apt-get install -y ufw
fi

# 2. Reset / Kebijakan Default
echo "[INFO] Mengatur default policy (Deny incoming, Allow outgoing)..."
ufw default deny incoming
ufw default allow outgoing

# 3. Deteksi Port SSH Aktif agar tidak terputus koneksi
SSH_PORT=$(ss -tlpn | grep sshd | awk '{print $4}' | awk -F: '{print $NF}' | head -n1)
SSH_PORT=${SSH_PORT:-22}
echo "[INFO] Mengizinkan port SSH aktif: $SSH_PORT/tcp"
ufw allow "$SSH_PORT"/tcp comment 'SSH Access'

# 4. Buka Port Web & Reverse Proxy
echo "[INFO] Mengizinkan port Web HTTP (80) dan HTTPS (443)..."
ufw allow 80/tcp comment 'HTTP (Let Encrypt & Redirect)'
ufw allow 443/tcp comment 'HTTPS (Traefik TLS Websecure)'

# 5. Buka Port Mail Server
echo "[INFO] Mengizinkan port Mail Server..."
ufw allow 25/tcp comment 'SMTP (Inbound Mail)'
ufw allow 465/tcp comment 'SMTPS (TLS Encrypted)'
ufw allow 587/tcp comment 'SMTP Submission'
ufw allow 993/tcp comment 'IMAPS (Encrypted Mail Access)'
ufw allow 143/tcp comment 'IMAP (STARTTLS)'

# 6. Aktifkan Firewall
echo "[INFO] Mengaktifkan UFW..."
ufw --force enable

echo ""
echo "======================================================"
echo " [SELESAI] Status Firewall Saat Ini:"
echo "======================================================"
ufw status verbose

echo ""
echo "Catatan Keamanan Penting:"
echo "- Port database PostgreSQL (5432) dan Redis (6379) TERTUTUP dari publik"
echo "  dan hanya bisa diakses antar-container melalui Docker Internal Network."
