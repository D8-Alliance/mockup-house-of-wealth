# Pending Activities

Kerja yang sudah dikenal pasti tetapi ditangguhkan. Kemas kini status apabila kerja dimulakan, dan buang item apabila selesai.

## 1. Pengesanan dokumen bukti projek yang diubah (tamper detection)

- **Status:** Ditangguhkan (dicatat 2026-10-01)
- **Kawasan:** `analyzeProjectDocument` dalam `server/src/ai/ai.service.ts`, `uploadEvidence` dalam `server/src/projects/`

**Keadaan sekarang:** Pengesahan bukti projek hanya memadankan kata kunci (regex) pada teks yang diekstrak. Tiada model AI dan tiada pemeriksaan integriti. PDF palsu yang mengandungi kata kunci yang betul akan lulus semakan AI (status itu hanya bermaksud "sedia untuk semakan manusia"). Satu-satunya perlindungan ialah semakan manusia dalam aliran feasibility.

**Cadangan, mengikut keutamaan:**
1. Simpan hash SHA-256 fail semasa muat naik, supaya perubahan selepas muat naik dapat dikesan.
2. Periksa metadata PDF: tarikh dicipta berbanding tarikh diubah, dan perisian yang menghasilkan fail.
3. Kesan suntingan bertambah (incremental update), iaitu lebih daripada satu penanda `%%EOF`.
4. Sahkan tandatangan digital PDF (PAdES) jika ada.
5. Bandingkan lapisan teks dengan OCR imej halaman untuk mengesan teks tersembunyi atau ditindih.
6. Semak silang dengan sumber pengeluar dokumen (contohnya SSM atau pejabat tanah).

Langkah 1 hingga 3 murah dan tidak memerlukan pakej baharu.

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

**Keadaan sekarang:** Pembaharuan membership adalah manual, kerana bill ToyyibPay ialah bayaran sekali. Peringatan hanya dipaparkan dalam app: banner di dashboard (`MembershipExpiryBanner`) dan di halaman Membership, 7 hari sebelum tamat dan semasa grace 7 hari. Projek ini belum ada servis emel.

**Diperlukan daripada pemilik projek:**
1. Pembekal emel (contohnya SMTP Google Workspace, Amazon SES, Brevo atau Mailgun).
2. Kelayakan akses, diletakkan sendiri dalam `server/.env`.
3. Alamat penghantar (contohnya `no-reply@domain`).
4. Jadual peringatan (cadangan: 7 hari dan 1 hari sebelum tamat, dan pada hari tamat).

**Kerja teknikal selepas itu:** servis emel, job berjadual harian (`@nestjs/schedule`) yang mencari langganan berbayar menghampiri `currentPeriodEnd`, dan rekod peringatan yang sudah dihantar supaya emel tidak berulang.

## 6. Butang Downgrade ke Free masih mock

- **Status:** Menunggu keputusan (dicatat 2026-10-01). Butang Cancel sudah dibuang.
- **Kawasan:** `MembershipCard.tsx`, `CancelDowngradeModal`, `revenueService.downgradeMembership` (data mock)

Butang Downgrade tidak mengubah apa-apa di backend. Pilihan: buang butang itu, atau jadikan "Downgrade ke Free sekarang" yang sebenar (baki hari plan hangus, tiada refund).

## 7. Baki pembetulan code review: feasibility governance

- **Status:** Belum dimulakan (dicatat 2026-10-01). Tiga pembetulan lain sudah siap.
- **Kawasan:** `server/src/ai/ai.service.ts`, migration `20260930120000_add_feasibility_governance`

1. Run feasibility lama tiada rekod revision, jadi semakan gagal dengan "revision is missing". Perlu migration backfill baru.
2. Nombor revision dikira di luar transaction; dua analisis serentak boleh berlanggar.
3. Satu revision boleh menerima lebih daripada satu keputusan akhir; kelulusan lama kekal aktif.

## 8. Contract Advisory dan Agreement Generation mengikut projek

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

## 9. Pembayaran simulasi (Card / USDT Escrow)

- **Status:** Menunggu keputusan (dicatat 2026-10-01). Di production ia sudah ditolak kecuali `ALLOW_SIMULATED_PAYMENTS=true`.
- **Kawasan:** `BuyAICreditsModal.tsx`, `UpgradeModal.tsx`, `BillingTransactionsView.tsx`

Cadangan: sembunyikan pilihan simulasi apabila tidak dibenarkan; label "USDT Escrow" sebagai Demo (tiada escrow atau crypto sebenar); alihkan lencana "Simulated Gateway" ke pilihan simulasi sahaja; tanda transaksi simulasi sebagai DEMO dan keluarkan daripada kiraan hasil.

**Data local:** baki kredit pengguna ujian termasuk kredit simulasi tanpa bayaran sebenar (contohnya 3600, 1150 dan beberapa 275). Bersihkan sebelum ujian yang memerlukan baki tepat.

## 10. Perkara kecil berkaitan pembayaran

- **Status:** Dicatat 2026-10-01.
- **Kredit bonus:** dianggap sama seperti kredit dibeli (tidak tamat, boleh ditebus untuk membership). Sahkan sama ada bonus patut dikira sebagai kredit percuma.
- **Project Promotion:** `promotionPayment` masih guna aliran bayaran sendiri, bukan ToyyibPay.
- **ToyyibPay go-live:** akaun live, kunci dan kategori dari akaun live, `TOYYIBPAY_BASE_URL=https://toyyibpay.com/`, `NODE_ENV=production`, dan sign-in melalui Keycloak (bukan `AUTH_MODE=mock`). Buat satu bayaran kecil dahulu sebelum dibuka kepada pengguna.
- **Deploy:** `TOYYIBPAY_RETURN_URL` dan `TOYYIBPAY_CALLBACK_URL` mesti menggunakan domain sebenar. Return URL mesti sama origin dengan URL app, jika tidak sesi log masuk tidak dijumpai selepas kembali dari ToyyibPay.

## 11. Payout provider production dan reconciliation

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
- Manual payout reconciliation endpoint tersedia.

**Masih pending:**
1. Pilih provider payout sebenar untuk bank transfer/DuitNow dan lengkapkan adapter `PayoutProvider`.
2. Tambah scheduled durable reconciliation job dan retry/backoff menggunakan Redis/BullMQ.
3. Lengkapkan provider-side validation untuk amount, currency, provider reference dan beneficiary sebelum `SETTLED`.
4. Tambah dual approval berdasarkan amount threshold dan approval-group separation untuk production.

## 12. Background jobs, notifications dan provider delivery

- **Status:** Queue topology, job persistence, ToyyibPay reconciliation worker, generic in-app notifications, notification outbox dan provider adapters siap (2026-10-02). Local Redis authentication dan integration smoke test sudah lulus; production secret/TLS provisioning dan provider activation masih pending.
- **Kawasan:** `server/src/jobs/`, `server/src/notifications/`, migration `20261002160000_add_jobs_and_notification_outbox`

**Sudah ada:**
- BullMQ queue `house-of-wealth-background` dan worker entrypoint `npm run start:worker`.
- Scheduled jobs untuk ToyyibPay reconciliation, payout reconciliation dan notification outbox.
- `JobRun` idempotency/status persistence dan retry/backoff queue configuration.
- Generic notification list, unread count, mark-read dan mark-all-read API.
- Notification outbox dengan deduplication, retry delay dan dead-letter status.
- Resend email, Twilio SMS dan FCM push adapters yang fail-closed jika credential tiada.
- PostgreSQL/Redis integration test harness melalui `npm run test:integration`.
- Production env template `server/.env.production.example` dengan fail-closed placeholders.
- Production Redis compose dengan password secret mount, TLS certificate mount, persistence dan healthcheck.
- GitHub Actions workflow `.github/workflows/ci.yml` dengan PostgreSQL + Redis service dan integration test.

**Masih pending:**
1. Provision secret files `server/ops/secrets/redis_password` dan certificate files berdasarkan `server/ops/redis/README.md`; jangan commit values.
2. Set provider credentials, sender identity, delivery consent dan notification templates dalam secret manager/deployment environment. Twilio SMS credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`) dan FCM push credential (`FCM_SERVER_KEY`) masih pending/optional; in-app notifications tidak memerlukan kedua-duanya.
3. Jalankan integration suite dengan `RUN_INTEGRATION_TESTS=true` dalam CI yang menyediakan PostgreSQL dan Redis. Local smoke test lulus selepas local `.env` diselaraskan dengan Redis authentication.
4. Pilih provider bank/DuitNow, dapatkan API/webhook contract dan credentials, kemudian implement adapter serta provider-side polling.

**Current local status:** Redis container aktif dan integration test lulus. Untuk production, pindahkan password ke secret manager/file mount dan jangan simpan nilai password dalam Git.
