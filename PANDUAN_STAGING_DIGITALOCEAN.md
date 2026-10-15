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
2. Cipta **Project** baharu bernama `how-staging`.
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
4. Nama: `how-staging-db`. Pilih projek `how-staging`.
5. Selepas siap (lebih kurang 5 minit), buka tab **Users & Databases**:
   - Cipta database `house_of_wealth`.
   - Cipta database `keycloak`.
6. Buka tab **Overview → Connection Details**. Pilih **Connection string**, kemudian catat:
   - host (contoh `how-staging-db-do-user-43776556-0.i.db.ondigitalocean.com`)
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
7. Hostname: `how-staging`.
8. Catat **alamat IP awam** droplet.

### Firewall
1. **Networking → Firewalls → Create Firewall** bernama `how-staging-fw`.
2. Inbound: benarkan **SSH (22)**, **HTTP (80)** dan **HTTPS (443)** sahaja.
3. Apply to droplet `how-staging`.

### Benarkan droplet sahaja masuk ke database
Dalam database `how-staging-db`: **Settings → Trusted Sources**, tambah droplet `how-staging/wp1-tags`. Selepas ini hanya droplet boleh menyambung ke database.

## Langkah 4: DNS (subdomain)

Di tempat DNS `alhidayahgroup.com.my` diuruskan (Plesk **DNS Settings** atau pendaftar domain), tambah tiga rekod **A** ke IP droplet:

| Nama | Jenis | Nilai |
|---|---|---|
| `how-staging` | A | 152.42.232.149 |
| `how-staging-api` | A | 152.42.232.149|
| `how-staging-auth` | A | 152.42.232.149|

Semak dari komputer anda (mungkin ambil masa sehingga 1 jam):
```
nslookup how-staging-api.alhidayahgroup.com.my
```

## Langkah 5: Sediakan pelayan

Log masuk dari PowerShell:
```
ssh root@IP_DROPLET
ssh root@152.42.232.149
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
KC_DB_PASSWORD=akucuba@123
KC_HOSTNAME=https://how-staging-auth.alhidayahgroup.com.my
KC_ADMIN_USERNAME=admin
KC_ADMIN_PASSWORD=akucuba@123
EOF
chmod 600 .env
docker compose -f docker-compose.staging.yml up -d
docker compose -f docker-compose.staging.yml logs -f keycloak
```

Tunggu sehingga log menunjukkan `Keycloak ... started`, kemudian tekan Ctrl+C. Realm `house-of-wealth` diimport secara automatik daripada `realm-export.json`.

Semak bahawa Keycloak sedia (mesti `200`):
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/realms/house-of-wealth/.well-known/openid-configuration
```

**Kata laluan database:** masukkan kata laluan tanpa memaparkannya, dan ujinya terus dengan database sebelum memulakan Keycloak:
```bash
read -rsp "Kata laluan doadmin: " PW; echo; sed -i "s|^KC_DB_PASSWORD=.*|KC_DB_PASSWORD=${PW}|" .env; unset PW
PGPASSWORD="$(grep '^KC_DB_PASSWORD=' .env | cut -d= -f2-)" psql "host=HOST_DB port=25060 user=doadmin dbname=defaultdb sslmode=require" -c "select 1"
```
Keycloak hanya membaca `.env` semasa container dicipta. Setiap kali kata laluan ditukar, jalankan `docker compose -f docker-compose.staging.yml up -d --force-recreate`; jika tidak, Keycloak terus menggunakan kata laluan lama dan memaparkan ralat 500. Jangan *reset* kata laluan `doadmin` tanpa sebab: ia juga digunakan dalam `DATABASE_URL` backend (langkah 8), jadi kedua-dua fail dan kedua-dua perkhidmatan (`pm2 restart how-api`) perlu dikemas kini.

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
npx vite build --outDir /opt/how-web --emptyOutDir   # bukan build:demo, dan bukan ke /opt/how/dist
```

Fail siap berada dalam `/opt/how-web`. Jangan bina ke `/opt/how/dist`: folder itu dijejak oleh Git untuk demo Plesk, dan mengubahnya akan menyebabkan `git pull` gagal. Folder `/opt/how-web` dicipta oleh root sebelum ini (`mkdir -p /opt/how-web && chown how:how /opt/how-web`).

## Langkah 10: nginx dan HTTPS

Kembali sebagai root (`exit`), kemudian:

```bash
cat > /etc/nginx/sites-available/how-staging <<'EOF'
server {
    listen 80;
    server_name how-staging.alhidayahgroup.com.my;
    root /opt/how-web;
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
chmod -R o+rX /opt/how-web
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
4. **Users:** realm yang diimport tidak mengandungi pengguna. Jika anda nampak pengguna lama `demo-admin`, **padamkannya** (kata laluannya pernah tertulis dalam repo).
5. **Users → Add user** untuk diri anda: Username dan Email ialah e-mel anda sendiri, **Email verified** ON. Di tab **Credentials**, tetapkan password dan matikan `Temporary`. Di tab **Details**, tambah **Required user actions → Configure OTP**, kemudian salin **ID** pengguna.
6. **Penanda OTP dalam token (wajib, Keycloak 26):** **Authentication → browser**. Pada baris **OTP Form**, klik ⚙️ dan isi Alias `otp-amr`, **Authenticator Reference** `otp`. Pada **Username Password Form**, Alias `pwd-amr`, Authenticator Reference `pwd`. Tanpa ini, token tidak mencatat OTP dan backend menolak Super Admin dengan `MFA is required for this role`, walaupun OTP sudah dimasukkan. Jika ikon ⚙️ tiada, **Action → Duplicate** aliran itu, tetapkan pada salinan, kemudian **Action → Bind flow → Browser flow**.
7. Padankan pengguna Keycloak dengan pengguna dalam database. Di droplet (kata laluan diambil dari fail Keycloak, jadi tidak perlu ditaip):
   ```bash
   cd /opt/how/server
   PGPASSWORD="$(grep '^KC_DB_PASSWORD=' keycloak/.env | cut -d= -f2-)" psql "host=HOST_DB port=25060 user=doadmin dbname=house_of_wealth sslmode=require" -c "UPDATE \"User\" SET \"idpProvider\"='keycloak', \"idpSubjectId\"='KEYCLOAK_USER_ID', \"isActive\"=true WHERE id='USR-mock-user';"
   ```
   Mesti keluar `UPDATE 1`. `USR-mock-user` ialah Super Admin (`ORG-PUBLIC`, `CN-MYS`) daripada data seed; organisasi itu sama dengan nilai lalai backend, jadi pengguna Keycloak tidak memerlukan atribut tambahan.
8. Tukar ID ahli `USR-mock-user` kepada ID sebenar, supaya profil tidak memaparkan "mock". Langkah ini dibuat sekali sahaja:
   ```bash
   cd /opt/how/server
   npx tsx scripts/rename-user-id.ts USR-mock-user USR-SYS-002
   ```
   Skrip ini mengemas kini semua jadual yang merujuk ID itu dalam satu transaksi. Jejak audit dan lejar tidak diubah, kerana kedua-duanya dilindungi rantaian hash dan merekodkan siapa yang bertindak pada masa itu. Selepas itu, log keluar dan log masuk semula.
Buka https://how-staging.alhidayahgroup.com.my dan log masuk.

Log masuk dalam tetingkap **Incognito** baharu, supaya sesi lama Keycloak tidak digunakan semula. Jika log masuk ditolak, halaman utama kini memaparkan sebabnya (contohnya `MFA is required for this role`).

Untuk pengguna lain (Investor, Project Sponsor, Shariah Reviewer dan lain-lain), ulang langkah 5 dan 7 dengan ID pengguna seed yang berkenaan. Kebanyakan persona berada dalam organisasi lain (contohnya Siti Aminah dalam `ORG-INV-MYS-01`), jadi pada pengguna Keycloak itu tambah juga **Attributes**: `organisation_id` dan `country_node_id` (contohnya `ORG-INV-MYS-01` dan `CN-MYS`). Pengguna juga boleh mendaftar sendiri melalui Keycloak; mereka akan bermula sebagai peranan asas.

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
npm ci && npx vite build --outDir /opt/how-web --emptyOutDir
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
| `User is not provisioned or is inactive` | Pengguna Keycloak belum dipadankan dengan database | Langkah 11, perkara 7 |
| `User has no active role in this organisation and country` | Atribut `organisation_id` pengguna Keycloak tidak sepadan | Tambah atribut (langkah 11) |
| `MFA is required for this role` (selepas OTP dimasukkan) | Token tidak mencatat OTP | Langkah 11, perkara 6 (Authenticator Reference) |
| Keycloak: *We are sorry… An internal server error* | Kata laluan database lama masih digunakan | `up -d --force-recreate` (langkah 7) |
| Keycloak: `Invalid parameter: redirect_uri` | Redirect URI staging belum ditambah, atau ditambah dalam realm master | Langkah 11, perkara 3 |
| Build frontend terhenti (`Killed`) | Kehabisan memori | Pastikan swap aktif (`swapon --show`) |

## Keselamatan staging

- Staging boleh diakses umum. Jangan guna data sebenar pelabur atau dokumen KYC sebenar. Guna data seed dan dokumen ujian sahaja.
- Rahsia (`.env`, password database, password admin Keycloak) tidak boleh masuk ke Git. Kedua-dua fail `.env` sudah diabaikan oleh `.gitignore`.
- Untuk menghadkan akses kepada pasukan sahaja, tambah `auth_basic` nginx pada blok `how-staging`, atau hadkan IP dalam firewall.
