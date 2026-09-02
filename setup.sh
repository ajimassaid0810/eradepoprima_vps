#!/usr/bin/env bash
# ==============================================================================
# SCRIPT INITIAL SETUP & SECURITY HARDENING
# ==============================================================================
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASE_DIR"

echo "======================================================"
echo " [SETUP] Inisialisasi Arsitektur Docker VPS..."
echo "======================================================"

# 1. Cek keberadaan Docker dan Docker Compose
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker tidak ditemukan! Silakan instal Docker terlebih dahulu."
    exit 1
fi

echo "[✓] Docker terdeteksi: $(docker --version)"

# 2. Siapkan file .env jika belum ada
if [ ! -f .env ]; then
    echo "[INFO] Menyalin .env.example menjadi .env..."
    cp .env.example .env
    echo "[!] File .env telah dibuat. Silakan sesuaikan isinya dengan domain & password Anda."
fi

# 3. Optimasi Swap Memory (Jika belum ada swap aktif di VPS)
SWAP_TOTAL=$(free -m | awk '/Swap:/ {print $2}')
if [ "${SWAP_TOTAL:-0}" -lt 1024 ]; then
    echo "[INFO] Menyiapkan 2GB SWAP File di NVMe untuk stabilitas sistem..."
    if [ ! -f /swapfile ]; then
        fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile || true
        if ! grep -q '/swapfile' /etc/fstab; then
            echo '/swapfile none swap sw 0 0' >> /etc/fstab
        fi
        echo "[✓] 2GB Swap file berhasil diaktifkan."
    fi
else
    echo "[✓] Swap memory terdeteksi: ${SWAP_TOTAL}MB."
fi

# 4. Buat direktori yang dibutuhkan untuk persistensi & keamanan
echo "[INFO] Membuat direktori data dan mengamankan hak akses..."
mkdir -p proxy/acme proxy/dynamic
mkdir -p mail/mail-data mail/mail-state mail/mail-logs mail/config mail/webmail-db

# Buat placeholder acme.json dengan permission ketat (600) untuk Let's Encrypt
if [ ! -f proxy/acme/acme.json ]; then
    touch proxy/acme/acme.json
fi

# 4. Terapkan Permission Hardening
chmod 600 .env || true
chmod 600 proxy/acme/acme.json || true
chmod 700 mail/config mail/mail-data mail/mail-state mail/mail-logs || true

# 5. Buat shared external network Docker 'proxy_net'
if ! docker network inspect proxy_net &> /dev/null; then
    echo "[INFO] Membuat Docker external network 'proxy_net'..."
    docker network create --driver bridge proxy_net
else
    echo "[✓] Docker network 'proxy_net' sudah ada."
fi

# 6. Buat manage.sh executable
chmod +x manage.sh setup.sh security/ufw-setup.sh 2>/dev/null || true

echo ""
echo "======================================================"
echo " [SELESAI] Inisialisasi Berhasil!"
echo "======================================================"
echo "Langkah selanjutnya:"
echo "1. Edit file .env dan sesuaikan DOMAIN_NAME dan password:"
echo "   nano .env"
echo "2. Jalankan firewall VPS:"
echo "   sudo bash security/ufw-setup.sh"
echo "3. Jalankan semua service:"
echo "   ./manage.sh start all"
echo "======================================================"
