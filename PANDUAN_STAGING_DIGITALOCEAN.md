# Panduan Staging DigitalOcean (Senario A)

Panduan ini menyediakan **staging dengan backend sebenar** di DigitalOcean. Laman awam https://how.alhidayahgroup.com.my di Plesk kekal sebagai demo statik dan tidak diubah.

Rujukan: item 16 dalam [PENDING_ACTIVITIES.md](PENDING_ACTIVITIES.md). Panduan Keycloak yang lebih terperinci ada dalam [PANDUAN_LENGKAP_VPS.md](PANDUAN_LENGKAP_VPS.md).

## Gambaran keseluruhan

```
Pelayar
  ├── https://how-staging.alhidayahgroup.com.my       → nginx → frontend (fail statik dist/)
  ├── https://how-staging-api.alhidayahgroup.com.my   → nginx → backend NestJS (PM2, port 3001)
  └── https://how-staging-auth.alhidayahgroup.com.my  → nginx → Keycloak (Docker, port 8080)

Droplet (Ubuntu 24.04, 4 GB)  ──SSL──►  Managed PostgreSQL 16 (pangkalan data: house_of_wealth + keycloak)
```

| Perkhidmatan | Saiz | Anggaran sebulan |
|---|---|---|
| Droplet Basic | 2 vCPU, 4 GB RAM, 80 GB SSD | $24 |
| Managed PostgreSQL | 1 GB RAM, 10 GB, satu nod | $15 |
| Sandaran droplet mingguan (pilihan) | | lebih kurang $5 |
| AI (pilihan, langkah 11) | Serverless inference, bayar ikut token | $0–20 |
| **Jumlah** | | **lebih kurang $40–65** |

Harga ialah anggaran. Sahkan di halaman harga DigitalOcean. Spaces belum diperlukan pada peringkat ini kerana fail masih disimpan dalam database (item 16, langkah 1).

**Nama subdomain di atas hanya cadangan.** Jika anda guna nama lain, gantikan di semua tempat dalam panduan ini.

**Tiada Redis dan tiada worker** dalam staging (`WORKER_ENABLED=false`). Notifikasi push, emel dan SMS tidak dihantar.

---

## Langkah 1: Akaun dan projek DigitalOcean

1. Daftar di https://cloud.digitalocean.com dan masukkan kad pembayaran.
2. Cipta **Project** baharu bernama `wealth-pooling-staging`.
3. Tambah kunci SSH anda di **Settings → Security → SSH Keys**. Jika belum ada kunci, jana di Windows (PowerShell):
   ```
   ssh-keygen -t ed25519 -C "how-staging"
   type $env:USERPROFILE\.ssh\id_ed25519.pub
   ```
   Salin output dan tampal ke DigitalOcean.

## Langkah 2: Managed PostgreSQL

1. **Create → Databases → PostgreSQL 16**.
2. Region: **Singapore (SGP1)**.
3. Plan: **Basic, 1 GB RAM / 1 vCPU / 10 GB**, satu nod (tanpa standby).
4. Nama: `how-staging-db`. Pilih projek `house-of-wealth-staging`.
5. Selepas siap (lebih kurang 5 minit), buka tab **Users & Databases**:
   - Cipta database `house_of_wealth`.
   - Cipta database `keycloak`.
6. Buka tab **Overview → Connection Details**. Pilih **Connection string**, kemudian catat:
   - host (contoh `how-staging-db-do-user-xxxx.k.db.ondigitalocean.com`)
   - port (biasanya `25060`)
   - user `doadmin` dan password

   Sambungan mesti guna SSL (`sslmode=require`).

pgvector disokong oleh Managed PostgreSQL DigitalOcean. Migrasi Prisma akan menjalankan `CREATE EXTENSION vector` sendiri.

## Langkah 3: Droplet

1. **Create → Droplets**.
2. Region: **Singapore (SGP1)**, sama dengan database.
3. Image: **Ubuntu 24.04 LTS**.
4. Size: **Basic → Regular → 4 GB / 2 vCPU / 80 GB** ($24).
5. Authentication: **SSH Key** (pilih kunci dari langkah 1).
6. Tandakan **Monitoring**. Sandaran (Backups) pilihan.
7. Hostname: `wealth-pooling-staging`.
8. Catat **alamat IP awam** droplet.

### Firewall
1. **Networking → Firewalls → Create Firewall** bernama `how-staging-fw`.
2. Inbound: benarkan **SSH (22)**, **HTTP (80)** dan **HTTPS (443)** sahaja.
3. Apply to droplet `wealth-pooling-staging`.

### Benarkan droplet sahaja masuk ke database
Dalam database `how-staging-db`: **Settings → Trusted Sources**, tambah droplet `wealth-pooling-staging`. Selepas ini hanya droplet boleh menyambung ke database.

## Langkah 4: DNS (subdomain)

Di tempat DNS `alhidayahgroup.com.my` diuruskan (Plesk **DNS Settings** atau pendaftar domain), tambah tiga rekod **A** ke IP droplet:

| Nama | Jenis | Nilai |
|---|---|---|
| `how-staging` | A | IP droplet |
| `how-staging-api` | A | IP droplet |
| `how-staging-auth` | A | IP droplet |

Semak dari komputer anda (mungkin ambil masa sehingga 1 jam):
```
nslookup how-staging-api.alhidayahgroup.com.my
```

## Langkah 5: Sediakan pelayan

Log masuk dari PowerShell:
```
ssh root@IP_DROPLET
```

Jalankan arahan berikut di droplet:

```bash
# Kemas kini sistem dan pasang alat asas
apt update && apt -y upgrade
apt -y install git nginx certbot python3-certbot-nginx postgresql-client

# Swap 2 GB supaya build frontend tidak kehabisan memori
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Node.js 22 dan PM2
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt -y install nodejs
npm install -g pm2

# Docker (untuk Keycloak)
curl -fsSL https://get.docker.com | sh

# Pengguna biasa untuk menjalankan aplikasi (bukan root)
adduser --disabled-password --gecos "" how
usermod -aG docker how
mkdir -p /opt/how && chown how:how /opt/how
```

## Langkah 6: Ambil kod dari GitHub

Repo `D8-Alliance/mockup-house-of-wealth` adalah peribadi, jadi droplet perlukan **deploy key** (baca sahaja):

```bash
su - how
ssh-keygen -t ed25519 -C "how-staging-deploy" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Di GitHub: **repo → Settings → Deploy keys → Add deploy key**. Tampal kunci, dan **jangan** tandakan "Allow write access".

```bash
git clone -b feat/keycloak-oidc-auth git@github.com:D8-Alliance/mockup-house-of-wealth.git /opt/how
```

## Langkah 7: Keycloak

Masih sebagai pengguna `how`:

```bash
cd /opt/how/server/keycloak
cat > .env <<'EOF'
KC_DB_URL=jdbc:postgresql://HOST_DB:25060/keycloak?sslmode=require
KC_DB_USERNAME=doadmin
KC_DB_PASSWORD=PASSWORD_DB
KC_HOSTNAME=https://how-staging-auth.alhidayahgroup.com.my
KC_ADMIN_USERNAME=admin
KC_ADMIN_PASSWORD=GANTI_DENGAN_PASSWORD_KUAT
EOF
chmod 600 .env
docker compose -f docker-compose.staging.yml up -d
docker compose -f docker-compose.staging.yml logs -f keycloak
```

Tunggu sehingga log menunjukkan `Keycloak ... started`, kemudian tekan Ctrl+C. Realm `house-of-wealth` diimport secara automatik daripada `realm-export.json`.

## Langkah 8: Backend

### 8.1 Fail `server/.env`

Jana dua rahsia rawak:
```bash
openssl rand -base64 32   # untuk PAYOUT_DESTINATION_ENCRYPTION_KEY
```

Cipta fail tersebut:
```bash
cd /opt/how/server
cat > .env <<'EOF'
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://doadmin:PASSWORD_DB@HOST_DB:25060/house_of_wealth?sslmode=require

# Sign-in: production hanya menerima oidc dan token RS256
AUTH_MODE=oidc
OIDC_ISSUER=https://how-staging-auth.alhidayahgroup.com.my/realms/house-of-wealth
OIDC_AUDIENCE=house-of-wealth-api
OIDC_JWKS_URI=https://how-staging-auth.alhidayahgroup.com.my/realms/house-of-wealth/protocol/openid-connect/certs

# Keselamatan
CORS_ORIGINS=https://how-staging.alhidayahgroup.com.my
TRUST_PROXY=loopback
RATE_LIMIT_PER_MINUTE=120
PAYOUT_DESTINATION_ENCRYPTION_KEY=RAHSIA_DARI_OPENSSL

DEFAULT_COUNTRY_NODE=CN-MYS
DEFAULT_ORGANISATION=ORG-PUBLIC

# Tiada Redis dan worker dalam staging
WORKER_ENABLED=false

# AI: kosong = mod sandbox (jawapan contoh). Lihat langkah 11.
OPENAI_API_KEY=
EOF
chmod 600 .env
```

Rujuk [server/.env.production.example](server/.env.production.example) untuk tetapan pilihan lain (ToyyibPay sandbox, FCM, Twilio).

### 8.2 Pasang, bina dan migrasi

```bash
cd /opt/how/server
npm ci
npm run prisma:generate
npm run build
npm run models:download          # model wajah untuk semakan liveness KYC
npm run prisma:migrate:deploy    # cipta semua jadual (56 migrasi)
npm run db:seed                  # data contoh: pengguna demo, projek, pool
```

### 8.3 Jalankan dengan PM2

```bash
pm2 start dist/main.js --name how-api --cwd /opt/how/server
pm2 save
curl http://localhost:3001/health
```

Hasil yang dijangka: `{"status":"ok",...}`.

Supaya PM2 hidup semula selepas droplet reboot, jalankan `pm2 startup` dan ikut arahan yang dipaparkan. Arahan itu perlu dijalankan sebagai root.

Jika backend gagal start, semak log dengan `pm2 logs how-api`. Mesej `AUTH_MODE must be "oidc"` atau `CORS_ORIGINS must list` bermakna `.env` belum lengkap.

## Langkah 9: Frontend staging

```bash
cd /opt/how
cat > .env.production.local <<'EOF'
VITE_API_BASE_URL=https://how-staging-api.alhidayahgroup.com.my
VITE_OIDC_ISSUER=https://how-staging-auth.alhidayahgroup.com.my/realms/house-of-wealth
VITE_OIDC_CLIENT_ID=house-of-wealth-web
VITE_OIDC_REDIRECT_URI=https://how-staging.alhidayahgroup.com.my/
VITE_AUTH_MODE=PRODUCTION
VITE_SINGLE_ROLE_MODE=false
EOF
npm ci
npm run build        # bukan build:demo
```

Fail siap berada dalam `/opt/how/dist`.

## Langkah 10: nginx dan HTTPS

Kembali sebagai root (`exit`), kemudian:

```bash
cat > /etc/nginx/sites-available/how-staging <<'EOF'
server {
    listen 80;
    server_name how-staging.alhidayahgroup.com.my;
    root /opt/how/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}

server {
    listen 80;
    server_name how-staging-api.alhidayahgroup.com.my;
    client_max_body_size 25m;   # muat naik dokumen KYC dan bukti projek
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;  # analisis AI boleh mengambil masa
    }
}

server {
    listen 80;
    server_name how-staging-auth.alhidayahgroup.com.my;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
    }
}
EOF
ln -s /etc/nginx/sites-available/how-staging /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
chmod o+x /opt/how && chmod -R o+rX /opt/how/dist
nginx -t && systemctl reload nginx

# Sijil SSL percuma (Let's Encrypt), diperbaharui automatik
certbot --nginx -d how-staging.alhidayahgroup.com.my -d how-staging-api.alhidayahgroup.com.my -d how-staging-auth.alhidayahgroup.com.my
```

Semak dari komputer anda: https://how-staging-api.alhidayahgroup.com.my/health

## Langkah 11: Tetapan Keycloak dan pengguna pertama

Buka https://how-staging-auth.alhidayahgroup.com.my/admin dan log masuk dengan `KC_ADMIN_USERNAME` dan `KC_ADMIN_PASSWORD`.

1. Tukar realm ke **house-of-wealth**.
2. **Realm settings → General → Require SSL:** `External requests`.
3. **Clients → house-of-wealth-web**:
   - Valid redirect URIs: tambah `https://how-staging.alhidayahgroup.com.my/*`
   - Web origins: tambah `https://how-staging.alhidayahgroup.com.my`
   - Valid post logout redirect URIs: `https://how-staging.alhidayahgroup.com.my/*`
4. **Users → Create user** untuk diri anda. Tetapkan password dan matikan `Temporary`. Catat **User ID**.
5. Padankan pengguna Keycloak itu dengan pengguna dalam database. Di droplet:
   ```bash
   psql "postgresql://doadmin:PASSWORD_DB@HOST_DB:25060/house_of_wealth?sslmode=require"
   ```
   ```sql
   UPDATE "User"
   SET "idpProvider" = 'keycloak', "idpSubjectId" = 'KEYCLOAK_USER_ID', "isActive" = true
   WHERE "id" = 'USR-mock-user';
   ```
   `USR-mock-user` ialah Super Admin (`ORG-PUBLIC`, `CN-MYS`) daripada data seed.
6. **MFA:** peranan admin, kewangan, compliance dan Shariah **wajib** OTP. Tanpa OTP, backend menolak dengan mesej `MFA is required for this role`. Dalam **Users → (pengguna) → Required user actions**, pilih `Configure OTP`. Imbas kod QR dengan Google Authenticator semasa log masuk pertama. Butiran ada dalam [PANDUAN_LENGKAP_VPS.md](PANDUAN_LENGKAP_VPS.md) bahagian 7.

Buka https://how-staging.alhidayahgroup.com.my dan log masuk.

Untuk pengguna lain (Investor, Project Sponsor, Shariah Reviewer dan lain-lain), ulang langkah 4 dan 5 dengan ID pengguna seed yang berkenaan. Pengguna juga boleh mendaftar sendiri melalui Keycloak; mereka akan bermula sebagai peranan asas.

## Langkah 12 (pilihan): AI sebenar

Tanpa `OPENAI_API_KEY`, AI berjalan dalam **mod sandbox** (jawapan contoh). Droplet 4 GB tidak cukup untuk Ollama, jadi gunakan **Serverless Inference DigitalOcean** (bayar ikut token):

1. Di DigitalOcean: **Agent Platform / Serverless Inference → Model Access Keys → Create**.
2. Pilih model daripada senarai dalam console (contoh `llama3.3-70b-instruct`).
3. Tambah dalam `server/.env`:
   ```
   OPENAI_API_URL=https://inference.do-ai.run/v1/chat/completions
   OPENAI_API_KEY=KUNCI_DARI_DIGITALOCEAN
   OPENAI_MODEL=llama3.3-70b-instruct
   ```
4. `pm2 restart how-api`.

Nama model dan URL mungkin berubah. Sahkan dalam dokumentasi DigitalOcean. Imej IC dan passport tidak dihantar ke model ini: OCR KYC berjalan dalam pelayan sendiri (tesseract).

## Kemas kini selepas setiap push ke GitHub

Sebagai pengguna `how` di droplet:

```bash
cd /opt/how
git pull
# Backend
cd server && npm ci && npm run prisma:generate && npm run build && npm run prisma:migrate:deploy && pm2 restart how-api && cd ..
# Frontend
npm ci && npm run build
```

Plesk (demo statik awam) dikemas kini seperti biasa: **Pull Updates**, kemudian `run build:demo`.

## Penyelesaian masalah

| Gejala | Punca biasa | Tindakan |
|---|---|---|
| `pm2 logs` menunjukkan `AUTH_MODE must be "oidc"` | `.env` tiada atau `AUTH_MODE` salah | Semak `/opt/how/server/.env` |
| `CORS_ORIGINS must list` | `CORS_ORIGINS` kosong | Tetapkan ke URL frontend staging |
| Frontend: ralat CORS dalam console pelayar | `CORS_ORIGINS` tidak sama dengan URL frontend (http/https, garis miring) | Samakan dengan tepat, kemudian `pm2 restart how-api` |
| `Can't reach database server` | Droplet belum dalam Trusted Sources, atau tiada `sslmode=require` | Langkah 3 dan 8.1 |
| `Token issuer mismatch` | `OIDC_ISSUER` tidak sama dengan `KC_HOSTNAME` + `/realms/house-of-wealth` | Samakan dengan tepat |
| `User is not provisioned or is inactive` | Pengguna Keycloak belum dipadankan dengan database | Langkah 11.5 |
| `MFA is required for this role` | OTP belum disediakan | Langkah 11.6 |
| Keycloak: `Invalid redirect uri` | Redirect URI staging belum ditambah | Langkah 11.3 |
| Build frontend terhenti (`Killed`) | Kehabisan memori | Pastikan swap aktif (`swapon --show`) |

## Keselamatan staging

- Staging boleh diakses umum. Jangan guna data sebenar pelabur atau dokumen KYC sebenar. Guna data seed dan dokumen ujian sahaja.
- Rahsia (`.env`, password database, password admin Keycloak) tidak boleh masuk ke Git. Kedua-dua fail `.env` sudah diabaikan oleh `.gitignore`.
- Untuk menghadkan akses kepada pasukan sahaja, tambah `auth_basic` nginx pada blok `how-staging`, atau hadkan IP dalam firewall.
