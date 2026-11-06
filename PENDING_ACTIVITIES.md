# Kerja Yang Belum Siap

Senarai ini hanya mengandungi kerja yang **belum siap**. Kerja yang sudah siap dibuang. Penerangan sistem yang sudah ada ditulis dalam [DOKUMENTASI_SISTEM.md](DOKUMENTASI_SISTEM.md).

## Ringkasan (disemak dengan kod pada 4 November 2026)

| # | Perkara | Apa yang belum siap | Sedang tunggu apa |
|---|---|---|---|
| 1 | Kesan dokumen palsu | Semak tandatangan digital PDF, bandingkan teks PDF dengan imbasan, semak dengan SSM atau pejabat tanah | Boleh dibuat bila diminta |
| 2 | Penyedia eKYC luar | Kesan muka palsu, dokumen palsu, semakan rekod kerajaan, senarai AML/PEP/sekatan | Pilih penyedia; semak garis panduan BNM dengan Compliance |
| 3 | Semakan wajah (liveness) | Uji di lebih banyak telefon, kelip mata/senyum, semak kad fizikal, jalan lain jika kamera gagal | Ujian telefon; jalan lain sebelum dihidupkan |
| 4 | Data biometrik (PDPA) | Berapa lama gambar wajah disimpan dan bila dipadam | Keputusan tempoh simpanan |
| 5 | Perjanjian ikut projek | Teks pindaan yang khusus (sekarang pindaan memuatkan perjanjian penuh) | Templat pindaan daripada peguam |
| 6 | Pembayaran ToyyibPay | Uji di staging, kredit bonus, buka akaun live | Ujian staging; akaun ToyyibPay live |
| 7 | Bayaran keluar ke bank | Sambungan bank/DuitNow, semakan sebelum selesai, dua pelulus ikut amaun | Pilih penyedia; had amaun |
| 8 | Notifikasi | Rekod DNS untuk emel Resend, Redis TLS untuk production | Tambah rekod DNS |
| 9 | Blockchain | Fasa 2 (simpan cap hash di blockchain awam), Fasa 3 (token) | Pilih rangkaian; nasihat SC dan Shariah |
| 10 | Akad, zakat, cukai, dompet pelabur | Nisab 3 negeri, cukai, e-Invois, kira akhir pool, dompet pelabur | Penasihat cukai dan Shariah; Kewangan |
| 11 | Keselamatan sebelum pilot | Sahkan had KYC, format laporan regulator, tetapan production, hidupkan peranan Auditor | Compliance; pemilik projek |
| 12 | Keputusan kecil | Organization Admin dan kredit AI, tarikh tamat kad 9 negara, data ujian "mockup" | Pemilik projek |
| 13 | Pembantu dokumen AI | Muat naik pintar, chatbot tahu status, lampiran dalam chat | Keputusan; model AI lebih kuat |
| 14 | DigitalOcean | Fail ke Spaces, model AI di staging, tetapan Keycloak, sandaran, production | Bajet; lokasi data |
| 15 | Kumpulan syarikat (pihak berkaitan) | Senarai nama kumpulan oleh admin, modal penaja Musharakah | Keputusan Shariah |
| 16 | Benefisiari dan pusaka | Semakan Shariah dan undang-undang, pewaris tanpa akaun, aset bukan pool | Penasihat Shariah, peguam, pemegang amanah |
| 17 | Modul aset | Sewa/untung pemilik aset, tandatangan, takaful, agensi luar, skrin demo | Boleh diteruskan |
| 18 | Kunci API | Kunci untuk sistem luar | Tangguh sehingga perlu |
| 19 | Pengurusan pengguna | Notis privasi rasmi, pelulus kedua untuk peranan admin, sebab tukar peranan | Butiran syarikat; peguam |
| 20 | Mini-app D8 Ideas | Akaun amanah sebenar, SSO D8 Ideas, ujian dalam super app, Keycloak, emel BM, semakan di telefon | Butiran bank; spesifikasi D8 Ideas |
| 21 | Sewaan terus (Ijarah) | Semakan perjanjian di mini-app, label "Delivery partner", caj utiliti, keputusan kutipan sewa dan cukai | Pemilik projek; peguam dan cukai |
| 22 | Agihan keuntungan | Fail bayaran pukal bank, padanan penyata, peringatan hasil lewat | Format fail bank; jadual hasil projek |
| 23 | Projek bermasalah | Pulangan modal kepada pelabur | Kewangan dan penasihat Shariah |
| 24 | Pangkalan pengetahuan dan Tanya | Tanda standard lama, model embedding di staging, Rebuild & embed, ujian jawapan | Shariah/Kewangan semak versi; tetapan staging |
| 25 | Kutipan sewa | Fasa 2: invois/SOA bulanan, pengesahan bayaran dua orang. Fasa 3: tugasan OTG, pakej Legal | Fasa 1 siap; Shariah untuk caj lewat |

---

## 1. Kesan dokumen bukti yang diubah

- **Fail:** `server/src/projects/document-integrity.ts`, `server/src/ai/ai.service.ts`

**Belum siap:**
1. Semak tandatangan digital dalam PDF (PAdES), jika ada.
2. Bandingkan teks dalam PDF dengan teks yang dibaca daripada gambar halaman (OCR). Ini untuk kesan teks yang disembunyikan atau ditutup.
3. Semak dengan pihak yang mengeluarkan dokumen, contohnya SSM atau pejabat tanah.

**Nota:** sistem belum boleh membaca maklumat dalam sesetengah PDF baharu (object stream termampat). PDF yang disimpan semula oleh Word kadang-kadang ditanda sebagai "diubah" walaupun tidak.

## 2. Penyedia eKYC dan saringan luar

- **Fail:** `server/src/kyc/checks`, `server/src/kyc/liveness`

**Belum siap (perlu penyedia yang bertauliah):**
- kesan muka palsu (rakaman skrin, topeng, deepfake, kamera palsu);
- kesan dokumen palsu;
- semak dengan rekod kerajaan;
- saringan AML (transaksi mencurigakan), PEP (orang politik) dan senarai sekatan.

Buat masa ini, Compliance menyemak sendiri semasa KYC dan KYB. Skrin AML, PEP dan Sanctions di Admin Center menyatakan "belum tersedia".

**Langkah seterusnya:** pilih penyedia (kos, kontrak, di mana data disimpan) dan semak garis panduan e-KYC Bank Negara bersama Compliance. Penyedia boleh disambung kemudian tanpa mengubah skrin.

## 3. Semakan wajah (liveness)

- **Fail:** `server/src/kyc/liveness/`, `src/kyc/KycLivenessCapture.tsx`

**Belum siap:**
1. Laraskan tahap semakan dengan kamera sebenar, pada banyak jenis telefon dan keadaan cahaya.
2. Arahan kelip mata dan senyum (perlu model wajah yang lebih lengkap).
3. Semak kad sebenar (condongkan kad untuk lihat hologram; kesan kad yang ditunjuk pada skrin).
4. Uji pada lebih banyak telefon dan bila skrin dipusing.
5. **Sebelum dihidupkan** (`KYC_REQUIRE_LIVENESS=true`, kini `false`): sediakan jalan lain untuk orang yang tiada kamera atau asyik gagal, contohnya semakan manual atau panggilan video.

**Nota:** muat naik selfie sudah dibuang daripada KYC (4 November 2026). Sekarang tiada semakan wajah langsung; jika perlu, semakan wajah (liveness) inilah yang menggantikannya.

## 4. Data biometrik (PDPA 2010)

Gambar wajah dan dokumen KYC kini disimpan tanpa had masa. **Perlu diputuskan:**
- berapa lama disimpan, dan dipadam secara automatik selepas itu;
- rekod persetujuan yang lebih lengkap (versi teks, masa, alamat IP);
- sama ada data wajah dipadam selepas semakan selesai.

## 5. Perjanjian ikut projek

- **Fail:** `server/src/ai/ai.service.ts`, `server/src/contract-intelligence/`, `src/ai/features/contract/`

**Sudah siap (5 November 2026):**
- Nasihat kontrak AI disimpan bagi setiap projek. Bila projek dipilih, nasihat terakhir dipaparkan; versi lama boleh dipilih. Analisis semula menambah versi baharu.
- Perjanjian yang diisi daripada projek ("Fill from" › My projects) dipautkan kepada projek itu. Jana semula semasa draf = versi 2, 3 dan seterusnya. Semasa semakan Legal/Shariah, jana semula ditolak. Selepas diluluskan atau ditandatangani, jana semula mencipta **pindaan** (perjanjian baharu yang merujuk perjanjian asal).

**Belum siap:**
1. Pindaan sekarang memuatkan teks perjanjian penuh dengan tajuk "Amendment to ...". Perlu templat pindaan yang hanya menyatakan perubahan, disediakan oleh peguam.
2. Perjanjian yang tidak diisi daripada projek (bermula kosong) masih berdiri sendiri, tanpa versi.

## 6. Pembayaran ToyyibPay

1. **Uji di staging:** selepas bayar dalam sandbox, status mesti bertukar kepada PAID dan pelan diaktifkan. Uji juga tambah kredit AI.
2. **Kredit bonus:** kini dikira sama seperti kredit yang dibeli. Putuskan sama ada bonus patut dikira kredit percuma.
3. **Buka akaun live:** guna akaun, kunci dan kategori live, alamat `https://toyyibpay.com/`, mod production dan log masuk Keycloak. Buat satu bayaran kecil dahulu untuk uji.
4. **Data lama:** bersihkan kredit ujian sebelum uji baki. Jika ada akaun lama `SYSTEM-TOYYIBPAY-CASH-MYR`, baca bersama akaun baharu atau pindahkan bakinya.

## 7. Bayaran keluar ke bank (payout)

- **Fail:** `server/src/distribution/`

**Belum siap:**
1. Pilih penyedia pindahan bank atau DuitNow, dan sambungkan. Sekarang hanya fail bank manual.
2. Semak amaun, mata wang, rujukan dan penerima dengan penyedia sebelum bayaran dikira selesai.
3. Dua pelulus bagi amaun besar. Perlu nilai had daripada pemilik projek.

## 8. Notifikasi

- **Keputusan 30 Oktober 2026:** notifikasi hanya dalam aplikasi dan emel. Tiada push (Firebase) dan tiada SMS (Twilio).

**Belum siap:**
1. **Emel (Resend):** tambah rekod DNS untuk domain `notify.alhidayahgroup.com.my` di MSC Hosting. Selepas itu isi `NOTIFICATION_EMAIL_PROVIDER=resend`, `RESEND_API_KEY` dan `NOTIFICATION_EMAIL_FROM` dalam `/opt/how/server/.env` di staging. Jangan guna `mail.alhidayahgroup.com.my`. Bila emel hidup, emel peringatan, kod OTP tandatangan dan emel kepada pelapor kematian juga akan dihantar.
2. **Redis untuk production:** sediakan sijil TLS (`ca.crt`, `redis.crt`, `redis.key`) dan simpan kata laluan Redis di tempat rahsia (lihat `server/ops/redis/README.md`).

## 9. Blockchain dan smart contract

- **Fasa 2 (belum mula):** setiap hari, simpan cap hash rekod audit, lejar dan zakat di blockchain awam yang murah. Buat halaman awam "Ketelusan Zakat" dan butang "Sahkan bayaran saya". **Perlu:** pilih rangkaian, dompet, cara simpan kunci, dan bajet yuran.
- **Fasa 3 (tunggu nasihat undang-undang dan Shariah):** token bagi bahagian pool hampir pasti dikira sebagai sekuriti oleh SC. Dapatkan nasihat dahulu. Lihat `DOKUMENTASI_SISTEM.md` bahagian 5.14.
- **Teks dalam skrin:** perkataan "tokenization" dan hash palsu sudah dibuang (4 November 2026). Yang tinggal hanya satu yuran masa depan dalam data contoh yang ditanda "Fasa 3, perlu semakan regulator".

## 10. Akad, zakat, cukai dan dompet pelabur

**⚠️ Zakat:** memungut zakat tanpa dilantik oleh Majlis Agama Islam Negeri ialah kesalahan. Sistem sekarang hanya mengira zakat dan menghantar pengguna ke portal rasmi pusat zakat.

**Perlu penasihat Shariah:**
1. Bagaimana kerugian dikurangkan daripada modal pelabur dalam lejar.
2. Kira akhir pool semasa pool ditutup.
3. Proses jika pengurus cuai (pengurus menanggung rugi).
4. Bahagian rugi rakan kongsi pengurus dalam Musharakah.

**Perlu penasihat cukai:**
1. Cukai pegangan bagi pelabur bukan pemastautin (kadar, potongan semasa agihan, bayaran kepada LHDN). Jenis cukai bergantung pada struktur pool.
2. Cukai perkhidmatan 8% atas yuran platform, jika terpakai.
3. e-Invois MyInvois bila jualan melebihi RM1 juta.
4. Peraturan cukai negara D-8 lain.
5. Penyata kewangan platform (hasil yuran, imbangan duga, lejar am).

**Lain-lain:**
1. Nisab Kedah, Pahang dan Perak belum direkod; Sarawak hanya September 2026. Admin perlu masukkan nilai rasmi dari masa ke masa.
2. Pengurusan perlu putuskan sama ada mahu memohon dilantik sebagai ejen kutipan zakat.
3. **Dompet pelabur:** wang pelabur direkod dalam akaun pool, bukan akaun pelabur. Reka akaun pelabur bersama Kewangan dahulu, kemudian tunjuk baki sebenar.

## 11. Keselamatan sebelum pilot

1. **Had pelaburan ikut tahap KYC:** nilai sementara ditulis dalam `server/.env.production.example` (Tahap 1: RM 10,000; Tahap 2: RM 100,000; Tahap 3: tiada had). Compliance perlu sahkan atau tukar, kemudian salin ke `/opt/how/server/.env`.
2. **Laporan kepada regulator:** setuju format laporan (SC, BNM, LHDN) dengan Compliance.
3. **Tetapan production:** semua baris di Admin Center › Security Dashboard mesti "Yes" sebelum pilot.
4. **Peranan Auditor:** hidupkan di Admin Center › Role Availability (kini dimatikan), supaya juruaudit boleh mengesahkan laporan prestasi projek. Pengguna ujian `umar_audit@gmail.com` (Wealth Pooling Malaysia) sudah didaftarkan dan menunggu peranan ini dihidupkan.

## 12. Keputusan kecil

1. Organization Admin tidak perlu bayar kredit AI sekarang. Kekal atau buang?
2. Jadual tarikh tamat kad pengenalan 9 negara: sahkan setiap satu.
3. Data ujian dalam database "mockup" (`claude.check1/2/6@test.local`, aset `ASSET-MYS-JZW65Y19`): bersihkan jika tidak perlu.

## 13. Pembantu dokumen AI (KYC, KYB, PDP)

**Cadangan:**
1. **Fasa A:** pengguna muat naik beberapa fail sekali gus; sistem kenal jenis dokumen, isi borang, dan beri amaran awal (kabur, tamat tempoh, nama tidak sama). Tanpa AI luar.
2. **Fasa B:** chatbot tahu dokumen apa yang belum lengkap dan kenapa permohonan dikembalikan.
3. **Fasa C:** hantar fail dalam chat; perlu model AI yang lebih kuat.

**Prinsip:** AI hanya mencadang; pengguna yang sahkan. AI tidak meluluskan KYC. Gambar IC dan pasport tidak dihantar ke AI luar.

## 14. DigitalOcean (staging berjalan sejak 15 Oktober 2026)

**Belum siap:**
1. **Simpan fail di DigitalOcean Spaces**, bukan dalam database. Fail KYC mesti peribadi.
2. **Staging:** pastikan `OPENAI_API_KEY` diisi (tanpanya jawapan AI hanya contoh); tetapan Keycloak oleh pemilik; sandaran berjadual; kemas kini panduan staging.
3. **Satu folder `deploy/`** untuk semua tetapan Docker.
4. **Production pilot:** pelayan 8 GB, database dengan sandaran, Redis.

**Perlu diputuskan:** bajet bulanan; lokasi data (DigitalOcean tiada di Malaysia, yang paling dekat Singapura; sahkan dengan Compliance).

## 15. Kumpulan syarikat (pihak berkaitan)

**Belum siap:**
1. Nama kumpulan diisi sendiri oleh organisasi. Jika ejaan berbeza, sistem tidak dapat padankan. Pertimbangkan senarai nama kumpulan yang diurus oleh admin. (Skrin semakan KYB kini memaparkan jenis entiti dan kumpulan, dengan peringatan supaya disemak dengan profil SSM.)
2. **Modal penaja dalam Musharakah** (pilihan): sebagai sumbangan berasingan dalam terma akad, dengan semakan Shariah.

## 16. Benefisiari dan pusaka

- **Fail:** `server/src/estate/`, `src/estate/EstateCasesView.tsx`, `src/components/BeneficiariesView.tsx`

**Belum siap:**
1. **Semakan Shariah dan undang-undang (wajib sebelum pilot):** seluruh aliran kes pusaka (lapor kematian, bekukan akaun, dokumen mahkamah, pelan, pindahan pelaburan), persetujuan waris, qabul hibah, teks panduan dan surat amanah. Perlu penasihat Shariah, peguam dan pemegang amanah.
2. **Pewaris tanpa akaun:** pewaris mesti daftar sebagai pelabur dan lulus KYC sebelum boleh menerima pelaburan. Jika pewaris tidak mahu menyertai platform, perlu cara lain (contohnya bayar tunai kepada pentadbir).
3. **Aset dan sewaan** (bukan pelaburan dalam pool): pindahan selepas kematian belum dibina.

## 17. Modul aset

**Wang dan perkongsian:**
1. Sewa atau bahagian untung pemilik aset dalam agihan projek.
2. Organisasi menggunakan aset sendiri dalam projek sendiri (kini ditolak).
3. Skor tawaran oleh AI: ditangguhkan, kerana model sekarang tidak konsisten.
4. Hidupkan peranan Legal dan Shariah di staging jika mahu penyemak sebenar.

**Modal penaja dan takaful:** siap 4 November 2026 (setoran modal penaja direkod dalam lejar; pemilik aset muat naik takaful sendiri dari skrin perkongsian; sasaran minimum, tarikh tutup dan pulangan wang pool). Yang tinggal: penasihat Shariah sahkan bahawa pool yang tidak capai minimum memulangkan modal penuh.

**Tandatangan elektronik:**
1. Sijil meterai daripada pihak yang dipercayai Adobe untuk production.
2. Emel OTP (perlu Resend, item 8).
3. Cap masa dalam meterai.
4. Penyedia tandatangan berlesen (MSC Trustgate / Pos Digicert) untuk perjanjian bernilai tinggi.
5. Pendapat peguam tentang tandatangan elektronik dan duti setem.
6. Hidupkan `SIGNING_REQUIRE_VERIFIED_IDENTITY=true` di production.
7. Templat perjanjian Musharakah dan Ijarah disemak peguam dan penasihat Shariah.

**Rekod dan semakan:** PDF sejarah perjanjian; rekod siapa sudah melihat perjanjian; senarai aktiviti haram ke tetapan negara; semakan automatik nombor SSM (perlu akses data SSM).

**Pendaftaran aset:**
1. Sambungan dengan e-Tanah, JPJ, JKKP (perlu perjanjian dengan agensi).
2. Pautan ke peta lot negeri.
3. Cara kemas kini nilai atau tarik balik aset yang sudah disahkan.
4. Skrin demo masih guna senarai aset contoh.
5. Pantau masa jawapan penasihat AI di staging.

(Amaran nilai berbanding laporan penilaian siap 4 November 2026: semakan dokumen membaca nilai pasaran dalam laporan dan menanda jika nilai yang diisi berbeza lebih 20%.)

## 18. Kunci API

Bila sistem luar perlu membaca data platform, bina kunci API (disimpan selamat, boleh dibatalkan, akses terhad, direkod dalam log). Ditangguhkan sehingga perlu (keputusan 3 November 2026).

## 19. Pengurusan pengguna

**Belum siap:**
1. **Notis privasi:** deraf perlu disemak peguam. Isi nama syarikat, nombor SSM, pegawai perlindungan data, lokasi data dan tempoh simpanan, kemudian terbitkan.
2. **Pelulus kedua** bagi peranan admin, dan **sebab wajib** bila menambah atau membuang peranan. (Gantung akaun, pindah organisasi, cipta dan gantung organisasi serta negara sudah ada di Admin Center.)
3. **Daftar sendiri** melalui Keycloak.
4. Sulitkan medan KYC dalam database.
5. Sekat penggunaan sistem sehingga pengguna bersetuju dengan notis privasi (kini disemak di skrin sahaja).
6. Tetapkan `COUNTRY_NODE_ID=CN-MYS` di production Malaysia.

## 20. Mini-app D8 Ideas

**Belum siap:**
1. Isi akaun amanah sebenar setiap negara (bank, nama akaun, nombor, SWIFT) di Admin Center › Country Nodes sebelum pelabur sebenar membuat pesanan.
2. Log masuk (SSO) dan push melalui D8 Ideas: tunggu spesifikasi mereka.
3. Uji dalam super app, terutamanya kamera dalam WebView.
4. Keycloak: tambah `/m/*` dalam Valid redirect URIs, dan tetapkan emel (SMTP) untuk "Forgot password".
5. Terjemahan: notifikasi utama sudah dalam BM (`src/mobile/i18n.messages.ts`). Mesej server yang baharu perlu ditambah ke situ, jika tidak ia keluar dalam bahasa Inggeris. Yang masih dalam bahasa Inggeris: emel.
6. Semakan di telefon untuk KYC Officer dan penyemak Legal/Shariah: belum dibina; mereka guna portal web.

## 21. Sewaan terus (Ijarah) tanpa projek

- **Keadaan:** berjalan di mini-app dan web (tab Sewaan): senarai unit, mohon dan runding, kelulusan Legal dan Shariah, perjanjian Ijarah dengan tandatangan OTP, jadual sewa, rekod bayaran, peringatan, dan tiga jenis deposit.
- **Keputusan sementara (perlu disahkan):** penyewa membayar sewa **terus ke akaun bank pemilik**. Platform hanya merekod, tidak memegang wang, dan tiada komisen buat masa ini.

**Belum siap:**
1. Penyemak belum boleh menyemak perjanjian sewaan di mini-app (guna web).
2. Skrin web Contracts (`src/ai/features/contract/AgreementReviewPanel.tsx`) masih memanggil penyewa "Delivery partner".
3. **Pembaharuan:** penyewa sudah boleh memohon pembaharuan (sewaan baharu bermula sehari selepas tamat, dipautkan kepada sewaan lama). Belum siap: deposit dipindahkan secara automatik (kini pemilik merekod sendiri dengan rujukan sewaan lama), dan pemilik menawarkan pembaharuan dahulu.
4. Rekod caj utiliti bulanan jika pemilik yang bayar bil; tetapan bulan deposit utiliti ikut negeri.
5. **Keputusan pemilik projek:** platform kutip sewa atau rekod sahaja; komisen atau yuran (semak Akta 242); duti setem; cukai perkhidmatan atas sewa komersial.
6. Fasa kemudian: pool pelaburan daripada hasil sewa.
7. **SIT:** sewaan Tingkat 6 (`LEASE-MYS-QAAJDKTT`) ditamatkan awal. Untuk sambung SIT, jalankan sendiri di staging: `cd /opt/how/server && npx tsx scripts/reopen-ended-lease.ts --lease LEASE-MYS-QAAJDKTT` (lihat dahulu), kemudian tambah `--confirm --by <userId> --reason "..."`.

## 22. Agihan keuntungan (Settlement Officer)

- **Keadaan:** aliran agihan berjalan di mini-app (tab Agihan) dan di web (Financials › Profit distribution, untuk Settlement Officer dan Super Admin, 4 November 2026): rekod hasil projek, pratonton bahagian setiap pelabur, pelulus kedua, bayaran dan rekod rujukan bank.

**Belum siap:**
1. **Fail bayaran pukal bank** (DuitNow Bulk atau IBG): perlu format fail bank yang digunakan. Fail ini perlu nombor akaun penuh, jadi server perlu membuka nombor yang disulitkan dengan kawalan ketat.
2. **Padanan penyata bank:** sekarang setiap bayaran disahkan satu demi satu.
3. **Peringatan hasil lewat:** perlu jadual bila hasil projek dijangka masuk (belum direkod dalam sistem).
4. Kira akhir pool dan rugi yang belum pulih (item 10).

## 23. Projek bermasalah: arkib dan gantung

- **Keadaan:** Arkib, Pulihkan, Gantung dan Sambung semula boleh dibuat di mini-app (Utama › Urus projek) dan di web (Admin Center › Problem Projects), dengan sebab wajib dan log audit. Pelabur nampak label "Suspended" dan sebabnya dalam Investments (4 November 2026). Projek ujian juga boleh dibuang dengan skrip `server/scripts/delete-test-project.ts`.

**Belum siap:**
1. **Pulangan modal kepada pelabur** bila projek tidak diteruskan: berapa yang dipulangkan (penuh atau tolak rugi), siapa meluluskan, dan catatan dalam lejar. Perlu keputusan Kewangan dan penasihat Shariah.

## 24. Pangkalan pengetahuan (AAOIFI) dan Tanya

- **Keadaan:** 47 PDF AAOIFI sudah dimuat naik dan APPROVED (AI Center › Knowledge Base, muat naik dan semakan pukal). Butang Tanya (ikon ✨) di mini-app menjawab hanya daripada sumber yang diluluskan, dengan rujukan.

**Belum siap:**
1. **Standard lama:** tanda versi yang sudah diganti sebagai lapuk, contohnya FAS 1 (1993) diganti FAS 1 (2022, berkuat kuasa 1 Januari 2024). Fail lain perlu disemak oleh penasihat Shariah atau Kewangan.
2. **Model embedding di staging:** `RAG_EMBEDDING_MODEL` belum diisi dalam `/opt/how/server/.env`, jadi carian hanya ikut kata kunci. Cadangan: `nomic-embed-text` pada Ollama di droplet how-ai. Selepas itu tekan **Rebuild & embed**.
3. Uji soalan sebenar di Tanya dan semak rujukan yang diberi.
4. Kredit AI: soalan tanpa sumber tidak ditolak kredit; putuskan sama ada pelabur biasa perlu kredit untuk Tanya.

## 25. Kutipan sewa (proses kutipan Al Hidayah)

- **Keadaan (Fasa 1 siap, 6 November 2026):** web dan mini-app, tab Sewaan › Kutipan. Bulan yang belum dibayar 7 hari selepas tarikh perlu bayar menjadi kes kutipan. Pasukan Kutipan menghantar peringatan 1, 2 dan 3 (surat PDF BM/EN kepada penyewa), merekod susulan (panggilan, WhatsApp, lawatan, janji bayar), menugaskan kes, dan selepas peringatan 3 menyerahkan kes kepada Legal dalaman pemilik. Rekod sewa sebagai diterima menutup kes. Tempoh lalai: peringatan 1 dalam 7 hari, peringatan 2 dalam 14 hari, peringatan 3 dalam 7 hari, Legal 7 hari selepas itu. Pemilik Aset menetapkan tugas pasukan (Akaun, SOA, Kutipan, Lapangan OTG, Legal) di Kutipan › Pasukan.
- **Fail:** `server/src/leasing/rent-collection*.ts`, `src/mobile/screens/LeaseCollections.tsx`

**Belum siap:**
1. **Fasa 2, invois dan SOA:** invois atau penyata akaun (SOA) bulanan dalam PDF, dijana dan dihantar kepada penyewa bersama baki tertunggak.
2. **Fasa 2, pengesahan dua orang:** pegawai SOA merekod bayaran (menunggu pengesahan), kemudian Akaun mengesahkannya (dibayar). Sekarang seorang sahaja merekod.
3. **Fasa 3, OTG + Tech:** tugasan lawatan lapangan di mini-app selepas peringatan 1 dan 2 (gambar, lokasi, nota). Perlu sahkan skop kerja OTG dengan Al Hidayah (lawatan, utiliti, pemeriksaan teknikal).
4. **Fasa 3, pakej Legal:** satu muat turun dengan perjanjian Ijarah, SOA, semua surat peringatan dan log susulan.
5. **Tetapan tempoh ikut pemilik:** tempoh 7/7/14/7 kini nilai lalai dalam kod; belum boleh diubah oleh setiap pemilik.
6. **Notifikasi dalam BM:** tajuk notifikasi kutipan sudah dalam BM, tetapi isi mesej masih dalam bahasa Inggeris.
7. **Keputusan Shariah:** caj lewat bayar (ta'widh/gharamah) dalam Ijarah. Tiada caj dikenakan sehingga diputuskan.
