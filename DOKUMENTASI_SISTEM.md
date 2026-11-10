# Dokumentasi Sistem Wealth Pooling (House of Wealth)

Keadaan sistem pada **4 November 2026**, cawangan `feat/keycloak-oidc-auth`. Dokumen ini menerangkan apa yang sudah ada dalam sistem.
- Kerja yang belum siap: [PENDING_ACTIVITIES.md](PENDING_ACTIVITIES.md).
- Cara menjalankan sistem: [RUN_COMMANDS.ps1](RUN_COMMANDS.ps1).
- Ringkasan untuk pembangun (bahasa Inggeris): [README.md](README.md).

> Reka bentuk penuh untuk 9 negara D-8 ada dalam *D-8 Wealth Pooling Master Architecture v1.0* dan *D-8 Wealth Pooling Technical Design Document v1.0* (Claude Docs). Kemas kini dokumen ini setiap kali modul, endpoint, migration atau peraturan berubah, terutamanya bahagian 5, 6, 9 dan 10.

---

## 1. Ringkasan

Wealth Pooling ialah platform pelaburan patuh Shariah untuk negara D-8. Cara ia berjalan:
1. Rakan penghantar projek (PDP) mendaftar projek dan memuat naik bukti.
2. Projek dianalisis (feasibility) dan disemak peringkat demi peringkat, sehingga Jawatankuasa Shariah membuat keputusan akhir.
3. Pelabur memasukkan wang ke dalam **pool** di bawah satu **akad** (Mudarabah, Musharakah, Wakalah atau Ijarah).
4. Keuntungan dibahagi ikut nisbah dalam akad. Setiap pergerakan wang direkod dalam lejar dua belah (double-entry) yang dirantai hash.

Sistem ini juga ada:
- pendaftaran pengguna, KYC (semakan wajah dan bacaan dokumen) dan KYB untuk organisasi;
- pendaftaran aset (tanah, bangunan, kenderaan berat, mesin), perkongsian aset dengan projek, dan sewaan terus (Ijarah);
- perjanjian dengan tandatangan elektronik, meterai PAdES dan cap masa;
- modal penaja dan takaful yang wajib sebelum wang dikeluarkan;
- keahlian (membership) dan kredit AI yang dibayar melalui ToyyibPay;
- ciri AI (feasibility, kontrak, due diligence, pembantu RAG) yang guna model sendiri (Ollama), dan alat analisis tanpa AI;
- zakat ikut pusat zakat negeri yang dipilih pengguna, penyata cukai dan penyata kewangan;
- benefisiari dan pusaka (Islam atau sivil), termasuk kes kematian;
- tadbir urus di Admin Center: papan pemuka, laporan regulator, daftar risiko, insiden, rekod fatwa;
- laporan prestasi projek setiap suku tahun yang disahkan juruaudit;
- notifikasi dalam aplikasi dan emel;
- mini-app untuk super app D8 Ideas (`/m`), dalam BM dan EN;
- log audit yang tidak boleh diubah (append-only) dan rantai hash untuk kesan rekod yang diubah.

Pengguna boleh Muslim atau bukan Muslim. Sistem **tidak menyimpan agama**. Cukai terpakai kepada semua orang. Zakat pula pilihan; pengguna hidupkan sendiri.

---

## 2. Teknologi

| Bahagian | Teknologi | Lokasi |
|---|---|---|
| Web dan mini-app | React 19, Vite 6, Tailwind CSS 4, TypeScript 5.8 | `src/` (mini-app di `src/mobile/`, alamat `/m`), port **3000** |
| API (backend) | NestJS 10, TypeScript, Prisma 6 | `server/src/`, port **3001** |
| Database | PostgreSQL dengan pgvector | local: Docker (lihat `RUN_COMMANDS.ps1`); staging: DigitalOcean Managed PostgreSQL |
| Kerja latar belakang | Redis 7 + BullMQ (`server/src/worker.ts`), dan semakan harian dalam API | `server/src/jobs/`, fail `*.sweeper.ts` |
| AI | Model sendiri melalui Ollama (sama format dengan API OpenAI); staging guna pelayan `how-ai` dengan `qwen2.5:7b` | `server/src/ai/` |
| Log masuk | Keycloak (`AUTH_MODE=oidc`); `AUTH_MODE=mock` untuk pembangunan sahaja | `server/keycloak/`, [server/KEYCLOAK_SETUP.md](server/KEYCLOAK_SETUP.md) |
| Pembayaran | ToyyibPay (FPX) | `server/src/membership/toyyibpay.service.ts` |
| Emel | Resend atau SMTP (nodemailer) | `server/src/notifications/email-config.ts` |
| PDF dan tandatangan | pdfkit; meterai PAdES dan cap masa RFC 3161 | `server/src/statements/`, `server/src/contract-intelligence/signing/` |
| KYC dalam pelayan | tesseract.js (baca teks), onnxruntime-node (YuNet/SFace untuk wajah) | `server/src/kyc/` |

**Persekitaran:**

| Persekitaran | Lokasi | Nota |
|---|---|---|
| Local | PC pembangun | `AUTH_MODE=mock`, data contoh (seed) |
| Staging | DigitalOcean (Singapura): `how-staging.alhidayahgroup.com.my`, `how-staging-api…`, `how-staging-auth…` | PM2 untuk API, nginx untuk web, Keycloak dalam Docker; deploy secara manual ([PANDUAN_STAGING_DIGITALOCEAN.md](PANDUAN_STAGING_DIGITALOCEAN.md)) |
| Demo awam | Plesk: `how.alhidayahgroup.com.my` | web statik dengan data yang dirakam (bahagian 3.1) |

**Folder utama:**
- `src/components/`: skrin web (dashboard, pooling, financials, membership, admin dan lain-lain).
- `src/mobile/`: mini-app D8 Ideas.
- `src/services/`: kod yang memanggil API (`apiClient.ts`, `statementsApi.ts`, `apiFetch.ts`).
- `server/src/<modul>/`: satu folder bagi setiap modul backend (controller, service, DTO, ujian).
- `server/prisma/schema.prisma` dan `server/prisma/migrations/`: struktur database dan migration.
- `server/ops/`: rahsia (tidak masuk Git) dan tetapan Redis.

---

## 3. Menjalankan sistem

Arahan penuh (termasuk pengguna ujian dan cara atasi masalah) ada dalam [RUN_COMMANDS.ps1](RUN_COMMANDS.ps1). Ringkasnya:

```powershell
cd server; npx prisma migrate deploy; npm run start:dev   # backend, port 3001
npm run dev                                                # web, port 3000 (dari folder utama)
curl.exe http://localhost:3001/health                      # semak backend hidup
```

- Masukkan data contoh: `cd server; npm run db:seed`.
- Worker latar belakang: set `WORKER_ENABLED=true` dalam `server/.env`, kemudian `npm run start:worker` (perlu Redis). Peringatan harian (membership, aset, takaful) berjalan dalam API sendiri, jadi tidak perlu worker.
- Pengguna baharu dan KYC: [PANDUAN_PENGGUNA_BARU_KYC.md](PANDUAN_PENGGUNA_BARU_KYC.md).
- Deploy staging: `git pull`, `npm ci`, `npx prisma generate`, `npm run build`, `npx prisma migrate deploy`, `pm2 restart how-api`, kemudian build web ke `/opt/how-web`.

### 3.1 Mod demo tanpa backend

Web boleh berjalan tanpa server, guna data contoh yang sudah dirakam (`VITE_DATA_SOURCE=static`, fail [.env.demo](.env.demo)). Ini untuk tunjuk sistem tanpa membuka backend kepada orang luar.

- **Cara ia berfungsi:** semua panggilan API melalui `apiFetch` ([src/services/apiFetch.ts](src/services/apiFetch.ts)). Dalam mod demo, jawapan diambil dari fail `public/demo-data/<pengguna>__<peranan>.json`. Bila pengguna cuba simpan sesuatu (hantar, lulus, bayar), skrin memaparkan "Demo mode: this action is not saved". Tiada apa yang disimpan. Label "Demo mode" ada di sudut skrin.
- **Pengguna yang dirakam:** Super Admin, Country Admin, Project Sponsor, Asset Owner, Retail Investor (Siti Aminah, pelabur Malaysia dengan KYC lulus), Shariah Reviewer, Legal Officer. Lima yang pertama aktif secara asal (`STATIC_DEMO_ROLES`). Super Admin boleh hidupkan Shariah Reviewer dan Legal Officer di Role Availability. Pilihan ini disimpan dalam pelayar sahaja.
- **Jalankan:** `npm run dev:demo` (local), atau `npm run build:demo` dan letak folder `dist/` sebagai laman statik. Tidak perlu database, Redis, Keycloak atau kunci API.
- **Rakam semula** (bila data contoh atau skrin berubah):
  1. Hidupkan backend dengan data contoh (port 3001).
  2. Jalankan `npm run demo:record` (proksi di port 3002; ia menyekat semua simpanan supaya database tidak berubah).
  3. Jalankan web dengan `VITE_API_BASE_URL=http://localhost:3002`. Log masuk sebagai setiap pengguna dan buka skrin yang mahu dirakam.
  4. **Wajib sebelum commit:** `npm run demo:sanitize`. Ia membuang rekod pengguna yang mendaftar sendiri (`USR-REG-*`, iaitu penguji sebenar), dan gagal jika data peribadi mereka masih ada.
- **Had:** hanya skrin yang dibuka semasa rakaman ada data. Skrin lain memaparkan "this screen has no recorded data yet". Data tidak berubah dan kembali asal bila refresh.

**Mod DEMO yang lain:** `VITE_AUTH_MODE=DEMO` (dengan backend) memaparkan data contoh dalam beberapa skrin. Di luar mod DEMO, setiap skrin membaca data sebenar dari server, atau menyatakan dengan jelas bahawa ia belum tersedia (bahagian 10).

---

## 4. Log masuk, peranan dan tenant

### 4.1 Log masuk
- **`AUTH_MODE=oidc`**: token JWT dari Keycloak (RS256 sahaja di production). Pengguna dipadankan melalui `idpSubjectId`. Production menolak `mock`, semasa server bermula dan bagi setiap permintaan.
- **`AUTH_MODE=mock`** (pembangunan): bahagian pertama token ialah JSON base64url `{mock, role, countryNode, org}`. `mock` ialah hujung ID pengguna (contohnya `INV-MYS-01` untuk `USR-INV-MYS-01`). Pengguna mesti ada dan aktif dalam database.
- Web: `VITE_AUTH_MODE`, `VITE_OIDC_*`. `VITE_SINGLE_ROLE_MODE` hadkan log masuk demo kepada satu peranan ujian.

### 4.2 Peranan
- Ada **37 peranan** (`server/src/policy/permissions.ts`). Di web, peranan disusun ikut kumpulan (`src/rbac/roles/`).

| Kumpulan | Peranan |
|---|---|
| Pentadbiran sistem | Super Admin, System Administrator, Security Administrator, Data Administrator, AI Administrator, AI Model Reviewer |
| Tenant | Country Admin, Organization Admin |
| Projek dan aset | Project Sponsor, Project Manager, Asset Owner, Asset Manager, Pool Manager |
| Pelabur | Retail Investor, HNWI Investor, Institutional Investor, Corporate Investor, Family Office, Portfolio Manager |
| Shariah | Shariah Advisor, Shariah Reviewer, Shariah Committee |
| Pematuhan dan risiko | Compliance Officer, KYC Officer, KYB Officer, AML Officer, Risk Officer, Fraud Analyst, Legal Officer, Estate Officer |
| Kewangan | Finance Officer, Treasury Officer, Settlement Officer, Reconciliation Officer, Auditor |
| Lain-lain | Customer Support, Guest |

- Hanya ada **satu Super Admin** untuk seluruh sistem (keputusan 15 Oktober 2026). Hanya dia boleh mencipta Country Admin. Peranan Super Admin tidak boleh diberi atau ditarik melalui sistem (guna skrip `ensure-single-super-admin.ts`).
- Peranan diberi melalui **`UserRoleAssignment`**. Setiap rekod mengikat satu peranan kepada satu organisasi dan satu negara, dan boleh dimatikan. Pengguna tidak boleh memberi peranan kepada diri sendiri.
- Peranan dalam token hanya diterima jika pengguna memang memegang peranan itu dalam database.
- **Member ID** berbentuk `USR-MYS-XXXXXXXX`. Individu mendapat organisasi peribadi `ORG-MYS-IND-…`. Negara akaun ditetapkan semasa daftar dan tidak boleh ditukar.
- **Persetujuan PDPA:** notis privasi dalam dua bahasa dan rekod `PrivacyConsent` (deraf masih perlu disemak peguam).
- **Urus pengguna dan tenant** di Admin Center (Super Admin; Country Admin dalam negaranya sahaja). Setiap tindakan direkod dalam audit bersama sebabnya.
  - **User Directory:** tambah atau buang peranan; gantung atau aktifkan akaun (bukan akaun sendiri); **pindah** seseorang ke organisasi lain yang aktif dalam negara yang sama (`POST /users/:id/organisation`). Semua peranannya ikut berpindah. Rekod lama dibatalkan, bukan dipadam. Country Admin tidak boleh memindahkan pentadbir. Super Admin tidak boleh dipindahkan.
  - **Organisations:** cipta organisasi (`POST /organisations`; nama tidak boleh sama dalam satu negara), dan gantung atau aktifkan semula (`PATCH /organisations/:id/status`). Tiada sesiapa boleh menggantung organisasi sendiri atau organisasi Super Admin. Country Admin tidak boleh menggantung organisasi yang ada pentadbir.
  - **Country Nodes** (Super Admin sahaja): cipta negara (`POST /country-nodes`), dan matikan atau hidupkan semula (`PATCH /country-nodes/:code/status`), kecuali negara Super Admin.
  - **Role Management:** di atas, senarai pengguna (peranan, organisasi, gantung). Di bawah, senarai 36 peranan: siapa yang memegangnya, kebenaran yang disemak server, dan sama ada peranan itu dimatikan di Role Availability. Peranan ditetapkan dalam kod. Cipta peranan sendiri, jemput pengguna dan tukar peranan hanya ada dalam mod DEMO.
  - **Kesan gantung:** pengguna, organisasi atau negara yang digantung tidak boleh log masuk (`IdentityService`) dan tidak boleh diberi peranan baharu. Rekod tetap disimpan. Organisasi dan negara tidak boleh dipadam selepas ada rekod audit; cara menamatkannya ialah dengan menggantung.

### 4.3 Kebenaran (permission)
- **Cara kerja:** setiap peranan ada senarai **tindakan** (`create`, `read`, `update`, `delete`, `approve`, `disburse`, `audit`, `export`) bagi setiap **modul** (`dashboard`, `assets`, `contracts`, `marketplace`, `pooling`, `ledger`, `profile`, `governance`, `approvals`, `users`, `audit_logs`, `reports`). `PolicyEngine` di server yang membuat keputusan.
- **Disemak di server:** `@RequirePermission(modul, tindakan)` (109 tempat) dan `@Roles(...)` (188 tempat) pada controller, melalui `OidcGuard` dan `RolesGuard`. Ada juga semakan dalam service, contohnya pengasingan tugas (bahagian 7).
- **Approval Matrix:** Admin Center › Approval Matrix menunjukkan siapa memutuskan setiap langkah dan apa peraturannya. Ia dibina dari senarai peranan yang sama yang disemak oleh service (`server/src/governance/approval-matrix.ts`).
- **Web** (`src/rbac/`): `RoleGuard` dan senarai tab bagi setiap peranan menyembunyikan skrin yang tidak dibenarkan. Ini untuk paparan sahaja; keputusan sebenar tetap dibuat di server.

### 4.4 Tenant
- Setiap rekod milik satu **negara (country node)**, contohnya `CN-MYS`, dan satu **organisasi**. Pengguna hanya boleh baca dan tulis dalam tenant sendiri (`assertTenantScope`, `tenantScopeFilter`). Super Admin boleh merentas semua tenant. `COUNTRY_NODE_ID` (pilihan) menolak negara lain pada satu pelayan.
- Zon masa dan format telefon ikut negara (GMT+8 dan +60 untuk Malaysia).
- **Pelabur:** pelabur boleh melihat dan melabur dalam pool OPEN milik organisasi lain dalam **negara yang sama** (`server/src/pools/pool-access.ts`). Pesanan perlu KYC APPROVED. Pesanan ditolak jika datang dari organisasi yang menjalankan projek, penaja projek, atau pemegang peranan PDP. Pelabur hanya melihat pesanan sendiri.

### 4.5 Modul ciri
Admin boleh hidupkan atau matikan modul (`GET/PATCH /admin/modules`): `ASSET_REGISTRATION`, `WEALTH_POOLING`, `SHARIAH_GOVERNANCE`, `AI_INTELLIGENCE`, `CONTRACTS`, `DOCUMENT_VAULT`, `FINANCIAL_LEDGER`, `SECONDARY_MARKET`, `KYC_VERIFICATION`, `KYB_VERIFICATION`.
- Pilihan: `ACTIVE`, `MANUAL_REVIEW` atau `DISABLED`. Endpoint modul yang dimatikan ditolak oleh `FeatureModuleGuard`.
- Financial Ledger sentiasa aktif.
- Secondary Market belum ada backend, jadi suisnya dikunci dan ditanda "Not built yet".

### 4.6 Hidup atau matikan peranan (Role Availability)
Super Admin boleh hidupkan atau matikan peranan untuk seluruh platform di **Admin Center › Role Availability** (`GET /roles/availability`, `PATCH /admin/roles/:role/availability`).
- Peranan yang dimatikan tidak boleh log masuk ("Your role is currently disabled on this platform"), tidak boleh diberi kepada pengguna, dan tidak boleh dipilih semasa daftar.
- Rekod peranan pengguna tidak dipadam. Bila peranan dihidupkan semula, akses kembali.
- Super Admin dan Guest sentiasa aktif.
- Data contoh hanya hidupkan set demo. Peranan seperti Legal Officer, peranan Shariah dan Auditor perlu dihidupkan dahulu sebelum digunakan.

---

## 5. Modul

### 5.1 Pengguna dan KYC (`/users`, `/kyc`, `/auth`)
- Daftar, profil dan peranan. Pilihan profil (kontrak pilihan, notifikasi, pusaka, bahasa) disimpan dalam `preferences` di server.
- KYC: isi borang, muat naik dokumen, hantar untuk semakan. Pegawai KYC boleh lulus (dengan **tahap KYC** LEVEL_1/2/3), pulangkan atau tolak.
- **Semakan automatik** (hanya nasihat; pegawai yang buat keputusan): dokumen sepadan atau tidak, nombor ID berulang, bacaan teks dokumen (OCR), dan prototaip **liveness** (gerak kepala ikut arahan rawak, tunjuk kad ke kamera, padan wajah). `KYC_REQUIRE_LIVENESS` kini `false`.
- Sambungan untuk penyedia eKYC luar (`KYC_ROUTING_JSON`, adapter `http-vendor`, mod bayangan) sudah sedia. Penyedia belum dipilih.

### 5.2 Projek, bukti dan feasibility (`/projects`, `/ai/projects/...`)
- Projek ada status, milestone, pasukan, pengumuman dan kempen promosi (bayar melalui ToyyibPay atau kredit).
- **Bukti projek** dimuat naik dan dianalisis AI. Sistem juga semak keaslian fail: SHA-256, maklumat dalam PDF, tanda PDF pernah disunting, dan fail yang sama dalam projek lain. Jika ada amaran, status kekal REQUIRES_REVIEW.
- **Analisis feasibility** ada nombor revision dan semakan ikut peringkat: DRAFT → Finance → Risk → Compliance → Shariah → Investment Committee → **Final Decision** (Jawatankuasa Shariah).
- **Pengasingan tugas:** selepas DRAFT, penyemak dari organisasi projek sendiri tidak boleh membuat keputusan. Seorang hanya boleh memutuskan satu peringkat bagi setiap analisis. (Dia boleh memutuskan semula peringkat yang sama selepas *request changes*.) Oleh itu, Investment Committee dan Final Decision perlu dua ahli Jawatankuasa Shariah yang berbeza.
- Projek yang lulus dikunci. Hanya Super Admin atau Country Admin boleh membukanya semula, dan hanya sebelum wang diterima.
- **Halaman Wealth Pooling:** senarai projek dan pool dari server, dan kitaran 17 langkah dengan panel "langkah seterusnya".

### 5.3 Tadbir urus Shariah (`/shariah/reviews`)
- Semakan Shariah, keputusan, pembatalan dan hantar semula. Kotak **My reviews** di dashboard penyemak mengumpul semua semakan yang sedang menunggu.

### 5.4 Pool, akad dan pelaburan (`/pools`, `/investments`)
- Pool dicipta untuk projek yang sudah dapat keputusan akhir feasibility, bersama **terma akad versi 1**. Yang boleh mencipta: Super Admin, Country Admin, Organization Admin, Pool Manager, Project Sponsor, Project Manager.
- Pool bermula sebagai **DRAFT** dan perlu **empat tandatangan** (Shariah, Compliance, Risk, Authorised) sebelum dibuka (OPEN). Pengurus pool boleh Pause, Mark full dan Close.
- **Minimum dan tarikh tutup** (pilihan, semasa pool dicipta): selepas tarikh tutup, pesanan baharu ditolak. Semakan harian (`PoolFundraisingService`) membatalkan pesanan yang belum dibayar. Jika jumlah yang disahkan kurang daripada minimum, pool menjadi **UNDERSUBSCRIBED** dan setiap pesanan yang dibayar menjadi `REFUND_DUE`; jika tidak, pool menjadi CLOSED. Kewangan memulangkan wang penuh dan merekod rujukan bank di senarai **Refunds** (Admin Center › Settlement Clearing, atau Financials › Profit distribution). Lejar merekod pulangan (`INVESTMENT_REFUND`), pesanan menjadi `REFUNDED`, dan pelabur dimaklumkan.
- **Terma akad** setiap pool: jenis akad, **nisbah bahagi untung (PSR)**, teks dan hash. Terma ada versi, tidak boleh diubah (append-only), dan **dikunci selepas pelabur menerimanya**.
- **Ijab dan qabul:** pesanan mesti menerima versi terma yang terkini. Sistem simpan id terma, hash dan masa diterima. Pelabur boleh lihat terma yang diterima di Investments › My agreements.
- Peraturan setiap akad (`server/src/pools/akad-terms.ts`):

| Akad | Pelabur sebagai | Pengurus sebagai | Bahagian untung pelabur | Kerugian |
|---|---|---|---|---|
| Mudarabah | Pemilik modal (rabb al-mal) | Mudarib | 1–99% | Ditanggung pelabur ikut modal; mudarib menanggung hanya jika cuai atau langgar terma |
| Musharakah | Rakan kongsi | Rakan kongsi pengurus | 1–99% | Ikut nisbah modal, bukan nisbah untung |
| Wakalah bil Istithmar | Pemberi kuasa (muwakkil) | Wakil pelaburan | 1–100% (baki jadi insentif wakil) | Ditanggung pelabur; wakil menanggung hanya jika cuai |
| Ijarah | Pemilik bersama aset sewaan | Pengurus aset | 1–100% daripada sewa bersih | Risiko aset ditanggung pemilik ikut bahagian milik |

- **Had pelaburan ikut tahap KYC** (`KYC_INVESTMENT_LIMITS`, JSON ikut tahap dan mata wang): jumlah pesanan PENDING dan SETTLED pelabur dibanding dengan had. Semakan ini dikunci bagi setiap pelabur supaya dua pesanan serentak tidak terlepas. Jika tiada tetapan, tiada had. Jika JSON salah, pesanan baharu disekat. KYC lama yang tiada tahap dikira LEVEL_1.
- **Bayar pesanan:** pelabur pindah wang ke **akaun amanah platform bagi negaranya** (bahagian 5.20), dengan nombor pesanan sebagai rujukan. Arahan bayaran dipaparkan di web dan mini-app (`GET /investments/orders/:id/payment-instructions`). Wang pelabur tidak pernah terus ke penaja.
- Pesanan kekal PENDING sehingga pegawai penyelesaian (Settlement) mengesahkan bayaran dengan rujukan bank. Pegawai tidak boleh menyelesaikan pesanan sendiri.
- **Pihak berkaitan:** pesanan dari syarikat dalam kumpulan yang sama dengan organisasi projek ditanda `relatedParty` (bahagian 5.17).
- **Skrin pelabur:** Investments memaparkan pelaburan (modal, bahagian pool, untung), sejarah keuntungan, perjanjian akad, laporan prestasi projek dan pool OPEN. Pool di bawah kontrak pilihan pelabur dipaparkan dahulu.

### 5.5 Agihan untung, rugi dan bayaran keluar (`/distributions`)
- **Hasil projek** yang masuk ke akaun amanah direkod sekali bagi setiap rujukan bank (`POST /distributions/pool-income`). Untung hanya dibayar dari hasil yang direkod, tidak sekali-kali dari modal pelabur.
- **Pratonton** dikira oleh server (`POST /distributions/preview`): untung atau rugi bersih, rugi lama yang ditampung dahulu, bahagian setiap pelabur ikut akad dan modal, dan akaun bank yang sudah disahkan.
- **Rugi:** tempoh yang rugi, atau tempoh yang untungnya habis menampung rugi lama, direkod tanpa bayaran (`POST /distributions/period-results`).
- **Dua orang (maker-checker):** dikira → dihantar → diluluskan oleh pegawai lain → diproses. Orang yang mencipta tidak boleh meluluskan sendiri.
- **Bayaran keluar (payout):**
  - hanya ke akaun bank yang disahkan, dan selepas tempoh bertenang;
  - nombor akaun disulitkan (hanya 4 digit akhir dipaparkan);
  - akaun disahkan oleh Settlement Officer atau Super Admin (bukan akaun sendiri);
  - status: QUEUED → SUBMITTED → SETTLED / FAILED / REVERSED;
  - webhook dengan tandatangan HMAC, dan padanan (reconciliation) berjadual;
  - penyedia bank atau DuitNow belum dipilih (sekarang fail bank manual).
- Aliran agihan untuk Settlement Officer ada di mini-app (tab Agihan) dan di web (Financials › Profit distribution: Pools, Approve, Pay out, All periods). Akaun bank pelabur disahkan di Admin Center › Payout Account Verification.

### 5.6 Lejar kewangan dan integriti (`/financial`, `/admin/audit/integrity`)
- Lejar dua belah: setiap transaksi mesti seimbang (disemak oleh trigger database). Jadual lejar tidak boleh diubah.
- Akaun ikut tenant: tunai ToyyibPay bagi setiap organisasi dan negara, tunai pool, dan akaun pengguna.
- **Rantai hash:** setiap rekod audit dan transaksi lejar dimeterai ke dalam jadual `HashChainLink` (SHA-256 bersambung). Worker memeterai setiap 5 minit. Super Admin boleh memeterai serta-merta. Super Admin dan Auditor boleh menyemak. Semakan menunjukkan rekod pertama yang diubah, dipadam atau disambung semula.
- Tab Ledger membaca lejar dari server, dan menunjukkan status rantai hash kepada Super Admin dan Auditor.

### 5.7 Membership, kredit AI dan ToyyibPay (`/membership`)

| Pelan | Harga sebulan | Harga setahun | Kredit AI percuma sebulan |
|---|---|---|---|
| Free | RM0 | RM0 | 20 |
| Plus | RM39 | RM390 | 100 |
| Professional | RM149 | RM1,490 | 400 |
| Enterprise | RM999 | RM9,990 | 2,500 |

- **Pek kredit AI:** 50 kredit (RM25), 250+25 (RM99), 1,000+150 (RM349), 3,000+600 (RM899).
- **Promosi projek:** Featured 7 hari (RM99 atau 50 kredit), Featured 30 hari (RM299 atau 150), Sponsored 30 hari (RM499 atau 250).
- **Peraturan kredit:** kredit percuma digunakan dahulu, tamat setiap kitaran, dan tidak boleh digunakan untuk bayar membership. Kredit yang dibeli tidak tamat, dan boleh ditukar untuk bayar membership (RM0.20 satu kredit, `MEMBERSHIP_CREDIT_VALUE_MYR`).
- **ToyyibPay:** yuran FPX RM1 dibayar pelanggan. Sistem semak bil dengan ToyyibPay sebelum memberi apa yang dibeli, dan pastikan satu bil tidak diproses dua kali. Ada padanan berjadual dan refund sebahagian.
- Tempoh tenggang 7 hari. **Satu peringatan** (loceng dan emel) seminggu sebelum tempoh berbayar tamat (`MembershipExpirySweeper`).
- **Bayaran olok-olok** hanya di luar production, atau jika `ALLOW_SIMULATED_PAYMENTS=true`. Transaksinya ditanda DEMO dan tidak dikira sebagai hasil.
- Jadual yuran dipaparkan di Admin Center › Platform Fee Schedule.

### 5.8 Zakat (`/zakat`)
- Pengguna pilih sendiri untuk hidupkan (`GET/PUT /zakat/preference`).
- **14 pusat zakat Malaysia** dengan laman rasmi: Selangor (LZS), WP (PPZ-MAIWP), Pahang, Kedah (LZNK), Perak, Sarawak (TBS), Johor (MAIJ), Melaka (MAIM), Negeri Sembilan (MAINS), Pulau Pinang (MAINPP), Kelantan (MAIK), Terengganu (MAIDAM), Perlis (MAIPs), Sabah (MUIS).
- **Nisab** direkod oleh admin atau pegawai Shariah, dengan tarikh dan sumber. Setakat ini: Selangor 2026 (RM42,047 Jan–Jun; RM38,748 Jul–Dis), WP 2026 (RM33,996), Sarawak September 2026 (RM46,294.89). Jika tiada nisab, sistem tidak meneka; pengguna masukkan sendiri dari laman pusat zakat.
- **Cara kira:** haul ikut kategori; kadar 2.5% (tahun Hijrah) atau 2.577% (tahun Masihi); tolak hutang. Pelaburan dalam platform dikira sama ada sebagai **untung yang diterima (al-mustaghallat)**, atau **modal yang cukup haul + untung** (cara zakat saham).

| Kategori | Perlu haul? | Nota |
|---|---|---|
| Simpanan dan tunai | Ya | Dimiliki setahun penuh |
| Pendapatan (gaji dan lain-lain) | Tidak | Dikira semasa diterima |
| Pendapatan pelaburan (al-mustaghallat: untung, dividen, sewa) | Tidak | Cara yang diluluskan untuk ASB pada 2025 |
| Modal pelaburan | Ya | Cara zakat saham; modal kurang setahun tidak dikira |
| Aset perniagaan (urud al-tijarah) | Ya | Stok dan hutang pelanggan |

- **Platform tidak memungut zakat.** Butang bayar membuka portal rasmi pusat zakat. Memungut zakat tanpa dilantik oleh Majlis Agama Islam Negeri ialah kesalahan. Kutipan melalui ToyyibPay hanya berjalan jika `ZAKAT_COLLECTION_APPOINTMENT_REF` diisi selepas pelantikan rasmi.

### 5.9 Cukai dan penyata (`/tax`, `/statements`)
- **Profil cukai:** negara tempat tinggal, status pemastautin Malaysia, jenis entiti, nombor cukai (disimpan; dipaparkan separuh tersembunyi; tidak masuk log audit).
- **Penyata:** penyata pelabur (`GET /statements/investor`), penyata projek (`GET /statements/projects/:id`, juga di Sponsor Portal › Reports), dan penyata pendapatan tahunan untuk cukai (`GET /statements/investor/tax?year=`). Format JSON, CSV dan PDF.
- **Platform belum mengira atau memotong cukai.** Kadar bergantung pada struktur undang-undang pool (item 10 dalam fail pending).

### 5.10 AI dan RAG (`/ai`)

**Penyedia dan model**
- Guna penyedia yang sama format dengan OpenAI (`OPENAI_API_URL`, `OPENAI_MODEL`, `OPENAI_API_KEY`), yang menunjuk ke **Ollama** sendiri. Jadi data tidak keluar dari pelayan. Tanpa `OPENAI_API_KEY`, penyedia **sandbox** memberi jawapan contoh yang ditanda dengan jelas.
- Had dan masa: `AI_CHAT_MAX_SOURCES`, `AI_CHAT_MAX_TOKENS`, `AI_CHAT_TIMEOUT_MS`. Permintaan AI yang tersangkut ditutup sendiri dan kredit dipulangkan.

**Ciri yang guna kredit**

| Ciri | Endpoint | Kredit |
|---|---|---|
| Pembantu AI (chat) dengan sumber RAG | `POST /ai/chat` | 1 |
| Analisis dokumen projek atau bukti | `POST /ai/projects/:id/documents/:docId/analyze` | 5 |
| Analisis feasibility projek | `POST /ai/projects/:id/feasibility/analyze` | 100 |
| Analisis risiko atau Shariah | `POST /ai/shariah/analyze` | 15 |
| Struktur kontrak, draf, semakan klausa | `/ai/contract-advisor/...`, `/ai/contract-drafts/...`, `/ai/contracts/...` | 20 |
| Due diligence projek | `POST /ai/projects/due-diligence/scan`, `POST /ai/due-diligence/analyze` | 30 |
| Penasihat struktur aset | halaman aset | 20 |

**Alat analisis tanpa AI** (di AI Wealth Engine, di luar DEMO; tiada kredit; jawapan sama bagi data yang sama; `src/ai/features/live/LiveAnalysisTools.tsx`): Pool Matcher (pemberat tetap), Portfolio Health dan Stress Scenarios (untuk pelabur), Risk & Early Warning, Pool Sizing (untuk pihak projek dan staf).

**RAG**
- Dokumen rujukan dipecah kepada bahagian kecil (`RagDocument`, `RagChunk`) dengan skop GLOBAL, COUNTRY atau PROJECT. Carian guna kata kunci, ditambah carian vektor (pgvector) jika model embedding ditetapkan.
- Jawapan mesti menyebut sumber (`[S1]`). Sumber disimpan dan boleh disemak (`/ai/citations`). Dokumen rujukan juga melalui semakan.

**Kawalan**
- Kredit ditolak hanya selepas berjaya. Setiap permintaan direkod (`AiRun`, log audit).
- Keputusan AI hanya **cadangan**; manusia tetap perlu menyemak.
- Ciri AI dibuka ikut peringkat projek. Menu AI ikut peranan (penyemak tidak nampak alat draf).

### 5.11 Kontrak dan perjanjian (`/contracts`, `/contract-intelligence`)
- Kontrak ada versi, pihak, kelulusan dan status. Perjanjian dijana dengan templat, klausa dan semakan pematuhan.
- **Perjanjian dari perkongsian aset:**
  - satu perjanjian bagi setiap perkongsian; draf seterusnya menjadi versi baharu;
  - kedua-dua pihak setuju dengan versi terkini, kemudian semakan Legal, kemudian Shariah, oleh penyemak dari luar kedua-dua pihak;
  - **Agreement checks** (klausa wajib ikut akad, ruang kosong, terma perkongsian) dan imbasan AI membantu penyemak;
  - jika penyemak meluluskan walaupun ada semakan gagal, dia mesti beri sebab.
- **Format:** gaya perjanjian komersial Malaysia, klausa bernombor penuh untuk Musharakah dan Ijarah, jadual dan halaman tandatangan. Boleh dimuat turun sebagai PDF dan Word.
- **Tandatangan elektronik:**
  - kod sekali guna (OTP) melalui emel;
  - selepas kedua-dua pihak tandatangan, PDF akhir dengan Sijil Penyempurnaan dimeterai platform (PAdES) dan dicap masa (RFC 3161);
  - keaslian disemak setiap 6 jam dan setiap kali dimuat turun;
  - `SIGNING_REQUIRE_VERIFIED_IDENTITY=true` mewajibkan KYC atau KYB bagi penandatangan.
- **Ikut projek:** nasihat kontrak AI disimpan bagi setiap projek (`GET /ai/projects/:id/contract-advice`), dengan versi. Perjanjian yang diisi daripada projek dipautkan kepadanya (`Contract.projectId`): jana semula semasa draf menambah versi, semasa semakan ditolak, dan selepas diluluskan atau ditandatangani mencipta pindaan (`amendsContractId`). Teks pindaan khusus masih belum ada (item 5 dalam fail pending).

### 5.12 Notifikasi dan kerja latar belakang (`/notifications`, `server/src/jobs/`)
- **Saluran:** dalam aplikasi (loceng) dan **emel** (Resend atau SMTP). Keputusan 30 Oktober 2026: push (Firebase) dan SMS (Twilio) tidak digunakan, tetapi kodnya kekal. Saluran asal `IN_APP,EMAIL`. Pengguna boleh matikan emel.
- **Outbox:** notifikasi tidak dihantar dua kali, dicuba semula jika gagal, dan diasingkan jika terus gagal (dead-letter). Setiap saluran dihantar dan direkod berasingan (`deliveredChannels`), jadi cubaan semula tidak menghantar emel dua kali. Saluran yang belum disediakan dilangkau dan dicatat.
- **Bahasa:** emel keluar ikut bahasa akaun penerima (`preferences.language`). Jika belum dipilih, atau penerima tiada akaun (pelapor kematian, penerima hibah), BM untuk Malaysia dan Inggeris untuk negara lain. Rekod dalam aplikasi kekal Inggeris dan diterjemah di skrin. Teks BM di `server/src/notifications/ms-text*.ts`, dikongsi oleh server dan mini-app.
- **Notifikasi utama:** keputusan KYC dan KYB; pelaburan disahkan atau dibatalkan; pool menunggu tandatangan, dibuka dan penuh; untung dibayar atau gagal; akaun bank disahkan; tranche diminta, diluluskan, ditolak atau dikeluarkan; langkah perkongsian dan perjanjian; laporan prestasi untuk disahkan dan diterbitkan; peringatan; dan perkembangan kes pusaka.
- **Kerja berjadual (BullMQ, perlu worker):** padanan ToyyibPay (10 minit), padanan payout (15 minit), outbox notifikasi (30 saat), meterai rantai hash (5 minit).
- **Semakan harian dalam API** (tanpa worker): peringatan membership (seminggu sebelum tamat); peringatan tarikh luput aset dan takaful (30, 14 dan 7 hari sebelum, dan selepas tamat); keaslian perjanjian yang ditandatangani; dan permintaan AI yang tersangkut.

### 5.13 Audit (`/admin/audit`)
- Setiap tindakan penting direkod dalam `AuditEvent`. Rekod tidak boleh diubah atau dipadam (trigger menolak UPDATE dan DELETE). Di Admin Center › Audit Logs: senarai, tapisan, eksport CSV dan status rantai hash.

### 5.14 Smart contract dan blockchain

**Keadaan sekarang: sistem tidak guna blockchain dan tidak menjalankan smart contract.**
- **"Kontrak" dalam sistem** ialah kontrak Shariah digital: dokumen akad, terma pool yang ada versi, dan ijab qabul yang direkod dalam database, serta perjanjian yang dijana (bahagian 5.4 dan 5.11). Ia bukan kod yang berjalan di blockchain.
- **Wang sebenar** bergerak melalui ToyyibPay (FPX) dan bank. Sistem hanya merekodnya dalam lejar.
- **Teks skrin** yang dahulu menyebut "on the blockchain", "smart contract execution", "immutable ledger" dan alamat dompet palsu sudah dibetulkan pada 5 Oktober 2026 (commit `cddb011`). Perkataan "tokenization" dan hash palsu dalam skrin demo pula dibuang pada 4 November 2026.

**Asas yang sudah ada (Fasa 1):** rantai hash SHA-256 ke atas log audit dan lejar (bahagian 5.6). Ia boleh mengesan rekod yang diubah tanpa perlu blockchain.

**Had Fasa 1:** orang yang boleh menulis terus ke database boleh membina semula seluruh rantai. Ini hanya boleh dikesan jika hash terakhir rantai disimpan di luar sistem.

**Rancangan (item 9 dalam fail pending):**

| Fasa | Isi | Status |
|---|---|---|
| 0 | Betulkan teks skrin yang mendakwa guna blockchain | Siap |
| 1 | Rantai hash audit dan lejar | Siap |
| 2 | **Anchoring:** simpan hash terakhir rantai (atau Merkle root) secara berkala di blockchain awam yang murah; halaman awam **Ketelusan Zakat**; butang "Sahkan bayaran saya" dengan bukti Merkle. Tiada data peribadi di blockchain | Tunggu pilihan rangkaian, dompet dan bajet |
| 3 | **Token** bagi bahagian pool dan **smart contract escrow** | Tunggu nasihat undang-undang SC dan keputusan Shariah; token pelaburan hampir pasti dikira sekuriti |

#### Apa itu smart contract

Smart contract ialah program kecil yang disimpan dan berjalan di atas blockchain. Ada tiga ciri:
1. **Berjalan sendiri:** bila syarat dipenuhi, kod terus bertindak (contohnya pindah wang) tanpa kelulusan sesiapa.
2. **Tidak boleh diubah:** selepas dipasang, kod kekal. Pepijat sukar dibaiki.
3. **Semua orang boleh lihat:** kod dan setiap transaksi terbuka kepada awam.

Walaupun namanya "contract", ia **bukan kontrak undang-undang**. Ia kod yang menjalankan peraturan secara automatik. Contoh escrow: "Simpan wang pelabur. Jika jumlah sampai RM500,000 sebelum 31 Disember, pindah kepada pengurus projek. Jika tidak, pulangkan kepada setiap pelabur." Tiada sesiapa, termasuk platform, boleh menahan atau mengalihkan wang itu.

#### Beza dengan sistem sekarang

| Perkara | Sistem sekarang | Dengan smart contract |
|---|---|---|
| Akad (Mudarabah, Musharakah, Wakalah, Ijarah) | Terma dalam database, ada versi, dikunci selepas diterima (5.4) | Akad kekal dokumen Shariah; smart contract hanya menjalankan sebahagian terma |
| Agihan untung dan tolak rugi | Kod NestJS di pelayan platform (5.5) | Kod di blockchain |
| Siapa yang perlu dipercayai | Platform | Kod itu sendiri |
| Bukti rekod tidak diubah | Rantai hash dalaman (5.6) | Rekod blockchain awam |
| Betulkan kesilapan | Boleh, melalui dua orang (maker-checker) dan jejak audit | Sangat sukar atau mustahil |

Logik "kontrak" (agihan ikut nisbah akad, tolak rugi, kunci terma) **sudah dibina**. Bezanya, ia berjalan di pelayan platform, bukan di blockchain.

#### Kenapa smart contract ditangguh ke Fasa 3

1. **Wang ialah ringgit sebenar.** Smart contract hanya boleh mengawal aset yang ada di blockchain. Jadi ia perlu token atau ringgit digital (stablecoin), yang dikawal oleh Bank Negara dan Suruhanjaya Sekuriti (SC).
2. **Undang-undang.** Token yang mewakili bahagian pool hampir pasti dikira sekuriti, dan perlu kelulusan atau pendaftaran SC dahulu.
3. **Data dunia sebenar.** Untung atau rugi projek berlaku di luar blockchain dan mesti dimasukkan oleh manusia (akaun dan audit). Jadi kelebihan "tidak perlu percaya sesiapa" sangat terhad.
4. **Kesilapan tidak boleh diundur.** Agihan yang salah tidak boleh dibetulkan seperti dalam sistem sekarang (dua orang, pembalikan lejar).
5. **PDPA.** Data peribadi tidak boleh diletak di blockchain awam kerana ia tidak boleh dipadam atau dibetulkan.
6. **Semakan Shariah.** Kod smart contract menjadi pelaksana akad, jadi kod itu sendiri perlu keputusan Majlis Penasihat Shariah.
7. **Kos dan kepakaran.** Yuran transaksi (gas), audit keselamatan kod oleh pihak luar (biasanya puluhan ribu USD), pembangun Solidity, dan pengurusan kunci dompet.

#### Syarat sebelum mula Fasa 3

- Nasihat undang-undang bertulis, dan kelulusan SC jika perlu, bagi token pelaburan.
- Keputusan Shariah tentang reka bentuk token dan kod smart contract.
- Fasa 2 (anchoring) sudah berjalan dengan stabil.
- Keperluan perniagaan yang jelas, contohnya pasaran jual beli unit pool atau escrow automatik yang diminta pelabur.
- Bajet untuk audit keselamatan kod dan pengurusan dompet.

### 5.15 Aset (`/assets`)
- **Daftar:** Asset Owner atau Asset Manager daftar aset (tanah, bangunan, kenderaan berat, mesin) sebagai draf. Mereka muat naik dokumen, buat tiga pengakuan, dan hantar.
  - Bukti hak milik wajib. PDF/JPG/PNG disemak jenis sebenar, SHA-256 dan tanda pernah diubah.
  - Borang dan dokumen wajib ikut jenis aset: geran dan Carian Rasmi untuk tanah, VOC JPJ untuk kenderaan, invois dan plat siri untuk mesin, CCC untuk bangunan.
  - Pin peta dan gambar tapak dengan GPS.
- **Bacaan teks (OCR)** untuk geran, Carian Rasmi, cukai tanah, VOC, PUSPAKOM, invois, sijil JKKP dan laporan penilaian. Aset yang sama dikesan melalui no. hak milik/lot, casis atau siri. Jika nilai yang diisi berbeza lebih 20% daripada nilai pasaran dalam laporan penilaian, semakan menanda perbezaan itu untuk penyemak.
- **Pengesahan:** Country Admin atau Legal Officer negara itu sahkan, minta perubahan atau tolak. Mereka tidak boleh menyemak organisasi sendiri.
- **Struktur Shariah:** cadangan akad (Ijarah, Musharakah, Murabahah) dari peraturan (`asset-structuring.ts`) dan penasihat AI (20 kredit).
- **Peringatan tarikh luput** cukai jalan, insurans, PUSPAKOM, sijil JKKP (jika perlu) dan pajakan, kepada pemilik dan Asset Manager organisasi.

### 5.16 Perkongsian aset dengan projek (`/asset-partnerships`)
- PDP menyiarkan aset yang diperlukan oleh projek. Asset Owner dalam negara yang sama menawarkan aset VERIFIED. Pemilik juga boleh menawarkan aset kepada PDP (butiran sulit disembunyikan sehingga diluluskan). Pemilik aset sejenis dimaklumkan bila ada keperluan baharu.
- Rundingan (terima, tolak, tawaran balas) di bawah Ijarah atau Musharakah. **Compare offers** beri skor tetap /100 dengan penjelasan AI (tanpa nama pihak lain).
- Selepas diterima: semakan Legal dan Shariah oleh dua orang berbeza dari luar kedua-dua pihak. Panel **Pre-approval checks** menyemak dokumen, gadaian, Rizab Melayu, penilaian, nisbah modal dan untung, aktiviti halal dan lain-lain. Jika lulus walaupun ada semakan gagal, sebab wajib diberi.
- Setiap langkah ditulis ke log audit dengan cap jari SHA-256. Rekod penuh boleh dimuat turun sebagai PDF.

### 5.17 KYB organisasi dan pihak berkaitan (`/organisations`)
- Ahli organisasi isi no. pendaftaran SSM, alamat berdaftar, **jenis entiti** (GLC, syarikat, institusi, individu) dan **kumpulan syarikat**. Mereka muat naik profil syarikat SSM (wajib), senarai pengarah, pemegang saham dan resolusi lembaga, kemudian hantar.
- KYB Officer, Compliance Officer, Country Admin atau Super Admin negara yang sama membuat keputusan (bukan untuk organisasi sendiri). Skrin semakan memaparkan jenis entiti dan kumpulan, dengan peringatan supaya nama kumpulan disemak dengan pemegang saham dalam profil SSM. Butiran dikunci selepas lulus.
- **Pihak berkaitan:** pesanan dari organisasi lain dalam kumpulan yang sama dengan organisasi projek ditanda. Staf nampak label "Related party", dan pelabur nampak berapa banyak wang dalam pool datang dari pihak berkaitan. Kumpulan hanya untuk pendedahan; ia tidak memberi akses bersama.
- **Senarai kumpulan** (`/corporate-groups`; Super Admin, Country Admin, KYB Officer, Compliance Officer): nama rasmi setiap kumpulan dan ejaan lain, bagi setiap negara. Nama atau ejaan yang ditaip dalam KYB disimpan di bawah nama rasmi, supaya pihak berkaitan sentiasa dikesan. Bila kumpulan disimpan, organisasi yang sudah guna salah satu ejaannya dikemas kini.

### 5.18 Modal penaja dan takaful (`/projects/:id/safeguards`, `/safeguards/queue`)
- Penaja berjanji memberi modal (sekurang-kurangnya 10% kos projek; boleh ditukar ikut negara dengan `MIN_SPONSOR_CONTRIBUTION_PCT`) dan muat naik penyata bank. Finance Officer sahkan dan rekod setoran. Setoran direkod dalam lejar sekali gus (`SPONSOR_CAPITAL`: tunai projek bertambah, modal penaja dikreditkan).
- Syarat:
  - projek hanya boleh dihantar jika modal minimum sudah dijanjikan;
  - pool hanya boleh dibuka jika modal sudah dibuktikan;
  - wang hanya dikeluarkan jika modal sudah disetor dan semua takaful wajib berkuat kuasa.
  Setiap pengeluaran merekod bahagian penaja dan pelabur ikut nisbah.
- Takaful wajib dijana sendiri ikut projek. Pemilik aset boleh muat naik takaful untuk aset sendiri dari skrin perkongsian aset (butang "Takaful for this asset"). Risk Officer (atau Compliance) mengesahkan. Insurans konvensional hanya dibenarkan dengan kelulusan bertulis penasihat Shariah.

### 5.19 Benefisiari dan pusaka (`/estate/beneficiaries`)
- Untuk individu (Retail, HNWI, Family Office) dan Asset Owner sahaja. Pemilik pilih cara Islam (faraid, Hibah Amanah, wasiyyah) atau sivil (wasiat). Pilihan disimpan dalam akaun.
- Peraturan disemak di server: wasiyyah paling banyak 1/3 dan tidak kepada waris faraid; bahagian waris faraid tidak ditetapkan oleh pengguna; institusi tidak boleh jadi waris faraid.
- Nombor ID benefisiari disulitkan AES-256-GCM (`ESTATE_DATA_ENCRYPTION_KEY`) dan dipaparkan separuh tersembunyi. Setiap perubahan direkod dalam audit, tanpa nombor ID.
- **Wasiyyah yang perlu persetujuan waris** (kepada waris faraid, atau lebih dari 1/3) boleh disimpan jika pemilik mengesahkan bahawa ia hanya sah dengan persetujuan waris selepas kematian (`heirConsentRequired`).
- **Qabul hibah:** pemilik hantar pautan sekali guna dari web atau mini-app. Penerima menjawab di `/m/hibah/<token>` tanpa log masuk.
- **Wasi atau pentadbir** (`/estate/executors`): individu, Amanah Raya Berhad, syarikat amanah atau peguam. Nombor ID disulitkan.
- **Kes pusaka** (`/estate/death-reports`, `/estate/cases`). Dikendalikan oleh peranan **Estate Officer**; Country Admin dan Super Admin boleh mengganti.
  1. **Lapor:** wasi atau benefisiari yang direkod melapor di `/m/estate/report` tanpa log masuk. Mereka isi nombor ID dan nama si mati, nama sendiri dan empat aksara akhir ID sendiri, dan muat naik sijil kematian. Jawapan borang sentiasa sama, supaya orang tidak boleh guna borang ini untuk menyemak siapa ahli platform. Hanya laporan yang sepadan membuka kes, dan pegawai negara itu dimaklumkan.
  2. **Sahkan kematian:** akaun dibekukan (tidak boleh log masuk, pesanan PENDING dibatalkan, akaun bank payout digantung). Arahan pusaka dan pelaburan si mati hanya dipaparkan selepas itu, dan setiap paparan direkod.
  3. **Dokumen mahkamah:** Sijil Faraid, geran probet atau surat kuasa mentadbir dimuat naik dan disahkan. Persetujuan atau penolakan setiap waris direkod bagi wasiyyah yang memerlukannya.
  4. **Akaun bank pusaka:** didaftar atas nama si mati dan disahkan oleh Settlement seperti akaun lain. Untung yang belum dibayar disalurkan ke situ.
  5. **Pelan pembahagian:** bagi setiap pool, tetapkan penerima (pelabur berdaftar dengan KYC lulus dalam negara yang sama) dan bahagian (jumlah 100%). Pelan diluluskan oleh pegawai kedua (bukan orang yang menyediakannya).
  6. **Pindahan:** bila diluluskan, modal dipindah dalam lejar (transaksi `ESTATE_TRANSFER`) dari akaun si mati kepada setiap penerima. Pesanan SETTLED baharu dicipta di bawah terma akad yang sama, dan pesanan serta modal si mati ditanda `TRANSFERRED`. Penerima dimaklumkan.
  - **Emel kepada pelapor:** pelapor mendapat emel bila laporan ditolak, kematian disahkan, dokumen disahkan dan kes selesai (perlu emel Resend hidup, item 8 dalam fail pending).
  - Seluruh aliran ini masih menunggu semakan Shariah dan undang-undang (item 16 dalam fail pending).

### 5.20 Akaun amanah bagi setiap negara (`/collection-accounts`)
- Satu akaun amanah platform bagi setiap negara, bukan bagi setiap pool. Super Admin mengisinya di Admin Center › Country Nodes. Selagi kosong, pelabur diberitahu supaya jangan pindah wang. Kewangan melepaskan wang kepada projek ikut tranche.

### 5.21 Sewaan terus (Ijarah) tanpa projek (`/leasing`)
- Pemilik aset senaraikan unit dari aset yang disahkan. Syarikat penyewa yang KYB-nya lulus memohon dan berunding. Kelulusan Legal dan Shariah oleh dua orang berbeza dari luar kedua-dua pihak (aktiviti yang mungkin haram ditanda). Ada jadual sewa bulanan dan rekod bayaran oleh pemilik.
- Ada di mini-app dan tab Sewaan di web.
- Keputusan sementara: sewa dibayar terus ke akaun pemilik; platform hanya merekod.
- **Pembaharuan:** penyewa memohon, atau pemilik menawarkan dahulu. Sewaan baharu bermula sehari selepas sewaan lama tamat dan melalui rundingan, kelulusan dan perjanjian yang sama. Bagi tawaran pemilik, penyewa membuat akuan patuh Shariah semasa menerima atau membalas. Deposit ubah suai yang sudah dipulangkan tidak diminta semula.
- **Deposit dibawa:** bila pembaharuan diluluskan, deposit yang masih dipegang dibawa mengikut jenis, sehingga jumlah yang diperlukan. Kekurangan dibayar penyewa (pemilik merekodnya); lebihan kekal boleh dipulangkan di bawah sewaan lama. Jika deposit sewaan lama direkod selepas kelulusan, ia dibawa ketika itu.
- **Bil utiliti:** bila pemilik yang membayar bil (`OWNER_RECHARGE`), pemilik merekod bil setiap bulan pada kos sebenar dengan nombor bil. Penyewa dimaklumkan, bayar dalam 14 hari secara lalai, dan pemilik merekod penerimaan. Satu bil bagi setiap bulan dan jenis (`LeaseUtilityCharge`). Bil yang belum dibayar boleh dibuang dengan sebab; log audit menyimpannya.
- **Deposit utiliti ikut negeri:** Super Admin dan Country Admin menetapkan bulan bagi setiap negeri (tab Sewaan › Deposit utiliti, `UtilityDepositRule`). Nilai ini menjadi nilai awal unit baharu; lalai 1 bulan. Pemilik boleh mengubahnya, dan unit sedia ada tidak terjejas.
- **Pengesahan bayaran dua orang:** jika syarikat pemilik ada sekurang-kurangnya seorang bertugas Akaun, rekod sewa jadi dua langkah. Pemilik Aset atau pegawai bertugas SOA merekod bayaran (status `RECORDED`, "Menunggu pengesahan Akaun"); Akaun dan Pemilik Aset dimaklumkan. Akaun (atau Pemilik Aset) menyemak bank lalu mengesahkan (`PAID`, penyewa dimaklumkan) atau menolak dengan sebab (bulan itu kembali belum bayar, perekod dimaklumkan). Orang yang merekod tidak boleh mengesahkan bayaran sendiri. Peringatan kutipan tidak boleh dihantar semasa bayaran menunggu pengesahan. Jika tiada sesiapa bertugas Akaun, seorang sahaja merekod seperti dahulu.
- **Penyata akaun (SOA):** PDF BM/EN bagi setiap sewaan yang diluluskan: semua sewa dan bil utiliti yang dikenakan setakat tarikh penyata, status, tarikh bayar, rujukan, jumlah dibayar dan baki tertunggak (bayaran yang sedang disahkan tidak dikira tertunggak). Pemilik dan penyewa boleh memuat turunnya di halaman sewaan. Sistem menghantarnya kepada penyewa secara automatik sekali setiap bulan (semakan harian, `LeaseStatement`); sewaan yang sudah tamat hanya menerimanya selagi ada baki. Pemilik Aset atau pegawai SOA boleh menghantarnya semula bila-bila masa.

### 5.22 Tadbir urus di Admin Center (`/governance`, `/dashboard`)
- **Papan pemuka** Compliance, Audit, Finance dan Security dari database (untuk Super Admin, Country Admin, Compliance Officer, Auditor). Security Dashboard menyemak tetapan pelayan yang perlu untuk production.
- **Regulatory Reports:** eksport CSV (daftar pelabur, daftar KYC, pihak berkaitan, agihan, payout). Setiap eksport direkod dalam audit.
- **Risk Register, Incidents, Fatwa Repository:** rekod sebenar dengan sejarah dan audit (`RiskItem`, `Incident`, `FatwaResolution`).
- **Approval Matrix, Platform Fee Schedule, PDP Country Rules:** baca sahaja, dari nilai yang sama yang digunakan oleh kod.
- **AML, PEP dan Sanctions:** memaparkan nota bahawa penyedia saringan belum dipilih.
- **Problem Projects** (`/project-admin`; Super Admin, dan Country Admin dalam negaranya): arkib projek yang belum ada wang pelabur yang disahkan (pesanan belum bayar dibatalkan, pool ditutup), atau gantung projek semasa masalah disiasat (pool OPEN dijadikan PAUSED). Kedua-duanya boleh dibatalkan. Sebab wajib; penaja dan pelabur dimaklumkan, dan pelabur nampak label "Suspended" dengan sebabnya dalam Investments. Sama seperti Urus projek di mini-app.
- Juga ada: User Directory, Organisations, Country Nodes, Role Management, Permission Matrix, Workflow Pipelines, Revenue, Promotions, System Status, Settlement Clearing, Payout Account Verification, kandungan laman awam, dan Shariah Governance (`/site-content`).
- **Laman awam** (About D-8, Member States): teks (tajuk, pengenalan, perjalanan, tonggak, sumbangan setiap negara) diedit di Admin Center › Public Site Content. Angka setiap negara (organisasi, projek, pool, pengguna) dan nama regulator dibaca terus dari database melalui `GET /public/network` (tanpa log masuk; hanya negara ACTIVE; organisasi peribadi individu tidak dikira). Data contoh hanya dipaparkan dalam mod DEMO.

### 5.23 Laporan prestasi projek (`/performance-reports`)
- PDP (Project Sponsor, Project Manager, Organization Admin organisasi projek) isi laporan bagi setiap suku tahun yang sudah tamat: hasil dan kos sebenar berbanding unjuran, milestone ikut masa, bajet yang digunakan, isu Shariah, dapatan audit, sehingga 5 KPI ikut sektor, dan ulasan. Untung yang diagih diisi sendiri oleh server dari agihan yang diluluskan dalam suku itu.
- Juruaudit (Auditor) dari negara yang sama dan organisasi lain mengesahkan atau memulangkan dengan nota. Laporan yang disahkan dikunci dan dipaparkan kepada pelabur projek, dengan notifikasi. Senarai laporan untuk juruaudit ada di tab Documents.

### 5.24 Mini-app D8 Ideas (`/m`)
- Log masuk, KYC dengan kamera dan semakan wajah, pool dan pesanan dengan arahan bayaran, portfolio, papan pemuka pelabur, profil, benefisiari, pengguna (Country Admin), sejarah keuntungan, notifikasi, penyata (PDF), zakat, sewaan, agihan (Settlement Officer), semakan (KYC Officer dan Compliance Officer untuk KYC; Legal dan Shariah untuk perjanjian), dan borang lapor kematian. Dalam BM dan EN (pilihan disimpan dalam akaun).
- **Semakan:** tab Semakan (Super Admin dan Country Admin membukanya dari Utama). Keselamatan yang sama seperti web: sebab wajib bila semakan automatik gagal, pengesahan amaran, asingan tugas di server, dan log audit.
- Log masuk (SSO) dan push melalui D8 Ideas menunggu spesifikasi mereka.

---

## 6. Database

- **106 model** dan **92 migration** (`server/prisma/migrations/`).
- **Jadual yang tidak boleh diubah** (UPDATE dan DELETE ditolak oleh trigger): `AuditEvent`, `LedgerTransaction`, `LedgerEntry`, `HashChainLink`, `PoolAkadTerms`.
- **Peraturan penting dalam database:**
  - baki lejar mesti seimbang;
  - satu nombor ID KYC untuk satu akaun sahaja;
  - satu keputusan aktif bagi setiap peringkat feasibility;
  - satu laporan prestasi bagi setiap projek dan suku;
  - jenis tempoh agihan: `PROFIT`, `LOSS`, `ABSORBED`;
  - nisab mesti positif dan tempohnya sah.
- **Data sulit disulitkan:** nombor akaun payout (`PAYOUT_DESTINATION_ENCRYPTION_KEY`), nombor ID benefisiari serta wasi (`ESTATE_DATA_ENCRYPTION_KEY`), dan nombor dokumen ID dalam KYC (`KYC_DATA_ENCRYPTION_KEY`; disimpan bersama hash berkunci untuk semakan ID berulang dan 4 aksara akhir untuk paparan bertopeng; rekod lama ditukar dengan `scripts/encrypt-kyc-identity.ts`). Fail KYC, bukti dan dokumen masih disimpan dalam database (`Bytes`). Rancangan untuk pindah ke DigitalOcean Spaces ada dalam item 14.

---

## 7. Keselamatan dan integriti

- Setiap baca dan tulis disemak tenant. Setiap endpoint disemak peranan (`@Roles`, `@RequirePermission`).
- **Pengasingan tugas:** pegawai tidak boleh:
  - menyelesaikan pesanan sendiri;
  - meluluskan agihan atau tranche sendiri;
  - mengesahkan akaun bank sendiri;
  - menyemak organisasi atau aset sendiri;
  - memutuskan feasibility projek organisasi sendiri;
  - meluluskan pelan pusaka yang dia sediakan sendiri.
  Seorang hanya memutuskan satu peringkat feasibility bagi setiap analisis.
- Kunci rekod (`FOR UPDATE`, dan advisory lock untuk had KYC) supaya sesuatu tidak diproses dua kali.
- Kunci idempotensi untuk lejar, pesanan pelaburan dan payout (permintaan yang dihantar dua kali hanya diproses sekali).
- Helmet, had kadar permintaan dan CORS (`CORS_ORIGINS` wajib di production). Production hanya terima `oidc` dan RS256.
- Webhook payout dengan tandatangan HMAC (`PAYOUT_WEBHOOK_SECRET`).
- Rantai hash ke atas audit dan lejar; semakan keaslian dokumen bukti dan perjanjian yang ditandatangani.
- Rahsia tidak disimpan dalam Git: `server/.env`, `server/.env.production` dan `server/ops/secrets/*` diabaikan.
- Eksport CSV membuang teks yang boleh dijalankan sebagai formula dalam Excel.

---

## 8. Tetapan (environment variables) utama

**Backend (`server/.env`; contoh dan penerangan dalam `server/.env.example` dan `server/.env.production.example`):**

| Kumpulan | Tetapan |
|---|---|
| Asas | `DATABASE_URL`, `PORT`, `NODE_ENV`, `AUTH_MODE`, `CORS_ORIGINS`, `COUNTRY_NODE_ID`, `PUBLIC_API_BASE_URL` |
| OIDC | `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URI` |
| AI | `OPENAI_API_URL`, `OPENAI_MODEL`, `OPENAI_API_KEY`, `RAG_EMBEDDING_MODEL` |
| ToyyibPay | `TOYYIBPAY_BASE_URL`, `TOYYIBPAY_SECRET_KEY`, `TOYYIBPAY_CATEGORY_CODE`, `TOYYIBPAY_CALLBACK_URL`, `TOYYIBPAY_RETURN_URL`, `ALLOW_SIMULATED_PAYMENTS`, `MEMBERSHIP_CREDIT_VALUE_MYR` |
| Pelaburan | `KYC_INVESTMENT_LIMITS`, `MIN_SPONSOR_CONTRIBUTION_PCT` |
| Penyulitan dan payout | `PAYOUT_DESTINATION_ENCRYPTION_KEY`, `PAYOUT_WEBHOOK_SECRET`, `ESTATE_DATA_ENCRYPTION_KEY` |
| Redis dan worker | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD_FILE`, `REDIS_TLS`, `REDIS_CA_CERT_FILE`, `WORKER_ENABLED`, `WORKER_CONCURRENCY` |
| Emel dan notifikasi | `NOTIFICATION_DEFAULT_CHANNELS`, `NOTIFICATION_EMAIL_PROVIDER` (`resend` atau `smtp`), `NOTIFICATION_EMAIL_FROM`, `RESEND_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` |
| Tandatangan | `SIGNING_OTP_CHANNEL`, `SIGNING_P12_PATH`, `SIGNING_P12_PASSPHRASE`, `SIGNING_TSA_URL`, `SIGNING_ALLOW_SELF_SIGNED`, `SIGNING_REQUIRE_VERIFIED_IDENTITY` |
| KYC | `KYC_REQUIRE_LIVENESS`, `KYC_ROUTING_JSON`, `KYC_VENDOR_A_*`, `KYC_ML_URL`, `KYC_ML_MEDIA_DIR` |
| Zakat | `ZAKAT_COLLECTION_APPOINTMENT_REF` (hanya selepas dilantik secara rasmi sebagai ejen kutipan) |

**Web (`.env.local`; contoh dalam `.env.example`):** `VITE_API_BASE_URL`, `VITE_AUTH_MODE`, `VITE_OIDC_*`, `VITE_SINGLE_ROLE_MODE`, `VITE_DATA_SOURCE`.

---

## 9. Ujian

- Backend: `cd server; npm test`. Ada **103 fail ujian** (`*.spec.ts`). CI di GitHub menjalankan semua ujian, termasuk ujian integrasi, bagi setiap push.
- Di PC pembangunan (7.8 GB RAM), jangan jalankan semua ujian sekali gus dalam Docker kerana Docker akan tergantung. Jalankan sedikit demi sedikit, contohnya `npm test -- --runInBand src/estate`.
- Semak jenis (type-check, termasuk fail ujian): `npx tsc --noEmit` (web) dan `cd server; npm run typecheck`.
- Ujian integrasi (PostgreSQL + Redis): `RUN_INTEGRATION_TESTS=true npm run test:integration`.
- Ujian terus secara local sudah dibuat bagi had KYC, peringatan aset, pihak berkaitan, endpoint governance, laporan prestasi dan aliran kes pusaka.

---

## 10. Status skrin web (di luar mod DEMO)

| Skrin | Status |
|---|---|
| Dashboard setiap peranan, My reviews | Data sebenar |
| Wealth Pooling (projek, pool, kitaran 17 langkah, tandatangan, buka pool) | Data sebenar |
| Investments: pelabur (pelaburan, label projek digantung, keuntungan, perjanjian, laporan prestasi, pool OPEN, arahan bayaran); staf (pesanan) | Data sebenar |
| Asset Register, Asset Partnerships, perjanjian dan tandatangan | Data sebenar |
| Sponsor Portal (projek, KYB, modal dan takaful, kempen, penyata, laporan prestasi, keahlian) | Data sebenar |
| KYC, KYB dan semakan | Data sebenar |
| AI Wealth Engine (ciri AI dan alat analisis) | Data sebenar |
| Financials: transaksi, penyata, zakat, cukai, settlement, agihan keuntungan (Settlement Officer, Super Admin) | Data sebenar (pelabur hanya nampak pesanan dan keuntungan sendiri) |
| Ledger dan Audit Logs | Data sebenar |
| Document Vault | Data sebenar: dokumen projek; dokumen aset (pemilik, Asset Manager, Legal); dokumen KYB (KYB, Compliance); laporan untuk disahkan (Auditor) |
| Membership, bil, kredit AI | Data sebenar (backend + ToyyibPay) |
| Beneficiaries dan kes pusaka | Data sebenar |
| Admin Center (semua bahagian) | Data sebenar; AML, PEP dan Sanctions memaparkan nota "belum tersedia" |
| Multi-Wallet | Staf: akaun lejar sebenar; pelabur: nota "belum tersedia" (akaun pelabur belum direka) |
| Asset Marketplace | Pool OPEN sebenar; senarai aset contoh hanya dalam DEMO |

Dalam mod DEMO, beberapa skrin masih memaparkan data contoh (`src/data/`).

---

## 11. Had dan kerja yang belum siap

Senarai penuh ada dalam [PENDING_ACTIVITIES.md](PENDING_ACTIVITIES.md). Yang utama:
- **Perlu penasihat Shariah:** cara tolak rugi dari modal pelabur, kira akhir pool, proses jika pengurus cuai, bahagian rugi rakan kongsi Musharakah, teks templat perjanjian, dan aliran pusaka.
- **Perlu penasihat cukai:** cukai pegangan bukan pemastautin, cukai perkhidmatan, e-Invois MyInvois, negara D-8 lain.
- **Perlu Compliance:** had pelaburan ikut tahap KYC (sekarang nilai sementara), format laporan regulator, penyedia eKYC dan saringan AML/PEP.
- **Perlu keputusan:** penyedia payout bank/DuitNow, pelantikan ejen kutipan zakat, tempoh simpan data biometrik (PDPA), reka bentuk akaun pelabur (Multi-Wallet).
- **Sebelum production:** rekod DNS Resend, sijil TLS Redis, akaun ToyyibPay live, sijil meterai dari pihak yang dipercayai, fail ke Spaces, Keycloak, dan semua baris Security Dashboard "Yes".
