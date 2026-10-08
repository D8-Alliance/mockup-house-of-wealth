# Dokumentasi Sistem Wealth Pooling (House of Wealth)

Keadaan sistem pada **6 Oktober 2026**, cawangan `feat/keycloak-oidc-auth`. Dokumen ini menerangkan apa yang ada dalam sistem sekarang. Kerja yang belum siap disenaraikan dalam [PENDING_ACTIVITIES.md](PENDING_ACTIVITIES.md); arahan menjalankan sistem ada dalam [RUN_COMMANDS.ps1](RUN_COMMANDS.ps1).

> [README.md](README.md) (bahasa Inggeris) ditulis pada September 2026 dan sebahagiannya sudah lapuk. Jika bercanggah, ikut dokumen ini. Seni bina sasaran untuk 9 negara D-8 ada dalam dokumen *D-8 Wealth Pooling Master Architecture v1.0* dan *D-8 Wealth Pooling Technical Design Document v1.0* (Claude Docs).

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

## 4. Pengesahan, peranan (RBAC) dan tenant

### 4.1 Pengesahan
- **`AUTH_MODE=mock`** (pembangunan): token demo ialah base64 JSON `{mock, role, countryNode, org}` diikuti `.demo-token`. Pengguna mesti wujud dan aktif dalam database.
- **`AUTH_MODE=oidc`**: token JWT dari Keycloak; pengguna dipadankan melalui `idpSubjectId`.
- Frontend: `VITE_AUTH_MODE`, `VITE_OIDC_*`; `VITE_SINGLE_ROLE_MODE` mengehadkan log masuk demo kepada satu peranan ujian.

### 4.2 Peranan dan tugasan
- **36 peranan** (`server/src/policy/permissions.ts`), dikumpulkan dalam frontend mengikut kumpulan (`src/rbac/roles/`): sistem, tadbir urus, operasi, pelabur, Shariah, pematuhan, kewangan, sokongan.

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

- Peranan diberi melalui **`UserRoleAssignment`**: setiap tugasan mengikat satu peranan kepada satu organisasi dan satu negara, dan boleh dinyahaktifkan. Seorang pengguna boleh memegang beberapa peranan (`POST /users/:userId/roles`, `DELETE /users/:userId/roles/...`).
- **Peranan aktif:** peranan dalam token hanya diterima jika pengguna memang memegangnya dalam database; jika tidak, peranan pertama yang ditugaskan digunakan. Jadi menukar peranan dalam token tidak memberi akses tambahan.
- **Peranan istimewa** (`PRIVILEGED_ROLES`): Super Admin, System, Security, Data dan AI Administrator.

### 4.3 Kebenaran (permission)
- **Model:** setiap peranan mempunyai senarai **tindakan** (`create`, `read`, `update`, `delete`, `approve`, `disburse`, `audit`, `export`) bagi setiap **modul sumber** (`dashboard`, `assets`, `contracts`, `marketplace`, `pooling`, `ledger`, `profile`, `governance`, `approvals`, `users`, `audit_logs`, `reports`). Dinilai oleh `PolicyEngine` di server.
- **Penguatkuasaan di server:** `@RequirePermission(modul, tindakan)` (70 penggunaan) dan `@Roles(...)` (89 penggunaan) pada controller, melalui guard global `OidcGuard` dan `RolesGuard`. Semakan tambahan dalam servis, contohnya: pegawai tidak boleh menyelesaikan pesanan sendiri, pencipta agihan tidak boleh meluluskannya, dan hanya Super Admin boleh mengurus pusat zakat.
- **Frontend** (`src/rbac/`): `RoleGuard` menyembunyikan tab yang tidak dibenarkan dan `RoleSwitcherBar` menukar peranan aktif. Ini untuk pengalaman pengguna sahaja; keputusan sebenar dibuat di server.

Contoh kebenaran:

| Peranan | Kebenaran utama |
|---|---|
| Super Admin | Semua modul dan tindakan |
| Country Admin | Cipta, baca, kemas kini dan lulus dalam negaranya (aset, kontrak, pool); baca dan audit lejar |
| Project Sponsor | Cipta dan baca aset; cipta permohonan kelulusan; baca pool |
| Pool Manager | Cipta, baca, kemas kini dan lulus pool (termasuk terma akad) |
| Retail Investor | Baca dashboard, pasaran, pool dan lejar sendiri |
| Shariah Committee | Cipta, baca, kemas kini dan lulus tadbir urus (keputusan akhir feasibility) |
| Settlement Officer | Baca dan kemas kini lejar; selesaikan pesanan, proses agihan dan payout |
| Auditor | Baca, audit dan eksport log audit, lejar dan laporan; sahkan rantai hash |

### 4.4 Tenant
- Setiap rekod milik satu **negara (country node)**, contohnya `CN-MYS`, dan satu **organisasi**. Pengguna hanya membaca dan menulis dalam tenant mereka (`assertTenantScope`, `tenantScopeFilter`); Super Admin merentas tenant.
- Zon masa dan format telefon mengikut negara (GMT+8 dan +60 bagi Malaysia).

### 4.5 Modul ciri
Admin boleh menghidupkan atau mematikan modul (`GET/PATCH /admin/modules`): `ASSET_REGISTRATION`, `WEALTH_POOLING`, `SHARIAH_GOVERNANCE`, `AI_INTELLIGENCE`, `CONTRACTS`, `DOCUMENT_VAULT`, `FINANCIAL_LEDGER`, `SECONDARY_MARKET`, `KYC_VERIFICATION`, `KYB_VERIFICATION`. Mod: `ACTIVE`, `MANUAL_REVIEW` atau `DISABLED`. Endpoint modul yang dimatikan ditolak oleh `FeatureModuleGuard`.

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
- Peraturan setiap akad (`server/src/pools/akad-terms.ts`):

| Akad | Pelabur sebagai | Pengurus sebagai | Bahagian untung pelabur | Kerugian |
|---|---|---|---|---|
| Mudarabah | Pemodal (rabb al-mal) | Mudarib | 1–99% | Ditanggung pelabur ikut modal; mudarib menanggung hanya jika cuai atau melanggar terma |
| Musharakah | Rakan kongsi | Rakan kongsi pengurus | 1–99% | Ikut nisbah modal, tanpa mengira nisbah untung |
| Wakalah bil Istithmar | Prinsipal (muwakkil) | Wakil pelaburan | 1–100% (baki sebagai insentif wakil) | Ditanggung pelabur; wakil menanggung hanya jika cuai |
| Ijarah | Pemilik bersama aset sewaan | Pengurus aset | 1–100% daripada sewa bersih | Risiko aset ditanggung pemilik ikut bahagian milikan |

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
- Peraturan pengiraan (`server/src/zakat/zakat-rules.ts`):

| Kategori | Haul diperlukan | Catatan |
|---|---|---|
| Simpanan dan tunai | Ya | Dimiliki setahun penuh |
| Pendapatan (gaji dan lain-lain) | Tidak | Dinilai semasa diterima |
| Pendapatan pelaburan (al-mustaghallat: untung, dividen, sewa) | Tidak | Kaedah yang diluluskan bagi ASB pada 2025 |
| Modal pelaburan | Ya | Kaedah zakat saham; modal kurang setahun dikecualikan |
| Aset perniagaan (urud al-tijarah) | Ya | Stok dan penghutang |

  Kadar: 2.5% (tahun Hijrah, 354 hari) atau 2.577% (tahun Masihi, 365 hari). Nisab dibandingkan dengan jumlah bersih selepas hutang.
- **Platform tidak memungut zakat.** Butang bayar membuka portal rasmi pusat zakat. Memungut zakat tanpa pelantikan Majlis Agama Islam Negeri ialah kesalahan; kutipan melalui ToyyibPay hanya berjalan jika `ZAKAT_COLLECTION_APPOINTMENT_REF` diset selepas pelantikan rasmi.

### 5.9 Cukai dan penyata (`/tax`, `/statements`)
- **Profil cukai:** negara pemastautin, status pemastautin Malaysia, jenis entiti, nombor cukai (disimpan; dipaparkan bertopeng; tidak masuk log audit).
- **Penyata pelabur** (`GET /statements/investor`): pegangan, pesanan dengan akad yang diterima, agihan.
- **Penyata projek** (`GET /statements/projects/:id`): pool dan akad, modal terkumpul, setiap tempoh (untung, rugi, ditampung), offset kerugian, bahagian pelabur dan pengurus; tanpa identiti pelabur. Boleh dibaca oleh penaja projek, kakitangan tenant, dan pelabur projek itu.
- **Penyata pendapatan tahunan untuk cukai** (`GET /statements/investor/tax?year=`): pendapatan dibayar dalam tahun itu mengikut jenis akad (bahagian untung atau sewa Ijarah), cukai dipotong (tiada setakat ini), modal dilabur berasingan.
- Format JSON, CSV dan PDF; tempoh mengikut zon masa negara pengguna.
- **Platform belum mengira atau memotong cukai.** Kadar bergantung pada struktur undang-undang pool (lihat item 11 dalam fail pending).

### 5.10 AI dan RAG (`/ai`)

**Penyedia dan model**
- Penyedia serasi OpenAI (`OPENAI_API_URL`, `OPENAI_MODEL`, `OPENAI_API_KEY`). Secara local, ia menunjuk kepada **Ollama** (container `gemma2`, model contohnya `gemma2:2b`), jadi data tidak keluar dari pelayan.
- Tanpa kunci API, **penyedia sandbox** digunakan: output sintetik yang ditanda jelas sebagai bukan nasihat.
- Had dan masa: `AI_CHAT_MAX_SOURCES` (lalai 4), `AI_CHAT_MAX_TOKENS`, `AI_CHAT_TIMEOUT_MS` (model CPU tempatan perlahan).

**Ciri**

| Ciri | Endpoint | Kredit |
|---|---|---|
| Pembantu AI (chat) dengan sumber RAG | `POST /ai/chat` | 1 |
| Ringkasan dan analisis dokumen projek/bukti | `POST /ai/projects/:id/documents/:docId/analyze` | 5 |
| Analisis feasibility projek (dengan revision dan semakan berperingkat) | `POST /ai/projects/:id/feasibility/analyze` | 100 |
| Analisis risiko / Shariah | `POST /ai/shariah/analyze` | 15 |
| Nasihat struktur kontrak Shariah, draf kontrak, semakan klausa dan peraturan | `/ai/contract-advisor/...`, `/ai/contract-drafts/...`, `/ai/contracts/...` | 20 |
| Due diligence projek | `POST /ai/projects/due-diligence/scan`, `POST /ai/due-diligence/analyze` | 30 |

**RAG (Retrieval-Augmented Generation)**
- Dokumen rujukan dimuat naik dan dipecah kepada bahagian (`RagDocument`, `RagChunk`), dengan **skop**: GLOBAL (semua negara D-8), COUNTRY atau PROJECT. GLOBAL hanya diurus oleh Super Admin atau AI Administrator.
- Carian kata kunci, ditambah carian vektor jika model embedding diset (`RAG_EMBEDDING_MODEL`, 768 dimensi, pgvector; ambang `RAG_MIN_VECTOR_SIMILARITY`, lalai 0.55).
- Jawapan mesti merujuk sumber (`[S1]`, `[S2]`); sitasi disimpan (`AiCitation`) dan boleh disemak serta dieksport (`/ai/citations`).
- Dokumen RAG melalui kitaran semakan: menunggu semakan, diluluskan, ditolak, perlu pindaan, atau diganti oleh versi baharu.

Jadual harga (`AiCapabilityPricing`) juga mengandungi "Investment Analysis" (30) dan "Full Feasibility Analysis" (20), tetapi tiada ciri AI yang menggunakannya sekarang.

**Kawalan**
- Kredit ditolak hanya selepas operasi AI berjaya; kredit percuma digunakan dahulu.
- Setiap permintaan dan jawapan direkod (`AiRun`, log audit); keputusan AI ialah **cadangan**, dan semakan manusia sentiasa diperlukan (`/ai/decisions/:id/review`).
- Ciri AI dikunci mengikut peringkat projek: selepas kelulusan akhir, analisis semula ditolak sehingga projek dibuka semula.
- Modul `AI_INTELLIGENCE` boleh dimatikan oleh admin; skrin membership kemudian menyembunyikan pelan AI.

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

### 5.14 Smart contract dan blockchain

**Keadaan sekarang: sistem tidak menggunakan blockchain dan tidak menjalankan smart contract.**
- **"Kontrak" dalam sistem** ialah kontrak Shariah digital: dokumen akad, terma pool yang ber-versi dan ijab qabul yang direkod di database, serta perjanjian yang dijana (bahagian 5.4 dan 5.11). Ia bukan kod yang berjalan di blockchain.
- **Wang sebenar** bergerak melalui ToyyibPay (FPX/kad) dan bank; sistem merekodnya dalam lejar kewangan.
- **Teks UI yang dahulu mendakwa** "on the blockchain", "smart contract execution", "immutable ledger" dan memaparkan alamat dompet palsu telah dibetulkan pada 5 Okt 2026 (commit `cddb011`). Perkataan "tokenization" masih ada dalam beberapa skrin admin dan data mock.

**Yang sudah ada sebagai asas (Fasa 1):** rantai hash SHA-256 ke atas log audit dan lejar kewangan (bahagian 5.6). Ia memberi kesan "tamper-evident" tanpa blockchain: perubahan, pemadaman atau penyusunan semula rekod yang telah dimeterai dikesan semasa pengesahan.

**Had Fasa 1:** sesiapa yang boleh menulis terus ke database boleh membina semula seluruh rantai. Ini hanya dapat dikesan jika hash kepala rantai (chain head) disimpan di luar sistem.

**Rancangan (item 10 dalam fail pending):**

| Fasa | Kandungan | Status |
|---|---|---|
| 0 | Betulkan dakwaan blockchain dalam UI | Siap |
| 1 | Rantai hash audit dan lejar | Siap |
| 2 | **Anchoring:** rekod hash kepala rantai atau Merkle root secara berkala ke blockchain awam yang murah (contohnya Ethereum Layer 2); halaman awam **Ketelusan Zakat**; butang "Sahkan bayaran saya" dengan bukti Merkle. Tiada data peribadi di blockchain | Menunggu pilihan rangkaian, dompet operasi dan bajet |
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

1. **Wang adalah ringgit sebenar.** Dana bergerak melalui ToyyibPay (FPX/kad) dan bank. Smart contract hanya boleh mengawal aset yang berada di blockchain, jadi ia memerlukan token atau ringgit digital (stablecoin). Ini dikawal selia oleh Bank Negara Malaysia dan Suruhanjaya Sekuriti (SC).
2. **Status kawal selia.** Token yang mewakili bahagian pool berkemungkinan dianggap sekuriti dan memerlukan kelulusan atau pendaftaran SC (contohnya rangka kerja ECF atau aset digital) sebelum dilancarkan.
3. **Masalah oracle.** Untung atau rugi projek berlaku di dunia sebenar dan mesti dimasukkan oleh manusia (akaun dan audit). Kepercayaan kepada pihak yang memasukkan data tidak hilang, jadi manfaat "tanpa perlu percaya" adalah terhad.
4. **Kesilapan tidak boleh diundur.** Agihan wang pelabur yang tersilap tidak dapat dibetulkan seperti dalam sistem sekarang (maker-checker, pembalikan lejar).
5. **PDPA.** Data peribadi tidak boleh diletakkan di rekod blockchain awam kerana ia tidak boleh dipadam atau dibetulkan.
6. **Semakan Shariah.** Kod smart contract menjadi pelaksana akad, jadi kod itu sendiri memerlukan resolusi Majlis Penasihat Shariah.
7. **Kos dan kepakaran.** Ia melibatkan yuran transaksi (gas), audit keselamatan kod oleh pihak ketiga (lazimnya puluhan ribu USD), pembangun Solidity atau seumpamanya, dan pengurusan kunci dompet operasi.

#### Syarat untuk memulakan Fasa 3

- Nasihat undang-undang bertulis dan, jika perlu, kelulusan SC bagi token pelaburan.
- Resolusi Shariah ke atas reka bentuk token dan kod smart contract.
- Fasa 2 (anchoring) sudah berjalan stabil.
- Keperluan perniagaan yang jelas, contohnya pasaran sekunder unit pool atau escrow automatik yang diminta pelabur.
- Bajet bagi audit keselamatan kod dan operasi dompet.

Sehingga syarat ini dipenuhi, logik akad kekal di server, dan ketelusan diperoleh melalui rantai hash (Fasa 1) serta anchoring (Fasa 2), tanpa memindahkan wang atau data peribadi ke blockchain.

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
