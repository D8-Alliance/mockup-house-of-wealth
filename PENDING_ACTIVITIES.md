# Kerja Yang Belum Siap

Senarai ini hanya mengandungi kerja yang **belum siap**. Kerja yang sudah siap dibuang. Penerangan sistem yang sudah ada ditulis dalam [DOKUMENTASI_SISTEM.md](DOKUMENTASI_SISTEM.md). Keputusan yang perlu dibuat, dan siapa yang perlu menjawab, ada dalam [KEPUTUSAN_DIPERLUKAN.md](KEPUTUSAN_DIPERLUKAN.md).

## Ringkasan (disemak dengan kod pada 11 November 2026)

| # | Perkara | Apa yang belum siap | Sedang tunggu apa |
|---|---|---|---|
| 1 | Kesan dokumen palsu | Semak tandatangan digital PDF, bandingkan teks PDF dengan imbasan, semak dengan SSM atau pejabat tanah | Boleh dibuat bila diminta |
| 2 | Penyedia eKYC luar | Kesan muka palsu, dokumen palsu, semakan rekod kerajaan, senarai AML/PEP/sekatan | Pilih penyedia; semak garis panduan BNM dengan Compliance |
| 3 | Semakan wajah (liveness) | Uji di lebih banyak telefon, kelip mata/senyum, semak kad fizikal, jalan lain jika kamera gagal | Ujian telefon; jalan lain sebelum dihidupkan |
| 4 | Data biometrik (PDPA) | Berapa lama gambar wajah disimpan dan bila dipadam | Keputusan tempoh simpanan |
| 5 | Perjanjian ikut projek | Teks pindaan yang khusus, versi bagi perjanjian kosong | Templat pindaan daripada peguam |
| 6 | Pembayaran ToyyibPay | Uji di staging, kredit bonus, buka akaun live | Ujian staging; akaun ToyyibPay live |
| 7 | Bayaran keluar ke bank | Sambungan bank/DuitNow, semakan sebelum selesai, dua pelulus ikut amaun | Pilih penyedia; had amaun |
| 8 | Notifikasi | Redis TLS di production | Sijil TLS Redis |
| 9 | Blockchain | Fasa 2 (simpan cap hash di blockchain awam), Fasa 3 (token) | Pilih rangkaian; nasihat SC dan Shariah |
| 10 | Akad, zakat, cukai, dompet pelabur | Nisab 3 negeri, cukai, e-Invois, kira akhir pool, dompet pelabur | Penasihat cukai dan Shariah; Kewangan |
| 11 | Keselamatan sebelum pilot | Sahkan had KYC, format laporan regulator, tetapan production, hidupkan peranan Auditor | Compliance; pemilik projek |
| 12 | Keputusan kecil | Organization Admin dan kredit AI, tarikh tamat kad 9 negara, data ujian "mockup" | Pemilik projek |
| 13 | Pembantu dokumen AI | Muat naik pintar, chatbot tahu status, lampiran dalam chat | Keputusan; model AI lebih kuat |
| 14 | DigitalOcean | Fail ke Spaces, model AI di staging, tetapan Keycloak, sandaran, production | Bajet; lokasi data |
| 15 | Kumpulan syarikat (pihak berkaitan) | Modal penaja Musharakah | Keputusan Shariah |
| 16 | Benefisiari dan pusaka | Semakan Shariah dan undang-undang, pewaris tanpa akaun, aset bukan pool | Penasihat Shariah, peguam, pemegang amanah |
| 17 | Modul aset | Sewa/untung pemilik aset, tandatangan elektronik production, agensi luar, semakan SSM | Shariah; peguam; agensi |
| 18 | Kunci API | Kunci untuk sistem luar | Tangguh sehingga perlu |
| 19 | Pengurusan pengguna | Notis privasi rasmi, pelulus kedua untuk peranan admin, daftar sendiri, kunci KYC di staging | Butiran syarikat; peguam; keputusan pelulus |
| 20 | Mini-app D8 Ideas | Akaun amanah sebenar, SSO D8 Ideas, ujian dalam super app, SMTP Keycloak | Butiran bank; spesifikasi D8 Ideas |
| 21 | Sewaan terus (Ijarah) | Keputusan kutipan sewa dan cukai, pool hasil sewa, sambung SIT Tingkat 6 | Pemilik projek; peguam dan cukai |
| 22 | Agihan keuntungan | Fail bayaran pukal bank, uji padanan penyata dengan penyata sebenar, peringatan hasil lewat | Format fail bank; jadual hasil projek |
| 23 | Projek bermasalah | Pulangan modal kepada pelabur | Kewangan dan penasihat Shariah |
| 24 | Pangkalan pengetahuan dan Tanya | Tanda standard lama, model embedding di staging, Rebuild & embed, ujian jawapan | Shariah/Kewangan semak versi; tetapan staging |
| 25 | Kutipan sewa | Uji di SIT, tugasan OTG, tempoh ikut pemilik | Ujian SIT; skop OTG; Shariah untuk caj lewat |

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

## 4. Data biometrik (PDPA 2010)

Gambar wajah dan dokumen KYC kini disimpan tanpa had masa. **Perlu diputuskan:**
- berapa lama disimpan, dan dipadam secara automatik selepas itu;
- rekod persetujuan yang lebih lengkap (versi teks, masa, alamat IP);
- sama ada data wajah dipadam selepas semakan selesai.

## 5. Perjanjian ikut projek

- **Fail:** `server/src/ai/ai.service.ts`, `server/src/contract-intelligence/`, `src/ai/features/contract/`

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

**Belum siap:**
1. **Redis untuk production:** sediakan sijil TLS (`ca.crt`, `redis.crt`, `redis.key`) dan simpan kata laluan Redis di tempat rahsia (lihat `server/ops/redis/README.md`).

## 9. Blockchain dan smart contract

- **Fasa 2 (belum mula):** setiap hari, simpan cap hash rekod audit, lejar dan zakat di blockchain awam yang murah. Buat halaman awam "Ketelusan Zakat" dan butang "Sahkan bayaran saya". **Perlu:** pilih rangkaian, dompet, cara simpan kunci, dan bajet yuran.
- **Fasa 3 (tunggu nasihat undang-undang dan Shariah):** token bagi bahagian pool hampir pasti dikira sebagai sekuriti oleh SC. Dapatkan nasihat dahulu. Lihat `DOKUMENTASI_SISTEM.md` bahagian 5.14. Satu yuran masa depan dalam data contoh ditanda "Fasa 3, perlu semakan regulator".

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

## 14. DigitalOcean

**Belum siap:**
1. **Simpan fail di DigitalOcean Spaces**, bukan dalam database. Fail KYC mesti peribadi.
2. **Staging:** pastikan `OPENAI_API_KEY` diisi (tanpanya jawapan AI hanya contoh); tetapan Keycloak oleh pemilik; sandaran berjadual; kemas kini panduan staging.
3. **Satu folder `deploy/`** untuk semua tetapan Docker.
4. **Production pilot:** pelayan 8 GB, database dengan sandaran, Redis.

**Perlu diputuskan:** bajet bulanan; lokasi data (DigitalOcean tiada di Malaysia, yang paling dekat Singapura; sahkan dengan Compliance).

## 15. Kumpulan syarikat (pihak berkaitan)

**Belum siap:**
1. **Modal penaja dalam Musharakah** (pilihan): sebagai sumbangan berasingan dalam terma akad, dengan semakan Shariah.

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
5. Penasihat Shariah sahkan bahawa pool yang tidak capai minimum memulangkan modal penuh.

**Tandatangan elektronik:**
1. Sijil meterai daripada pihak yang dipercayai Adobe untuk production.
2. Uji emel OTP tandatangan di staging.
3. Cap masa dalam meterai.
4. Penyedia tandatangan berlesen (MSC Trustgate / Pos Digicert) untuk perjanjian bernilai tinggi.
5. Pendapat peguam tentang tandatangan elektronik dan duti setem.
6. Hidupkan `SIGNING_REQUIRE_VERIFIED_IDENTITY=true` di production.
7. Templat perjanjian Musharakah dan Ijarah disemak peguam dan penasihat Shariah.

**Rekod dan semakan:**
1. Semakan automatik nombor SSM (perlu akses data SSM).
2. Penasihat Shariah semak senarai aktiviti haram platform (`server/src/shariah/prohibited-activities.ts`).

**Pendaftaran aset:**
1. Sambungan dengan e-Tanah, JPJ, JKKP (perlu perjanjian dengan agensi).
2. Pautan ke peta lot negeri.
3. Pantau masa jawapan penasihat AI di staging.

## 18. Kunci API

Bila sistem luar perlu membaca data platform, bina kunci API (disimpan selamat, boleh dibatalkan, akses terhad, direkod dalam log). Ditangguhkan sehingga perlu (keputusan 3 November 2026).

## 19. Pengurusan pengguna

**Belum siap:**
1. **Notis privasi:** deraf perlu disemak peguam. Isi nama syarikat, nombor SSM, pegawai perlindungan data, lokasi data dan tempoh simpanan, kemudian terbitkan.
2. **Pelulus kedua** bagi peranan admin: perlu keputusan. Hanya Super Admin boleh memberi peranan admin, dan hanya ada seorang Super Admin, jadi siapa pelulus kedua? Mini-app juga belum menghantar sebab bila peranan ditambah atau dibuang.
3. **Daftar sendiri** melalui Keycloak.
4. **Sulitkan nombor ID KYC di staging dan production:** tambah `KYC_DATA_ENCRYPTION_KEY` (nilai rawak sendiri, contoh `openssl rand -base64 32`) dalam `/opt/how/server/.env`, `pm2 restart how-api`, kemudian `npx tsx scripts/encrypt-kyc-identity.ts` (lihat dahulu) dan `--confirm`. Simpan kunci itu dengan selamat: tanpanya nombor ID tidak boleh dibaca. Medan lain (tarikh lahir, alamat) belum disulitkan.
5. Tetapkan `COUNTRY_NODE_ID=CN-MYS` di production Malaysia.

## 20. Mini-app D8 Ideas

**Belum siap:**
1. Isi akaun amanah sebenar setiap negara (bank, nama akaun, nombor, SWIFT) di Admin Center › Country Nodes sebelum pelabur sebenar membuat pesanan.
2. Log masuk (SSO) dan push melalui D8 Ideas: tunggu spesifikasi mereka.
3. Uji dalam super app, terutamanya kamera dalam WebView.
4. Keycloak: SMTP realm staging kosong, jadi emel "Forgot password" tidak dihantar. Production belum disemak.
5. Mesej "aset untuk projek: nota penyemak" (penolakan perkongsian aset) keluar dalam bahasa Inggeris kerana isinya nota bebas penyemak.

## 21. Sewaan terus (Ijarah) tanpa projek

- **Keputusan sementara (perlu disahkan):** penyewa membayar sewa **terus ke akaun bank pemilik**. Platform hanya merekod, tidak memegang wang, dan tiada komisen buat masa ini.

**Belum siap:**
1. **Keputusan pemilik projek:** platform kutip sewa atau rekod sahaja; komisen atau yuran (semak Akta 242); duti setem; cukai perkhidmatan atas sewa komersial.
2. Fasa kemudian: pool pelaburan daripada hasil sewa.
3. **SIT:** sewaan Tingkat 6 (`LEASE-MYS-QAAJDKTT`) kekal tamat kerana satu depositnya sudah dipulangkan (keputusan 6 November 2026). SIT disambung dengan sewaan baharu; penyewa memohon semula unit itu di tab Sewaan.

## 22. Agihan keuntungan (Settlement Officer)

**Belum siap:**
1. **Fail bayaran pukal bank** (DuitNow Bulk atau IBG): perlu format fail bank yang digunakan. Fail ini perlu nombor akaun penuh, jadi server perlu membuka nombor yang disulitkan dengan kawalan ketat.
2. **Uji padanan penyata dengan penyata sebenar:** bank berbeza menulis lajur berbeza. Bila bank akaun amanah dipilih, uji satu penyata CSV sebenar di Financials › Profit distribution › Bank statement dan tambah nama lajurnya jika tidak dikenali. Mini-app belum ada skrin ini.
3. **Peringatan hasil lewat:** perlu jadual bila hasil projek dijangka masuk (belum direkod dalam sistem).
4. Kira akhir pool dan rugi yang belum pulih (item 10).

## 23. Projek bermasalah

**Belum siap:**
1. **Pulangan modal kepada pelabur** bila projek tidak diteruskan: berapa yang dipulangkan (penuh atau tolak rugi), siapa meluluskan, dan catatan dalam lejar. Perlu keputusan Kewangan dan penasihat Shariah.

## 24. Pangkalan pengetahuan (AAOIFI) dan Tanya

**Belum siap:**
1. **Standard lama:** tanda versi yang sudah diganti sebagai lapuk, contohnya FAS 1 (1993) diganti FAS 1 (2022, berkuat kuasa 1 Januari 2024). Fail lain perlu disemak oleh penasihat Shariah atau Kewangan.
2. **Model embedding di staging:** `RAG_EMBEDDING_MODEL` belum diisi dalam `/opt/how/server/.env`, jadi carian hanya ikut kata kunci. Cadangan: `nomic-embed-text` pada Ollama di droplet how-ai. Selepas itu tekan **Rebuild & embed**.
3. Uji soalan sebenar di Tanya dan semak rujukan yang diberi.
4. Kredit AI: soalan tanpa sumber tidak ditolak kredit; putuskan sama ada pelabur biasa perlu kredit untuk Tanya.

## 25. Kutipan sewa (proses kutipan Al Hidayah)

- **Fail:** `server/src/leasing/rent-collection*.ts`, `server/src/leasing/lease-statement.ts`, `server/src/leasing/leasing.service.ts`, `src/mobile/screens/LeaseCollections.tsx`, `src/mobile/screens/MobileLeasing.tsx`

**Belum siap:**
1. **Uji di SIT:** pangkalan data tempatan tiada sewaan yang diluluskan. Beri tugas Akaun dan SOA, rekod bayaran, sahkan/tolak, muat turun penyata, hantar penyata dan semak PDF dalam e-mel penyewa, biarkan satu bil utiliti tidak dibayar lebih 7 hari dan semak kes kutipannya, dan muat turun pakej Legal bagi kes yang sudah ada surat peringatan.
2. **Fasa 3, OTG + Tech:** tugasan lawatan lapangan di mini-app selepas peringatan 1 dan 2 (gambar, lokasi, nota). Perlu sahkan skop kerja OTG dengan Al Hidayah (lawatan, utiliti, pemeriksaan teknikal).
3. **Tetapan tempoh ikut pemilik:** tempoh 7/7/14/7 kini nilai lalai dalam kod; belum boleh diubah oleh setiap pemilik.
4. **Keputusan Shariah:** caj lewat bayar (ta'widh/gharamah) dalam Ijarah. Tiada caj dikenakan sehingga diputuskan.
