# Dokumentasi Sistem Wealth Pooling (House of Wealth)

Keadaan sistem pada **3 November 2026**, cawangan `feat/keycloak-oidc-auth`. Dokumen ini menerangkan apa yang ada dalam sistem sekarang. Kerja yang belum siap disenaraikan dalam [PENDING_ACTIVITIES.md](PENDING_ACTIVITIES.md); arahan menjalankan sistem ada dalam [RUN_COMMANDS.ps1](RUN_COMMANDS.ps1); [README.md](README.md) (bahasa Inggeris) ialah ringkasan untuk pembangun.

> Seni bina sasaran untuk 9 negara D-8 ada dalam *D-8 Wealth Pooling Master Architecture v1.0* dan *D-8 Wealth Pooling Technical Design Document v1.0* (Claude Docs). Kemas kini dokumen ini setiap kali modul, endpoint, migration atau peraturan perniagaan berubah, terutamanya bahagian 5, 6, 9 dan 10.

---

## 1. Ringkasan

Wealth Pooling ialah platform pelaburan patuh Shariah untuk negara anggota D-8. Rakan penghantar projek (PDP) mendaftarkan projek dan bukti; projek melalui analisis kebolehlaksanaan (feasibility) dan semakan berperingkat sehingga keputusan Jawatankuasa Shariah; kemudian dana dikumpul daripada pelabur melalui **pool** di bawah **akad** (Mudarabah, Musharakah, Wakalah atau Ijarah). Keuntungan diagihkan mengikut nisbah dalam akad, dan semua aliran wang direkod dalam lejar kewangan berganda (double-entry) yang dirantai hash.

Sistem juga mempunyai:
- pendaftaran pengguna, KYC (semakan wajah dan bacaan dokumen) dan KYB organisasi;
- pendaftaran aset (tanah, bangunan, kenderaan berat, mesin), perkongsian aset dengan projek dan sewaan terus (Ijarah);
- perjanjian dengan tandatangan elektronik, meterai PAdES dan cap masa;
- modal penaja dan takaful wajib sebelum dana dikeluarkan;
- keahlian (membership) dan kredit AI berbayar melalui ToyyibPay;
- ciri AI (feasibility, kontrak, due diligence, pembantu RAG) dengan model sendiri (Ollama), serta alat analisis berasaskan peraturan;
- zakat ikut pusat zakat negeri (pilihan pengguna), penyata cukai dan penyata kewangan;
- benefisiari dan arahan pusaka (Islam atau sivil);
- tadbir urus di Admin Center: papan pemuka, laporan regulator, daftar risiko, insiden, repositori fatwa;
- laporan prestasi projek suku tahunan yang disahkan juruaudit;
- notifikasi dalam aplikasi dan e-mel;
- mini-app untuk super app D8 Ideas (`/m`), dalam BM dan EN;
- log audit append-only dan rantai hash untuk mengesan perubahan rekod.

Pengguna boleh Muslim atau bukan Muslim. Sistem **tidak menyimpan agama**: cukai terpakai kepada semua pengguna, zakat ialah pilihan yang dihidupkan sendiri.

---

## 2. Seni bina dan teknologi

| Lapisan | Teknologi | Lokasi |
|---|---|---|
| Frontend web dan mini-app | React 19, Vite 6, Tailwind CSS 4, TypeScript 5.8 | `src/` (mini-app `src/mobile/`, laluan `/m`), port **3000** |
| Backend API | NestJS 10, TypeScript, Prisma 6 | `server/src/`, port **3001** |
| Database | PostgreSQL dengan pgvector | local: container Docker (lihat `RUN_COMMANDS.ps1`); staging: DigitalOcean Managed PostgreSQL |
| Queue dan job | Redis 7 + BullMQ (`server/src/worker.ts`), dan semakan harian dalam API sendiri | `server/src/jobs/`, fail `*.sweeper.ts` |
| AI | Model sendiri melalui Ollama (API serasi OpenAI); staging guna droplet `how-ai` dengan `qwen2.5:7b` | `server/src/ai/` |
| Identiti | Keycloak (`AUTH_MODE=oidc`); `AUTH_MODE=mock` untuk pembangunan sahaja | `server/keycloak/`, [server/KEYCLOAK_SETUP.md](server/KEYCLOAK_SETUP.md) |
| Pembayaran | ToyyibPay (FPX) | `server/src/membership/toyyibpay.service.ts` |
| E-mel | Resend atau SMTP (nodemailer) | `server/src/notifications/email-config.ts` |
| PDF dan tandatangan | pdfkit; meterai PAdES dan cap masa RFC 3161 | `server/src/statements/`, `server/src/contract-intelligence/signing/` |
| KYC tempatan | tesseract.js (OCR), onnxruntime-node (YuNet/SFace) | `server/src/kyc/` |

**Persekitaran:**

| Persekitaran | Lokasi | Catatan |
|---|---|---|
| Local | PC pembangun | `AUTH_MODE=mock`, data seed |
| Staging | DigitalOcean (Singapura), `how-staging.alhidayahgroup.com.my`, `how-staging-api…`, `how-staging-auth…` | PM2 untuk API, nginx untuk web, Keycloak dalam Docker; deploy manual ([PANDUAN_STAGING_DIGITALOCEAN.md](PANDUAN_STAGING_DIGITALOCEAN.md)) |
| Demo awam | Plesk, `how.alhidayahgroup.com.my` | build statik dengan data dirakam (bahagian 3.1) |

**Struktur folder utama:**
- `src/components/`: skrin web (dashboard, pooling, financials, membership, admin dan lain-lain).
- `src/mobile/`: mini-app D8 Ideas.
- `src/services/`: klien API (`apiClient.ts`, `statementsApi.ts`, `apiFetch.ts`).
- `server/src/<modul>/`: satu folder bagi setiap modul backend (controller, service, DTO, ujian).
- `server/prisma/schema.prisma` dan `server/prisma/migrations/`: schema database dan migration.
- `server/ops/`: rahsia (diabaikan Git) dan konfigurasi Redis.

---

## 3. Menjalankan sistem

Arahan penuh, termasuk pengguna ujian dan penyelesaian masalah, ada dalam [RUN_COMMANDS.ps1](RUN_COMMANDS.ps1). Ringkasnya:

```powershell
cd server; npx prisma migrate deploy; npm run start:dev   # backend, port 3001
npm run dev                                                # frontend, port 3000 (dari folder utama)
curl.exe http://localhost:3001/health                      # semak backend
```

- Data contoh: `cd server; npm run db:seed`.
- Worker latar belakang: set `WORKER_ENABLED=true` dalam `server/.env` dan jalankan `npm run start:worker` (perlukan Redis). Peringatan harian (membership, aset, takaful) berjalan dalam API sendiri dan tidak memerlukan worker.
- Pengguna baharu dan KYC: [PANDUAN_PENGGUNA_BARU_KYC.md](PANDUAN_PENGGUNA_BARU_KYC.md).
- Deploy staging: `git pull`, `npm ci`, `npx prisma generate`, `npm run build`, `npx prisma migrate deploy`, `pm2 restart how-api`, kemudian build web ke `/opt/how-web`.

### 3.1 Mod demo frontend sahaja (tanpa backend)

Untuk menunjuk sistem secara langsung tanpa mendedahkan backend, frontend boleh berjalan dengan data seed yang dirakam (`VITE_DATA_SOURCE=static`, fail [.env.demo](.env.demo)).

- **Cara berfungsi:** semua panggilan API melalui `apiFetch` ([src/services/apiFetch.ts](src/services/apiFetch.ts)). Dalam mod demo, jawapan diambil daripada `public/demo-data/<pengguna>__<peranan>.json`, bukan dari server. Tindakan tulis (hantar, lulus, bayar) memaparkan "Demo mode: this action is not saved"; tiada apa yang disimpan. Label "Demo mode" dipaparkan di sudut skrin.
- **Persona yang dirakam:** Super Admin, Country Admin, Project Sponsor, Asset Owner, Retail Investor (Siti Aminah, pelabur individu Malaysia dengan KYC diluluskan), Shariah Reviewer, Legal Officer. Lima yang pertama aktif secara lalai (`STATIC_DEMO_ROLES`); Super Admin boleh menghidupkan Shariah Reviewer dan Legal Officer di Role Availability. Pilihan itu disimpan dalam pelayar sahaja.
- **Jalankan:** `npm run dev:demo` (local) atau `npm run build:demo` lalu hoskan folder `dist/` sebagai laman statik. Tiada database, Redis, Keycloak atau kunci API diperlukan.
- **Rakam semula** (selepas data seed atau skrin berubah):
  1. Hidupkan backend dengan data seed (port 3001).
  2. `npm run demo:record` (proksi port 3002; tindakan tulis disekat supaya database tidak berubah).
  3. Jalankan frontend dengan `VITE_API_BASE_URL=http://localhost:3002`, log masuk sebagai setiap persona dan buka skrin yang ingin dirakam.
  4. **Wajib sebelum commit:** `npm run demo:sanitize`. Ia membuang semua rekod milik pengguna yang mendaftar sendiri (`USR-REG-*`, iaitu penguji sebenar) supaya hanya data seed diterbitkan, dan gagal jika data peribadi mereka masih ada.
- **Had:** hanya skrin yang dibuka semasa rakaman ada data; skrin lain memaparkan "this screen has no recorded data yet". Data tidak berubah dan kembali asal selepas refresh.

**Mod DEMO lain:** `VITE_AUTH_MODE=DEMO` (dengan backend) memaparkan data contoh terbina dalam pada beberapa skrin. Di luar DEMO, setiap skrin membaca server atau menyatakan dengan jelas bahawa ia belum tersedia (bahagian 10).

---

## 4. Pengesahan, peranan (RBAC) dan tenant

### 4.1 Pengesahan
- **`AUTH_MODE=oidc`**: token JWT dari Keycloak (RS256 sahaja di production); pengguna dipadankan melalui `idpSubjectId`. Production menolak `mock` semasa server dimulakan dan bagi setiap permintaan.
- **`AUTH_MODE=mock`** (pembangunan): bahagian pertama token ialah JSON base64url `{mock, role, countryNode, org}`; `mock` ialah akhiran ID pengguna (contoh `INV-MYS-01` bagi `USR-INV-MYS-01`). Pengguna mesti wujud dan aktif dalam database.
- Frontend: `VITE_AUTH_MODE`, `VITE_OIDC_*`; `VITE_SINGLE_ROLE_MODE` mengehadkan log masuk demo kepada satu peranan ujian.

### 4.2 Peranan dan tugasan
- **36 peranan** (`server/src/policy/permissions.ts`), dikumpulkan dalam frontend mengikut kumpulan (`src/rbac/roles/`).

| Kumpulan | Peranan |
|---|---|
| Pentadbiran sistem | Super Admin, System Administrator, Security Administrator, Data Administrator, AI Administrator, AI Model Reviewer |
| Tadbir urus tenant | Country Admin, Organization Admin |
| Projek dan aset | Project Sponsor, Project Manager, Asset Owner, Asset Manager, Pool Manager |
| Pelabur | Retail Investor, HNWI Investor, Institutional Investor, Corporate Investor, Family Office, Portfolio Manager |
| Shariah | Shariah Advisor, Shariah Reviewer, Shariah Committee |
| Pematuhan dan risiko | Compliance Officer, KYC Officer, KYB Officer, AML Officer, Risk Officer, Fraud Analyst, Legal Officer |
| Kewangan | Finance Officer, Treasury Officer, Settlement Officer, Reconciliation Officer, Auditor |
| Lain-lain | Customer Support, Guest |

- **Satu Super Admin** untuk seluruh sistem (keputusan 2026-10-15); hanya dia mencipta Country Admin. Super Admin tidak boleh diberi atau ditarik melalui sistem (skrip `ensure-single-super-admin.ts`).
- Peranan diberi melalui **`UserRoleAssignment`**: setiap tugasan mengikat satu peranan kepada satu organisasi dan satu negara, dan boleh dinyahaktifkan. Pengguna tidak boleh memberi peranan kepada diri sendiri.
- **Peranan aktif:** peranan dalam token hanya diterima jika pengguna memang memegangnya dalam database.
- **Member ID** `USR-MYS-XXXXXXXX`; individu mendapat organisasi peribadi `ORG-MYS-IND-…`. Negara akaun ditetapkan semasa pendaftaran dan tidak boleh ditukar.
- **Persetujuan PDPA:** notis privasi dwibahasa dan rekod `PrivacyConsent` (deraf masih perlu semakan peguam).
- **Pentadbiran pengguna dan tenant** (Admin Center; Super Admin, dan Country Admin dalam negaranya; setiap tindakan diaudit dengan sebab):
  - **User Directory:** tambah atau buang peranan, gantung atau aktifkan akaun (bukan akaun sendiri), dan **pindah** seseorang ke organisasi aktif lain dalam negara yang sama (`POST /users/:id/organisation`). Semua peranannya berpindah; tugasan lama dibatalkan, bukan dipadam. Country Admin tidak boleh memindahkan pentadbir, dan Super Admin tidak boleh dipindahkan.
  - **Organisations:** cipta organisasi (`POST /organisations`; nama tidak boleh berulang dalam negara yang sama) dan gantung atau aktifkan semula (`PATCH /organisations/:id/status`). Tiada sesiapa boleh menggantung organisasi sendiri atau organisasi Super Admin; Country Admin tidak boleh menggantung organisasi yang mempunyai pentadbir.
  - **Country Nodes** (Super Admin sahaja): cipta (`POST /country-nodes`) dan nyahaktifkan atau aktifkan semula (`PATCH /country-nodes/:code/status`), kecuali negara Super Admin.
  - **Role Management:** senarai pengguna yang sama (peranan, organisasi, gantung) di bahagian atas, diikuti katalog 36 peranan: siapa memegang setiap peranan, kebenaran yang dikuatkuasakan server, dan sama ada peranan dimatikan dalam Role Availability. Peranan tetap dalam kod; cipta peranan sendiri, jemput pengguna dan tukar peranan hanya dalam mod DEMO.
  - **Kesan gantung:** pengguna, organisasi atau negara yang digantung tidak boleh log masuk (`IdentityService`) dan tidak boleh diberi peranan baharu. Rekod kekal. Organisasi dan negara tidak boleh dipadam selepas ada rekod audit; gantung ialah cara menamatkannya.

### 4.3 Kebenaran (permission)
- **Model:** setiap peranan mempunyai senarai **tindakan** (`create`, `read`, `update`, `delete`, `approve`, `disburse`, `audit`, `export`) bagi setiap **modul sumber** (`dashboard`, `assets`, `contracts`, `marketplace`, `pooling`, `ledger`, `profile`, `governance`, `approvals`, `users`, `audit_logs`, `reports`). Dinilai oleh `PolicyEngine` di server.
- **Penguatkuasaan di server:** `@RequirePermission(modul, tindakan)` (109 penggunaan) dan `@Roles(...)` (188 penggunaan) pada controller, melalui guard global `OidcGuard` dan `RolesGuard`, ditambah semakan dalam servis (contohnya pengasingan tugas, bahagian 7).
- **Matriks kelulusan:** Admin Center › Approval Matrix memaparkan siapa memutuskan setiap langkah dan peraturannya, dibina daripada senarai peranan yang sama yang disemak oleh servis (`server/src/governance/approval-matrix.ts`).
- **Frontend** (`src/rbac/`): `RoleGuard` dan senarai tab setiap peranan menyembunyikan skrin yang tidak dibenarkan. Ini untuk pengalaman pengguna sahaja; keputusan sebenar dibuat di server.

### 4.4 Tenant
- Setiap rekod milik satu **negara (country node)**, contohnya `CN-MYS`, dan satu **organisasi**. Pengguna hanya membaca dan menulis dalam tenant mereka (`assertTenantScope`, `tenantScopeFilter`); Super Admin merentas tenant. `COUNTRY_NODE_ID` (pilihan) menolak negara lain pada satu pelayan.
- Zon masa dan format telefon mengikut negara (GMT+8 dan +60 bagi Malaysia).
- **Pelabur:** peranan pelabur boleh melihat dan melabur dalam pool OPEN milik organisasi lain dalam **negara yang sama** (`server/src/pools/pool-access.ts`). Pesanan memerlukan KYC APPROVED dan ditolak bagi organisasi yang menjalankan projek, penaja projek dan pemegang peranan PDP. Pelabur hanya melihat pesanan sendiri.

### 4.5 Modul ciri
Admin boleh menghidupkan atau mematikan modul (`GET/PATCH /admin/modules`): `ASSET_REGISTRATION`, `WEALTH_POOLING`, `SHARIAH_GOVERNANCE`, `AI_INTELLIGENCE`, `CONTRACTS`, `DOCUMENT_VAULT`, `FINANCIAL_LEDGER`, `SECONDARY_MARKET`, `KYC_VERIFICATION`, `KYB_VERIFICATION`. Mod: `ACTIVE`, `MANUAL_REVIEW` atau `DISABLED`; endpoint modul yang dimatikan ditolak oleh `FeatureModuleGuard`. Financial Ledger sentiasa aktif. Secondary Market belum mempunyai backend, jadi suisnya dikunci dan ditanda "Not built yet".

### 4.6 Peranan aktif (Role Availability)
Super Admin boleh menghidupkan atau mematikan peranan untuk seluruh platform di **Admin Center › Role Availability** (`GET /roles/availability`, `PATCH /admin/roles/:role/availability`). Peranan yang dimatikan tidak boleh digunakan untuk log masuk ("Your role is currently disabled on this platform"), diberi kepada pengguna atau dipilih semasa mendaftar. Rekod pemberian peranan tidak dipadam, jadi menghidupkan semula peranan memulihkan akses. Super Admin dan Guest sentiasa aktif. Data seed menghidupkan set demo sahaja; peranan seperti Legal Officer, peranan Shariah dan Auditor perlu dihidupkan sebelum digunakan.

---

## 5. Modul fungsi

### 5.1 Pengguna dan KYC (`/users`, `/kyc`, `/auth`)
- Pendaftaran, profil, peranan; pilihan profil (kontrak pilihan, notifikasi, rangka pusaka, bahasa) disimpan dalam `preferences` di server.
- KYC: borang, muat naik dokumen, hantar untuk semakan, keputusan pegawai KYC (lulus dengan **tahap KYC** LEVEL_1/2/3, pulangkan atau tolak).
- **Semakan automatik (nasihat sahaja; pegawai yang memutuskan):** konsistensi dokumen, nombor ID pendua, bacaan kandungan dokumen (OCR), dan prototaip **liveness** (gerakan kepala rawak, kad dipegang ke kamera, padanan wajah). `KYC_REQUIRE_LIVENESS` kini `false`.
- Rangka penyedia eKYC luar (`KYC_ROUTING_JSON`, adapter `http-vendor`, mod bayangan) sedia, tetapi penyedia belum dipilih.

### 5.2 Projek, bukti dan feasibility (`/projects`, `/ai/projects/...`)
- Projek dengan status kitaran hayat, milestone, pasukan, pengumuman dan kempen promosi (dibayar melalui ToyyibPay atau kredit).
- **Bukti projek** dimuat naik dan dianalisis AI, dengan pemeriksaan integriti (SHA-256, metadata PDF, kesan suntingan bertambah, fail sama dalam projek lain). Sebarang amaran mengekalkan status REQUIRES_REVIEW.
- **Analisis feasibility** dengan revision bernombor dan semakan berperingkat: DRAFT → Finance → Risk → Compliance → Shariah → Investment Committee → **Final Decision** (Jawatankuasa Shariah).
- **Pengasingan tugas:** selepas DRAFT, penyemak daripada organisasi projek tidak boleh memutuskan; seorang hanya memutuskan satu peringkat bagi setiap analisis (memutuskan semula peringkat yang sama selepas *request changes* dibenarkan). Akibatnya Investment Committee dan Final Decision memerlukan dua ahli Jawatankuasa Shariah yang berbeza.
- Projek yang diluluskan dikunci; hanya Super Admin atau Country Admin boleh membukanya semula sebelum dana diterima.
- **Halaman Wealth Pooling:** senarai projek dan pool daripada server, kitaran 17 langkah dengan panel langkah seterusnya.

### 5.3 Tadbir urus Shariah (`/shariah/reviews`)
- Semakan Shariah, keputusan, pembatalan dan penghantaran semula. Peti **My reviews** di dashboard penyemak menghimpun semua semakan yang menunggu.

### 5.4 Pool, akad dan pelaburan (`/pools`, `/investments`)
- Pool dicipta untuk projek yang telah mendapat keputusan akhir feasibility, bersama **terma akad versi 1**. Pencipta: Super Admin, Country Admin, Organization Admin, Pool Manager, Project Sponsor, Project Manager.
- Pool bermula **DRAFT** dan memerlukan **empat tandatangan** (Shariah, Compliance, Risk, Authorised) sebelum dibuka (OPEN). Pengurus pool boleh Pause, Mark full dan Close.
- **Terma akad** setiap pool: jenis akad, **nisbah perkongsian untung (PSR)**, teks dan hash. Terma ber-versi, append-only, dan **dikunci selepas pelabur menerimanya**.
- **Ijab dan qabul:** pesanan mesti menerima versi terma semasa; id terma, hash dan masa penerimaan disimpan. Pelabur melihat terma yang diterima di Investments › My agreements.
- Peraturan setiap akad (`server/src/pools/akad-terms.ts`):

| Akad | Pelabur sebagai | Pengurus sebagai | Bahagian untung pelabur | Kerugian |
|---|---|---|---|---|
| Mudarabah | Pemodal (rabb al-mal) | Mudarib | 1–99% | Ditanggung pelabur ikut modal; mudarib menanggung hanya jika cuai atau melanggar terma |
| Musharakah | Rakan kongsi | Rakan kongsi pengurus | 1–99% | Ikut nisbah modal, tanpa mengira nisbah untung |
| Wakalah bil Istithmar | Prinsipal (muwakkil) | Wakil pelaburan | 1–100% (baki sebagai insentif wakil) | Ditanggung pelabur; wakil menanggung hanya jika cuai |
| Ijarah | Pemilik bersama aset sewaan | Pengurus aset | 1–100% daripada sewa bersih | Risiko aset ditanggung pemilik ikut bahagian milikan |

- **Had pelaburan ikut tahap KYC** (`KYC_INVESTMENT_LIMITS`, JSON ikut tahap dan mata wang): jumlah pesanan PENDING dan SETTLED pelabur dibanding dengan had, di bawah kunci setiap pelabur. Tiada tetapan bermaksud tiada had; JSON yang tidak sah menyekat pesanan baharu. KYC lama tanpa tahap dikira LEVEL_1.
- **Bayaran pesanan:** pelabur memindahkan wang ke **akaun amanah platform bagi negaranya** (bahagian 5.20) dengan nombor pesanan sebagai rujukan; arahan bayaran dipaparkan di web dan mini-app (`GET /investments/orders/:id/payment-instructions`). Wang pelabur tidak pernah terus ke penaja.
- Pesanan PENDING sehingga pegawai penyelesaian mengesahkan bayaran dengan rujukan bank; pegawai tidak boleh menyelesaikan pesanan sendiri.
- **Pihak berkaitan:** pesanan daripada entiti dalam kumpulan korporat yang sama dengan organisasi projek ditanda `relatedParty` (bahagian 5.17).
- **Pelabur:** Investments memaparkan posisi (modal, bahagian pool, untung), sejarah keuntungan, perjanjian akad, laporan prestasi projek dan pool OPEN (pool di bawah kontrak pilihan pelabur disenaraikan dahulu).

### 5.5 Agihan keuntungan, kerugian dan payout (`/distributions`)
- **Hasil projek** yang masuk ke akaun amanah direkod sekali bagi setiap rujukan bank (`POST /distributions/pool-income`); keuntungan hanya dibayar daripada hasil yang direkod, tidak sekali-kali daripada modal pelabur.
- **Pratonton** oleh server (`POST /distributions/preview`): keputusan bersih, rugi terdahulu yang dipulihkan dahulu, bahagian pelabur ikut akad dan ikut modal, dan akaun bank yang disahkan.
- **Kerugian:** tempoh yang rugi, atau untung yang habis menampung rugi lama, direkod tanpa bayaran (`POST /distributions/period-results`).
- **Maker-checker:** dikira → dihantar → diluluskan oleh pegawai lain → diproses. Pencipta tidak boleh meluluskan sendiri.
- **Payout:** hanya ke akaun bank yang disahkan dan selepas tempoh bertenang; nombor akaun disulitkan (hanya 4 digit akhir dipaparkan); pengesahan akaun oleh Settlement Officer atau Super Admin (bukan akaun sendiri); status QUEUED → SUBMITTED → SETTLED / FAILED / REVERSED; webhook bertandatangan HMAC; reconciliation berjadual. Penyedia bank/DuitNow sebenar belum dipilih (fail bank manual).
- Aliran agihan Settlement Officer kini dalam mini-app (tab Agihan).

### 5.6 Lejar kewangan dan integriti (`/financial`, `/admin/audit/integrity`)
- Lejar double-entry: setiap transaksi mesti seimbang (trigger database), dan jadual lejar append-only.
- Akaun mengikut tenant (tunai ToyyibPay bagi setiap organisasi dan negara, tunai pool, akaun pengguna).
- **Rantai hash:** setiap rekod audit dan transaksi lejar dimeterai ke dalam jadual append-only `HashChainLink` (SHA-256 berangkai). Worker memeterai setiap 5 minit; Super Admin boleh memeterai segera dan Super Admin/Auditor boleh mengesahkan. Pengesahan menunjukkan rekod pertama yang diubah, dipadam atau dipautkan semula.
- Tab Ledger membaca lejar daripada server, dengan status rantai hash untuk Super Admin dan Auditor.

### 5.7 Membership, kredit AI dan ToyyibPay (`/membership`)

| Pelan | Harga bulanan | Harga tahunan | Kredit AI percuma sebulan |
|---|---|---|---|
| Free | RM0 | RM0 | 20 |
| Plus | RM39 | RM390 | 100 |
| Professional | RM149 | RM1,490 | 400 |
| Enterprise | RM999 | RM9,990 | 2,500 |

- **Pek kredit AI:** 50 kredit (RM25), 250+25 (RM99), 1,000+150 (RM349), 3,000+600 (RM899). Promosi projek: Featured 7 hari (RM99 atau 50 kredit), Featured 30 hari (RM299 atau 150), Sponsored 30 hari (RM499 atau 250).
- **Peraturan kredit:** kredit percuma digunakan dahulu, tamat setiap kitaran, dan tidak boleh membayar membership. Kredit yang dibeli tidak tamat dan boleh ditebus untuk membership (RM0.20 sekredit, `MEMBERSHIP_CREDIT_VALUE_MYR`).
- **ToyyibPay:** yuran FPX RM1 dibayar pelanggan; bil disahkan dengan ToyyibPay sebelum dipenuhi; status dituntut secara bersyarat supaya tidak dipenuhi dua kali; reconciliation berjadual; refund separa disokong.
- Tempoh tenggang 7 hari; **satu peringatan** (loceng dan e-mel) seminggu sebelum tempoh berbayar tamat (`MembershipExpirySweeper`).
- **Pembayaran simulasi** hanya di luar production atau dengan `ALLOW_SIMULATED_PAYMENTS=true`; transaksinya dilabel DEMO dan tidak dikira sebagai hasil.
- Jadual yuran semasa dipaparkan di Admin Center › Platform Fee Schedule.

### 5.8 Zakat (`/zakat`)
- **Opt-in** (`GET/PUT /zakat/preference`).
- **14 pusat zakat Malaysia** dengan laman rasmi: Selangor (LZS), WP (PPZ-MAIWP), Pahang, Kedah (LZNK), Perak, Sarawak (TBS), Johor (MAIJ), Melaka (MAIM), Negeri Sembilan (MAINS), Pulau Pinang (MAINPP), Kelantan (MAIK), Terengganu (MAIDAM), Perlis (MAIPs), Sabah (MUIS).
- **Nisab bertarikh dengan sumber** yang direkod oleh admin atau pegawai Shariah. Setakat ini: Selangor 2026 (RM42,047 Jan–Jun; RM38,748 Jul–Dis), WP 2026 (RM33,996), Sarawak September 2026 (RM46,294.89). Jika tiada nisab, sistem tidak meneka; pengguna memasukkan nisab dari laman pusat zakat.
- **Pengiraan:** haul ikut kategori, kadar 2.5% (Hijrah) atau 2.577% (Masihi), tolak hutang. Pelaburan dalam platform dikira sama ada sebagai **keuntungan diterima (al-mustaghallat)** atau **modal yang cukup haul + keuntungan** (kaedah zakat saham).

| Kategori | Haul diperlukan | Catatan |
|---|---|---|
| Simpanan dan tunai | Ya | Dimiliki setahun penuh |
| Pendapatan (gaji dan lain-lain) | Tidak | Dinilai semasa diterima |
| Pendapatan pelaburan (al-mustaghallat: untung, dividen, sewa) | Tidak | Kaedah yang diluluskan bagi ASB pada 2025 |
| Modal pelaburan | Ya | Kaedah zakat saham; modal kurang setahun dikecualikan |
| Aset perniagaan (urud al-tijarah) | Ya | Stok dan penghutang |

- **Platform tidak memungut zakat.** Butang bayar membuka portal rasmi pusat zakat. Memungut zakat tanpa pelantikan Majlis Agama Islam Negeri ialah kesalahan; kutipan melalui ToyyibPay hanya berjalan jika `ZAKAT_COLLECTION_APPOINTMENT_REF` diset selepas pelantikan rasmi.

### 5.9 Cukai dan penyata (`/tax`, `/statements`)
- **Profil cukai:** negara pemastautin, status pemastautin Malaysia, jenis entiti, nombor cukai (disimpan; dipaparkan bertopeng; tidak masuk log audit).
- **Penyata pelabur** (`GET /statements/investor`), **penyata projek** (`GET /statements/projects/:id`, juga di Sponsor Portal › Reports) dan **penyata pendapatan tahunan untuk cukai** (`GET /statements/investor/tax?year=`). Format JSON, CSV dan PDF.
- **Platform belum mengira atau memotong cukai.** Kadar bergantung pada struktur undang-undang pool (item 10 dalam fail pending).

### 5.10 AI dan RAG (`/ai`)

**Penyedia dan model**
- Penyedia serasi OpenAI (`OPENAI_API_URL`, `OPENAI_MODEL`, `OPENAI_API_KEY`), menunjuk kepada **Ollama** sendiri, jadi data tidak keluar dari pelayan. Tanpa `OPENAI_API_KEY`, penyedia **sandbox** memberi output sintetik yang ditanda jelas.
- Had dan masa: `AI_CHAT_MAX_SOURCES`, `AI_CHAT_MAX_TOKENS`, `AI_CHAT_TIMEOUT_MS`. AI run yang tersangkut ditutup secara automatik dan kredit dipulangkan.

**Ciri berbayar kredit**

| Ciri | Endpoint | Kredit |
|---|---|---|
| Pembantu AI (chat) dengan sumber RAG | `POST /ai/chat` | 1 |
| Analisis dokumen projek/bukti | `POST /ai/projects/:id/documents/:docId/analyze` | 5 |
| Analisis feasibility projek | `POST /ai/projects/:id/feasibility/analyze` | 100 |
| Analisis risiko / Shariah | `POST /ai/shariah/analyze` | 15 |
| Struktur kontrak, draf, semakan klausa | `/ai/contract-advisor/...`, `/ai/contract-drafts/...`, `/ai/contracts/...` | 20 |
| Due diligence projek | `POST /ai/projects/due-diligence/scan`, `POST /ai/due-diligence/analyze` | 30 |
| Penasihat penstrukturan aset | halaman aset | 20 |

**Alat analisis tanpa AI** (AI Wealth Engine, di luar DEMO; tiada kredit, jawapan sama bagi data yang sama, `src/ai/features/live/LiveAnalysisTools.tsx`): Pool Matcher (pemberat tetap), Portfolio Health dan Stress Scenarios (pelabur), Risk & Early Warning, Pool Sizing (pihak projek dan staf).

**RAG**
- Dokumen rujukan dipecah kepada bahagian (`RagDocument`, `RagChunk`) dengan skop GLOBAL, COUNTRY atau PROJECT; carian kata kunci ditambah carian vektor (pgvector) jika model embedding diset.
- Jawapan mesti merujuk sumber (`[S1]`); sitasi disimpan dan boleh disemak (`/ai/citations`). Dokumen melalui kitaran semakan.

**Kawalan**
- Kredit ditolak hanya selepas operasi berjaya; setiap permintaan direkod (`AiRun`, log audit); keputusan AI ialah **cadangan** dan semakan manusia sentiasa diperlukan. Ciri AI dikunci mengikut peringkat projek. Menu AI mengikut peranan (penyemak tidak melihat alat draf).

### 5.11 Kontrak dan perjanjian (`/contracts`, `/contract-intelligence`)
- Kontrak dengan versi, pihak, kelulusan dan peralihan status; penjanaan perjanjian dengan templat, klausa dan semakan pematuhan.
- **Perjanjian daripada perkongsian aset:** satu perjanjian bagi setiap perkongsian; draf seterusnya menjadi versi baharu. Kedua-dua pihak bersetuju dengan versi terkini sebelum semakan Legal, kemudian Shariah, oleh penyemak dari luar kedua-dua pihak. **Agreement checks** (klausa wajib ikut akad, ruang kosong, terma perkongsian) dan imbasan jurang AI membantu penyemak; kelulusan walaupun semakan gagal memerlukan alasan.
- **Format:** gaya perjanjian komersial Malaysia, klausa bernombor penuh untuk Musharakah dan Ijarah, jadual dan halaman tandatangan; PDF dan Word.
- **Tandatangan elektronik:** kod sekali guna (OTP) melalui e-mel; selepas kedua-dua pihak menandatangani, PDF muktamad dengan Sijil Penyempurnaan dimeterai platform (PAdES) dan dicap masa (RFC 3161); semakan integriti setiap 6 jam dan setiap muat turun. `SIGNING_REQUIRE_VERIFIED_IDENTITY=true` mewajibkan KYC/KYB penandatangan.
- Contract Advisory dan Agreement Generation umum belum dipautkan kepada projek (item 5 dalam fail pending).

### 5.12 Notifikasi dan job latar belakang (`/notifications`, `server/src/jobs/`)
- **Saluran:** dalam aplikasi (loceng) dan **e-mel** (Resend atau SMTP), keputusan 2026-10-30; push (Firebase) dan SMS (Twilio) tidak digunakan (kod kekal). Saluran lalai `IN_APP,EMAIL`; pengguna boleh mematikan e-mel.
- **Outbox** dengan deduplikasi, cubaan semula dan dead-letter. Setiap saluran dihantar berasingan dan direkod (`deliveredChannels`), jadi cubaan semula tidak menghantar e-mel dua kali; saluran yang belum disediakan dilangkau dan dicatat.
- **Notifikasi utama:** keputusan KYC dan KYB, pelaburan disahkan atau dibatalkan, pool menunggu tandatangan, dibuka dan penuh, keuntungan dibayar atau gagal, akaun bank disahkan, tranche diminta/diluluskan/ditolak/dikeluarkan, langkah perkongsian dan perjanjian, laporan prestasi untuk disahkan dan diterbitkan, serta peringatan.
- **Job berjadual (BullMQ, worker):** reconciliation ToyyibPay (10 minit), reconciliation payout (15 minit), outbox notifikasi (30 saat), meterai rantai hash (5 minit).
- **Semakan harian dalam API** (tanpa worker): peringatan membership (seminggu sebelum tamat), peringatan tarikh luput aset dan takaful (30, 14, 7 hari dan selepas tamat), integriti perjanjian yang ditandatangani, dan AI run yang tersangkut.

### 5.13 Audit (`/admin/audit`)
- Setiap tindakan penting direkod dalam `AuditEvent` (append-only; trigger menolak UPDATE dan DELETE). Admin Center › Audit Logs: senarai, tapisan, eksport CSV dan status rantai hash.

### 5.14 Smart contract dan blockchain

**Keadaan sekarang: sistem tidak menggunakan blockchain dan tidak menjalankan smart contract.**
- **"Kontrak" dalam sistem** ialah kontrak Shariah digital: dokumen akad, terma pool yang ber-versi dan ijab qabul yang direkod di database, serta perjanjian yang dijana (bahagian 5.4 dan 5.11). Ia bukan kod yang berjalan di blockchain.
- **Wang sebenar** bergerak melalui ToyyibPay (FPX) dan bank; sistem merekodnya dalam lejar kewangan.
- **Teks UI yang dahulu mendakwa** "on the blockchain", "smart contract execution", "immutable ledger" dan memaparkan alamat dompet palsu telah dibetulkan pada 5 Okt 2026 (commit `cddb011`). Perkataan "tokenization" masih ada dalam beberapa skrin mod DEMO.

**Yang sudah ada sebagai asas (Fasa 1):** rantai hash SHA-256 ke atas log audit dan lejar kewangan (bahagian 5.6). Ia memberi kesan "tamper-evident" tanpa blockchain.

**Had Fasa 1:** sesiapa yang boleh menulis terus ke database boleh membina semula seluruh rantai. Ini hanya dapat dikesan jika hash kepala rantai disimpan di luar sistem.

**Rancangan (item 9 dalam fail pending):**

| Fasa | Kandungan | Status |
|---|---|---|
| 0 | Betulkan dakwaan blockchain dalam UI | Siap |
| 1 | Rantai hash audit dan lejar | Siap |
| 2 | **Anchoring:** rekod hash kepala rantai atau Merkle root secara berkala ke blockchain awam yang murah; halaman awam **Ketelusan Zakat**; butang "Sahkan bayaran saya" dengan bukti Merkle. Tiada data peribadi di blockchain | Menunggu pilihan rangkaian, dompet operasi dan bajet |
| 3 | **Tokenisasi** bahagian pool dan **smart contract escrow** | Menunggu nasihat undang-undang Suruhanjaya Sekuriti dan resolusi Shariah; token pelaburan berkemungkinan dianggap sekuriti |

#### Apa itu smart contract

Smart contract ialah program kecil yang disimpan dan dijalankan di atas blockchain. Ia mempunyai tiga ciri:
1. **Berjalan sendiri:** apabila syarat dipenuhi, kod bertindak (contohnya memindahkan dana) tanpa kelulusan sesiapa.
2. **Tidak boleh diubah:** selepas dipasang, kod kekal. Pepijat tidak boleh dibaiki dengan mudah.
3. **Boleh disemak semua orang:** kod dan setiap transaksi boleh dilihat secara awam.

Walaupun dinamakan "contract", ia **bukan kontrak undang-undang**. Ia kod yang menguatkuasakan peraturan secara automatik. Contoh escrow pelaburan: "Simpan wang pelabur; jika jumlah mencapai RM500,000 sebelum 31 Disember, pindahkan kepada pengurus projek; jika tidak, pulangkan kepada setiap pelabur." Tiada pihak, termasuk operator platform, boleh menahan atau melencongkan wang itu.

#### Perbandingan dengan sistem sekarang

| Perkara | Sistem sekarang | Dengan smart contract |
|---|---|---|
| Akad (Mudarabah, Musharakah, Wakalah, Ijarah) | Terma dalam database, ber-versi, dikunci selepas diterima (5.4) | Akad kekal dokumen Shariah; smart contract hanya melaksanakan sebahagian terma |
| Agihan untung dan tolakan rugi | Kod NestJS di server platform (5.5) | Kod di blockchain |
| Pihak yang perlu dipercayai | Operator platform | Kod itu sendiri |
| Bukti rekod tidak diubah | Rantai hash dalaman (5.6) | Rekod blockchain awam |
| Pembetulan kesilapan | Boleh, melalui maker-checker dan jejak audit | Sangat sukar atau mustahil |

Logik "kontrak" (agihan mengikut nisbah akad, tolakan rugi, kunci terma) **sudah dilaksanakan**; bezanya ia berjalan di server platform, bukan di blockchain.

#### Sebab smart contract dilewatkan ke Fasa 3

1. **Wang adalah ringgit sebenar.** Smart contract hanya boleh mengawal aset yang berada di blockchain, jadi ia memerlukan token atau ringgit digital (stablecoin), yang dikawal selia oleh Bank Negara Malaysia dan Suruhanjaya Sekuriti (SC).
2. **Status kawal selia.** Token yang mewakili bahagian pool berkemungkinan dianggap sekuriti dan memerlukan kelulusan atau pendaftaran SC sebelum dilancarkan.
3. **Masalah oracle.** Untung atau rugi projek berlaku di dunia sebenar dan mesti dimasukkan oleh manusia (akaun dan audit), jadi manfaat "tanpa perlu percaya" adalah terhad.
4. **Kesilapan tidak boleh diundur.** Agihan yang tersilap tidak dapat dibetulkan seperti dalam sistem sekarang (maker-checker, pembalikan lejar).
5. **PDPA.** Data peribadi tidak boleh diletakkan di rekod blockchain awam kerana ia tidak boleh dipadam atau dibetulkan.
6. **Semakan Shariah.** Kod smart contract menjadi pelaksana akad, jadi kod itu sendiri memerlukan resolusi Majlis Penasihat Shariah.
7. **Kos dan kepakaran.** Yuran transaksi (gas), audit keselamatan kod oleh pihak ketiga (lazimnya puluhan ribu USD), pembangun Solidity atau seumpamanya, dan pengurusan kunci dompet operasi.

#### Syarat untuk memulakan Fasa 3

- Nasihat undang-undang bertulis dan, jika perlu, kelulusan SC bagi token pelaburan.
- Resolusi Shariah ke atas reka bentuk token dan kod smart contract.
- Fasa 2 (anchoring) sudah berjalan stabil.
- Keperluan perniagaan yang jelas, contohnya pasaran sekunder unit pool atau escrow automatik yang diminta pelabur.
- Bajet bagi audit keselamatan kod dan operasi dompet.

### 5.15 Aset (`/assets`)
- **Pendaftaran:** Asset Owner atau Asset Manager mendaftar aset (tanah, bangunan, kenderaan berat, mesin) sebagai draf, memuat naik dokumen (bukti hak milik wajib; PDF/JPG/PNG disemak jenis sebenar, SHA-256, isyarat pengubahsuaian), membuat tiga pengakuan dan menghantar. Borang dan dokumen wajib mengikut jenis (contohnya geran dan Carian Rasmi untuk tanah, VOC JPJ untuk kenderaan, invois dan plat siri untuk mesin, CCC untuk bangunan); pin peta dan gambar tapak dengan GPS.
- **OCR** geran, Carian Rasmi, cukai tanah, VOC, PUSPAKOM, invois, sijil JKKP; aset yang sama dikesan melalui no. hak milik/lot, casis atau siri.
- **Pengesahan:** Country Admin atau Legal Officer negara itu mengesahkan, meminta perubahan atau menolak, tidak boleh untuk organisasi sendiri.
- **Penstrukturan Shariah:** pilihan akad (Ijarah, Musharakah, Murabahah) daripada peraturan (`asset-structuring.ts`) dan penasihat AI (20 kredit).
- **Peringatan tarikh luput** cukai jalan, insurans, PUSPAKOM, sijil JKKP (jika perlu) dan pajakan, kepada pemilik dan Asset Manager organisasi.

### 5.16 Perkongsian aset dengan projek (`/asset-partnerships`)
- PDP menyiarkan keperluan aset pada projek; Asset Owner dalam negara yang sama menawarkan aset VERIFIED, atau pemilik menawarkan aset kepada PDP (butiran sulit disembunyikan sehingga diluluskan). Pemilik aset sejenis dimaklumkan apabila keperluan baharu disiarkan.
- Rundingan (terima, tolak, tawaran balas) di bawah Ijarah atau Musharakah; **Compare offers** dengan skor tetap /100 dan penjelasan AI (tanpa nama pihak lain).
- Selepas diterima: semakan Legal dan Shariah oleh orang berbeza dari luar kedua-dua pihak, dengan panel **Pre-approval checks** (dokumen, gadaian, Rizab Melayu, penilaian, nisbah modal dan untung, aktiviti halal dan lain-lain) dan alasan wajib jika meluluskan walaupun ada semakan gagal.
- Setiap langkah ditulis ke log audit dengan cap jari SHA-256; rekod penuh boleh dimuat turun sebagai PDF.

### 5.17 KYB organisasi dan pihak berkaitan (`/organisations`)
- Ahli organisasi mengisi no. pendaftaran SSM, alamat berdaftar, **jenis entiti** (GLC, syarikat, institusi, individu) dan **kumpulan korporat**, memuat naik profil syarikat SSM (wajib), senarai pengarah, pemegang saham dan resolusi lembaga, lalu menghantar. KYB Officer, Compliance Officer, Country Admin atau Super Admin negara yang sama memutuskan (tidak untuk organisasi sendiri). Butiran dikunci selepas diluluskan.
- **Pihak berkaitan:** pesanan daripada organisasi lain dalam kumpulan yang sama dengan organisasi projek ditanda, dipaparkan "Related party" kepada staf, dan pool memaparkan kepada pelabur jumlah wang yang disahkan daripada pihak berkaitan. Kumpulan hanya untuk pendedahan; ia tidak berkongsi akses.

### 5.18 Modal penaja dan takaful (`/projects/:id/safeguards`, `/safeguards/queue`)
- Penaja menjanjikan modal (minimum 10% kos projek, boleh ditetapkan ikut negara dengan `MIN_SPONSOR_CONTRIBUTION_PCT`) dan memuat naik penyata bank; Finance Officer mengesahkan dan merekod setoran.
- Syarat: projek hanya boleh dihantar jika modal minimum dijanjikan; pool hanya dibuka jika modal dibuktikan; dana hanya dikeluarkan jika modal disetor dan semua takaful wajib berkuat kuasa. Setiap pengeluaran merekod bahagian pro-rata penaja dan pelabur.
- Takaful wajib dijana automatik ikut projek; Risk Officer (atau Compliance) mengesahkan; insurans konvensional hanya dengan kelulusan bertulis penasihat Shariah.

### 5.19 Benefisiari dan pusaka (`/estate/beneficiaries`)
- Untuk individu (Retail, HNWI, Family Office) dan Asset Owner sahaja. Pemilik memilih rangka Islam (faraid, Hibah Amanah, wasiyyah) atau sivil (wasiat), disimpan dalam akaun.
- Peraturan disemak di server: wasiyyah maksimum 1/3 dan tidak kepada waris faraid; bahagian waris faraid tidak ditetapkan pengguna; institusi bukan waris faraid.
- Nombor ID benefisiari disulitkan AES-256-GCM (`ESTATE_DATA_ENCRYPTION_KEY`) dan dipaparkan bertopeng; setiap perubahan diaudit tanpa nombor ID.

### 5.20 Akaun amanah (kutipan) bagi setiap negara (`/collection-accounts`)
- Satu akaun amanah platform bagi setiap negara, bukan bagi setiap pool. Super Admin mengisinya di Admin Center › Country Nodes. Selagi kosong, pelabur diberitahu supaya tidak memindahkan wang. Kewangan melepaskan wang kepada projek mengikut tranche.

### 5.21 Sewaan terus (Ijarah) tanpa projek (`/leasing`)
- Pemilik aset menyenaraikan unit daripada aset yang disahkan; syarikat penyewa dengan KYB diluluskan memohon dan berunding; kelulusan Legal dan Shariah oleh orang berbeza dari luar kedua-dua pihak (aktiviti yang mungkin haram ditanda); jadual sewa bulanan dan rekod bayaran oleh pemilik. Kini dalam mini-app sahaja. Keputusan sementara: sewa dibayar terus ke akaun pemilik; platform hanya merekod.

### 5.22 Tadbir urus Admin Center (`/governance`, `/dashboard`)
- **Papan pemuka** Compliance, Audit, Finance dan Security daripada database (Super Admin, Country Admin, Compliance Officer, Auditor). Security Dashboard menyemak tetapan pelayan yang diperlukan untuk production.
- **Regulatory Reports:** eksport CSV (daftar pelabur, daftar KYC, pihak berkaitan, agihan, payout); setiap eksport diaudit.
- **Risk Register, Incidents, Fatwa Repository:** rekod sebenar dengan sejarah dan audit (`RiskItem`, `Incident`, `FatwaResolution`).
- **Approval Matrix, Platform Fee Schedule, PDP Country Rules:** paparan baca sahaja daripada nilai yang sama yang dikuatkuasakan kod.
- **AML, PEP dan Sanctions:** memaparkan nota bahawa penyedia saringan belum dipilih.
- Juga: User Directory, Organisations, Country Nodes, Role Management, Permission Matrix, Workflow Pipelines, Revenue, Promotions, System Status, Settlement Clearing, Payout Account Verification, kandungan laman awam dan Shariah Governance (`/site-content`).

### 5.23 Laporan prestasi projek (`/performance-reports`)
- PDP (Project Sponsor, Project Manager, Organization Admin organisasi projek) mengisi laporan bagi setiap suku yang telah tamat: hasil dan kos sebenar lawan unjuran, milestone tepat masa, bajet digunakan, insiden Shariah, dapatan audit, sehingga 5 KPI sektor dan ulasan. Untung diagih diisi server daripada agihan yang diluluskan dalam suku itu.
- Juruaudit (Auditor) negara yang sama dan dari organisasi lain mengesahkan atau memulangkan dengan nota; laporan yang disahkan dikunci dan dipaparkan kepada pelabur projek, dengan notifikasi. Barisan juruaudit ada di tab Documents.

### 5.24 Mini-app D8 Ideas (`/m`)
- Log masuk, KYC dengan kamera dan pengesahan wajah, pool dan pesanan dengan arahan bayaran, portfolio, papan pemuka pelabur, profil, benefisiari, pengguna (Country Admin), sejarah keuntungan, notifikasi, penyata (PDF), zakat, sewaan dan agihan (Settlement Officer); BM dan EN (pilihan disimpan dalam akaun).
- SSO dan push melalui D8 Ideas menunggu spesifikasi mereka.

---

## 6. Database

- **98 model** dan **80 migration** (`server/prisma/migrations/`).
- **Jadual append-only** (UPDATE/DELETE ditolak oleh trigger): `AuditEvent`, `LedgerTransaction`, `LedgerEntry`, `HashChainLink`, `PoolAkadTerms`.
- **Kekangan penting:** baki lejar mesti seimbang (trigger tertangguh), satu nombor ID KYC bagi satu akaun, satu keputusan aktif bagi setiap peringkat feasibility, satu laporan prestasi bagi setiap projek dan suku, jenis tempoh agihan (`PROFIT`, `LOSS`, `ABSORBED`), nisab mesti positif dan tempoh sah.
- **Data sensitif disulitkan:** nombor akaun payout (`PAYOUT_DESTINATION_ENCRYPTION_KEY`) dan nombor ID benefisiari (`ESTATE_DATA_ENCRYPTION_KEY`). Fail KYC, bukti dan dokumen masih disimpan dalam database (`Bytes`); pemindahan ke DigitalOcean Spaces dirancang (item 14).

---

## 7. Kawalan keselamatan dan integriti

- Skop tenant pada setiap baca dan tulis; kawalan peranan pada endpoint (`@Roles`, `@RequirePermission`).
- **Pengasingan tugas:** pegawai tidak boleh menyelesaikan pesanan sendiri, meluluskan agihan atau tranche sendiri, mengesahkan akaun bank sendiri, menyemak organisasi atau aset sendiri, atau memutuskan feasibility projek organisasi sendiri; seorang memutuskan satu peringkat feasibility sahaja bagi setiap analisis.
- Tuntutan status bersyarat dan kunci baris (`FOR UPDATE`, advisory lock bagi had KYC) untuk mengelakkan pemprosesan berganda.
- Kunci idempotensi bagi posting lejar, pesanan pelaburan dan payout.
- Helmet, had kadar dan CORS (`CORS_ORIGINS` wajib di production); production hanya menerima `oidc` dan RS256.
- Webhook payout bertandatangan HMAC (`PAYOUT_WEBHOOK_SECRET`).
- Rantai hash ke atas audit dan lejar; pemeriksaan integriti dokumen bukti dan perjanjian yang ditandatangani.
- Rahsia tidak disimpan dalam Git: `server/.env`, `server/.env.production` dan `server/ops/secrets/*` diabaikan.
- Eksport CSV meneutralkan teks yang boleh dijalankan sebagai formula hamparan.

---

## 8. Pembolehubah persekitaran utama

**Backend (`server/.env`; contoh dan penerangan dalam `server/.env.example` dan `server/.env.production.example`):**

| Kumpulan | Pembolehubah |
|---|---|
| Asas | `DATABASE_URL`, `PORT`, `NODE_ENV`, `AUTH_MODE`, `CORS_ORIGINS`, `COUNTRY_NODE_ID`, `PUBLIC_API_BASE_URL` |
| OIDC | `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URI` |
| AI | `OPENAI_API_URL`, `OPENAI_MODEL`, `OPENAI_API_KEY`, `RAG_EMBEDDING_MODEL` |
| ToyyibPay | `TOYYIBPAY_BASE_URL`, `TOYYIBPAY_SECRET_KEY`, `TOYYIBPAY_CATEGORY_CODE`, `TOYYIBPAY_CALLBACK_URL`, `TOYYIBPAY_RETURN_URL`, `ALLOW_SIMULATED_PAYMENTS`, `MEMBERSHIP_CREDIT_VALUE_MYR` |
| Pelaburan | `KYC_INVESTMENT_LIMITS`, `MIN_SPONSOR_CONTRIBUTION_PCT` |
| Penyulitan dan payout | `PAYOUT_DESTINATION_ENCRYPTION_KEY`, `PAYOUT_WEBHOOK_SECRET`, `ESTATE_DATA_ENCRYPTION_KEY` |
| Redis/worker | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD_FILE`, `REDIS_TLS`, `REDIS_CA_CERT_FILE`, `WORKER_ENABLED`, `WORKER_CONCURRENCY` |
| E-mel dan notifikasi | `NOTIFICATION_DEFAULT_CHANNELS`, `NOTIFICATION_EMAIL_PROVIDER` (`resend` atau `smtp`), `NOTIFICATION_EMAIL_FROM`, `RESEND_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` |
| Tandatangan | `SIGNING_OTP_CHANNEL`, `SIGNING_P12_PATH`, `SIGNING_P12_PASSPHRASE`, `SIGNING_TSA_URL`, `SIGNING_ALLOW_SELF_SIGNED`, `SIGNING_REQUIRE_VERIFIED_IDENTITY` |
| KYC | `KYC_REQUIRE_LIVENESS`, `KYC_ROUTING_JSON`, `KYC_VENDOR_A_*`, `KYC_ML_URL`, `KYC_ML_MEDIA_DIR` |
| Zakat | `ZAKAT_COLLECTION_APPOINTMENT_REF` (hanya selepas pelantikan rasmi sebagai ejen kutipan) |

**Frontend (`.env.local`; contoh dalam `.env.example`):** `VITE_API_BASE_URL`, `VITE_AUTH_MODE`, `VITE_OIDC_*`, `VITE_SINGLE_ROLE_MODE`, `VITE_DATA_SOURCE`.

---

## 9. Ujian

- Backend: `cd server; npx jest`. **103 fail ujian** (`*.spec.ts`). Suite penuh terakhir lulus pada Oktober 2026; sejak itu hanya type-check dijalankan kerana PC pembangunan (7.8 GB RAM) tidak dapat menjalankan Jest dalam Docker. Jalankan semula suite penuh selepas naik taraf RAM, satu suite pada satu masa jika perlu.
- Type-check (termasuk fail ujian): `npx tsc --noEmit` (frontend) dan `cd server; npm run typecheck`.
- Ujian integrasi (PostgreSQL + Redis): `RUN_INTEGRATION_TESTS=true npm run test:integration`.
- Ujian langsung secara local dibuat bagi had KYC, peringatan aset, pihak berkaitan, endpoint governance dan aliran laporan prestasi; data ujian dibuang selepas itu.

---

## 10. Status skrin frontend (di luar mod DEMO)

| Skrin | Status |
|---|---|
| Dashboard setiap peranan, My reviews | Sebenar |
| Wealth Pooling (projek, pool, kitaran 17 langkah, tandatangan, buka pool) | Sebenar |
| Investments: pelabur (posisi, keuntungan, perjanjian, laporan prestasi, pool OPEN, arahan bayaran); staf (pesanan) | Sebenar |
| Asset Register, Asset Partnerships, perjanjian dan tandatangan | Sebenar |
| Sponsor Portal (projek, KYB, modal dan takaful, kempen, penyata, laporan prestasi, keahlian) | Sebenar |
| KYC, KYB dan semakan | Sebenar |
| AI Wealth Engine (ciri AI dan alat analisis) | Sebenar |
| Financials: transaksi, penyata, zakat, cukai, settlement | Sebenar (pelabur melihat pesanan dan keuntungan sendiri) |
| Ledger dan Audit Logs | Sebenar |
| Document Vault | Sebenar: dokumen projek; dokumen aset (pemilik, Asset Manager, Legal); dokumen KYB (KYB, Compliance); laporan untuk disahkan (Auditor) |
| Membership, bil, kredit AI | Sebenar (backend + ToyyibPay) |
| Beneficiaries | Sebenar |
| Admin Center (semua bahagian) | Sebenar; AML, PEP dan Sanctions memaparkan nota "belum tersedia" |
| Multi-Wallet | Staf: akaun lejar sebenar; pelabur: nota "belum tersedia" (akaun pelabur belum direka) |
| Asset Marketplace | Pool OPEN sebenar; senarai aset contoh hanya dalam DEMO |

Dalam mod DEMO, beberapa skrin masih memaparkan data contoh terbina dalam (`src/data/`).

---

## 11. Had dan kerja yang belum siap

Senarai penuh dan terkini dalam [PENDING_ACTIVITIES.md](PENDING_ACTIVITIES.md). Perkara utama:
- **Perlu penasihat Shariah:** caj kerugian ke atas modal pelabur, perkiraan akhir pool, proses kecuaian pengurus, bahagian rugi rakan kongsi Musharakah, teks templat perjanjian dan pusaka.
- **Perlu penasihat cukai:** cukai pegangan bukan pemastautin, cukai perkhidmatan, e-Invois MyInvois, negara D-8 lain.
- **Perlu Compliance:** nilai had pelaburan ikut tahap KYC (kini nilai sementara), format laporan regulator, penyedia eKYC dan saringan AML/PEP.
- **Perlu keputusan:** penyedia payout bank/DuitNow, pelantikan ejen kutipan zakat, tempoh simpanan data biometrik (PDPA), reka bentuk akaun pelabur (Multi-Wallet).
- **Production:** rekod DNS Resend, sijil TLS Redis, akaun ToyyibPay live, sijil meterai daripada CA yang dipercayai, fail ke Spaces, Keycloak, dan semua baris Security Dashboard "Yes".
