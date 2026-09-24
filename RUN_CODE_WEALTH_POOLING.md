# Run Code Wealth Pooling

Panduan ini menerangkan cara menjalankan Wealth Pooling secara local.

## Prerequisites

- Node.js
- Docker Desktop
- Git

## 1. Install Dependencies

Jalankan dari root project:

```powershell
npm install
npm --prefix server install
```

## 2. Start PostgreSQL

Database local menggunakan container `keycloak-postgres` pada port `55433`.

```powershell
```

Jika container belum wujud, gunakan setup script:

```powershell
npm run db:setup:local
```

## 3. Apply Database Migration and Seed Data

```powershell
cd server
npx prisma migrate deploy
npm run db:seed
```

Seed boleh dijalankan semula untuk memuatkan mock data terkini.

Seed juga menyediakan projek ujian lengkap berikut:

```text
DEMO | Selangor Precision Agri-Tech & Grain Storage
```

Projek ini mempunyai 9 synthetic evidence documents untuk menguji RAG, Contract Advisor, Shariah Assistant dan Contract Draft Assistant. Semua dokumen ditanda `DEMO / SIMULATION ONLY` dan tidak boleh digunakan sebagai dokumen pelaburan, KYC, undang-undang atau Shariah sebenar.

## 4. Start Backend

Buka Terminal 1:

```powershell
cd server
npm run start:dev
```

Backend berjalan di:

```text
http://localhost:3001
```

Health check:

```text
http://localhost:3001/health
```

## 5. Start Frontend

Buka Terminal 2 dari root project:

```powershell
npm run dev
```

Frontend berjalan di:

```text
http://localhost:3000
```

## 6. Login Demo

1. Buka `http://localhost:3000`.
2. Klik `Login` atau `Sign In`.
3. Pilih persona seperti `Project Sponsor` atau `Country Admin`.
4. Masukkan apa-apa password demo, contohnya `demo123`.
5. Klik `Sign In`.

Mode local menggunakan mock authentication dan tidak memerlukan MFA.

## Environment

Frontend menggunakan `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_AUTH_MODE=PRE_PRODUCTION
VITE_SINGLE_ROLE_MODE=false
```

Backend menggunakan `server/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:55433/house_of_wealth_local"
AUTH_MODE=mock
PORT=3001
DEFAULT_COUNTRY_NODE=CN-MYS
DEFAULT_ORGANISATION=ORG-PUBLIC
```

## Troubleshooting

Jika frontend menggunakan port `3001`, port `3000` mungkin telah digunakan. Semak port:

```powershell
netstat -ano | findstr ":3000 :3001"
```

Frontend telah ditetapkan dengan `--strictPort`. Ia tidak akan berpindah secara automatik ke port `3001`. Jika port `3000` digunakan, hentikan proses yang menggunakan port tersebut dan jalankan semula frontend.

```powershell
taskkill /PID <PID_FRONTEND_LAMA> /F
npm run dev
```

Pastikan pembahagian port sentiasa begini:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:3001
```

Jika `3001` memaparkan frontend, hentikan proses frontend yang salah dahulu, kemudian jalankan backend dari folder `server`:

```powershell
netstat -ano | findstr ":3001"
taskkill /PID <PID_YANG_MENGGUNAKAN_3001> /F
cd server
npm run start:dev
```

Backend mesti memaparkan `Nest application successfully started`. Uji endpoint backend:

```powershell
curl.exe http://localhost:3001/health
```

Respons yang betul mengandungi:

```json
{"status":"ok","service":"house-of-wealth-api"}
```

Hentikan proses berdasarkan PID:

```powershell
```

Jika backend gagal disambungkan ke database:

```powershell
docker start keycloak-postgres
```

## Verification Commands

Frontend:

```powershell
npm run lint
npm run build
```

Backend:

```powershell
cd server
npm run typecheck
npm test -- --runInBand
npm run build
```
