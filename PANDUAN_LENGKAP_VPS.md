# Panduan Lengkap VPS

Manual ini digunakan untuk development dan UAT menggunakan user ujian. Jangan
gunakan password sebenar dalam dokumen atau chat.

## 1. Semak Backend API

Buka PowerShell di root project:

```powershell
cd C:\clone_how\mockup-house-of-wealth
npm --prefix server run start:dev
```

Biarkan terminal ini terbuka. Backend mesti memaparkan:

```text
Wealth Pooling API listening on http://localhost:3001
```

Buka browser:

```text
http://localhost:3001/health
```

Response yang betul:

```json
{
  "status": "ok",
  "service": "house-of-wealth-api"
}
```

Jika browser menunjukkan `ERR_CONNECTION_REFUSED`, backend belum berjalan.
Jika backend gagal start kerana database, selesaikan `DATABASE_URL` dahulu.

## 2. Semak Database

Pastikan `server/.env` mempunyai `DATABASE_URL` yang betul. Jalankan migration:

```powershell
cd C:\clone_how\mockup-house-of-wealth
npm --prefix server exec prisma migrate deploy
npm --prefix server exec prisma generate
```

Jika `prisma generate` memberi error `EPERM`, hentikan proses backend dahulu,
kemudian jalankan semula command tersebut.

## 3. Semak Keycloak Docker

Di VPS:

```bash
cd /root/keycloak
docker compose ps
```

Status container mesti `Up` dan port mesti menunjukkan:

```text
0.0.0.0:8080->8080/tcp
```

Semak issuer:

```bash
curl -s http://127.0.0.1:8080/realms/house-of-wealth/.well-known/openid-configuration | grep -o '"issuer":"[^"]*"'
```

Expected:

```text
"issuer":"http://45.127.7.141:8080/realms/house-of-wealth"
```

Jika container tidak berjalan:

```bash
docker compose up -d
sleep 20
docker compose ps
docker compose logs --tail=50 keycloak
```

## 4. Akses Keycloak Admin

Untuk admin console development, gunakan SSH tunnel jika `master` realm
memerlukan HTTPS:

```powershell
ssh -N -L 18080:127.0.0.1:8080 -p 8288 root@45.127.7.141
```

Biarkan terminal terbuka. Buka:

```text
http://localhost:18080/admin
```

Untuk user application, pilih realm:

```text
house-of-wealth
```

Jangan gunakan `master` untuk user aplikasi.

## 5. Semak Client Keycloak

Dalam realm `house-of-wealth`:

```text
Clients → house-of-wealth-web
```

Pastikan:

```text
Client type: Public
Standard flow: Enabled
Valid redirect URI: http://localhost:3000/*
Web origin: http://localhost:3000
```

Audience access token mesti:

```text
house-of-wealth-api
```

## 6. Sediakan User Ujian

Dalam Keycloak:

```text
Users → Add user
```

Cipta pengguna dengan e-mel anda sendiri, kemudian di tab Credentials tetapkan password dan matikan `Temporary`. Catat **User ID** Keycloak (tab Details). Realm yang diimport tidak lagi mengandungi pengguna `demo-admin`; jika Keycloak lama masih mempunyai pengguna itu, padamkannya kerana kata laluannya pernah tertulis dalam repo.

Padankan user itu dalam database HOW:

```sql
UPDATE "User"
SET
  "idpProvider" = 'keycloak',
  "idpSubjectId" = 'KEYCLOAK_USER_ID',
  "isActive" = true
WHERE "id" = 'USR-mock-user';
```

Gantikan `KEYCLOAK_USER_ID` dengan ID sebenar. User `USR-mock-user` mesti
mempunyai role `Super_Admin`, organisasi `ORG-PUBLIC`, dan country `CN-MYS`.

## 7. Aktifkan MFA Untuk User Ujian

Dalam Keycloak:

```text
Users → (pengguna anda) → Required actions → Configure OTP
```

Semasa login pertama:

1. Masukkan password.
2. Scan QR code dengan Google Authenticator atau Microsoft Authenticator.
3. Masukkan kod OTP enam digit.
4. Klik `Save` atau `Continue`.

Untuk mewajibkan OTP setiap login, dalam:

```text
Authentication → Flows → Browser
```

Gunakan flow yang mempunyai:

```text
Username Password Form: Required
Condition - user configured: Required
OTP Form: Required
```

Kemudian pergi ke `Bindings` dan pilih flow tersebut sebagai `Browser Flow`.

## 8. Konfigurasi Backend OIDC

Dalam `server/.env`:

```env
AUTH_MODE=oidc
OIDC_ISSUER=http://45.127.7.141:8080/realms/house-of-wealth
OIDC_AUDIENCE=house-of-wealth-api
OIDC_JWKS_URI=http://45.127.7.141:8080/realms/house-of-wealth/protocol/openid-connect/certs
```

Restart backend selepas mengubah `.env`.

## 9. Konfigurasi Frontend OIDC

Dalam root project `.env.local`:

```env
VITE_AUTH_MODE=PRODUCTION
VITE_OIDC_ISSUER=http://45.127.7.141:8080/realms/house-of-wealth
VITE_OIDC_CLIENT_ID=house-of-wealth-web
VITE_OIDC_REDIRECT_URI=http://localhost:3000/
VITE_API_BASE_URL=http://localhost:3001
```

Jika API berjalan di VPS, tukar `VITE_API_BASE_URL` kepada URL API VPS.
Restart Vite selepas mengubah `.env.local`:

```powershell
npm run dev
```

## 10. Uji Login Penuh

Buka:

```text
http://localhost:3000
```

Flow yang betul:

```text
Frontend → Keycloak password → OTP → callback localhost:3000
→ API /users/me → API /users/me/access → dashboard
```

Selepas login, pastikan profile menunjukkan user backend, bukan `Guest Visitor`.

Jika kembali ke public landing page:

1. Buka `http://localhost:3001/health`.
2. Buka browser DevTools: `F12 → Network`.
3. Semak `/users/me` dan `/users/me/access`.
4. Semak terminal backend untuk mesej `401`.

## 11. Uji Session

Selepas login, logout melalui aplikasi dan login semula. Pastikan backend
menerima endpoint:

```text
POST /auth/logout
```

Token yang telah revoked mesti tidak boleh digunakan untuk akses API.
Session direkod dalam table `Session` dan token tidak disimpan secara plain
text dalam database.

## 12. Uji RBAC Screen

Semak sekurang-kurangnya role berikut menggunakan user ujian:

```text
Super Admin
Country Admin
Organization Admin
Investor
Auditor
```

Untuk setiap role:

1. Pastikan hanya role assignment backend digunakan.
2. Pastikan tab yang tidak dibenarkan tidak muncul.
3. Cuba akses tab terlarang secara manual.
4. Pastikan screen menunjukkan access denied.
5. Pastikan Production Mode tidak boleh bertukar kepada mock persona.

## 13. Uji Contract API

API memerlukan access token sebenar. Jangan masukkan token sebenar ke dalam
chat atau commit.

Endpoint tersedia:

```text
GET  /contracts
GET  /contracts/:id
POST /contracts
POST /contracts/:id/versions
POST /contracts/:id/parties
POST /contracts/:id/approvals
POST /contracts/:id/approvals/:approvalId
POST /contracts/:id/transition
```

Lifecycle yang sah:

```text
DRAFT → PENDING_APPROVAL → APPROVED → SIGNED → ACTIVE
```

Uji juga:

- Organisation Admin tidak boleh akses organisasi lain.
- Country Admin tidak boleh akses negara lain.
- Invalid lifecycle transition mesti ditolak.
- Setiap perubahan mesti menghasilkan audit event.

## 14. Validation Code

Dari root project:

```powershell
npm run lint
npm run build
npm --prefix server run typecheck
npm --prefix server test -- --runInBand
```

Expected backend tests:

```text
7 test suites passed
40 tests passed
```

## 15. Jangan Buat Dalam Development HTTP

- Jangan gunakan password yang pernah dikongsi.
- Jangan kongsi access token.
- Jangan gunakan user sebenar dahulu.
- Jangan expose port `8080` sebagai production.
- Jangan gunakan Redis sebelum diperlukan.
- Jangan anggap mock user sebagai production identity.
- Jangan gunakan `sslRequired=NONE` untuk production.

## 16. Sahkan Pengguna Baharu (Staging)

Log masuk ada dua bahagian. **Keycloak** menyemak kata laluan dan OTP. **Database aplikasi** pula menentukan siapa pengguna itu dan apa peranannya. Pengguna yang ada dalam Keycloak sahaja akan nampak:

```text
Sign-in was not completed
Reason from the server: User is not provisioned or has no active role in this organisation and country
```

Maksudnya kata laluan betul, tetapi akaun belum dipautkan kepada pengguna dalam aplikasi. Ikut langkah di bawah.

### Langkah 1: Salin ID Keycloak

1. Buka https://how-staging-auth.alhidayahgroup.com.my/admin
2. Pilih realm **house-of-wealth**, kemudian **Users**.
3. Klik pengguna itu. Di tab **Details**, salin **ID** (36 aksara, contoh `219e2fce-3ed3-46e5-9f88-a023eacc504f`).
4. Di tab yang sama, pastikan **Email verified** ON, kemudian **Save**. Emel staging belum berfungsi, jadi pengguna tidak dapat mengesahkan emel sendiri.

### Langkah 2: Pilih organisasi

Peranan selain pelabur individu (Retail atau HNWI Investor) mesti berada dalam satu organisasi. Di droplet, sebagai `how`, buka database:

```bash
cd /opt/how/server
psql "$(grep '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"' | sed 's/[?&]schema=[^&]*//')"
```

Senaraikan organisasi:

```sql
SELECT id, name FROM "Organisation" WHERE "countryNodeId"='CN-MYS' AND status='ACTIVE' ORDER BY name;
```

Taip `\q` untuk keluar.

- **Asset Manager:** organisasi pemilik aset yang dia uruskan.
- **Legal Officer, Shariah, Compliance:** organisasi penyemak (contohnya organisasi platform), bukan organisasi pihak yang disemak.
- **Syarikat baharu:** guna `--org-name "Nama Syarikat"` di langkah 3, bukan `--org-id`.

### Langkah 3: Pautkan akaun

Masih di `/opt/how/server`. Satu arahan bagi setiap pengguna:

```bash
npx tsx scripts/provision-user.ts --keycloak-id <ID_KEYCLOAK> --role "<Peranan>" \
  --country CN-MYS --org-id <ID_ORGANISASI> --email <emel@pengguna>
```

Contoh:

```bash
npx tsx scripts/provision-user.ts --keycloak-id <ID_AZIMAH> --role "Asset Manager" \
  --country CN-MYS --org-id <ID_ORGANISASI_PEMILIK_ASET> --email azimahasset@gmail.com
```

- Tulis peranan seperti dalam aplikasi: `"Asset Owner"`, `"Asset Manager"`, `"Legal Officer"`, `"Retail Investor"`, `"Project Sponsor"`.
- Pelabur individu (`"Retail Investor"`, `"HNWI Investor"`) tidak perlu `--org-id`; skrip mencipta organisasi peribadi.
- Super Admin tidak boleh diberi di sini (hanya ada seorang).
- Jika skrip berkata akaun Keycloak itu sudah dipautkan, jangan jalankan lagi. Tukar peranan di langkah 6.

### Langkah 4: Hidupkan peranan jika perlu

Sesetengah peranan dimatikan secara asal (contohnya Legal Officer, peranan Shariah, Auditor). Jika pengguna nampak `Your role is currently disabled on this platform`, Super Admin hidupkan peranan itu di **Admin Center › Role Availability**.

### Langkah 5: Uji log masuk

1. Buka tetingkap **Incognito** baharu (supaya sesi lama tidak digunakan).
2. Buka https://how-staging.alhidayahgroup.com.my dan log masuk dengan akaun pengguna itu.
3. Notis privasi dipaparkan dahulu. Selepas diterima, aplikasi dibuka dengan peranan yang diberi.

### Langkah 6: Tukar peranan atau organisasi (selepas akaun dipautkan)

Tidak perlu skrip atau SQL. Sebagai Super Admin atau Country Admin:

1. **Admin Center › User Directory**, cari emel pengguna.
2. **Roles:** tanda peranan baharu, buang tanda peranan lama, tulis sebab, **Save**.
3. Jika organisasi juga salah, guna **Move to organisation** (dengan sebab). Semua peranannya ikut berpindah.
4. Pengguna log keluar dan log masuk semula.

### Jika masih gagal

Banner merah di halaman utama memaparkan sebab dari server:

| Sebab | Maksud | Tindakan |
|---|---|---|
| `User is not provisioned or has no active role...` | Akaun belum dipautkan, atau tiada peranan aktif | Ulang langkah 3 |
| `Your role is currently disabled on this platform` | Peranan dimatikan | Langkah 4 |
| `MFA is required for this role` | Peranan ini wajib OTP | Dalam Keycloak, user › **Required user actions** › **Configure OTP**; pengguna sediakan OTP semasa log masuk |
| Keycloak minta sahkan emel | **Email verified** OFF | Langkah 1, perkara 4 |
