# Pending Activities

Kerja yang belum siap sahaja. Kerja yang sudah siap dibuang daripada senarai ini (penerangan sistem semasa ada dalam [DOKUMENTASI_SISTEM.md](DOKUMENTASI_SISTEM.md)). Item dinomborkan semula pada 2026-11-02.

## Ringkasan (disemak dengan kod 2026-11-02)

| # | Item | Baki | Langkah seterusnya / menunggu |
|---|---|---|---|
| 1 | Tamper detection | PAdES, OCR lawan lapisan teks, semakan dengan pengeluar | Bina bila diminta |
| 2 | Penyedia eKYC dan saringan luar | Anti-spoofing, pemalsuan dokumen, REGISTRY, AML/PEP/sanksi | Pilih penyedia; semak BNM e-KYC dengan compliance |
| 3 | Liveness | Penalaan peranti, kelip mata/senyum, kad fizikal, jalan alternatif | Uji lebih banyak telefon; sediakan jalan alternatif sebelum `KYC_REQUIRE_LIVENESS=true` |
| 4 | Data biometrik (PDPA) | Tempoh simpanan, pemadaman automatik, rekod persetujuan | Keputusan tempoh simpanan |
| 5 | Contract Advisory/Agreement ikut projek | `projectId` pada `Contract`, versi v2/v3, wizard pilih projek | Bina bila diminta (kerja besar) |
| 6 | Pembayaran | Ujian sandbox di staging, kredit bonus, go-live ToyyibPay | Uji di staging; akaun ToyyibPay live |
| 7 | Payout provider | Adapter bank/DuitNow, validation sebelum SETTLED, dual approval | Pilihan provider; nilai had amaun |
| 8 | Notifikasi dan background jobs | Rekod DNS Resend, TLS Redis, integration test dalam CI | Tambah rekod DNS `notify.alhidayahgroup.com.my` |
| 9 | Blockchain | Fasa 2 anchoring; Fasa 3 tokenisasi; teks "tokenization" dalam skrin demo | Keputusan rangkaian; nasihat SC dan Shariah |
| 10 | Akad, zakat, cukai dan akaun pelabur | Nisab 3 negeri; cukai pegangan/perkhidmatan, e-Invois; perkiraan akhir pool; dompet pelabur | Penasihat cukai dan Shariah; Kewangan |
| 11 | Keselamatan dan compliance sebelum pilot | Sahkan nilai had KYC sementara; format laporan regulator; tetapan production; hidupkan peranan Auditor | Compliance; pemilik projek |
| 12 | Keputusan kecil | Organization Admin dan kredit AI; tarikh tamat kad 9 negara; data ujian Anuar | Keputusan pemilik projek |
| 13 | Pembantu dokumen AI | Fasa A smart upload, Fasa B chatbot tahu status, Fasa C lampiran | Keputusan; model AI lebih kuat |
| 14 | DigitalOcean | Fail ke Spaces, model AI di staging, tetapan Keycloak, sandaran, pilot production | Bajet; lokasi data |
| 15 | Entiti berasingan dan pihak berkaitan | Semakan nama kumpulan oleh KYB, paparan dalam skrin semakan, sumbangan modal penaja | Keputusan Shariah (sumbangan modal) |
| 16 | Benefisiari dan pusaka | Estate Officer, aliran kematian, persetujuan waris, wasi (qabul hibah siap di mini-app) | Ditangguhkan (keputusan 2026-11-02); nasihat Shariah dan undang-undang |
| 17 | Modul aset | Aliran tunai sewa/untung, baki tandatangan dan takaful, Fasa C agensi, skrin demo | Boleh diteruskan |
| 18 | Kunci API | Kunci API untuk sistem luar | Ditangguhkan sehingga ada keperluan |
| 19 | Pengurusan pengguna | Notis privasi rasmi; RoleGrantRequest dan sebab perubahan peranan; Fasa 3–4; penguatkuasaan PDPA di server | Butiran syarikat dan semakan peguam |
| 20 | Mini-app D8 Ideas | Akaun amanah sebenar, SSO/push D8 Ideas, ujian super app, Keycloak, terjemahan | Butiran bank; spesifikasi D8 Ideas |
| 21 | Sewaan terus (Ijarah) tanpa projek | Skrin web, pembaharuan sewaan, keputusan pungutan sewa, komisen dan cukai | Keputusan pemilik projek; nasihat peguam dan cukai |
| 22 | Agihan keuntungan (Settlement Officer) | Skrin web, fail bayaran pukal bank, peringatan hasil projek lewat | Boleh dimulakan |
| 23 | Projek bermasalah: arkib dan gantung | Skrin web; label "Digantung" untuk pelabur; aliran pulangan modal | Boleh dimulakan bila diperlukan |

## 1. Tamper detection dokumen bukti projek

- **Kawasan:** `server/src/projects/document-integrity.ts`, `analyzeProjectDocument` dalam `server/src/ai/ai.service.ts`

**Baki:**
1. Sahkan tandatangan digital PDF (PAdES) jika ada.
2. Bandingkan lapisan teks dengan OCR imej halaman (teks tersembunyi atau ditindih).
3. Semak silang dengan pengeluar dokumen (SSM, pejabat tanah).

**Nota:** metadata dalam object stream termampat (PDF 1.5+) tidak dibaca. PDF yang disimpan semula oleh Word boleh ditanda INCREMENTAL_UPDATE.

## 2. Keputusan: penyedia eKYC dan saringan luar

- **Kawasan:** `server/src/kyc/checks`, `server/src/kyc/liveness`, `src/components/admin/AdminGovernanceLive.tsx` (`ScreeningNotAvailable`)

**Baki (memerlukan penyedia bertauliah):** passive anti-spoofing (rakaman skrin, topeng, deepfake, kamera maya); pengesanan pemalsuan dokumen; REGISTRY; AML (pemantauan transaksi), PEP dan saringan sanksi. Sehingga penyedia dipilih, Compliance menyemak secara manual semasa KYC/KYB.

**Langkah seterusnya:** pilih penyedia (kos, kontrak, lokasi data) dan semak Policy Document e-KYC BNM bersama compliance. Penyedia boleh dipasang melalui `KYC_ROUTING_JSON` / adapter `http-vendor` tanpa mengubah UI.

## 3. Liveness: penalaan dan pelancaran

- **Kawasan:** `server/src/kyc/liveness/`, `src/kyc/KycLivenessCapture.tsx`, `server/src/kyc/liveness/card-quality.ts`

**Baki:**
1. Tala ambang dengan kamera sebenar pada pelbagai peranti dan cahaya (`turnYaw` 0.22, `lookUpPitch` 0.06, face match 0.363, ambang kualiti kad).
2. Kelip mata dan senyum (perlu model titik muka lebih lengkap).
3. Semakan kad fizikal (condong kad untuk hologram, kesan kad di skrin).
4. Uji lebih banyak telefon dan putaran skrin.
5. **Pelancaran:** sediakan jalan alternatif (semakan manual atau panggilan video) untuk pengguna tanpa kamera atau yang gagal berulang kali, kemudian `KYC_REQUIRE_LIVENESS=true` (kini `false`).

## 4. Data biometrik (PDPA 2010)

- **Kawasan:** jadual `KycLivenessFrame`, `KycDocument`

Bingkai kamera dan dokumen KYC masih disimpan tanpa had masa. **Perlu keputusan:** tempoh simpanan dan pemadaman automatik; rekod persetujuan formal (versi teks, masa, IP); sama ada embedding wajah dipadam selepas sesi.

## 5. Contract Advisory dan Agreement Generation mengikut projek

- **Kawasan:** `server/src/ai/ai.service.ts` (`contractAdvisor`), `server/src/contract-intelligence/`, `src/ai/features/contract/`

**Masalah sekarang:** Advisory boleh dijana tanpa had dan hilang bila tukar halaman; Agreement Generation sentiasa versi 1 tanpa pautan projek (model `Contract` tiada `projectId`).

**Langkah:** simpan Advisory sebagai revision setiap projek; tambah `projectId` pada `Contract` (satu perjanjian aktif setiap projek dan jenis); jana semula = versi baharu; selepas APPROVED hanya melalui pindaan; wizard pilih projek dari senarai.

## 6. Pembayaran

1. **Sahkan di staging:** selepas bayaran sandbox, "Check status" atau callback mesti menukar status kepada PAID dan mengaktifkan pelan; uji juga tambah nilai kredit AI.
2. **Kredit bonus:** kini sama seperti kredit dibeli. Putuskan sama ada bonus dikira kredit percuma.
3. **Go-live ToyyibPay:** akaun live, kunci dan kategori live, `TOYYIBPAY_BASE_URL=https://toyyibpay.com/`, `NODE_ENV=production`, sign-in Keycloak. `TOYYIBPAY_RETURN_URL` sama origin dengan app; `TOYYIBPAY_CALLBACK_URL` domain sebenar. Buat satu bayaran kecil dahulu.
4. **Data lama:** bersihkan kredit simulasi pengguna ujian sebelum ujian baki tepat. Jika database ada akaun lama `SYSTEM-TOYYIBPAY-CASH-MYR`, baca bersama akaun baharu atau pindahkan bakinya dengan entri pelarasan.

## 7. Payout provider production

- **Kawasan:** `server/src/distribution/`

**Baki:**
1. Pilih provider bank transfer/DuitNow dan bina adapter `PayoutProvider` (kini rail manual bank-file sahaja).
2. Validation pihak provider (amaun, mata wang, rujukan, benefisiari) sebelum `SETTLED`.
3. Dual approval ikut had amaun dan pengasingan kumpulan pelulus. Perlu nilai had daripada pemilik projek.

## 8. Notifikasi dan background jobs

- **Keputusan 2026-10-30:** dalam aplikasi dan emel sahaja (tiada Firebase, tiada Twilio). Emel melalui Resend, domain `notify.alhidayahgroup.com.my` (jangan guna `mail.alhidayahgroup.com.my`).
- **Kawasan:** `server/src/notifications/`, `server/src/jobs/`

**Baki:**
1. **Resend:** tambah rekod DNS domain di MSC Hosting (log masuk Plesk "IT Executive" tiada DNS Settings; tanya Anuar atau MSC). Kemudian set `NOTIFICATION_EMAIL_PROVIDER=resend`, `RESEND_API_KEY` dan `NOTIFICATION_EMAIL_FROM` dalam `/opt/how/server/.env` di staging. Ini juga menghidupkan emel peringatan membership, aset, takaful dan OTP tandatangan.
2. **Redis TLS production:** sediakan `ca.crt`, `redis.crt`, `redis.key` (`server/ops/redis/README.md`); password Redis dalam secret manager.
3. **CI:** jalankan integration suite (`RUN_INTEGRATION_TESTS=true`) dalam GitHub Actions dan pastikan lulus.

## 9. Blockchain dan smart contract

- **Kawasan:** `server/src/audit/hash-chain.service.ts`, `server/src/zakat/`

**Fasa 2 (belum dimulakan):** anchor hash kepala rantai AUDIT/LEDGER atau Merkle root zakat setiap hari ke blockchain awam murah; halaman awam Ketelusan Zakat; butang "Sahkan bayaran saya". **Perlu:** pilihan rangkaian, dompet dan simpanan kunci, bajet yuran.

**Fasa 3 (menunggu undang-undang dan Shariah):** token bahagian pool hampir pasti sekuriti (SC). Dapatkan nasihat dahulu; rujuk `DOKUMENTASI_SISTEM.md` bahagian 5.14.

**Baki teks:** "tokenization/tokenized" dan hash palsu masih dalam skrin mod DEMO (`WorkflowEnginePanel`, `AdminGovernanceDashboards`, `AdminComplianceRisk`, `ApprovalMatrixPanel`, `ExecutiveDashboardWidgets`, `DashboardView` dan lain-lain). Buang atau kemas kini selepas keputusan Fasa 3.

## 10. Akad, zakat, cukai dan akaun pelabur

- **Kawasan:** `server/src/distribution/`, `server/src/zakat/`, `server/src/tax/`, `server/src/statements/`

**⚠️ Zakat:** memungut zakat tanpa pelantikan Majlis Agama Islam Negeri ialah kesalahan syariah; sistem kini hanya mengira dan menghantar ke portal rasmi.

**Baki: penasihat Shariah (Fasa D):**
1. Caj kerugian ke atas modal pelabur dalam lejar.
2. Perkiraan akhir pool (tanzid/qismah) semasa pool ditutup.
3. Proses kecuaian pengurus (mudarib/wakil).
4. Bahagian kerugian rakan kongsi pengurus dalam Musharakah.

**Baki: penasihat cukai (Fasa C):**
1. Cukai pegangan bukan pemastautin (kadar, potongan semasa agihan, akaun lejar, remitan LHDN). Jenis cukai bergantung pada struktur pool (ECF, P2P, dana Mudarabah).
2. Cukai perkhidmatan 8% ke atas yuran platform jika terpakai.
3. e-Invois MyInvois bila jualan melebihi RM1 juta.
4. Peraturan negara D-8 lain dan DTA.
5. Penyata platform: hasil yuran, imbangan duga, lejar am.

**Baki: lain-lain:**
1. Nisab Kedah, Pahang dan Perak belum direkod; Sarawak hanya September 2026. Admin perlu merekod nilai rasmi berkala.
2. Keputusan pengurusan: memohon pelantikan sebagai ejen kutipan zakat atau tidak (rujukan pelantikan masuk ke `ZAKAT_COLLECTION_APPOINTMENT_REF`).
3. **Dompet pelabur (Multi-Wallet):** wang pelabur direkod dalam akaun pool semasa settlement, bukan akaun pelabur. Reka akaun lejar pelabur bersama Kewangan, kemudian bina baki sebenar bagi setiap mata wang.

## 11. Keselamatan dan compliance sebelum pilot

1. **Had pelaburan:** nilai sementara dalam `server/.env.production.example` (LEVEL_1 RM 10,000, LEVEL_2 RM 100,000, LEVEL_3 tiada had). Compliance perlu mengesahkan atau menukar nilai ini, kemudian salin `KYC_INVESTMENT_LIMITS` ke `/opt/how/server/.env` di staging dan production.
2. **Laporan regulator:** persetujui format pemfailan setiap regulator (SC, BNM, LHDN) dengan Compliance.
3. **Tetapan production:** pastikan semua baris di Admin Center › Security Dashboard menunjukkan "Yes" sebelum pilot.
4. **Peranan Auditor:** hidupkan dalam Admin Center › Role Availability (kini dimatikan) supaya juruaudit boleh mengesahkan laporan prestasi projek suku tahunan.

## 12. Keputusan kecil

1. **Organization Admin dalam pengecualian kredit AI** (`server/src/membership/ai-credit-exemption.ts`): kekal atau buang.
2. **Jadual tarikh tamat kad pengenalan 9 negara** (`server/src/kyc/kyc-workflow.ts`): sahkan setiap negara sebelum dipindah ke Country Policy.
3. **Data ujian dalam database local Anuar:** akaun `claude.check1/2/6@test.local`, aset `ASSET-MYS-JZW65Y19` dan AiRun ujian; bersihkan jika tidak diperlukan.

## 13. Pembantu dokumen AI (KYC, KYB, PDP)

- **Kawasan:** `server/src/kyc/checks/document-text-reader.ts`, `server/src/pdp/`, `server/src/ai/ai.service.ts`, `src/ai/components/AIAssistant.tsx`

**Baki (cadangan fasa):**
1. **Fasa A:** smart upload: kenal pasti jenis dokumen, isi medan borang, semakan awal (kabur, tamat tempoh, nama tidak sepadan). OCR dan peraturan, tanpa LLM.
2. **Fasa B:** chatbot tahu status pengguna (dokumen belum lengkap, sebab dikembalikan, pautan ke borang).
3. **Fasa C:** lampiran fail dalam chat; perlu model vision atau model lebih besar.

**Prinsip:** AI mencadangkan, pengguna mengesahkan; AI tidak meluluskan KYC/KYB; imej IC/passport tidak ke AI luar (PDPA); bantuan onboarding dikecualikan kredit AI.

## 14. DigitalOcean (staging berjalan sejak 2026-10-15)

- **Kawasan:** `server/prisma/schema.prisma` (lajur `Bytes`), `PANDUAN_STAGING_DIGITALOCEAN.md`

**Baki:**
1. **Fail ke DigitalOcean Spaces:** database simpan kunci objek, SHA-256 dan metadata sahaja; skrip pindah fail sedia ada; fail KYC peribadi dengan URL bertandatangan singkat.
2. **Staging:** sahkan `OPENAI_API_KEY` diisi supaya semua ciri AI guna model sebenar (tanpanya penyedia sandbox digunakan); tetapan Keycloak oleh pemilik (Unmanaged attributes = "Only administrators can edit"; Max Age 36000 pada OTP Form dan Username Password Form); sandaran berjadual dan ujian pemulihan; kemas kini panduan staging (arahan sebagai `how`, `.env` disalin dengan tangan).
3. **Konfigurasi deploy:** satu folder `deploy/` (compose + override setiap persekitaran), secret di luar Git. Dibuat selepas Anuar berhenti.
4. **Pilot production:** Droplet 8 GB, PostgreSQL HA, Redis, sandaran.

**Keputusan diperlukan:** bajet bulanan; lokasi data (tiada region Malaysia, terdekat Singapura; sahkan dengan compliance); LLM serverless untuk teks.

## 15. Entiti berasingan dan transaksi pihak berkaitan

- **Kawasan:** model `Organisation`, `server/src/organisation-kyb/`, `server/src/investments/investments.service.ts`

**Baki:**
1. **Nama kumpulan diisi sendiri oleh organisasi:** KYB Officer perlu menyemaknya dengan profil SSM (pemegang saham) sebelum meluluskan; jika ejaan berbeza, padanan terlepas. Pertimbangkan senarai kumpulan yang diurus admin.
2. Paparkan jenis entiti dan kumpulan dalam skrin semakan KYB dan direktori organisasi Admin Center.
3. **Sumbangan modal penaja Musharakah** (pilihan) sebagai sumbangan berasingan dalam terma akad.

## 16. Benefisiari dan pusaka

- **Status:** ditangguhkan oleh pemilik (2026-11-02).
- **Kawasan:** `server/src/estate/`, `src/components/BeneficiariesView.tsx`

**Baki:**
1. **Peranan Estate Officer:** baca arahan pusaka hanya selepas kematian dilaporkan, dengan log audit.
2. **Aliran kematian:** lapor, bekukan akaun, sahkan dokumen (sijil kematian, Sijil Faraid, surat kuasa/probet), salurkan pelaburan dan aset, penyelesaian.
3. **Qabul hibah:** siap 2026-11-03 di mini-app. Pemberi menghantar pautan sekali guna (diemel jika emel disediakan; boleh dikongsi melalui WhatsApp atau SMS). Penerima membuka `/m/hibah/<token>` tanpa log masuk, mengesahkan dengan empat aksara terakhir nombor pengenalan dan namanya (atau wali bagi kanak-kanak), kemudian menerima atau menolak. Jawapan muktamad, direkod bersama IP dan pelayar, dan pemberi dimaklumkan. Pautan sah 30 hari dan dikunci selepas 5 cubaan salah. Baki: butang pautan qabul di skrin web; semakan Shariah tentang qabul oleh wali dan qabul melalui pautan.
4. **Persetujuan waris** bagi wasiyyah kepada waris faraid atau melebihi 1/3.
5. **Wasi/pentadbir** (contoh Amanah Raya Berhad).
6. **Semakan** teks panduan, akad hibah dan surat ikatan amanah oleh penasihat Shariah, peguam dan pemegang amanah.

## 17. Modul aset

- **Kawasan:** `server/src/assets/`, `server/src/asset-partnerships/`, `src/assets/`, `src/asset-partnerships/`

**Baki: aliran wang dan perkongsian:**
1. Sewa atau bahagian untung Asset Owner dalam aliran tunai dan agihan projek.
2. Organisasi yang menggunakan aset sendiri dalam projek sendiri (kini ditolak).
3. Skor tawaran oleh AI sendiri: ditangguhkan (qwen2.5:7b tidak konsisten); perlu model 14B/32B dan ujian konsistensi.
4. Hidupkan Legal Officer dan peranan Shariah dalam Role Availability di staging jika mahu penyemak sebenar.

**Baki: modal sponsor dan takaful:** setoran dalam ledger (menunggu akaun amanah, Fasa 2); skrin pemilik aset untuk muat naik takaful sendiri; sasaran minimum, tarikh tutup dan pulangan wang pool; pengeluaran pro-rata sebenar dari dua akaun.

**Baki: tandatangan elektronik:**
1. Sijil meterai daripada CA dipercayai Adobe untuk production.
2. Resend untuk OTP emel (item 8).
3. Cap masa dalam meterai (PAdES-T) dan pengesahan tandatangan TSA.
4. Fasa 2: penyedia tandatangan digital berlesen (MSC Trustgate / Pos Digicert) untuk nilai tinggi.
5. Pendapat peguam tentang kecukupan tandatangan elektronik dan duti setem.
6. Hidupkan `SIGNING_REQUIRE_VERIFIED_IDENTITY=true` di production.
7. Teks templat perjanjian (Musharakah, Ijarah) disemak peguam dan penasihat Shariah.

**Baki: log dan semakan:** PDF garis masa untuk perjanjian; rekod "Dilihat" untuk perjanjian; IP/peranti (perlu keputusan PDPA); paparkan fail dokumen aset dalam skrin semakan perkongsian; senarai aktiviti haram dan julat hasil sewa ke Country Policy (sahkan dengan Shariah); semakan automatik SSM (API SSM / MyData) dan OCR dokumen KYB.

**Baki: pendaftaran aset:**
1. Fasa C: integrasi e-Tanah, JPJ, JKKP (perlu perjanjian agensi).
2. Pautan peta lot negeri untuk tanah.
3. Amaran jika nilai dimasukkan jauh berbeza daripada laporan penilaian.
4. Cara mengemas kini nilai atau menarik balik aset VERIFIED (kini melalui Country Admin).
5. Asset Marketplace (mod DEMO) dan dashboard eksekutif masih guna `INITIAL_ASSETS`.
6. Penasihat AI di staging (Ollama qwen2.5:7b): pantau masa jawapan dan kualiti.

## 18. Kunci API untuk integrasi luar

**Baki:** apabila sistem luar perlu membaca data platform, bina kunci API (dicipta di server, disimpan sebagai hash dan dipaparkan sekali, boleh dibatalkan, skop terhad seperti `pools:read`, log audit). Ditangguhkan sehingga ada keperluan (keputusan 2026-11-03).

## 19. Pendaftaran dan pengurusan pengguna

- **Kawasan:** `server/src/users/`, `src/legal/`, `server/src/auth/identity.service.ts`

**Baki:**
1. **Notis privasi:** deraf `MYS-2026-10-DRAFT-1` perlu peguam; isi nama syarikat, SSM, pegawai perlindungan data, lokasi data, tempoh simpanan; terbitkan versi baharu.
2. **Fasa 2:** `RoleGrantRequest` (pemohon dan pelulus berbeza) untuk peranan admin, dan sebab wajib semasa menambah atau membuang peranan. (Gantung/aktifkan akaun, pindah organisasi, cipta dan gantung organisasi serta negara sudah ada di Admin Center.)
3. **Fasa 3:** daftar sendiri melalui Keycloak; pengguna dicipta pada log masuk pertama.
4. **Fasa 4:** model organisasi lengkap (item 15); penyulitan medan KYC.
5. **Penguatkuasaan PDPA di server:** sekat API (kecuali log masuk dan notis) sehingga persetujuan direkod.
6. **`COUNTRY_NODE_ID=CN-MYS`** di production Malaysia.

## 20. Mini-app D8 Ideas

**Baki:**
1. Isi akaun amanah sebenar setiap negara (bank, nama akaun, nombor, SWIFT) di Admin Center › Country Nodes sebelum pelabur sebenar membuat pesanan.
2. SSO dan push melalui D8 Ideas: menunggu spesifikasi mereka.
3. Uji dalam sandbox super app, terutamanya kebenaran kamera dalam WebView.
4. Keycloak: `/m/*` dalam Valid redirect URIs, dan SMTP (Realm settings › Email) untuk "Forgot password".
5. Notifikasi dalam BM: tajuk dan mesej notifikasi utama (pelaburan, KYC, keuntungan, akaun bank, keahlian, KYB, tarikh tamat aset, sewaan, perkongsian aset) diterjemah dalam mini-app melalui `src/mobile/i18n.messages.ts`. Notis privasi mengikut bahasa mini-app. Mesej server baharu perlu ditambah ke jadual itu, jika tidak ia dipaparkan dalam bahasa Inggeris. Emel dan push masih dalam bahasa Inggeris.
6. Tab Projek untuk penaja (Project Sponsor, Project Manager, Organization Admin), siap 2026-11-03: status projek, kemajuan pool, tranche dan permohonan pelepasan, serta laporan prestasi suku tahunan (isi, simpan, hantar kepada juruaudit). Baki: langkah seterusnya (roadmap) dipaparkan dalam bahasa Inggeris dari server, dan penyediaan projek kekal di web.
7. Semakan di telefon untuk KYC Officer dan penyemak Legal/Shariah (KYC, aset, sewaan, perjanjian): belum dibina; penyemak menggunakan portal web.

## 21. Sewaan terus (Ijarah) tanpa projek

- **Status:** Fasa 1 dalam mini-app (tab Sewaan) dan API `/leasing`: penyenaraian unit, permohonan dan rundingan, kelulusan Legal dan Shariah, jadual sewa dan rekod bayaran.
- **Kawasan:** `server/src/leasing/`, model `LeasableUnit`, `AssetLease`, `LeaseRentPayment` (migration `20261102090000_direct_leases`), `src/mobile/screens/MobileLeasing.tsx`

**Keputusan sementara (perlu disahkan):** sewa dibayar oleh penyewa **terus ke akaun bank pemilik**. Platform hanya merekod dan tidak memegang wang, jadi tiada isu wang pihak ketiga. Tiada komisen dikenakan buat masa ini.

**Baki:**
1. Perjanjian Ijarah: siap 2026-11-03 (`Contract.leaseId`, `POST /contract-intelligence/agreements/lease-drafts`). Pemilik menyediakan perjanjian daripada terma sewaan yang diluluskan; teks khusus sewaan terus (kegunaan dibenarkan, deposit sebagai amanah dan dipulangkan dalam 30 hari, sewa bulanan di awal bulan). Penyewa bersetuju, pemilik menghantar untuk semakan Legal dan Shariah (penyemak di portal web), kemudian kedua-dua pihak menandatangani dengan OTP di mini-app. Baki: penyemak belum boleh menyemak di mini-app; skrin web Contracts masih menamakan penyewa sebagai "delivery partner".
2. Skrin web (Asset Registry dan semakan Legal/Shariah). Buat masa ini semuanya dalam mini-app.
3. Peringatan: siap 2026-11-03 (`LeaseReminderSweeper`, sekali sehari). Sewa 3 hari sebelum dan pada hari perlu bayar; tertunggak 1, 7, 14 dan 30 hari (pemilik juga dimaklumkan); sewaan tamat dalam 60 dan 30 hari; pemulangan deposit hampir atau lewat tarikh akhir. Baki: pembaharuan sewaan (sekarang penyewa memohon sewaan baharu).
4. Deposit: siap 2026-11-03. Pemilik merekod deposit diterima; selepas sewaan tamat, pemilik memulangkannya dengan potongan dan sebab bagi setiap potongan, dalam 30 hari seperti dalam perjanjian.
5. Keputusan pemilik projek:
   - sama ada platform memungut sewa (melalui akaun amanah) atau rekod sahaja;
   - komisen atau yuran langganan (semak Akta 242, ejen harta tanah);
   - duti setem perjanjian sewa;
   - cukai perkhidmatan ke atas sewa komersial.
6. Fasa kemudian: pool pelaburan daripada hasil sewa (pelabur membiayai pengubahsuaian, berkongsi hasil sewa).

## 22. Agihan keuntungan (Settlement Officer)

- **Status:** aliran agihan berjalan dalam mini-app (tab **Agihan**) untuk Settlement Officer dan Super Admin.
- **Kawasan:** `server/src/distribution/`, `src/mobile/screens/MobileSettlement.tsx`

**Sudah ada:**
- **Skop:** Settlement Officer bertindak bagi semua pool di negaranya. Pool milik organisasi penaja, dan pelabur berada dalam organisasi peribadi masing-masing.
- **Rekod hasil projek** yang masuk ke akaun amanah (`POST /distributions/pool-income`), sekali bagi setiap rujukan bank. Keuntungan hanya dibayar daripada hasil yang direkod, tidak sekali-kali daripada modal pelabur.
- **Pratonton oleh server** (`POST /distributions/preview`):
  - keputusan bersih dan rugi terdahulu yang dipulihkan dahulu;
  - bahagian pelabur mengikut akad;
  - bahagian setiap pelabur mengikut modal;
  - akaun bank utama yang disahkan, dengan tanda bagi pelabur yang belum ada akaun disahkan.
- **Aliran agihan:** cipta dan hantar, kemudian pegawai lain meluluskan (pencipta tidak boleh meluluskan). Selepas itu proses bayaran, rekod rujukan bank bagi setiap pelabur, kemudian rekod "wang diterima", atau "gagal" dan cuba semula. Rugi atau keuntungan yang diserap direkod tanpa bayaran.
- **Pengesahan akaun bank pelabur.**
- **Akaun lejar pelabur:** pelabur yang ada pool di bawah dua organisasi kini mendapat akaun lejar berasingan bagi setiap organisasi, bukan lagi ralat.

**Baki:**
1. Skrin web untuk Kewangan, termasuk fail bayaran pukal bank (DuitNow Bulk atau IBG) dan penyesuaian penyata bank.
2. Peringatan jika hasil projek tidak masuk mengikut jadual.
3. Perkiraan akhir pool (tanzid) dan caj rugi yang belum pulih terhadap modal (item 10).

## 23. Projek bermasalah: arkib dan gantung

- **Status:** Separa siap (2026-11-02). Projek boleh diarkibkan atau dipadam melalui skrip `server/scripts/delete-test-project.ts` sahaja. Skrip ini ditulis untuk membuang data ujian (Temerloh Biochar dan MD2 Pineapple).
- **Cara skrip berfungsi:**
  - Projek tanpa rekod *append-only* dipadam terus.
  - Projek yang ada terma akad atau transaksi lejar diarkibkan (`Project.archivedAt`): pesanan PENDING dibatalkan, pool ditutup, dan projek hilang daripada senarai projek, pool, Agihan dan papan pemuka. Rekod dan log audit kekal.
  - Pencetus *append-only* (lejar, terma akad, audit) tidak pernah dimatikan.

**Belum siap:**
1. Arkib, Pulihkan, Gantung dan Sambung semula: siap 2026-11-03 di mini-app (Utama › Urus projek, `/project-admin`). Setiap tindakan wajib dengan sebab dan direkod dalam log audit; pelabur dan penaja dimaklumkan. Arkib ditolak jika ada wang pelabur yang sudah diselesaikan. Gantung menjeda pool yang dibuka tanpa membatalkan pesanan belum dibayar; Sambung semula membuka semula pool itu. Baki: skrin web.
2. Label "Digantung" pada portfolio dan pool untuk pelabur sedia ada (sekarang pool kelihatan sebagai dijeda dan pelabur menerima notifikasi).
3. Aliran pulangan modal kepada pelabur (lejar dan arahan bayaran).
