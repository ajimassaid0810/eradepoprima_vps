#!/usr/bin/env bash
# ==============================================================================
# SCRIPT OTOMATISASI BACKUP DATABASE, SSL, & KONFIGURASI VPS
# ==============================================================================
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BASE_DIR}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "======================================================"
echo " [BACKUP] Memulai proses backup sistem: $TIMESTAMP"
echo "======================================================"

# 1. Backup PostgreSQL Database
if docker ps --format '{{.Names}}' | grep -q "postgres_db"; then
    echo "[INFO] Melakukan dump database PostgreSQL..."
    docker exec -t postgres_db pg_dump -U app_dbuser app_production > "${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"
    gzip -f "${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"
    echo "[✓] Database berhasil di-backup: ${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"
fi

# 2. Backup File Konfigurasi Sensitif & Sertifikat SSL Let's Encrypt
echo "[INFO] Mem-backup file .env, Traefik SSL, dan DKIM keys..."
tar -czf "${BACKUP_DIR}/config_backup_${TIMESTAMP}.tar.gz" \
    -C "$BASE_DIR" \
    .env \
    proxy/acme/acme.json \
    mail/config 2>/dev/null || true

echo "[✓] Konfigurasi berhasil di-backup: ${BACKUP_DIR}/config_backup_${TIMESTAMP}.tar.gz"

# 3. Rotasi Backup (Hapus backup yang lebih lama dari 7 hari untuk menghemat ruang disk)
echo "[INFO] Menghapus backup lama (> ${RETENTION_DAYS} hari)..."
find "$BACKUP_DIR" -type f -name "*_backup_*" -mtime +"$RETENTION_DAYS" -exec rm -f {} + 2>/dev/null || true

echo "======================================================"
echo " [SELESAI] Backup selesai! Daftar file backup terkini:"
echo "======================================================"
ls -lh "$BACKUP_DIR"
