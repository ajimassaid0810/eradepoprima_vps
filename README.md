# 🛡️ Secure VPS Docker Stack

Infrastruktur berbasis **Docker Compose** dengan standar keamanan tinggi (Zero-Trust Network Isolation, Hardened Reverse Proxy, Automated SSL/TLS Let's Encrypt) yang mencakup:
1. **Company Profile**: Web Landing Page Modern (Nginx Alpine Non-Root, Hardened & Fast).
2. **API Service**: Microservice REST API (Node.js Non-Root) + PostgreSQL 16 + Redis 7 terisolasi secara internal.
3. **Mail Server**: Full-featured Mail Suite (`docker-mailserver` dengan Postfix, Dovecot, Rspamd, ClamAV, OpenDKIM, dan Fail2ban).
4. **Ingress & Security Proxy**: **Traefik v3** yang dipasangkan dengan **Docker Socket Proxy (Read-Only)** untuk mencegah privilege escalation / container breakout.

---

## 📁 Struktur Direktori

```
vps/
├── .env.example                     # Template variabel environment
├── setup.sh                         # Inisialisasi folder, permission, dan network
├── manage.sh                        # CLI controller untuk start/stop, log, & manajemen email
│
├── proxy/
│   ├── docker-compose.yml           # Traefik v3 + Docker Socket Proxy (Read-Only)
│   └── dynamic/
│       └── security-headers.yml     # Middleware HSTS, CSP, Rate Limiting, Compression
│
├── apps/
│   ├── docker-compose.yml           # Company Profile + API Service + PostgreSQL + Redis
│   ├── company-profile/             # Frontend static landing page (Nginx non-root)
│   └── api-service/                 # REST API template (Node.js non-root)
│
├── mail/
│   └── docker-compose.yml           # docker-mailserver suite
│
└── security/
    ├── ufw-setup.sh                 # Script konfigurasi firewall host (UFW)
    └── dns-guide.md                 # Panduan konfigurasi DNS (A, MX, SPF, DKIM, DMARC, PTR)
```

---

## 🚀 Panduan Setup Cepat (Langkah demi Langkah di VPS)

### 1. Salin Proyek ke VPS
Anda dapat meng-clone atau meng-upload folder `vps` ini ke direktori VPS Anda (misal: `/opt/vps` atau `/root/vps`).

### 2. Jalankan Inisialisasi
Jalankan script setup untuk membuat permission yang aman dan membuat docker network `proxy_net`:
```bash
chmod +x setup.sh manage.sh security/ufw-setup.sh
./setup.sh
```

### 3. Konfigurasi File `.env`
Buka dan sesuaikan file `.env`:
```bash
nano .env
```
Ubah bagian:
- `DOMAIN_NAME`: Domain utama Anda (misal `perusahaananda.com`).
- `ACME_EMAIL`: Email untuk notifikasi SSL Let's Encrypt.
- `DB_PASSWORD` & `REDIS_PASSWORD`: Ganti dengan password yang kuat.

### 4. Aktifkan Firewall UFW
Jalankan script firewall untuk mengamankan port VPS:
```bash
sudo bash security/ufw-setup.sh
```

### 5. Jalankan Seluruh Layanan
Cukup gunakan satu perintah helper:
```bash
./manage.sh start all
```

---

## 📧 Manajemen Akun Email & DKIM

### Menambah Akun Email Baru
```bash
./manage.sh email add info@perusahaananda.com PasswordKuat123
./manage.sh email add kontak@perusahaananda.com PasswordLain456
```

### Melihat Daftar Akun Email
```bash
./manage.sh email list
```

### Meng-generate & Melihat DKIM Key untuk DNS
```bash
./manage.sh email dkim
```
*Ikuti panduan lengkap pengaturan DNS di [security/dns-guide.md](security/dns-guide.md) agar email Anda memiliki skor 10/10 dan tidak masuk spam.*

---

## 🛠️ Perintah Operasional Sehari-hari

| Perintah | Fungsi |
| :--- | :--- |
| `./manage.sh status` | Melihat status kesehatan seluruh container |
| `./manage.sh logs apps` | Memantau log Company Profile, API, dan Database |
| `./manage.sh logs proxy` | Memantau log akses & perpanjangan SSL Traefik |
| `./manage.sh logs mail` | Memantau lalu lintas pengiriman & penerimaan email |
| `./manage.sh restart apps` | Merestart service web & API |
| `./manage.sh stop all` | Menghentikan seluruh service secara aman |

---

## 🔒 Fitur Keamanan yang Diterapkan

1. **Docker Socket Proxy (Read-Only)**: Traefik tidak mengakses `/var/run/docker.sock` sebagai root. Hanya request read-only yang diizinkan; operasi perusak (POST/DELETE/EXEC) diblokir.
2. **Database Isolation**: PostgreSQL dan Redis tidak membuka port ke internet (`0.0.0.0`), hanya dapat diakses melalui Docker internal network oleh container API.
3. **Non-Root Containers**: Nginx dan Node.js berjalan di bawah UID unprivileged (`nginx` dan `node`).
4. **Security Headers & Rate Limiting**: Header HSTS preloaded, CSP, X-Frame-Options DENY, serta proteksi rate-limit otomatis aktif di level Traefik Ingress.
5. **Anti-Spam & Antivirus**: Mailserver dilengkapi Rspamd Greylisting, Fail2ban internal, dan DKIM 2048-bit signing.
