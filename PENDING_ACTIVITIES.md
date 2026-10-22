# Pending Activities

Kerja yang sudah dikenal pasti tetapi ditangguhkan. Kemas kini status apabila kerja dimulakan, dan buang item apabila selesai. Penerangan sistem semasa ada dalam [DOKUMENTASI_SISTEM.md](DOKUMENTASI_SISTEM.md).

## Ringkasan: apa yang belum siap (disemak 2026-10-19)

| # | Item | Yang belum siap | Menunggu |
|---|---|---|---|
| 1 | Tamper detection | Tandatangan PAdES, OCR lawan lapisan teks, semakan dengan pengeluar dokumen | Boleh dibuat bila diminta |
| 2 | Penyedia eKYC luar | Anti-spoofing, pemalsuan dokumen, REGISTRY, AML/PEP | Keputusan penyedia dan compliance (BNM e-KYC) |
| 3 | Liveness | Penalaan pada lebih banyak peranti, kelip mata/senyum, semakan kad fizikal, jalan alternatif | Ujian telefon sudah bermula (2026-10-16) |
| 4 | Data biometrik (PDPA) | Tempoh simpanan, pemadaman automatik | Keputusan tempoh simpanan |
| 5 | Emel peringatan membership | Job peringatan harian dan rekod emel dihantar | Akaun Resend dan alamat penghantar |
| 6 | Contract Advisory/Agreement ikut projek | `projectId` pada kontrak, versi v2/v3, wizard pilih projek | Boleh dibuat bila diminta (kerja besar) |
| 7 | Pembayaran | Sahkan aktivasi pelan selepas bayaran sandbox di staging; kredit bonus; Project Promotion ke ToyyibPay; go-live ToyyibPay | Ujian di staging; akaun ToyyibPay live |
| 8 | Payout provider | Adapter bank/DuitNow, validation sebelum SETTLED, dual approval ikut had amaun | Pilihan provider; nilai had amaun |
| 9 | Background jobs dan notifikasi | Uji token push, TLS Redis, akaun Resend/Twilio, integration test dalam CI | Akaun Resend/Twilio |
| 10 | Blockchain dan smart contract | Fasa 2 anchoring hash; Fasa 3 tokenisasi | Keputusan rangkaian; nasihat SC dan Shariah |
| 11 | Akad, zakat, cukai dan penyata | Nisab beberapa negeri; cukai pegangan, cukai perkhidmatan, e-invois; perkiraan akhir pool | Penasihat cukai dan Shariah |
| 12 | Dokumentasi | README lapuk; `DOKUMENTASI_SISTEM.md` belum merangkumi kerja 2026-10-14 hingga 16 | Boleh dibuat |
| 13 | Fasa 0: keselamatan sebelum pilot | Had amaun ikut tahap KYC, pengasingan tugas feasibility | Boleh dimulakan |
| 14 | Keputusan kecil 2026-10-08 | Organization Admin dan kredit AI, jadual tarikh tamat kad 9 negara, data ujian local | Keputusan pemilik projek |
| 15 | Pembantu dokumen AI (KYC/KYB/PDP) | Smart upload, chatbot tahu status dokumen | Keputusan; model AI yang lebih kuat |
| 16 | DigitalOcean (staging siap) | Fail ke Spaces, model AI sebenar di staging, tetapan Keycloak, sandaran, pilot production | Bajet; lokasi data; tindakan Keycloak oleh pemilik |
| 17 | Entiti berasingan dan pihak berkaitan | No. SSM, jenis entiti, syarikat induk; skrin cipta organisasi | Boleh dimulakan |
| 18 | Prestasi projek PDP dan kontrak | Laporan KPI berkala; "My Contracts" masih data contoh | Keputusan senarai KPI |
| 19 | Benefisiari dan pusaka | Simpanan backend, Estate Officer, aliran kematian | Keputusan proses; nasihat Shariah dan undang-undang |
| 20 | Modul aset | Pendaftaran semua jenis dan perkongsian aset dengan projek PDP siap; baki: isi perjanjian daripada perkongsian, aliran tunai sewa/untung, peringatan tarikh luput, Fasa C (e-Tanah/JPJ/JKKP) | Boleh diteruskan |
| 21 | Profile & Settings | Skrin pengesahan akaun bank (Settlement Officer); kontrak dan mata wang pilihan belum digunakan | Boleh dimulakan |
| 22 | Pendaftaran dan pengurusan pengguna | Notis privasi rasmi; Fasa 2 (RoleGrantRequest, skrin Users); Fasa 3 (daftar sendiri) | Butiran syarikat dan semakan peguam |
| 23 | Skrin yang masih data contoh | Lihat senarai penuh dalam item 23 | Boleh dimulakan mengikut keutamaan |
| 24 | Perkara teknikal kecil | Saiz bundle frontend, AiRun tergantung, kebersihan data local | Boleh dimulakan |

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

- **Status:** Prototaip siap (2026-10-02). Ujian pertama di telefon oleh pemilik projek pada 2026-10-16: oval panduan kini kekal berbentuk wajah di skrin potret, ambang dongak diturunkan ke 0.06, dan setiap pergerakan kepala menunjukkan bar kemajuan.
- **Dikemas kini 2026-10-08 (commit `b2a4d2c`):** langkah kad kini **wajib** membaca nombor ID daripada kad dan memadankannya dengan borang (laluan alternatif "wajah + 20 huruf" dibuang). Kawasan kad dipotong, dibesarkan dan ditajamkan sebelum OCR; kamera 1920×1080; had masa langkah kad 90 saat; mesej punca (gelap, silau, kabur, tidak sepadan). Ambang kecerahan/silau/ketajaman dalam `card-quality.ts` hanya memilih mesej dan belum ditala dengan kamera sebenar. **Risiko:** tiada laluan alternatif lagi, jadi pengguna dengan webcam lemah mungkin gagal berulang kali; perkara 5 di bawah menjadi lebih penting.
- **Kawasan:** `server/src/kyc/liveness/`, `src/kyc/KycLivenessCapture.tsx`, `src/kyc/KycLivenessReviewPanel.tsx`

1. **Uji dan tala ambang dengan kamera sebenar:** saiz/kedudukan muka, pusing kiri/kanan (`turnYaw` 0.22), dongak (`lookUpPitch` 0.06, diturunkan 2026-10-16) dan face match (0.363; pegawai kini melihat tahap kuat, sederhana atau tidak sepadan), pada pelbagai peranti, cahaya dan pengguna. Nilai sekarang disahkan dengan gambar sampel dan titik muka sintetik sahaja.
2. **Arahan tambahan:** kelip mata dan senyum. Ini memerlukan model titik muka yang lebih lengkap; model sekarang hanya ada 5 titik.
3. **Semakan kad fizikal:** arahan "condongkan kad" untuk melihat pantulan hologram, dan pengesanan kad yang dipaparkan di skrin.
4. **Pengalaman telefon:** ujian pertama dibuat (2026-10-16). Baki: uji pada lebih banyak telefon dan putaran skrin; kamera hanya berfungsi pada `https://` atau `localhost`.
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

- **Status:** Dicatat 2026-10-01. Dikemas kini 2026-10-16: ToyyibPay sandbox dikonfigurasi di staging; bil berjaya dicipta selepas dua pembetulan (e-mel bertanda "+" ditolak ToyyibPay, dan yuran FPX RM 1 yang dibayar pelanggan dianggap tidak sepadan).
- **Sahkan di staging:** selepas bayaran sandbox, "Check status" atau callback ToyyibPay mesti menukar status kepada PAID dan mengaktifkan pelan. Uji juga tambah nilai kredit AI.
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
- **Di-commit 2026-10-08 (commit `ab8980c`):** kod Firebase Web push (`src/services/firebaseMessaging.ts`, `public/firebase-messaging-sw.js`, `pushToken` profil) dan validasi Twilio (`server/ops/notifications-twilio.md`, ujian adapter). Saluran lalai kini `IN_APP,PUSH,SMS`.

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

**Hibah Amanah (ditambah 2026-10-13):** borang benefisiari kini ada pilihan Hibah Amanah dengan akad: penghibah mengesahkan tawaran (ijab), dan status penerimaan penerima (qabul) bermula "Awaiting acceptance". Baki: (a) benefisiari masih disimpan di pelayar sahaja, belum di backend; (b) permintaan qabul belum dihantar kepada penerima, dan penerima belum ada skrin untuk menerima atau menolak; (c) teks akad dan surat ikatan amanah (trust deed) perlu disemak oleh penasihat Shariah dan pemegang amanah yang dilantik.

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

## 13. Fasa 0: pembetulan keselamatan sebelum pilot (Master Architecture v1.0)

- **Status:** Separuh siap (2026-10-12): larang peranan sendiri, pengasingan tugas funding dan payout, Helmet/had kadar/CORS, serta sekatan mock auth dan algoritma JWT (production hanya terima `oidc` + RS256) sudah dibuat. Pada 2026-10-13: semakan KYC sebelum melabur (status APPROVED) dan pool OPEN kelihatan kepada pelabur semua organisasi dalam negara yang sama. Baki di bawah. Rujukan penuh: *D-8 Wealth Pooling Master Architecture v1.0* §16–18 dan *Technical Design Document v1.0* §3, §6, §7.
- **Kawasan:** `server/src/main.ts`, `server/src/auth/identity.service.ts`, `server/src/users/users.service.ts`, `server/src/investments/investments.service.ts`, `server/src/funding/funding.service.ts`, `server/src/distribution/payout-destination.service.ts`, `server/src/ai/ai.service.ts`

1. **Tahap KYC minimum:** pesanan pelaburan kini memerlukan KYC berstatus APPROVED (2026-10-13). Baki: had amaun mengikut tahap KYC (LEVEL_1, LEVEL_2, LEVEL_3).
2. **Pengasingan tugas (baki):** Organization/Country Admin masih penyemak lalai bagi lima peringkat feasibility dalam `ai.service.ts`. (Funding dan destinasi payout siap 2026-10-12.)
3. **Pelulus kedua:** keputusan 2026-10-15: hanya satu Super Admin untuk seluruh sistem, dan hanya dia mencipta Country Admin. `RoleGrantRequest` untuk peranan admin lain dipindahkan ke item 22 (Fasa 2).

## 14. Keputusan kecil daripada kerja 2026-10-08

- **Kawasan:** `server/src/membership/ai-credit-exemption.ts`, `server/src/kyc/kyc-workflow.ts` (dan `src/kyc/kycLabels.ts`), halaman utama awam

1. **Organization Admin dalam pengecualian kredit AI:** kini dikecualikan (commit `42b47f8`) kerana diminta "semua administrator", tetapi kategori sistemnya Operational Management dan organisasi pelanggan juga boleh memegangnya. Keputusan: kekal atau buang (satu baris).
2. **Jadual tarikh tamat kad pengenalan 9 negara** (commit `b64568b`) diambil daripada rujukan yang diberi pada 2026-10-08. Perlu disahkan untuk setiap negara sebelum dipindah ke Country Policy (Fasa 2).
3. **Data ujian dalam database local:** akaun `claude.check1@test.local`, `claude.check2@test.local` (nama organisasi kosong) dan `claude.check6@test.local` dicipta semasa pengujian. Nyahaktifkan jika tidak diperlukan.

## 15. Pembantu dokumen AI untuk muat naik KYC, KYB dan PDP

- **Status:** Staging **berjalan** sejak 2026-10-15: droplet 152.42.232.149 (Singapura), Managed PostgreSQL, Keycloak dalam Docker, nginx dengan Let's Encrypt untuk how-staging, how-staging-api dan how-staging-auth.alhidayahgroup.com.my. Panduan: `PANDUAN_STAGING_DIGITALOCEAN.md`.
- **Baki untuk staging:**
  - Model AI sebenar: staging masih `AI_PROVIDER=sandbox`, jadi jawapan AI hanya teks contoh (langkah 12 panduan).
  - Tetapan Keycloak oleh pemilik: Unmanaged attributes = "Only administrators can edit"; Authenticator Reference Max Age 36000 pada OTP Form dan Username Password Form.
  - Sandaran database berjadual dan ujian pemulihan.
  - Panduan staging belum mencatat pengalaman 2026-10-15 dan 16 (arahan mesti dijalankan sebagai `how`, kunci rahsia tidak di-commit, `.env` mesti disalin dengan tangan).
- **Kawasan:** `server/src/kyc/checks/document-text-reader.ts` (OCR sedia ada), `server/src/kyc/kyc.controller.ts`, `server/src/pdp/`, `server/src/projects/projects.controller.ts` (muat naik bukti), `server/src/ai/ai.service.ts` (`/ai/chat`), `src/ai/components/AIAssistant.tsx`

**Sudah ada:** OCR tesseract di dalam pelayan, semakan pengubahsuaian dokumen dan liveness untuk KYC, analisis AI untuk dokumen bukti projek, chatbot RAG (hanya menjawab soalan, tiada lampiran fail atau tindakan).

**Cadangan fasa:**
1. **Fasa A: smart upload dalam borang KYC/KYB/PDP.** Pengguna seret beberapa fail sekali gus. Sistem kenal pasti jenis dokumen (MyKad, passport, Sijil SSM, penyata bank, akaun beraudit), isi medan borang (nama, nombor IC/pendaftaran, alamat, tarikh tamat), dan buat semakan awal sebelum hantar: dokumen kabur atau terpotong, sudah tamat tempoh, nama tidak sepadan dengan profil, jenis dokumen salah. Guna OCR dan peraturan tetap, tanpa LLM.
2. **Fasa B: chatbot tahu status pengguna.** Menyenaraikan dokumen yang belum lengkap mengikut negara dan jenis akad, menerangkan sebab permohonan dikembalikan, dan memberi pautan terus ke borang yang betul.
3. **Fasa C: lampiran fail dalam chat.** AI cadangkan ke mana setiap fail patut pergi; pengguna sahkan sebelum dimuat naik.

**Prinsip:**
- AI hanya mencadangkan; pengguna mengesahkan. Muat naik tetap melalui endpoint sedia ada dengan semakan kebenaran, pengubahsuaian dokumen dan log audit yang sama.
- AI tidak meluluskan KYC/KYB; keputusan kekal pada KYC/KYB Officer.
- Imej IC dan passport tidak dihantar ke AI luar (PDPA). Guna OCR dan model tempatan.
- Bantuan onboarding (KYC/KYB) dikecualikan daripada kredit AI.

**Nota:** model tempatan sekarang (`gemma2:2b`) terlalu kecil untuk ekstraksi yang tepat. Fasa C memerlukan model vision atau model yang lebih besar, iaitu pelayan yang lebih kuat atau GPU.

## 16. Pemindahan database, backend dan LLM ke DigitalOcean

- **Status:** Cadangan (2026-10-12). Belum dimulakan.
- **Kawasan:** `server/prisma/schema.prisma` (lajur `fileContent`/`content` jenis `Bytes`), `server/src/kyc/`, `server/src/projects/`, `server/src/ai/` (muat naik RAG), `server/Dockerfile`, `server/.env.production.example`

**Keadaan sekarang (diukur 2026-10-12):** database tempatan 21 MB; fail KYC, bukti projek dan dokumen RAG disimpan terus dalam PostgreSQL (`Bytes`). Plesk hanya menjalankan demo statik; backend tidak berjalan di sana.

**Langkah:**
1. **Simpan fail di DigitalOcean Spaces (serasi S3)** dan bukan dalam database. Database hanya simpan kunci objek, hash SHA-256 dan metadata. Pindahkan fail sedia ada dengan skrip migrasi. Fail KYC mesti peribadi (tiada akses awam) dan dicapai melalui URL bertandatangan yang singkat tempohnya.
2. **Konfigurasi deploy:** App Platform spec atau Docker Compose untuk API, worker dan Keycloak; secret dalam pengurus secret, bukan dalam Git.
3. **Staging:** siap 2026-10-15 (Droplet 4 GB dan Managed PostgreSQL). Belum: Spaces untuk fail, dan LLM serverless.
4. **Pilot production (anggaran $160–240 sebulan):** Droplet 8 GB, PostgreSQL dengan standby HA, Redis, sandaran. Selepas baki item 13 siap.

**Keputusan diperlukan:**
- Bajet bulanan.
- Lokasi data: DigitalOcean tiada region Malaysia (terdekat Singapura). Sahkan pemindahan data KYC dan kewangan ke luar negara dengan compliance (PDPA, garis panduan BNM/SC jika terpakai).
- LLM: serverless (bayar ikut token) untuk teks; imej IC dan passport kekal diproses oleh OCR dalam pelayan sendiri (rujuk item 15).

**Nota:** anggaran harga berdasarkan senarai harga DigitalOcean yang diketahui pada 2026; sahkan sebelum membuat keputusan.

## 17. Entiti berasingan (GLC dan anak syarikat) dan transaksi pihak berkaitan

- **Status:** Langkah 1 dan sekatan entiti siap (2026-10-13): organisasi yang menjalankan projek (entiti PDP) tidak boleh melabur dalam pool sendiri; pelabur dari entiti lain dalam negara yang sama boleh melabur dalam pool OPEN. Juga: hanya peranan pelabur boleh membuat pesanan pelaburan, dan penaja projek atau pemegang peranan PDP (Project Sponsor, Project Manager) tidak boleh melabur dalam pool projek itu. Butang Invest Now, Subscribe to Pool dan Invest in Pool hanya dipaparkan kepada pelabur.
- **Kawasan:** `server/prisma/schema.prisma` (model `Organisation`), `server/src/investments/investments.service.ts`, `server/src/tenancy/tenant-scope.ts`, skrin Organization Management

**Prinsip:** setiap entiti dalam kumpulan GLC (contoh: Felda Plantation, Felda Ventures) didaftarkan sebagai organisasi berasingan, kerana struktur dan cara kerjanya berbeza. Setiap entiti ada pengguna, peranan, KYB dan akaun bank sendiri.

**Baki:**
1. **Maklumat entiti:** tambah No. pendaftaran (SSM), jenis entiti (GLC, syarikat, individu, institusi) dan kumpulan induk pada organisasi. Kumpulan hanya untuk pendedahan, bukan untuk berkongsi akses.
2. **Transaksi pihak berkaitan:** apabila entiti dalam kumpulan yang sama dengan PDP melabur dalam pool PDP itu (contoh: Felda Ventures dalam pool Felda Plantation), tanda pesanan itu sebagai pihak berkaitan, paparkan kepada Compliance dan Shariah reviewer, dan nyatakan kepada pelabur lain.
3. **Sumbangan modal penaja (pilihan):** jika PDP perlu membiayai bersama projeknya (Musharakah), bina sebagai sumbangan berasingan yang dinyatakan dalam terma akad pool, dengan semakan penasihat Shariah. Bukan melalui butang Invest Now.

## 18. Prestasi projek PDP dan baki skrin kontrak

- **Status:** Separuh siap (2026-10-13): "My Contracts" untuk PDP (Project Sponsor, Project Manager) kini dipanggil "My Pool Agreements" dan membaca data sebenar: terma akad setiap pool (jenis akad, nisbah untung, versi), dana diterima, permohonan dana dan keuntungan yang diagihkan. Project Sponsor kini boleh membaca permohonan dana projeknya sendiri. Terma akad versi 1 diterbitkan untuk pool seed (`server/scripts/seed-pool-akad-terms.ts`), jadi aliran pelaburan boleh didemokan.
- **Kawasan:** `src/components/sponsor/SponsorAgreementsView.tsx`, `src/components/sponsor/SponsorKPICards.tsx`, `src/components/MyContractsView.tsx`, `server/src/projects/` (milestone), `server/scripts/seed-mock-data.ts`

**Baki:**
1. **Laporan prestasi projek berkala:** PDP menghantar angka sebenar setiap suku tahun, disahkan juruaudit, dan dipaparkan kepada pelabur. KPI kewangan: hasil dan kos sebenar berbanding unjuran, pulangan sebenar berbanding yang dijanjikan, milestone tepat masa (%), penggunaan bajet, keuntungan yang diagihkan. KPI sektor (contoh ladang: hasil BTS sehektar, kadar perahan minyak, keluasan tanam semula). Insiden Shariah dan dapatan audit.
2. **"My Contracts" pelabur:** angka ringkasan (4 Agreements, $117,500, Nov 15, 2026) masih data contoh tetap di frontend. Gantikan dengan pesanan pelaburan dan terma akad yang diterima pelabur dari backend.

## 19. Benefisiari dan pusaka: backend dan aliran kematian

- **Status:** Bahagian frontend siap (2026-10-13). Tab Beneficiaries hanya untuk individu (Retail, HNWI, Family Office) dan Asset Owner; admin, Compliance, Institutional dan Corporate Investor tiada akses. Pemilik memilih rangka Islam (faraid, Hibah Amanah, wasiyyah) atau sivil (wasiat). Peraturan: wasiyyah maksimum 1/3 dan tidak kepada waris faraid (pasangan, anak, ibu bapa); bahagian waris faraid tidak ditetapkan pengguna; institusi bukan waris faraid. Tuntutan "AAOIFI Shariah Standard No. 33" dan "Dual-Jurisdiction Certified" dibuang; data contoh guna domain contoh.
- **Kawasan:** `src/beneficiaries/estateRules.ts`, `src/components/BeneficiariesView.tsx`, `src/components/BeneficiaryModal.tsx`, backend baharu

**Baki:**
1. **Simpanan di backend:** benefisiari kini dalam pelayar sahaja dan hilang apabila dimuat semula. Simpan setiap pemilik di server, nombor ID disulitkan (PDPA), dan setiap perubahan diaudit. Hanya pemilik boleh membaca dan menulis.
2. **Peranan Estate Officer:** boleh membaca arahan pusaka seorang pemilik hanya selepas kematian dilaporkan, dengan log audit; tidak boleh mengubah arahan.
3. **Aliran kematian:** lapor kematian, kemudian akaun dibekukan (tiada pesanan baharu; keuntungan terkumpul kepada harta pusaka), sahkan dokumen (sijil kematian, Sijil Faraid, surat kuasa tadbir atau probet), salurkan pelaburan dan aset mengikut arahan dan perintah mahkamah, kemudian penyelesaian.
4. **Qabul hibah:** hantar permintaan qabul kepada penerima, dan sediakan skrin untuk menerima atau menolak (rujuk item 11).
5. **Persetujuan waris:** wasiyyah kepada waris faraid atau melebihi 1/3 hanya sah jika waris lain bersetuju; sediakan rekod persetujuan jika mahu disokong.
6. **Penama dan wasi:** catat wasi atau pentadbir (contoh Amanah Raya Berhad). Bagi Muslim di Malaysia, penama biasanya bertindak sebagai pentadbir, bukan pemilik manfaat.
7. **Semakan:** teks panduan dan peraturan perlu disahkan oleh penasihat Shariah dan peguam sebelum pilot.

## 20. Modul aset untuk Asset Owner

- **Status:** Sebahagian siap (2026-10-16). Pendaftaran aset kini di server (model `Asset` dan `AssetDocument`, modul `ASSET_REGISTRATION`): Asset Owner atau Asset Manager mendaftar aset sebagai draf, memuat naik dokumen (bukti hak milik wajib; PDF/JPG/PNG disemak jenis sebenar, hash SHA-256, isyarat pengubahsuaian dan fail yang sama pada aset pemilik lain), membuat tiga pengakuan (hak milik, kegunaan halal, ketepatan) lalu menghantar. Country Admin atau Legal Officer negara itu mengesahkan, meminta perubahan atau menolak, tidak boleh untuk organisasi sendiri. Tab Asset Register dan kad dashboard "Asset Holdings" kini data sebenar; tab Investments dibuang untuk Asset Owner. Pada 2026-10-16: halaman aset memaparkan pilihan akad (Ijarah, Musharakah, Murabahah) daripada peraturan penstrukturan Shariah (`server/src/assets/asset-structuring.ts`), butang penasihat AI (20 kredit; kredit dipulangkan jika AI gagal atau tamat masa), dan butang draf perjanjian yang mengisi Agreement Generation daripada aset yang disahkan. Menu AI Asset Owner hanya menunjukkan bahagian yang berkaitan.
- **Kawasan:** `server/src/assets/`, `src/assets/`, `src/components/dashboards/RoleDashboardView.tsx`

**Baki:**
1. **Kad kontrak:** ringkasan My Contracts masih data contoh; gantikan dengan perjanjian dan pesanan sebenar (rujuk item 18).
2. **Perkongsian aset dengan projek PDP: siap (2026-10-19).** Menu **More › Asset Partnerships** (`server/src/asset-partnerships/`, `src/asset-partnerships/`, migrasi `20261019090000_asset_partnerships`).
   - **(a) Tawaran Asset Owner:** PDP (Project Sponsor, Project Manager, Organization Admin) menyiarkan keperluan aset pada projek (jenis, bilangan, tempoh, lokasi, akad pilihan). Asset Owner dalam negara yang sama melihat keperluan terbuka dan menawarkan aset VERIFIED yang sama jenis.
   - **(b) Permintaan PDP:** Asset Owner memilih sendiri untuk menawarkan aset VERIFIED (halaman aset › "Offer to delivery partners": akad pilihan, tempoh tersedia, terma anggaran). PDP hanya melihat jenis, kawasan dan butiran umum, tanpa no. hak milik, lot, casis atau siri, nilai, atau nama pemilik, sehingga perjanjian diluluskan.
   - **Rundingan dan kelulusan:** pihak yang menerima boleh terima, tolak atau buat tawaran balas (giliran berselang); pencadang boleh tarik balik. Akad Ijarah (sewa, bulanan atau sekali gus, penyelenggaraan harian) atau Musharakah (nilai aset sebagai modal, nisbah untung pemilik). Selepas diterima: kelulusan Legal (Legal Officer, Country Admin) dan Shariah (Shariah Reviewer/Advisor/Committee) oleh orang berbeza, bukan dari mana-mana pihak; Super Admin boleh menandatangani satu sahaja. Aset tidak boleh dikomit kepada dua perjanjian yang bertindih tarikh; keperluan ditanda FILLED apabila cukup. Notifikasi dalam aplikasi kepada pihak lain dan penyemak; semua langkah direkod dalam sejarah dan audit.
   - **Lebih daripada satu Asset Owner (siap 2026-10-22):** butang **Compare offers** pada kad keperluan PDP memaparkan semua tawaran sebelah-menyebelah: sewa sebulan dan jumlah sepanjang tempoh (walau disebut bulanan atau sekali gus), nilai dan nisbah untung Musharakah, peratus tempoh keperluan yang diliputi, gadaian, isu dokumen, status dan langkah seterusnya. PDP tidak boleh menerima lebih daripada bilangan yang diminta; apabila keperluan FILLED atau ditutup, tawaran yang masih dirunding ditutup automatik dan pemilik dimaklumkan.
   - **Satu perjanjian bagi setiap perkongsian (siap 2026-10-22):** selepas perkongsian diluluskan, mana-mana pihak mendraf perjanjian (diisi automatik daripada perkongsian). Draf seterusnya daripada mana-mana pihak menjadi versi baharu bagi perjanjian yang sama, bukan perjanjian kedua. Pihak yang menulis sesuatu versi dikira bersetuju; pihak lain menekan "Agree to version N". Penghantaran ke semakan Legal hanya selepas kedua-dua pihak bersetuju dengan versi terkini. Penyemak Legal dan Shariah mesti dari luar kedua-dua pihak. Selepas diluluskan, setiap pihak menandatangani secara elektronik (taip nama penuh seperti didaftarkan dan sahkan kuasa menandatangani); perjanjian menjadi EXECUTION apabila kedua-dua pihak menandatangani. PDF/DOCX memaparkan nama penandatangan dan tarikh. Notifikasi pada setiap langkah.
   - **Skor tawaran dan penjelasan AI (siap 2026-10-22):** Compare offers memaparkan skor /100 yang dikira sistem dengan pemberat tetap (harga 35, liputan tempoh 25, dokumen 20, tiada gadaian 10, ketersediaan 10), jadi tawaran yang sama sentiasa mendapat skor yang sama. Harga dibanding dalam akad yang sama sahaja (sewa untuk Ijarah, nisbah untung pemilik untuk Musharakah). Ketersediaan diturunkan jika projek lain mahukan aset yang sama untuk tempoh bertindih; PDP hanya melihat tahap (rendah, sederhana, tinggi), tanpa nama atau bilangan projek. Butang "Explain with AI" menghantar angka dan skor sahaja (Offer A, B…, tanpa nama pemilik atau projek lain); AI menerangkan, tidak mengubah skor atau membuat keputusan. Aset yang belum disahkan tetap tidak boleh ditawarkan (keputusan 2026-10-22); apabila keperluan baharu disiarkan, pemilik aset sejenis yang belum disahkan diberitahu langkah seterusnya, dan Country Admin/Legal Officer diminta mendahulukan pengesahan aset yang sudah dihantar (bukan dari organisasi sendiri). PDP melihat bilangan aset sejenis yang masih disahkan.
   - **Semakan pra-kelulusan perkongsian (siap 2026-10-22):** penyemak boleh **Request changes** (perkongsian kembali kepada pihak yang menulis terma untuk tawaran balas; kelulusan sedia ada dibatalkan; terima tanpa pindaan disekat). Musharakah merekod **modal PDP** (wajib sebelum diterima; 0 dibenarkan dengan amaran "lebih dekat kepada Mudarabah"). Skrin semakan memaparkan panel **Pre-approval checks** (Legal / Shariah) yang dikira sistem: jenis aset berbanding keperluan, tempoh, aset disahkan, dokumen wajib, pemilik berdaftar, umur Carian Rasmi, gadaian/kaveat, sewa beli, Rizab Melayu, cukai tanah, tamat pajakan, kategori tanah, penilaian < 12 bulan, KYB PDP, komitmen bertindih, hasil sewa berbanding nilai, nisbah modal dan untung, nilai dipersetujui berbanding penilaian, untung sebagai nisbah, kerugian ikut modal, aktiviti halal, perniagaan penyewa. Butang **AI review assistant** meringkaskan risiko, menyenaraikan soalan untuk pihak-pihak dan mendraf nota semakan (tidak boleh mencadangkan kelulusan jika ada semakan gagal). Semakan yang gagal atau beramaran direkodkan bersama setiap keputusan dalam sejarah.
   - **Log dan bukti untuk pertikaian (siap 2026-10-22):** setiap langkah perkongsian ditulis ke audit log yang tidak boleh diubah, bersama entri penuh (terma, tarikh, nota, hasil semakan) dan cap jari SHA-256; History menunjukkan "Verified" jika sepadan dengan audit log ("Earlier record" untuk entri sebelum 2026-10-22, amaran merah jika berbeza). Masa dipaparkan dalam waktu tempatan dengan zon (GMT+8). Accept memerlukan pengesahan eksplisit "bagi pihak organisasi" dan cap jari terma yang dilihat (ditolak jika terma berubah). "Seen by …" direkodkan apabila pihak membuka perubahan pihak lain. Keputusan penyemak merekod sama ada nota didraf dengan AI (rujukan AI run) dan SHA-256 dokumen aset pada masa itu. Rekod penuh boleh dimuat turun sebagai PDF (cap jari keseluruhan; muat turun turut diaudit). Penutupan automatik oleh sistem juga diaudit.
   - **Alasan kelulusan (override, siap 2026-10-22):** penyemak yang meluluskan walaupun ada semakan gagal, AI mencadangkan perubahan atau penolakan, atau notanya berbunyi seperti penolakan, mesti menulis alasan (sekurang-kurangnya 10 aksara). Alasan dan sebabnya direkodkan dalam History, audit log dan PDF rekod.
   - **Kemas kini skrin penyemak (siap 2026-10-22):** menu AI mengikut peranan (Legal Officer dan peranan Shariah tidak lagi melihat Agreement Generation, Contract Structuring, Project Feasibility dan alat contoh; alat contoh ditanda "Sample" untuk peranan lain); "Loading projects…" kini "No projects you can access" bila kosong; halaman AI Credits untuk staf tanpa Top Up/Upgrade/Test & Consume; peti **My reviews** di dashboard penyemak (perkongsian, perjanjian, KYB, pengesahan aset, KYC, peringkat projek Shariah) dengan pautan terus; "Contract Gap & Clause Analyzer" (data contoh tetap) dibuang dan diganti dengan **Agreement checks** sebenar dalam skrin perjanjian (ruang kosong, klausa wajib ikut akad, terma perkongsian yang diluluskan) serta **AI scan for gaps** dengan draf nota.
   - **Baki log:** gunakan perkara yang sama untuk perjanjian (Contracts): kandungan versi dan tindakan pihak dalam audit log, PDF rekod; alamat IP/peranti tidak direkodkan (keputusan PDPA diperlukan).
   - **Baki semakan:** paparkan dokumen aset (fail) terus dalam skrin semakan perkongsian; senarai aktiviti haram dan julat hasil sewa kini tetap dalam kod, perlu dipindah ke tetapan Country Policy (Fasa 2) dan disahkan oleh penasihat Shariah.
   - **Baki:** (vi) **Skor oleh AI sendiri** (bukan pemberat tetap) ditangguhkan: model qwen2.5:7b tidak cukup konsisten (jawapan berbeza untuk data yang sama). Jika mahu, naik taraf ke model lebih besar (contohnya 14B/32B, perlu droplet LLM lebih besar atau GPU) dan uji konsistensi dahulu; skor tetap kekal sebagai rujukan; (ii) sewa atau bahagian keuntungan Asset Owner dalam aliran tunai dan agihan projek; (iii) notifikasi kepada Asset Owner apabila keperluan baharu sepadan dengan aset mereka; (iv) aliran untuk organisasi yang menggunakan aset sendiri dalam projek sendiri (kini ditolak); (v) peranan Legal Officer dan Shariah di staging perlu dihidupkan dalam Role Availability jika mahu penyemak sebenar.
3. **Pengesahan mengikut jenis aset (dipersetujui 2026-10-16):**
   - **Fasa A** (tiada pihak luar): borang dan senarai dokumen mengikut jenis; pengesanan pendaftaran berganda (hak milik/lot, no. casis, no. siri); pin peta dan gambar tapak dengan GPS; tarikh luput (pajakan, insurans, cukai jalan, sijil JKKP).
   - **Fasa B** (OCR dalam pelayan sendiri): geran dan Carian Rasmi (pemilik, bahagian, gadaian/kaveat), cukai pintu dan CCC (bangunan), VOC JPJ dan PUSPAKOM (kenderaan berat), invois dan plat nombor siri, sijil PMA JKKP (mesin).
   - **Fasa C** (pihak luar): integrasi e-Tanah, JPJ atau JKKP; memerlukan perjanjian dengan agensi atau penyedia.
   - **Tanah: Fasa A dan B siap (2026-10-16).** Butiran geran (jenis dan no. hak milik, lot, mukim, daerah, negeri, keluasan, kategori, pegangan, tarikh tamat pajakan, bahagian, Tanah Rizab Melayu); pin peta (OpenStreetMap) dan gambar tapak dengan GPS; Carian Rasmi wajib; tanah yang sama ditolak dalam satu organisasi dan dipaparkan kepada penyemak jika didaftar organisasi lain; OCR geran, Carian Rasmi dan cukai tanah (no. hak milik, lot, mukim, pemilik berdaftar, tarikh carian, gadaian/kaveat, Rizab Melayu, tahun cukai) serta jarak gambar dari pin. PDF imbasan kini dibaca dengan OCR (2026-10-19). Baki tanah: peringatan tarikh luput; pautan peta lot negeri.
   - **Kenderaan berat, mesin dan bangunan: Fasa A dan B siap (2026-10-19).**
     - **Kenderaan berat:** no. pendaftaran, casis dan enjin, buatan, tahun, kategori, tarikh luput cukai jalan, insurans dan PUSPAKOM, permit APAD, sewa beli. VOC JPJ wajib. OCR VOC dan PUSPAKOM (nombor, pemilik berdaftar, tuntutan hak milik pembiaya). Kenderaan yang sama dikenal pasti melalui no. casis.
     - **Mesin dan peralatan:** pengilang, model, no. siri, tarikh beli, jam operasi, sewa beli. Invois dan gambar plat nombor siri wajib; sijil PMA JKKP wajib jika ditanda (kren, pengangkat, dandang, bejana tekanan). OCR invois, plat siri dan sijil. Mesin yang sama dikenal pasti melalui pengilang dan no. siri.
     - **Bangunan:** hak milik sendiri, strata, atau hak milik induk (strata belum dikeluarkan); kegunaan, keluasan lantai, tahun siap, no. CCC, penyewa dan jenis perniagaan mereka. Hak milik/SPA dan CCC wajib. OCR hak milik (no., lot, pemilik, gadaian), cukai pintu (pemilik, tahun) dan CCC. Perniagaan penyewa yang tidak patuh Shariah (contohnya arak atau judi) ditanda untuk penyemak Shariah.
     - **OCR:** nombor siri, casis dan enjin dianggap sepadan walaupun OCR keliru antara O/0, I/1, B/8, S/5, dengan nota supaya penyemak melihat dokumen.
     - **Baki:** peringatan automatik sebelum tarikh luput (cukai jalan, insurans, PUSPAKOM, sijil JKKP); Fasa C dengan agensi.
4. **Penilaian:** amaran jika laporan penilaian lebih lama daripada 12 bulan, atau nilai yang dimasukkan jauh berbeza daripada laporan.
5. **Aset yang sudah disahkan:** cara mengemas kini nilai atau menarik balik aset VERIFIED (kini perlu melalui Country Admin).
6. **Skrin lama:** Asset Marketplace dan dashboard eksekutif masih menggunakan senarai aset contoh (`INITIAL_ASSETS`).
7. **Penasihat AI di staging:** disambung kepada LLM sendiri (droplet `how-ai`, Ollama qwen2.5:7b) pada 2026-10-21. Baki: pantau masa jawapan dan kualiti; pertimbangkan model lebih besar jika perlu.

## 21. Baki tab Profile & Settings

- **Status:** Sebahagian siap (dicatat 2026-10-15). Tab Security & Auth membuka halaman akaun Keycloak (kata laluan, OTP, peranti). Tetapan pilihan dan notifikasi disimpan dalam profil di server, dan penghantar notifikasi melangkau saluran yang dimatikan. Akaun bank bayaran disimpan dalam `PayoutDestination` (nombor disulitkan, hanya 4 digit akhir dipaparkan). Tab API & Integrations dibuang.
- **Kawasan:** `src/profile/`, `server/src/distribution/payout-destination.service.ts`, `server/src/distribution/payout-accounts.controller.ts`

**Baki:**
1. **Skrin pengesahan akaun bank:** endpoint `POST /distributions/payout-destinations/:id/verify` sudah ada, tetapi belum ada skrin untuk Settlement Officer. Akaun baharu kekal "Awaiting verification" sehingga skrin ini dibina.
2. **Pilihan kontrak Islam:** disimpan dalam profil tetapi belum digunakan untuk menapis atau menyusun pool di Asset Marketplace.
3. **Mata wang pilihan:** disimpan tetapi paparan amaun belum ditukar mengikut pilihan ini.
4. **Kunci API:** jika integrasi luar diperlukan, bina kunci API sebenar (dicipta di server, disimpan sebagai hash, boleh dibatalkan, dengan skop terhad).

## 22. Standard pendaftaran dan pengurusan pengguna

- **Status:** Fasa 1 siap (2026-10-15). Keputusan pemilik: **hanya satu Super Admin** untuk seluruh sistem; Country Admin ialah tahap tertinggi setiap negara dan hanya dicipta oleh Super Admin. Negara akaun ditetapkan semasa pendaftaran dan tidak boleh ditukar (negara = Country Cell, rujuk Master Architecture v1.0).
- **Fasa 1 (siap):**
  - Member ID baharu `USR-MYS-XXXXXXXX`; individu mendapat organisasi peribadi `ORG-MYS-IND-…`.
  - Medan `userType` dan `homeCountryNodeId`.
  - Rekod persetujuan notis privasi PDPA (`PrivacyConsent`), dengan notis dwibahasa.
  - Super Admin tidak boleh diberi atau ditarik melalui sistem.
  - Organisasi dan negara diambil daripada peranan pengguna (tiada lagi lalai `CN-MYS`/`ORG-PUBLIC`); `COUNTRY_NODE_ID` pilihan menolak negara lain.
  - Skrip `ensure-single-super-admin.ts`.
- **Kawasan:** `server/src/users/user-identity.ts`, `server/src/users/privacy-notice.ts`, `src/legal/`, `server/src/auth/identity.service.ts`

**Baki:**
1. **Notis privasi:** deraf `MYS-2026-10-DRAFT-1` perlu disemak peguam. Isi nama syarikat pengendali, nombor SSM, pegawai perlindungan data, lokasi pusat data dan tempoh simpanan, kemudian terbitkan versi baharu di frontend dan backend (semua pengguna akan diminta bersetuju semula).
2. **Fasa 2:** `RoleGrantRequest` (pemohon dan pelulus berbeza) untuk peranan admin, dan skrin Users untuk Country Admin dan Super Admin (tambah/buang peranan dengan sebab, pindah organisasi dalam negara yang sama, gantung akaun).
3. **Fasa 3:** daftar sendiri melalui realm Keycloak; pengguna dicipta secara automatik pada log masuk pertama dengan Member ID standard.
4. **Fasa 4:** model organisasi lengkap (jenis, nombor pendaftaran, syarikat induk) dan KYB (rujuk item 17); penyulitan medan KYC.
5. **Penguatkuasaan di server:** persetujuan PDPA kini diminta di frontend; pertimbangkan menyekat API (kecuali log masuk dan notis) sehingga persetujuan direkod.
6. **`COUNTRY_NODE_ID`:** tetapkan `CN-MYS` di production Malaysia. Staging belum menetapkannya kerana masih ada persona Indonesia.

## 23. Skrin yang masih menggunakan data contoh

- **Status:** Senarai disemak 2026-10-16. Skrin ini kelihatan berfungsi tetapi tidak membaca atau menyimpan data di server, jadi ia boleh mengelirukan dalam staging atau pilot.

| Skrin | Data sekarang | Rujukan |
|---|---|---|
| Investments (posisi pelaburan pelabur) | Senarai contoh dalam `InvestmentsView.tsx` | Pesanan pelaburan sebenar sudah ada di server |
| My Contracts | `INITIAL_CONTRACTS` | Item 18 |
| Document Vault | Contoh | Dokumen projek sebenar sudah ada di server |
| Asset Marketplace dan dashboard eksekutif | `INITIAL_ASSETS` | Item 20 |
| Beneficiaries | Disimpan dalam pelayar sahaja | Item 19 |
| Angka dashboard Super Admin | Contoh | Boleh diganti dengan ringkasan server |
| AI: Pool Matcher, Portfolio Health, Risk & Early Warning, Stress Scenarios, Pool Sizing Optimizer | Contoh (tiada panggilan server) | Disembunyikan untuk Asset Owner sahaja |
| Sponsor Portal: pelan langganan PDP (RM 99/bulan, slot projek), laporan contoh (FELDA Bio-Refinery), Launch Wealth Pool | `revenueService` dan data contoh dalam pelayar | Sejak 2026-10-20 permohonan PDP, nama organisasi dan projek dibaca dari server. Sejak 2026-10-22 penyemak KYB (Country Admin, KYB Officer, Compliance Officer, Super Admin) ada senarai sebenar di Admin Center › PDP Applications Queue: lulus, minta maklumat tambahan (pemohon membetulkan dan menghantar semula) atau tolak, dengan notifikasi. Baki: fail dokumen PDP belum dimuat naik ke server (borang hanya merekod nama dokumen) |
| Wealth Pooling MVP Workflow Console (senarai projek dan pool, End-to-End Test Engine) | `INITIAL_PROJECTS` dalam pelayar; enjin ujian hanya simulasi | Projek dan pool sebenar sudah ada di server. Sejak 2026-10-19 butang Submit New Project dan enjin ujian hanya untuk peranan yang boleh mencipta projek; Structure Pool dan kelulusan pool hanya untuk pengurus pool |

**Cadangan:** ganti mengikut keutamaan pilot (Investments dan My Contracts dahulu), atau tandakan skrin contoh dengan label "Contoh" sehingga diganti.

## 24. Perkara teknikal kecil

- **Status:** Dicatat 2026-10-16.

1. **Saiz bundle frontend:** satu fail JavaScript kira-kira 1.9 MB (430 KB selepas gzip). Pecahkan dengan `import()` dinamik untuk skrin besar (AI Wealth Engine, Admin Center) supaya muat pertama lebih pantas, terutamanya di telefon.
2. **AiRun tergantung:** permintaan AI yang terputus kerana pelayan dimulakan semula kekal `RUNNING` selama-lamanya. Tambah job pembersihan yang menandakannya FAILED dan memulangkan kredit (pemulangan kredit untuk kegagalan biasa sudah ada sejak 2026-10-16).
3. **Data ujian local:** aset ujian `ASSET-MYS-JZW65Y19` dan rekod AiRun ujian dalam database local; bersihkan jika perlu (data demo Plesk dirakam daripadanya).
