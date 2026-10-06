# Dokumentasi Sistem Wealth Pooling (House of Wealth)

Keadaan sistem pada **6 Oktober 2026**, cawangan `feat/keycloak-oidc-auth`. Dokumen ini menerangkan apa yang ada dalam sistem sekarang. Kerja yang belum siap disenaraikan dalam [PENDING_ACTIVITIES.md](PENDING_ACTIVITIES.md); arahan menjalankan sistem ada dalam [RUN_COMMANDS.ps1](RUN_COMMANDS.ps1).

> Dokumen lama dalam bahasa Inggeris ([README.md](README.md), [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md), [CURRENT_ARCHITECTURE.md](CURRENT_ARCHITECTURE.md), [server/PRODUCTION_STATUS.md](server/PRODUCTION_STATUS.md), [RUN_CODE_WEALTH_POOLING.md](RUN_CODE_WEALTH_POOLING.md)) ditulis pada September 2026 dan sebahagiannya sudah lapuk. Jika bercanggah, ikut dokumen ini.

---

## 1. Ringkasan

Wealth Pooling ialah platform pelaburan patuh Shariah untuk negara anggota D-8. Penaja projek mendaftarkan projek dan bukti, projek melalui analisis kebolehlaksanaan (feasibility) dan semakan berperingkat sehingga keputusan Jawatankuasa Shariah, kemudian dana dikumpul daripada pelabur melalui **pool** di bawah **akad** (Mudarabah, Musharakah, Wakalah atau Ijarah). Keuntungan diagihkan mengikut nisbah dalam akad, dan semua aliran wang direkod dalam lejar kewangan berganda (double-entry) yang dirantai hash.

Sistem juga mempunyai:
- pendaftaran pengguna dan KYC (termasuk semakan wajah dan bacaan dokumen);
- keahlian (membership) dan kredit AI berbayar melalui ToyyibPay;
- ciri AI (analisis projek, kontrak, due diligence, pembantu RAG) menggunakan model tempatan (Ollama);
- anggaran zakat ikut pusat zakat negeri (pilihan pengguna), penyata cukai dan penyata kewangan;
- notifikasi (dalam app, push Firebase; e-mel dan SMS disediakan tetapi belum diaktifkan);
- log audit append-only dan rantai hash untuk mengesan perubahan rekod.

Pengguna boleh Muslim atau bukan Muslim. Sistem **tidak menyimpan agama**: cukai terpakai kepada semua pengguna, zakat ialah pilihan yang dihidupkan sendiri.

---

## 2. Seni bina dan teknologi

| Lapisan | Teknologi | Lokasi |
|---|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS 4, TypeScript 5.8 | `src/`, port **3000** |
| Backend API | NestJS 10, TypeScript, Prisma 6 | `server/src/`, port **3001** |
| Database | PostgreSQL 16 dengan pgvector | container `keycloak-postgres-5433`, port **5433** |
| Queue dan job | Redis 7 + BullMQ (`server/src/worker.ts`) | container `keycloak-redis-1`, port **6379** |
| AI | Model tempatan melalui Ollama (API serasi OpenAI), contohnya `gemma2:2b` | container `gemma2`, port **11434** |
| Identiti | `AUTH_MODE=mock` (pembangunan) atau `oidc` (Keycloak) | `server/keycloak/`, [server/KEYCLOAK_SETUP.md](server/KEYCLOAK_SETUP.md) |
| Pembayaran | ToyyibPay (FPX/kad) | `server/src/membership/toyyibpay.service.ts` |
| Push | Firebase Cloud Messaging HTTP v1 | `server/src/notifications/fcm-client.ts` |
| PDF | pdfkit (penyata, perjanjian) | `server/src/statements/`, `server/src/contract-intelligence/` |
| KYC tempatan | tesseract.js (OCR), onnxruntime-node (YuNet/SFace) | `server/src/kyc/` |

**Nota database local:** Windows merizab julat port 55422–55521, jadi container lama `keycloak-postgres-new` (port 55433) tidak dapat dihidupkan. Volume data yang sama kini dijalankan sebagai `keycloak-postgres-5433` pada port 5433; container lama disimpan dalam keadaan berhenti.

**Struktur folder utama:**
- `src/components/`: skrin utama (dashboard, pooling, financials, membership, admin dan lain-lain).
- `src/services/`: klien API (`apiClient.ts`, `akadApi.ts`, `zakatApi.ts`, `statementsApi.ts`, `firebaseMessaging.ts`).
- `server/src/<modul>/`: satu folder bagi setiap modul backend (controller, service, DTO, ujian).
- `server/prisma/schema.prisma` dan `server/prisma/migrations/`: schema database dan migration.
- `server/ops/`: rahsia (diabaikan Git), konfigurasi Redis, panduan Twilio.

---

## 3. Menjalankan sistem

Arahan penuh, termasuk pengguna ujian dan penyelesaian masalah, ada dalam [RUN_COMMANDS.ps1](RUN_COMMANDS.ps1). Ringkasnya:

```powershell
docker start keycloak-postgres-5433 gemma2      # database dan model AI
cd server; npm run start:dev                      # backend, port 3001
npm run dev                                       # frontend, port 3000 (dari folder utama)
curl.exe http://localhost:3001/health             # semak backend
```

- Migration: `cd server; npx prisma migrate deploy`.
- Data contoh: `cd server; npm run db:seed`.
- Worker latar belakang: set `WORKER_ENABLED=true` dalam `server/.env` dan jalankan `npm run start:worker` (perlukan Redis).
- Pengguna baharu dan KYC: [PANDUAN_PENGGUNA_BARU_KYC.md](PANDUAN_PENGGUNA_BARU_KYC.md).
- Pelayan VPS: [PANDUAN_LENGKAP_VPS.md](PANDUAN_LENGKAP_VPS.md), [DEPLOYMENT_TROUBLESHOOTING_PLESK.md](DEPLOYMENT_TROUBLESHOOTING_PLESK.md).

---

## 4. Pengesahan, peranan dan tenant

**Mod pengesahan** (`AUTH_MODE`):
- `mock`: token demo (base64 JSON `{mock, role, countryNode, org}` + `.demo-token`). Pengguna mesti wujud dan aktif dalam database.
- `oidc`: token JWT dari Keycloak.

**Tenant:** setiap rekod milik satu **negara (country node)**, contohnya `CN-MYS`, dan satu **organisasi**. Pengguna hanya melihat data dalam tenant mereka kecuali Super Admin.

**36 peranan**, antaranya: Super Admin, Country Admin, Organization Admin, Project Sponsor, Project Manager, Pool Manager, pelabur (Retail, HNWI, Institutional, Corporate, Family Office), Portfolio Manager, Shariah Advisor/Reviewer/Committee, Compliance Officer, KYC/KYB/AML Officer, Risk Officer, Finance Officer, Treasury Officer, Settlement Officer, Auditor, AI Administrator dan Guest. Senarai penuh dan kebenaran: `server/src/policy/permissions.ts`.

**Modul ciri** (boleh dihidupkan atau dimatikan oleh admin, `GET/PATCH /admin/modules`): `ASSET_REGISTRATION`, `WEALTH_POOLING`, `SHARIAH_GOVERNANCE`, `AI_INTELLIGENCE`, `CONTRACTS`, `DOCUMENT_VAULT`, `FINANCIAL_LEDGER`, `SECONDARY_MARKET`, `KYC_VERIFICATION`, `KYB_VERIFICATION`. Mod: `ACTIVE`, `MANUAL_REVIEW` atau `DISABLED`.

---

## 5. Modul fungsi

### 5.1 Pengguna dan KYC (`/users`, `/kyc`, `/auth`)
- Pendaftaran demo (`POST /auth/demo-register`), profil pengguna, peranan.
- KYC: borang, muat naik dokumen, hantar untuk semakan, semakan pegawai KYC.
- **Semakan automatik (nasihat sahaja; pegawai yang memutuskan):** konsistensi dokumen, nombor ID pendua, bacaan kandungan dokumen (OCR, bandingkan nama, ID, tarikh lahir, alamat dengan borang), dan prototaip **liveness** (arahan gerakan kepala rawak dari server, zon muka, kad dipegang ke kamera, padanan wajah dengan gambar kad).
- Rangka penyedia eKYC luar (`KYC_ROUTING_JSON`, adapter `http-vendor`, mod bayangan) sedia, tetapi penyedia belum dipilih.
- Nombor telefon mengikut kod negara (contoh +60); masa dipaparkan mengikut zon negara (GMT+8 untuk Malaysia).

### 5.2 Projek, bukti dan feasibility (`/projects`, `/ai/projects/...`)
- Projek dengan status kitaran hayat, milestone, pasukan, pengumuman dan kempen promosi.
- **Bukti projek** (model kewangan, unjuran aliran tunai, penilaian aset, hak milik) dimuat naik dan dianalisis AI. **Pemeriksaan integriti** semasa muat naik: hash SHA-256 (disemak semula semasa analisis), metadata PDF, kesan suntingan bertambah, perisian penyunting, tarikh masa depan, fail sama dalam projek lain. Sebarang amaran mengekalkan status REQUIRES_REVIEW.
- **Analisis feasibility** dengan revision bernombor dan semakan berperingkat: DRAFT → Finance → Risk → Compliance → Shariah → Investment Committee → **Final Decision** (Jawatankuasa Shariah). Satu keputusan aktif bagi setiap peringkat; satu keputusan akhir bagi setiap revision.
- Projek yang telah diluluskan dikunci; hanya Super Admin atau Country Admin boleh membukanya semula (`POST /projects/:id/reopen`) sebelum dana diterima.

### 5.3 Tadbir urus Shariah (`/shariah/reviews`)
- Semakan Shariah, keputusan, pembatalan dan penghantaran semula; paparan pusat untuk Malaysia.

### 5.4 Pool, akad dan pelaburan (`/pools`, `/investments`)
- Pool hanya boleh dicipta untuk projek yang telah mendapat keputusan akhir feasibility. Pencipta: Super Admin, Country Admin, Organization Admin, Pool Manager.
- **Terma akad** setiap pool: jenis akad, **nisbah perkongsian untung (PSR)**, teks terma dan hash. Terma ber-versi, append-only (trigger database), dan **dikunci selepas pelabur menerimanya**. Mudarabah dan Musharakah memerlukan kedua-dua pihak berkongsi untung (1–99%).
- Teks terma menyatakan pembahagian untung, siapa menanggung rugi, dan bahawa **pulangan serta modal tidak dijamin**.
- **Ijab dan qabul:** pesanan pelaburan mesti menerima versi terma semasa; sistem menyimpan id terma, hash dan masa penerimaan.
- Pesanan berstatus PENDING sehingga pegawai penyelesaian (Settlement Officer, Portfolio Manager, Super Admin) mengesahkan bayaran; pegawai tidak boleh menyelesaikan pesanan sendiri.

### 5.5 Agihan keuntungan, kerugian dan payout (`/distributions`)
- Agihan dikira dari hasil kasar dan kos layak, menggunakan **PSR dari akad** (bukan nilai yang ditaip semasa pengiraan), dan dibahagi kepada pelabur ikut nisbah modal.
- **Kerugian:** tempoh yang rugi, atau untung yang habis menampung rugi lama, direkod tanpa bayaran (`POST /distributions/period-results`). Untung baharu menampung kerugian yang belum pulih sebelum dikongsi.
- **Maker-checker:** dikira → dihantar → diluluskan oleh pegawai lain → diproses. Pencipta tidak boleh meluluskan sendiri.
- **Payout:** destinasi bank disimpan secara encrypted, ada tempoh bertenang; status QUEUED → SUBMITTED → SETTLED / FAILED / REVERSED; webhook penyedia dengan tandatangan HMAC; reconciliation berjadual. Penyedia bank/DuitNow sebenar belum dipilih (fail bank manual buat masa ini).

### 5.6 Lejar kewangan dan integriti (`/financial`, `/admin/audit/integrity`)
- Lejar double-entry: setiap transaksi mesti seimbang (trigger database), dan jadual lejar append-only.
- Akaun mengikut tenant (contohnya tunai ToyyibPay bagi setiap organisasi dan negara, tunai pool, akaun pengguna).
- **Rantai hash:** setiap rekod audit dan transaksi lejar (dengan entri) dimeterai ke dalam jadual append-only `HashChainLink` (SHA-256 berangkai). Worker memeterai setiap 5 minit; Super Admin boleh memeterai segera dan Super Admin/Auditor boleh mengesahkan dalam skrin Audit Trail. Pengesahan menunjukkan rekod pertama yang diubah, dipadam atau dipautkan semula.

### 5.7 Membership, kredit AI dan ToyyibPay (`/membership`)

| Pelan | Harga bulanan | Harga tahunan | Kredit AI percuma sebulan |
|---|---|---|---|
| Free | RM0 | RM0 | 20 |
| Plus | RM39 | RM390 | 100 |
| Professional | RM149 | RM1,490 | 400 |
| Enterprise | RM999 | RM9,990 | 2,500 |

- **Pek kredit AI:** 50 kredit (RM25), 250+25 (RM99), 1,000+150 (RM349), 3,000+600 (RM899).
- **Peraturan kredit:** kredit percuma digunakan dahulu, tamat setiap bulan, dan tidak boleh digunakan untuk membayar membership. Kredit yang dibeli tidak tamat dan boleh ditebus untuk membership.
- **ToyyibPay:** yuran FPX RM1 dikenakan kepada pengguna; bil disahkan dengan ToyyibPay sebelum dipenuhi; status dituntut secara bersyarat supaya tidak dipenuhi dua kali; reconciliation berjadual; refund separa disokong.
- Tempoh tenggang 7 hari dan amaran tamat 7 hari sebelum (banner dashboard).
- **Pembayaran simulasi** (kad/dompet demo) hanya ditawarkan di luar production atau dengan `ALLOW_SIMULATED_PAYMENTS=true`; transaksinya dilabel DEMO dan tidak dikira sebagai hasil.

### 5.8 Zakat (`/zakat`)
- **Opt-in** (`GET/PUT /zakat/preference`).
- **14 pusat zakat Malaysia** dengan laman rasmi: Selangor (LZS), WP (PPZ-MAIWP), Pahang, Kedah (LZNK), Perak, Sarawak (TBS), Johor (MAIJ), Melaka (MAIM), Negeri Sembilan (MAINS), Pulau Pinang (MAINPP), Kelantan (MAIK), Terengganu (MAIDAM), Perlis (MAIPs), Sabah (MUIS).
- **Nisab bertarikh dengan sumber** yang direkod oleh admin atau pegawai Shariah. Setakat ini: Selangor 2026 (RM42,047 Jan–Jun; RM38,748 Jul–Dis), WP 2026 (RM33,996), Sarawak September 2026 (RM46,294.89). Jika tiada nisab, sistem tidak meneka; pengguna memasukkan nisab dari laman pusat zakat.
- **Pengiraan:** haul ikut kategori (simpanan, modal pelaburan, perniagaan memerlukan haul; pendapatan dan pendapatan pelaburan tidak), kadar 2.5% (Hijrah) atau 2.577% (Masihi), tolak hutang. Pelaburan dalam platform dikira sama ada sebagai **keuntungan diterima (al-mustaghallat)** atau **modal yang cukup haul + keuntungan** (kaedah zakat saham).
- **Platform tidak memungut zakat.** Butang bayar membuka portal rasmi pusat zakat. Memungut zakat tanpa pelantikan Majlis Agama Islam Negeri ialah kesalahan; kutipan melalui ToyyibPay hanya berjalan jika `ZAKAT_COLLECTION_APPOINTMENT_REF` diset selepas pelantikan rasmi.

### 5.9 Cukai dan penyata (`/tax`, `/statements`)
- **Profil cukai:** negara pemastautin, status pemastautin Malaysia, jenis entiti, nombor cukai (disimpan; dipaparkan bertopeng; tidak masuk log audit).
- **Penyata pelabur** (`GET /statements/investor`): pegangan, pesanan dengan akad yang diterima, agihan.
- **Penyata projek** (`GET /statements/projects/:id`): pool dan akad, modal terkumpul, setiap tempoh (untung, rugi, ditampung), offset kerugian, bahagian pelabur dan pengurus; tanpa identiti pelabur. Boleh dibaca oleh penaja projek, kakitangan tenant, dan pelabur projek itu.
- **Penyata pendapatan tahunan untuk cukai** (`GET /statements/investor/tax?year=`): pendapatan dibayar dalam tahun itu mengikut jenis akad (bahagian untung atau sewa Ijarah), cukai dipotong (tiada setakat ini), modal dilabur berasingan.
- Format JSON, CSV dan PDF; tempoh mengikut zon masa negara pengguna.
- **Platform belum mengira atau memotong cukai.** Kadar bergantung pada struktur undang-undang pool (lihat item 11 dalam fail pending).

### 5.10 AI dan RAG (`/ai`)
- Pembantu AI berasaskan dokumen rujukan (RAG) dengan sitasi dan semakan sitasi; skop GLOBAL, negara dan projek.
- Analisis feasibility, due diligence, ringkasan dokumen projek, nasihat struktur kontrak Shariah, draf kontrak, analisis Shariah.
- Setiap operasi menggunakan kredit AI (contoh: soalan 1 kredit, ringkasan projek 5, feasibility penuh 20, due diligence 30, risikan projek penuh 100).
- Ciri AI dikunci mengikut peringkat projek (contohnya selepas kelulusan).
- Keputusan AI ialah cadangan; semakan manusia sentiasa diperlukan.

### 5.11 Kontrak (`/contracts`, `/contract-intelligence`)
- Kontrak dengan versi, pihak, kelulusan dan peralihan status.
- Penjanaan perjanjian (Ijarah, Musharakah, Mudarabah, Wakalah, Sukuk) dengan templat, klausa, peraturan Shariah dan semakan pematuhan asas; muat turun PDF.
- Perjanjian belum dipautkan kepada projek (item 6 dalam fail pending).

### 5.12 Notifikasi dan job latar belakang (`/notifications`, `server/src/jobs/`)
- Notifikasi dalam app (senarai, belum dibaca, tanda dibaca).
- Outbox dengan deduplikasi, cubaan semula dan dead-letter. Saluran: dalam app, **push Firebase (FCM HTTP v1)**; e-mel (Resend) dan SMS (Twilio) disediakan tetapi belum diaktifkan.
- Job berjadual (BullMQ): reconciliation ToyyibPay (10 minit), reconciliation payout (15 minit), outbox notifikasi (30 saat), meterai rantai hash (5 minit).

### 5.13 Audit (`/admin/audit`)
- Setiap tindakan penting direkod dalam `AuditEvent` (append-only; trigger menolak UPDATE dan DELETE). Eksport CSV tersedia.

---

## 6. Database

- **77 model** dan **56 migration** (`server/prisma/migrations/`).
- **Jadual append-only** (UPDATE/DELETE ditolak oleh trigger): `AuditEvent`, `LedgerTransaction`, `LedgerEntry`, `HashChainLink`, `PoolAkadTerms`.
- **Kekangan penting:** baki lejar mesti seimbang (trigger tertangguh), satu nombor ID KYC bagi satu akaun, satu keputusan aktif bagi setiap peringkat feasibility, jenis tempoh agihan (`PROFIT`, `LOSS`, `ABSORBED`), nisab mesti positif dan tempoh sah.
- **Pepijat yang dibetulkan pada 6 Okt 2026:** trigger baki lejar sebelum ini menyebabkan setiap posting lejar gagal pada PostgreSQL sebenar. Migration `20261006110000_fix_ledger_balance_trigger` membetulkannya.

---

## 7. Kawalan keselamatan dan integriti

- Skop tenant pada setiap baca dan tulis; kawalan peranan pada endpoint (`@Roles`, `@RequirePermission`).
- Maker-checker bagi agihan; pegawai tidak boleh menyelesaikan pesanan sendiri atau meluluskan agihan sendiri.
- Tuntutan status bersyarat dan kunci baris (`FOR UPDATE`) untuk mengelakkan pemprosesan berganda (bayaran, payout, review feasibility, terma akad, offset kerugian).
- Kunci idempotensi bagi posting lejar, pesanan pelaburan dan payout.
- Destinasi payout encrypted (`PAYOUT_DESTINATION_ENCRYPTION_KEY`); webhook payout bertandatangan HMAC (`PAYOUT_WEBHOOK_SECRET`).
- Rantai hash ke atas audit dan lejar; pemeriksaan integriti dokumen bukti.
- Rahsia tidak disimpan dalam Git: `server/.env`, `server/.env.production` dan `server/ops/secrets/*` diabaikan.
- Eksport CSV (penyata dan log audit) meneutralkan teks yang boleh dijalankan sebagai formula hamparan.

---

## 8. Pembolehubah persekitaran utama

**Backend (`server/.env`; contoh dalam `server/.env.example`):**

| Kumpulan | Pembolehubah |
|---|---|
| Asas | `DATABASE_URL`, `PORT`, `NODE_ENV`, `AUTH_MODE`, `DEFAULT_COUNTRY_NODE`, `DEFAULT_ORGANISATION`, `PUBLIC_API_BASE_URL` |
| AI | `OPENAI_API_URL`, `OPENAI_MODEL`, `OPENAI_API_KEY`, `RAG_EMBEDDING_MODEL` |
| ToyyibPay | `TOYYIBPAY_BASE_URL`, `TOYYIBPAY_SECRET_KEY`, `TOYYIBPAY_CATEGORY_CODE`, `TOYYIBPAY_CALLBACK_URL`, `TOYYIBPAY_RETURN_URL`, `ALLOW_SIMULATED_PAYMENTS`, `MEMBERSHIP_CREDIT_VALUE_MYR` |
| Payout | `PAYOUT_DESTINATION_ENCRYPTION_KEY`, `PAYOUT_WEBHOOK_SECRET` |
| Redis/worker | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD_FILE`, `REDIS_TLS`, `REDIS_CA_CERT_FILE`, `WORKER_ENABLED`, `WORKER_CONCURRENCY` |
| Notifikasi | `NOTIFICATION_DEFAULT_CHANNELS`, `NOTIFICATION_PUSH_PROVIDER`, `FCM_SERVICE_ACCOUNT_FILE`, `NOTIFICATION_SMS_PROVIDER`, `TWILIO_*` (dan Resend untuk e-mel apabila diaktifkan) |
| KYC | `KYC_REQUIRE_LIVENESS`, `KYC_ROUTING_JSON`, `KYC_VENDOR_A_*`, `KYC_ML_URL`, `KYC_ML_MEDIA_DIR` |
| Zakat | `ZAKAT_COLLECTION_APPOINTMENT_REF` (hanya selepas pelantikan rasmi sebagai ejen kutipan) |

**Frontend (`.env.local`; contoh dalam `.env.example`):** `VITE_API_BASE_URL`, `VITE_AUTH_MODE`, `VITE_OIDC_*`, `VITE_FIREBASE_*`, `VITE_SINGLE_ROLE_MODE`.

---

## 9. Ujian

- Backend: `cd server; npx jest`. Pada 6 Okt 2026: **41 suite, 280 ujian, semua lulus**.
- Ujian integrasi (PostgreSQL + Redis): `RUN_INTEGRATION_TESTS=true npm run test:integration`.
- Type-check: `npx tsc --noEmit -p .` (frontend) dan `cd server; npx tsc --noEmit -p tsconfig.json`.
- Aliran wang, akad, zakat, kerugian dan penyata telah diuji end-to-end pada PostgreSQL sementara (migration dari kosong, seed, backend sebenar).

---

## 10. Status skrin frontend

| Skrin | Status |
|---|---|
| Membership, transaksi bil, top-up kredit AI | Sebenar (backend + ToyyibPay) |
| KYC dan semakan KYC | Sebenar |
| Portal penaja projek, projek, bukti, feasibility, ciri AI | Sebenar |
| Financials: penyata, zakat, penyata cukai | Sebenar |
| Pooling: cipta pool (Pool Manager), langgan pool dengan akad | Sebenar; senarai pool dan sebahagian paparan lain masih data mock |
| Audit Trail: panel integriti rantai hash | Sebenar; senarai acara di skrin itu masih mock |
| Profil pengguna, dompet | Sebahagian sebenar |
| Aset, kontrak saya, pasaran aset, lejar, pelaburan, dokumen, benefisiari, skrin admin | Kebanyakannya data mock |
| Modal cipta pool pihak sponsor (`PDPPoolCreationModal`) | Cadangan mock |

---

## 11. Had dan kerja yang belum siap

Senarai penuh dan terkini dalam [PENDING_ACTIVITIES.md](PENDING_ACTIVITIES.md). Perkara utama:
- **Perlu penasihat Shariah:** caj kerugian ke atas modal pelabur, perkiraan akhir pool, proses kecuaian pengurus, bahagian rugi rakan kongsi Musharakah.
- **Perlu penasihat cukai:** cukai pegangan bukan pemastautin, cukai perkhidmatan, e-Invois MyInvois, negara D-8 lain.
- **Perlu keputusan:** penyedia eKYC, penyedia payout bank/DuitNow, akaun e-mel dan SMS, pelantikan ejen kutipan zakat, tempoh simpanan data biometrik (PDPA).
- **Production:** sijil TLS Redis, akaun ToyyibPay live, domain sebenar, Keycloak.
