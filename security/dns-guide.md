# Panduan DNS & Keamanan Email: PT Era Depo Prima (`eradepoprima.com`)

Gunakan panduan ini untuk memasang seluruh DNS Record di panel domain **`eradepoprima.com`** (Cloudflare / Namecheap / Niagahoster / IDCloudHost / dll.).

---

## 1. Tabel DNS Record Lengkap untuk `eradepoprima.com`

> *Catatan: Ganti `IP_VPS_ANDA` dengan IP Publik VPS Anda (misal `203.0.113.10`).*

| Type | Name / Host | Value / Target | Proxy Status | Keterangan & Fungsi |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `IP_VPS_ANDA` | DNS Only / Proxied | Website Company Profile (`eradepoprima.com`) |
| **A** | `www` | `IP_VPS_ANDA` | DNS Only / Proxied | Subdomain WWW (`www.eradepoprima.com`) |
| **A** | `api` | `IP_VPS_ANDA` | DNS Only / Proxied | Subdomain API (`api.eradepoprima.com`) |
| **A** | `webmail` | `IP_VPS_ANDA` | DNS Only / Proxied | Webmail Inbox Browser (`webmail.eradepoprima.com`) |
| **A** | `mail` | `IP_VPS_ANDA` | **DNS Only (Grey Cloud)** | Hostname Mail Server (`mail.eradepoprima.com`) |
| **MX** | `@` | `mail.eradepoprima.com` *(Priority: 10)* | - | Mengarahkan email masuk `@eradepoprima.com` ke VPS |
| **TXT** | `@` | `v=spf1 mx a:mail.eradepoprima.com ~all` | - | **SPF Record**: Otorisasi server pengirim email |
| **TXT** | `_dmarc` | `v=DMARC1; p=quarantine; pct=100; rua=mailto:admin@eradepoprima.com` | - | **DMARC Record**: Proteksi anti-spoofing / phishing |
| **TXT** | `mail._domainkey` | `(Salin output ./manage.sh email dkim)` | - | **DKIM Record**: Tanda tangan kriptografis 2048-bit |

---

## 2. Langkah Demi Langkah Setup Email `eradepoprima.com`

### Langkah 1: Pasang PTR Record (Reverse DNS) di VPS Provider
1. Masuk ke dashboard penyedia VPS Anda (Hetzner / Contabo / DigitalOcean / Linode / Niagahoster).
2. Buka menu **Networking** -> **Reverse DNS** / **PTR Record**.
3. Set IP VPS Anda mengarah ke: `mail.eradepoprima.com`.

### Langkah 2: Buat Akun Email Perusahaan
Jalankan perintah ini di VPS:
```bash
./manage.sh email add info@eradepoprima.com PasswordKuat123
./manage.sh email add admin@eradepoprima.com PasswordKuat456
./manage.sh email add inquiry@eradepoprima.com PasswordKuat789
```

### Langkah 3: Generate DKIM Key untuk DNS
Jalankan perintah:
```bash
./manage.sh email dkim
```
Salin teks kunci publik DKIM yang muncul, lalu masukkan ke DNS Record berjenis **TXT** dengan nama **`mail._domainkey`**.

---

## 3. Konfigurasi Client Email (Thunderbird / Outlook / Android / iPhone)

Gunakan parameter berikut saat menghubungkan akun email ke aplikasi mail client:

| Pengaturan | Nilai Konfigurasi |
| :--- | :--- |
| **Alamat Email** | `info@eradepoprima.com` *(atau akun Anda)* |
| **Username** | `info@eradepoprima.com` |
| **Password** | Password yang Anda buat saat `./manage.sh email add` |
| **Incoming Server (IMAP)** | `mail.eradepoprima.com` \| **Port 993** \| SSL/TLS |
| **Outgoing Server (SMTP)** | `mail.eradepoprima.com` \| **Port 465** (SSL/TLS) atau **587** (STARTTLS) |

---

## 4. Pengujian Deliverability (Skor Anti-Spam)
1. Buka [https://www.mail-tester.com/](https://www.mail-tester.com/)
2. Kirim 1 email percobaan dari `info@eradepoprima.com` ke alamat email uji coba di situs tersebut.
3. Klik tombol periksa skor (Target: **10/10 Perfect Score**).
