# Pending Activities

Kerja yang sudah dikenal pasti tetapi ditangguhkan. Kemas kini status apabila kerja dimulakan, dan buang item apabila selesai. Penerangan sistem semasa ada dalam [DOKUMENTASI_SISTEM.md](DOKUMENTASI_SISTEM.md).

## Ringkasan: apa yang belum siap (disemak 2026-10-06)

| # | Item | Yang belum siap | Menunggu |
|---|---|---|---|
| 1 | Tamper detection | Tandatangan PAdES, OCR lawan lapisan teks, semakan dengan pengeluar dokumen | Boleh dibuat bila diminta |
| 2 | Penyedia eKYC luar | Anti-spoofing, pemalsuan dokumen, REGISTRY, AML/PEP | Keputusan penyedia dan compliance (BNM e-KYC) |
| 3 | Liveness | Penalaan dengan kamera sebenar, kelip mata/senyum, semakan kad fizikal, ujian telefon, jalan alternatif | Ujian kamera oleh pemilik projek |
| 4 | Data biometrik (PDPA) | Tempoh simpanan, pemadaman automatik, rekod persetujuan formal | Keputusan tempoh simpanan |
| 5 | Emel peringatan membership | Job peringatan harian dan rekod emel dihantar | Akaun Resend dan alamat penghantar |
| 6 | Contract Advisory/Agreement ikut projek | `projectId` pada kontrak, versi v2/v3, wizard pilih projek | Boleh dibuat bila diminta (kerja besar) |
| 7 | Perkara kecil pembayaran | Kredit bonus, Project Promotion ke ToyyibPay, go-live ToyyibPay, akaun lejar lama | Keputusan kredit bonus; akaun ToyyibPay live dan domain |
| 8 | Payout provider | Adapter bank/DuitNow, validation sebelum SETTLED, dual approval ikut had amaun | Pilihan provider; nilai had amaun |
| 9 | Background jobs dan notifikasi | Uji token push di browser sebenar, sijil TLS Redis (production), akaun Resend/Twilio, integration test dalam CI | Akaun Resend/Twilio; penyediaan secret production |
| 10 | Blockchain dan smart contract | Fasa 2: anchoring hash ke blockchain awam dan halaman Ketelusan Zakat. Fasa 3: tokenisasi dan smart contract escrow. Baki teks "tokenization" dalam skrin mock | Fasa 2: pilihan rangkaian dan dompet operasi. Fasa 3: nasihat undang-undang SC dan resolusi Shariah |
| 11 | Akad, zakat, cukai dan penyata kewangan | Nisab Kedah/Pahang/Perak; cukai pegangan, cukai perkhidmatan, e-invois; caj kerugian ke atas modal dan perkiraan akhir pool | Penasihat cukai; penasihat Shariah; keputusan pelantikan ejen kutipan zakat |
| 12 | Dokumentasi | Kemas kini atau buang dokumen lama bahasa Inggeris yang sudah lapuk; pastikan `DOKUMENTASI_SISTEM.md` dikemas kini setiap kali sistem berubah | Keputusan: kekalkan dokumen lama atau gabungkan |

## 1. Pengesanan dokumen bukti projek yang diubah (tamper detection)

- **Status:** Langkah 1 hingga 3 siap (2026-10-05, commit `dc263b1`). Baki langkah 4 hingga 6 ditangguhkan.
- **Kawasan:** `server/src/projects/document-integrity.ts`, `analyzeProjectDocument` dalam `server/src/ai/ai.service.ts`, `uploadEvidence` dalam `server/src/projects/`

**Sudah ada:** hash SHA-256 semasa muat naik (dan disemak semula semasa analisis), metadata PDF (tarikh dicipta/diubah, perisian penyunting, tarikh masa depan), kesan suntingan bertambah (penanda `%%EOF` berulang, mengambil kira PDF linearized), dan amaran jika fail sama dimuat naik ke projek lain. Sebarang amaran mengekalkan status REQUIRES_REVIEW dan dipaparkan kepada penyemak. Ini hanya petunjuk, bukan bukti pemalsuan.

**Baki cadangan:**
1. Sahkan tandatangan digital PDF (PAdES) jika ada.
2. Bandingkan lapisan teks dengan OCR imej halaman untuk mengesan teks tersembunyi atau ditindih.
3. Semak silang dengan sumber pengeluar dokumen (contohnya SSM atau pejabat tanah).

**Nota:** metadata PDF dalam object stream termampat (PDF 1.5+) tidak dibaca; hanya Info dictionary biasa dan XMP. PDF yang disimpan semula oleh Word boleh mempunyai dua penanda `%%EOF` dan ditanda INCREMENTAL_UPDATE.

## 2. Keputusan: penyedia eKYC luar (untuk production)

- **Status:** Menunggu keputusan (dikemas kini 2026-10-02)
- **Kawasan:** `server/src/kyc/checks`, `server/src/kyc/liveness`

**Sudah ada (berjalan dalam server sendiri, tanpa servis luar):**
- **`DOCUMENT_CONTENT` (`local-ocr`):** baca dokumen (teks PDF dan OCR) dan bandingkan nama, nombor ID, tarikh lahir dan alamat dengan borang.
- **`LIVENESS` dan `FACE_MATCH` (`local-face`, prototaip):** arahan gerakan kepala rawak dari server, zon muka, kad dipegang ke kamera, dan face match wajah langsung lawan gambar kad (model OpenCV YuNet/SFace).
- **Sekatan kelulusan:** pengesahan amaran, sebab override, dan satu nombor ID untuk satu akaun sahaja.

**Belum ada, dan memerlukan penyedia bertauliah:**
- passive anti-spoofing: rakaman skrin, topeng, deepfake masa nyata, dan kamera maya;
- pengesanan pemalsuan dokumen;
- REGISTRY (pendaftaran kerajaan);
- AML_SCREENING (sanksi dan PEP).

**Keputusan diperlukan:** pilih penyedia (kos, kontrak, lokasi data) dan semak keperluan Policy Document e-KYC Bank Negara Malaysia bersama compliance. Rangka provider sedia ada (`KYC_ROUTING_JSON`, adapter `http-vendor`, mod bayangan) membolehkan penyedia dipasang tanpa mengubah UI.

## 3. Pengesahan wajah (liveness): penalaan dan pelancaran

- **Status:** Prototaip siap (2026-10-02). Belum diuji dengan kamera sebenar oleh pengguna.
- **Kawasan:** `server/src/kyc/liveness/`, `src/kyc/KycLivenessCapture.tsx`, `src/kyc/KycLivenessReviewPanel.tsx`

1. **Uji dan tala ambang dengan kamera sebenar:** saiz/kedudukan muka, pusing kiri/kanan (`turnYaw` 0.22), dongak (`lookUpPitch` 0.08) dan face match (0.363), pada pelbagai peranti, cahaya dan pengguna. Nilai sekarang disahkan dengan gambar sampel dan titik muka sintetik sahaja.
2. **Arahan tambahan:** kelip mata dan senyum. Ini memerlukan model titik muka yang lebih lengkap; model sekarang hanya ada 5 titik.
3. **Semakan kad fizikal:** arahan "condongkan kad" untuk melihat pantulan hologram, dan pengesanan kad yang dipaparkan di skrin.
4. **Pengalaman telefon:** uji di telefon (kamera depan, putaran skrin); kamera hanya berfungsi pada `https://` atau `localhost`.
5. **Pelancaran:** bila sedia, tetapkan `KYC_REQUIRE_LIVENESS=true`. Sebelum itu, sediakan jalan alternatif untuk pengguna tanpa kamera, atau yang gagal berulang kali (contohnya semakan manual atau panggilan video).

## 4. Data biometrik (PDPA 2010)

- **Status:** Menunggu keputusan (dicatat 2026-10-02)
- **Kawasan:** jadual `KycLivenessFrame`, `KycDocument`

Bingkai kamera dan dokumen KYC disimpan dalam database tanpa had masa. Perlu diputuskan:
- tempoh simpanan, dan pemadaman automatik selepas tempoh itu;
- rekod persetujuan yang lebih formal (versi teks persetujuan, masa, dan IP);
- sama ada embedding wajah (disimpan dalam metrics bingkai ALIGN) patut dipadam selepas sesi selesai.

## 5. Emel peringatan tamat membership

- **Status:** Ditangguhkan (dicatat 2026-10-01). Menunggu pembekal emel.
- **Kawasan:** `server/src/membership/membership.service.ts` (`getMembershipStatus`, `applyLifecycle`)

**Keadaan sekarang:** Pembaharuan membership adalah manual, kerana bill ToyyibPay ialah bayaran sekali. Peringatan hanya dipaparkan dalam app: banner di dashboard (`MembershipExpiryBanner`) dan di halaman Membership, 7 hari sebelum tamat dan semasa grace 7 hari. Adapter emel Resend dan notification outbox (item 9) sudah ada, tetapi belum ada job yang menghantar peringatan tamat membership.

**Diperlukan daripada pemilik projek:**
1. Akaun Resend dan `RESEND_API_KEY`, diletakkan sendiri dalam `server/.env` (atau pilih pembekal lain, yang memerlukan adapter baharu).
2. Alamat penghantar yang disahkan dalam Resend (contohnya `no-reply@domain`) untuk `NOTIFICATION_EMAIL_FROM`.
3. Jadual peringatan (cadangan: 7 hari dan 1 hari sebelum tamat, dan pada hari tamat).

**Kerja teknikal selepas itu:** job harian dalam queue BullMQ sedia ada yang mencari langganan berbayar menghampiri `currentPeriodEnd` dan memasukkan emel ke notification outbox, dengan kunci deduplication supaya setiap peringatan dihantar sekali sahaja.

## 6. Contract Advisory dan Agreement Generation mengikut projek

- **Status:** Cadangan (dicatat 2026-10-01)
- **Kawasan:** `server/src/ai/ai.service.ts` (`contractAdvisor`), `server/src/contract-intelligence/`, `src/ai/features/contract/`

**Keadaan sekarang:**
- **Advisory:** boleh dijana semula tanpa had (20 kredit setiap kali), dan keputusan hilang bila tukar halaman.
- **Agreement Generation:** mencipta perjanjian baru setiap kali, sentiasa versi 1, tanpa pautan ke projek. Wizard hanya minta nama projek sebagai teks bebas.
- **Kunci peringkat projek:** belum boleh dikenakan pada Agreement Generation, kerana model `Contract` tiada `projectId`.

**Cadangan:**
- Advisory disimpan sebagai revision bagi setiap projek.
- Tambah `projectId` pada `Contract`, dengan satu perjanjian aktif bagi setiap projek dan jenis kontrak.
- Jana semula mencipta versi baru (v2, v3) pada perjanjian yang sama.
- Selepas APPROVED, perubahan hanya melalui proses pindaan.
- Wizard memilih projek dari senarai, dan mengisi jenis kontrak dari Advisory.

## 7. Perkara kecil berkaitan pembayaran

- **Status:** Dicatat 2026-10-01.
- **Kredit bonus:** dianggap sama seperti kredit dibeli (tidak tamat, boleh ditebus untuk membership). Sahkan sama ada bonus patut dikira sebagai kredit percuma.
- **Project Promotion:** `promotionPayment` masih guna aliran bayaran sendiri, bukan ToyyibPay.
- **ToyyibPay go-live:** akaun live, kunci dan kategori dari akaun live, `TOYYIBPAY_BASE_URL=https://toyyibpay.com/`, `NODE_ENV=production`, dan sign-in melalui Keycloak (bukan `AUTH_MODE=mock`). Buat satu bayaran kecil dahulu sebelum dibuka kepada pengguna.
- **Deploy:** `TOYYIBPAY_RETURN_URL` dan `TOYYIBPAY_CALLBACK_URL` mesti menggunakan domain sebenar. Return URL mesti sama origin dengan URL app, jika tidak sesi log masuk tidak dijumpai selepas kembali dari ToyyibPay.
- **Data local (kredit simulasi):** baki kredit pengguna ujian termasuk kredit simulasi tanpa bayaran sebenar (contohnya 3600, 1150 dan beberapa 275). Bersihkan sebelum ujian yang memerlukan baki tepat. Transaksi lama ini kini dilabel DEMO dalam senarai transaksi.
- **Akaun lejar ToyyibPay lama:** jika database sudah ada akaun `SYSTEM-TOYYIBPAY-CASH-MYR` (sebelum commit `5e2d898`), entri lama kekal di situ dan refund untuk bayaran lama direkod ke akaun baru organisasi. Baca kedua-dua akaun bersama untuk bayaran sebelum perubahan itu, atau pindahkan baki lama dengan entri pelarasan.

## 8. Payout provider production dan reconciliation

- **Status:** Payout state machine, encrypted destination, signed webhook dan compensating reversal siap (2026-10-02). Provider payout sebenar masih pending.
- **Kawasan:** `server/src/distribution/`, model `PayoutInstruction`, `PayoutDestination`, `PayoutProviderEvent`, `DistributionApproval`

**Sudah ada:**
- Aliran `CALCULATED -> PENDING_APPROVAL -> APPROVED -> PROCESSING -> SETTLED`.
- Rejection, optimistic version check, maker-checker approval, audit event dan idempotency key.
- Manual bank-file payout rail melalui `PayoutInstruction`.
- Endpoint submit dan settle payout dengan provider reference.
- Payout destination disimpan encrypted dan hanya hash dipulangkan kepada client; verification dan cooling-off policy tersedia.
- Webhook HMAC signature, provider event idempotency dan event audit tersedia.
- Failure, retry, reversal dan compensating ledger transaction tersedia.
- Manual payout reconciliation endpoint, dan job reconciliation berjadual (BullMQ, setiap 15 minit).

**Masih pending:**
1. Pilih provider payout sebenar untuk bank transfer/DuitNow dan lengkapkan adapter `PayoutProvider`.
2. Lengkapkan provider-side validation untuk amount, currency, provider reference dan beneficiary sebelum `SETTLED`.
3. Tambah dual approval berdasarkan amount threshold dan approval-group separation untuk production. Perlu nilai had amaun daripada pemilik projek.

## 9. Background jobs, notifications dan provider delivery

- **Status:** Queue topology, job persistence, ToyyibPay reconciliation worker, generic in-app notifications, notification outbox dan provider adapters siap (2026-10-02). Firebase Push dan Twilio SMS kini disediakan sebagai external channels; Resend kekal optional. Local Redis authentication dan integration smoke test sudah lulus; production secret/TLS provisioning masih pending.
- **Kawasan:** `server/src/jobs/`, `server/src/notifications/`, migration `20261002160000_add_jobs_and_notification_outbox`

**Sudah ada:**
- BullMQ queue `house-of-wealth-background` dan worker entrypoint `npm run start:worker`.
- Scheduled jobs untuk ToyyibPay reconciliation (10 minit), payout reconciliation (15 minit), notification outbox (30 saat) dan seal rantai hash audit/lejar (5 minit, lihat item 10).
- `JobRun` idempotency/status persistence dan retry/backoff queue configuration.
- Generic notification list, unread count, mark-read dan mark-all-read API.
- Notification outbox dengan deduplication, retry delay dan dead-letter status.
- Resend email, Twilio SMS dan FCM push adapters yang fail-closed jika credential tiada.
- FCM push menggunakan API HTTP v1 dengan service account (commit `ecd52ed`); fail kunci dipasang sebagai Docker secret `firebase_service_account` untuk `api` dan `worker`.
- PostgreSQL/Redis integration test harness melalui `npm run test:integration`.
- Production env template `server/.env.production.example` dengan fail-closed placeholders.
- Production Redis compose dengan password secret mount, TLS certificate mount, persistence dan healthcheck.
- GitHub Actions workflow `.github/workflows/ci.yml` dengan PostgreSQL + Redis service dan integration test.
- Firebase Web SDK config, browser permission/token registration, Firebase messaging service worker dan backend `pushToken` profile persistence.
- Twilio adapter validation, E.164 checks, mocked delivery tests dan setup guide `server/ops/notifications-twilio.md`.

**Masih pending:**
1. Sediakan certificate files Redis (`ca.crt`, `redis.crt`, `redis.key`) berdasarkan `server/ops/redis/README.md` untuk production (TLS). Fail `redis_password` local sudah diisi; jangan commit nilainya.
2. Set provider credentials, sender identity, delivery consent dan notification templates dalam secret manager/deployment environment. Twilio code/config validation siap tetapi live SMS perlu diuji dengan account dan nombor yang disahkan; Resend masih optional.
3. Jalankan integration suite dengan `RUN_INTEGRATION_TESTS=true` dalam CI yang menyediakan PostgreSQL dan Redis. Local integration test (PostgreSQL + Redis dengan secret file) lulus pada 2026-10-05; yang tinggal ialah menjalankannya dalam CI.

Provider payout bank/DuitNow dijejak dalam item 8. Untuk production, pindahkan password Redis ke secret manager/file mount dan jangan simpan nilainya dalam Git.

**Semakan 2026-10-05:**
- **`server/ops/secrets/redis_password` sudah diisi** (disemak semula 2026-10-05). Folder `server/ops/redis/certs/` masih kosong (belum ada `ca.crt`, `redis.crt` dan `redis.key`); local menggunakan `REDIS_TLS=false`.
- Container Redis local `keycloak-redis-1` kini healthy, expose `6379`, dan menggunakan secret file; local integration test lulus (disahkan semula 2026-10-05).
- **Notifikasi local:** FCM sudah diset dalam `server/.env` dan service account Firebase telah disahkan boleh mendapatkan token Google. Email/SMS kekal tidak dikonfigurasi; `NOTIFICATION_DEFAULT_CHANNELS=IN_APP,PUSH`, tetapi penghantaran push ke browser sebenar belum diuji. Worker tidak berjalan secara local (`WORKER_ENABLED=false`), jadi notification outbox (termasuk push) tidak diproses sehingga worker dihidupkan.
- **Belum di-commit:** kod Firebase Web push (`src/services/firebaseMessaging.ts`, `public/firebase-messaging-sw.js`, `pushToken` profil) dan validasi Twilio (`server/ops/notifications-twilio.md`, ujian adapter) masih dalam working copy.

## 10. Blockchain dan smart contract

- **Status:** Fasa 0 dan 1 siap (2026-10-05). Fasa 2 dan 3 ditangguhkan.
- **Kawasan:** `server/src/audit/hash-chain.service.ts`, jadual `HashChainLink`, `src/components/admin/LedgerIntegrityPanel.tsx`, `server/src/zakat/`

**Sudah ada:**
- **Fasa 0 (commit `cddb011`):** dakwaan "on the blockchain", "smart contract execution", "immutable ledger" dan alamat dompet palsu dibuang dari halaman yang dilihat pengguna (landing, About, kontrak, pelaburan pool, lejar, profil).
- **Fasa 1 (commit `ce2641c`):** rantai hash SHA-256 ke atas audit log (AUDIT) dan lejar kewangan berserta entrinya (LEDGER), dalam jadual append-only `HashChainLink`. Worker men-seal rekod baharu setiap 5 minit. Super Admin boleh seal segera, dan Super Admin atau Auditor boleh sahkan melalui `GET /admin/audit/integrity` atau panel dalam skrin Audit Trail. Pengesahan menunjukkan rekod pertama yang diubah, dipadam atau dipautkan semula, serta hash kepala rantai (chain head).

**Had Fasa 1:** sesiapa yang boleh menulis terus ke database (contohnya DBA superuser) boleh membina semula keseluruhan rantai. Ini hanya dapat dikesan jika hash kepala rantai disimpan di luar sistem, iaitu tujuan Fasa 2. Secara local, worker tidak berjalan (`WORKER_ENABLED=false`), jadi rekod hanya di-seal bila Super Admin menekan "Seal new records".

**Fasa 2: anchoring dan Ketelusan Zakat (belum dimulakan):**
1. Secara berkala (cadangan: harian), rekod hash kepala rantai AUDIT dan LEDGER, atau Merkle root bagi rekod zakat dan agihan hari itu, ke blockchain awam yang murah (contohnya Ethereum Layer 2). Simpan rujukan transaksi blockchain bersama tarikh.
2. Halaman awam **Ketelusan Zakat**: jumlah zakat dikutip dan diagih, tanpa data peribadi.
3. Butang "Sahkan bayaran saya" untuk pembayar zakat: bukti Merkle bahawa resit mereka termasuk dalam hash yang direkodkan.
4. **Perlu daripada pemilik projek:** pilihan rangkaian blockchain, dompet operasi dan cara penyimpanan kuncinya, dan bajet yuran transaksi. Agihan zakat sebenar kepada asnaf tetap perlu laporan amil (Majlis Agama Islam negeri); blockchain tidak membuktikan wang sampai kepada penerima.

**Fasa 3: tokenisasi dan smart contract (menunggu keputusan undang-undang dan Shariah):**
1. Token bagi bahagian pool pelaburan hampir pasti dianggap sekuriti oleh Suruhanjaya Sekuriti Malaysia. Dapatkan nasihat undang-undang dan resolusi Shariah sebelum sebarang kerja teknikal.
2. Jika diluluskan: pertimbangkan blockchain berizin (contohnya Hyperledger Besu, satu nod bagi setiap negara D-8), audit keselamatan kontrak, dan kelulusan manusia sebelum sebarang agihan automatik. Keuntungan Mudarabah/Musharakah tetap ditentukan melalui akaun dan audit.
3. Tiada data peribadi di blockchain (PDPA: data perlu boleh dibetulkan, rekod blockchain tidak boleh dipadam).
4. Penerangan smart contract, perbandingan dengan sistem sekarang, 7 sebab Fasa 3 dilewatkan, dan syarat untuk memulakannya: lihat `DOKUMENTASI_SISTEM.md` bahagian 5.14.

**Baki teks:** perkataan "tokenization/tokenized" masih ada dalam skrin admin mock, dashboard, data mock dan penerangan peranan (contohnya `WorkflowEnginePanel`, `AdminGovernanceDashboards` dengan hash "Immutable Hash Certified" palsu, `rbac/roles/*`, `revenueConfig`). Kemas kini atau buang selepas keputusan Fasa 3. Kandungan halaman info yang pernah diedit dan diterbitkan oleh admin dalam mod DEMO disimpan dalam localStorage pelayar dan tidak menerima teks baharu.

## 11. Akad, zakat, cukai dan penyata kewangan

- **Status:** Fasa A dan B siap; Fasa C dan D, bahagian yang tidak memerlukan keputusan penasihat, siap (2026-10-06). Baki memerlukan penasihat cukai, penasihat Shariah dan keputusan pengurusan.
- **Kawasan:** `server/src/pools/`, `server/src/investments/`, `server/src/distribution/`, `server/src/zakat/`, `server/src/tax/`, `server/src/statements/`, `src/components/FinancialsView.tsx`, `src/components/financials/`

**Prinsip:** platform digunakan oleh Muslim dan bukan Muslim. Sistem tidak menyimpan agama pengguna. **Cukai terpakai kepada semua pengguna**; **zakat ialah pilihan** (opt-in dalam profil). Kedua-duanya mengambil angka dari satu sumber, iaitu lejar kewangan.

**⚠️ Isu undang-undang zakat:** memungut zakat tanpa dilantik sebagai amil atau diberi kuasa oleh Majlis Agama Islam Negeri ialah kesalahan jenayah syariah (contoh: seksyen 16 Akta 559, Wilayah Persekutuan). Rebat cukai zakat (seksyen 6A(3) Akta Cukai Pendapatan) hanya diberi dengan resit asal pusat zakat. Sistem kini hanya mengira dan menghantar pengguna ke portal rasmi.

**Fakta cukai Malaysia yang disahkan (2026-10-06):**
- Pulangan pembiayaan jenis P2P dikenakan cukai pendapatan; pelabur bukan pemastautin dipotong cukai pegangan 15% oleh operator.
- Pelaburan ECF layak pengecualian cukai 50% daripada jumlah pelaburan (had RM50,000 setahun, pegangan 2 tahun), hanya untuk tawaran ECF berdaftar dengan SC.
- Dividen individu melebihi RM100,000 setahun dikenakan cukai 2% (mulai 2025).
- Zakat individu: rebat cukai RM untuk RM. Zakat perniagaan Sdn Bhd/Bhd: potongan sehingga 2.5% pendapatan agregat.
- e-Invois (MyInvois): wajib jika jualan tahunan melebihi RM1 juta; bagi RM1–5 juta, tiada penalti hingga 31 Disember 2027.
- Cukai perkhidmatan 8% (ambang umum RM500,000).
- **Jenis cukai pelabur bergantung pada struktur undang-undang pool** (ECF, P2P atau dana Mudarabah).

**Sudah siap:**
- **Akad (Fasa A):** terma akad setiap pool (Mudarabah, Musharakah, Wakalah, Ijarah) dengan PSR, versi, append-only, dan dikunci selepas diterima pelabur; pool dicipta di server bersama terma versi 1 (`PoolCreationModal`); wizard pelaburan memaparkan teks terma dan merekod ijab qabul (id terma, hash, masa); agihan menggunakan PSR dari akad.
- **Penyata (Fasa A):** penyata pelabur dan penyata projek sebenar (JSON, CSV, PDF) dari rekod dan lejar.
- **Zakat (Fasa B):** opt-in; 14 pusat zakat Malaysia (Selangor, WP, Pahang, Kedah, Perak, Sarawak, Johor, Melaka, Negeri Sembilan, Pulau Pinang, Kelantan, Terengganu, Perlis, Sabah; laman rasmi disahkan); nisab bertarikh dengan sumber (Selangor 2026, WP 2026, Sarawak September 2026); haul ikut kategori; 2.5% Hijrah atau 2.577% Masihi; pelaburan platform dikira sebagai al-mustaghallat atau modal cukup haul; bayaran melalui portal rasmi; kutipan ToyyibPay hanya dengan `ZAKAT_COLLECTION_APPOINTMENT_REF`. Super Admin boleh menambah atau mengubah pusat zakat; admin dan pegawai Shariah merekod nisab.
- **Kerugian (Fasa D, sebahagian):** keputusan tempoh yang rugi, atau untung yang habis menampung rugi lama, direkod melalui kelulusan maker-checker tanpa bayaran (`POST /distributions/period-results`). Untung baharu menampung kerugian yang belum pulih sebelum dikongsi (offset). Penyata projek memaparkan jenis tempoh, keputusan bersih dan offset.
- **Cukai (Fasa C, sebahagian):** profil cukai pengguna (negara pemastautin, status pemastautin Malaysia, jenis entiti, nombor cukai yang disimpan dan dipaparkan bertopeng, tidak dimasukkan ke log audit); penyata pendapatan tahunan untuk cukai (`GET /statements/investor/tax`): pendapatan dibayar dalam tahun itu mengikut jenis akad, cukai dipotong (tiada setakat ini), dan modal dilabur disenaraikan berasingan.
- Diuji end-to-end pada PostgreSQL sementara (migration dari kosong, seed, kelulusan dua pegawai).

**Baki: perlu penasihat Shariah (Fasa D):**
1. **Caj kerugian ke atas modal:** kerugian yang tidak pulih kini hanya disimpan sebagai rekod tempoh; modal pelabur dalam lejar belum dikurangkan. Perlu kaedah perakaunan (akaun kerugian, pengurangan modal ikut nisbah modal) yang disahkan.
2. **Perkiraan akhir pool (tanzid/qismah)** semasa pool ditutup, termasuk sama ada agihan terdahulu dianggap "atas akaun".
3. **Kecuaian pengurus:** proses untuk menentukan dan merekod kerugian yang ditanggung pengurus (mudarib/wakil) kerana kecuaian atau pelanggaran terma.
4. **Musharakah:** bahagian kerugian rakan kongsi pengurus mengikut modal yang disumbang (contohnya sumbangan penaja projek).

**Baki: perlu penasihat cukai (Fasa C):**
1. **Cukai pegangan bukan pemastautin:** kadar dan jenis pendapatan bagi setiap struktur pool, potongan semasa agihan (kasar, cukai, bersih), akaun lejar cukai pegangan, dan remitan kepada LHDN.
2. **Cukai perkhidmatan** ke atas yuran platform (membership, kredit AI) jika klasifikasi dan ambang terpakai.
3. **e-Invois MyInvois** apabila jualan platform melebihi RM1 juta (perlu kelayakan akses LHDN).
4. Peraturan negara D-8 lain dan perjanjian cukai berganda (DTA).
5. **Penyata platform:** hasil yuran dengan cukai perkhidmatan, imbangan duga dan lejar am.

**Baki: zakat dan kerja lain:**
1. Nisab **Kedah, Pahang dan Perak** belum direkodkan: nilai yang dijumpai tiada tempoh berkuat kuasa yang jelas, atau tidak dapat disahkan dari laman rasmi. Nisab Sarawak ditetapkan bulanan; hanya September 2026 direkodkan. Admin perlu merekod nilai rasmi secara berkala.
2. **Keputusan pengurusan:** sama ada platform mahu memohon pelantikan rasmi sebagai ejen kutipan zakat.
3. `PDPPoolCreationModal` (pihak sponsor) masih cadangan mock; di backend hanya admin dan Pool Manager boleh mencipta pool.
4. Selepas kerja notifikasi yang mengubah `apiClient.ts` dan `server/.env.example` di-commit: buang `apiClient.calculateZakat`/`createZakatPayment` (tidak digunakan lagi), kemas kini `apiClient.createInvestmentOrder`, dan dokumentasikan `ZAKAT_COLLECTION_APPOINTMENT_REF`.

**Nota pepijat lejar (dibetulkan 2026-10-06, commit `770649a`):** trigger baki lejar menyebabkan setiap posting lejar gagal pada PostgreSQL sebenar. Migration pembetulan sudah dipasang pada database local.

**Nota database local (2026-10-06):** Windows merizab julat port 55422–55521, jadi `keycloak-postgres-new` (port 55433) tidak dapat dihidupkan. Volume data yang sama kini dijalankan sebagai `keycloak-postgres-5433` pada port 5433, dan `DATABASE_URL` dalam `server/.env` sudah ditukar. Container lama disimpan (berhenti). Lihat `RUN_COMMANDS.ps1`.

## 12. Dokumentasi

- **Status:** `DOKUMENTASI_SISTEM.md` (Bahasa Melayu) ditulis pada 2026-10-06 sebagai penerangan lengkap sistem semasa.
- **Kawasan:** `DOKUMENTASI_SISTEM.md`, `README.md`

1. **`README.md` (bahasa Inggeris, ditulis September 2026) sudah lapuk.** Contohnya: port database 55433, tiada akad, zakat atau cukai. Pilihan: kemas kini atau ringkaskan kepada pautan ke `DOKUMENTASI_SISTEM.md`. Empat dokumen lama lain dan folder `RAG_AI_PROJECT/` telah dibuang pada 2026-10-07.
2. **Kemas kini `DOKUMENTASI_SISTEM.md`** setiap kali modul, endpoint, migration atau peraturan perniagaan berubah, terutamanya bahagian 5 (modul), 9 (bilangan ujian) dan 10 (status skrin).
