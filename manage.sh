#!/usr/bin/env bash
# ==============================================================================
# VPS DOCKER STACK MANAGEMENT CLI
# ==============================================================================
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASE_DIR"

if [ ! -f .env ]; then
    echo "[ERROR] File .env tidak ditemukan! Jalankan './setup.sh' terlebih dahulu."
    exit 1
fi

export $(grep -v '^#' .env | xargs -d '\n' 2>/dev/null || true)

usage() {
    echo "======================================================================"
    echo " VPS Docker Stack CLI Helper"
    echo "======================================================================"
    echo "Penggunaan: ./manage.sh [command] [options]"
    echo ""
    echo "Commands Operasional & Keamanan:"
    echo "  backup                           Membuat cadangan database & config (Gzip)"
    echo "  start   [all|proxy|apps|mail]    Menjalankan service"
    echo "  stop    [all|proxy|apps|mail]    Menghentikan service"
    echo "  restart [all|proxy|apps|mail]    Merestart service"
    echo "  status                           Melihat status semua container"
    echo "  logs    [proxy|apps|mail]        Melihat log live dari container"
    echo ""
    echo "Commands Manajemen Email:"
    echo "  email add <alamat> <password>    Menambahkan akun email baru"
    echo "  email list                       Melihat daftar akun email terdaftar"
    echo "  email del <alamat>               Menghapus akun email"
    echo "  email dkim                       Generate & tampilkan DKIM DNS Record"
    echo ""
    echo "Contoh:"
    echo "  ./manage.sh start all"
    echo "  ./manage.sh email add info@domain.com PasswordKuat123"
    echo "  ./manage.sh email dkim"
    echo "======================================================================"
}

cmd_start() {
    local target="${1:-all}"
    case "$target" in
        proxy)
            echo "[INFO] Menjalankan Reverse Proxy (Traefik + Socket Proxy)..."
            docker compose -f proxy/docker-compose.yml up -d
            ;;
        apps)
            echo "[INFO] Menjalankan Apps (Company Profile + API + Postgres + Redis)..."
            docker compose -f apps/docker-compose.yml --env-file .env up -d --build
            ;;
        mail)
            echo "[INFO] Menjalankan Mail Server (docker-mailserver)..."
            docker compose -f mail/docker-compose.yml --env-file .env up -d
            ;;
        all)
            cmd_start proxy
            cmd_start apps
            cmd_start mail
            ;;
        *)
            echo "[ERROR] Target tidak valid. Pilihan: all, proxy, apps, mail"
            exit 1
            ;;
    esac
}

cmd_stop() {
    local target="${1:-all}"
    case "$target" in
        proxy)
            docker compose -f proxy/docker-compose.yml down
            ;;
        apps)
            docker compose -f apps/docker-compose.yml down
            ;;
        mail)
            docker compose -f mail/docker-compose.yml down
            ;;
        all)
            docker compose -f apps/docker-compose.yml down || true
            docker compose -f mail/docker-compose.yml down || true
            docker compose -f proxy/docker-compose.yml down || true
            ;;
        *)
            echo "[ERROR] Target tidak valid. Pilihan: all, proxy, apps, mail"
            exit 1
            ;;
    esac
}

cmd_restart() {
    local target="${1:-all}"
    cmd_stop "$target"
    cmd_start "$target"
}

cmd_status() {
    echo "=== STATUS CONTAINER DOCKER ==="
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Networks}}"
}

cmd_logs() {
    local target="${1:-apps}"
    case "$target" in
        proxy) docker compose -f proxy/docker-compose.yml logs -f --tail=100 ;;
        apps) docker compose -f apps/docker-compose.yml logs -f --tail=100 ;;
        mail) docker compose -f mail/docker-compose.yml logs -f --tail=100 ;;
        *) echo "[ERROR] Pilihan logs: proxy, apps, mail"; exit 1 ;;
    esac
}

cmd_email() {
    local subcmd="${1:-}"
    shift || true
    case "$subcmd" in
        add)
            if [ "$#" -ne 2 ]; then
                echo "[ERROR] Penggunaan: ./manage.sh email add <email@domain.com> <password>"
                exit 1
            fi
            docker exec -ti mailserver setup email add "$1" "$2"
            echo "[✓] Akun email $1 berhasil dibuat!"
            ;;
        list)
            docker exec -ti mailserver setup email list
            ;;
        del)
            if [ "$#" -ne 1 ]; then
                echo "[ERROR] Penggunaan: ./manage.sh email del <email@domain.com>"
                exit 1
            fi
            docker exec -ti mailserver setup email del "$1"
            echo "[✓] Akun email $1 berhasil dihapus."
            ;;
        dkim)
            echo "[INFO] Melakukan generate/cek DKIM key..."
            docker exec -ti mailserver setup config dkim
            echo ""
            echo "======================================================================"
            echo " [DKIM RECORD] Salin teks di bawah ini ke DNS TXT Record Anda:"
            echo "======================================================================"
            find mail/config/opendkim/keys/ -name "mail.txt" -exec cat {} + 2>/dev/null || echo "DKIM generated. Cek folder mail/config/opendkim/keys/"
            echo "======================================================================"
            ;;
        *)
            echo "[ERROR] Sub-command email tidak valid. Pilihan: add, list, del, dkim"
            exit 1
            ;;
    esac
}

# Router
ACTION="${1:-}"
case "$ACTION" in
    backup)
        bash security/backup.sh
        ;;
    start)
        cmd_start "${2:-all}"
        ;;
    stop)
        cmd_stop "${2:-all}"
        ;;
    restart)
        cmd_restart "${2:-all}"
        ;;
    status)
        cmd_status
        ;;
    logs)
        cmd_logs "${2:-apps}"
        ;;
    email)
        shift
        cmd_email "$@"
        ;;
    *)
        usage
        exit 1
        ;;
esac
