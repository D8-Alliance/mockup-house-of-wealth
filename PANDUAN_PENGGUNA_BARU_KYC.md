# Panduan Ujian: Pengguna Baru, dari Register hingga KYC Diluluskan

Panduan ini untuk menguji aliran penuh pengguna baru dalam mod DEMO (local): daftar akaun, isi dan hantar permohonan KYC, kemudian disemak oleh KYC Officer.

**Sebelum mula:** pastikan app sedang berjalan. Ikut bahagian 1 dalam [RUN_COMMANDS.ps1](RUN_COMMANDS.ps1) (Docker, backend, frontend), kemudian buka http://localhost:3000.

---

## Bahagian A: Daftar akaun baru

1. Buka http://localhost:3000, kemudian klik **Sign In / Register** (kanan atas).
2. Pilih tab **Register**.
3. Isi borang. Contoh data:

   | Medan | Contoh |
   |---|---|
   | Full Name | Aminah binti Yusof |
   | Corporate Email | `aminah.test1@example.com` (mesti belum pernah digunakan) |
   | Organisation | Aminah Holdings |
   | Country Node | Malaysia |
   | Create Password / Confirm Password | `demo12345` (minimum 8 aksara) |
   | Access Level / Role | Retail Investor |

4. Tandakan kotak **I agree to the Terms of Service...**
5. Klik **Register & Access Dashboard**.

**Keputusan yang dijangka:** mesej "Account registered successfully", kemudian anda terus masuk ke dashboard sebagai pengguna baru.

**Nota:**
- Peranan yang boleh dipilih sendiri hanyalah Retail Investor, Institutional Investor, Project Sponsor dan Asset Owner. Peranan staf (Finance Officer, KYC Officer, admin) hanya diberi oleh pentadbir.
- Pilih **Malaysia** sebagai Country Node. Penyemak KYC hanya nampak permohonan dari negara sendiri, dan KYC Officer ujian (Aisyah) berada di Malaysia.
- Setiap pendaftaran mencipta organisasi baru untuk pengguna itu sahaja.

---

## Bahagian B: Isi maklumat KYC

1. Klik ikon profil (kanan atas) untuk ke **Profile**.
2. Pilih tab **Identity Verification**. Lencana "KYC not started" di atas halaman profil juga membawa ke sini.
3. Isi maklumat. Contoh:

   | Medan | Contoh |
   |---|---|
   | Full name | AMINAH BINTI YUSOF |
   | Date of birth | 1990-05-12 |
   | Nationality | Malaysian |
   | ID document type | National ID card |
   | ID number | 900512-10-1234 |
   | ID expiry | 2031-12-31 |
   | Residential address | No. 8, Jalan Tun Razak, 50400 Kuala Lumpur |

4. Klik **Save details** untuk simpan sebagai draf. Draf belum dihantar dan **tidak** dilihat oleh penyemak.

---

## Bahagian C: Muat naik dokumen

Untuk National ID, 4 dokumen diperlukan: JPG, PNG atau PDF, maksimum 10 MB setiap satu. Sistem menyemak jenis sebenar fail, jadi fail lain yang ditukar nama kepada `.png`/`.pdf` akan ditolak.

**Langkah 1: jana dokumen sampel dengan maklumat anda sendiri.** Sistem kini **membaca kandungan dokumen** dan membandingkannya dengan maklumat yang diisi. Jadi gunakan nama, nombor ID, tarikh lahir dan alamat yang **sama** seperti Bahagian B:

```powershell
cd C:\clone_how\mockup-house-of-wealth\server
npm run kyc:samples -- --name "AMINAH BINTI YUSOF" --id 900512-10-1234 --dob 1990-05-12 --address "No. 8, Jalan Tun Razak, 50400 Kuala Lumpur"
```

Fail akan dijana dalam `C:\clone_how\kyc-test-files\aminah-binti-yusof\`. Setiap kali dijana, fail ada nombor rujukan rawak, supaya penguji lain tidak memuat naik fail yang sama.

**Langkah 2: muat naik ke slot masing-masing.**

| Slot dalam borang | Fail |
|---|---|
| National ID (front) | `1-national-id-front.png` |
| National ID (back) | `2-national-id-back.png` |
| Selfie holding your ID | `3-selfie-with-id.png` |
| Proof of address (bil utiliti atau penyata bank, kurang 3 bulan) | `4-proof-of-address.pdf` |

**Setiap penguji gunakan nombor ID yang berbeza.** Satu nombor ID hanya boleh disahkan untuk satu akaun; permohonan kedua dengan nombor yang sama akan disekat.

**Untuk menguji amaran:** jana dokumen dengan nama atau nombor ID yang **berbeza** daripada yang diisi dalam borang. Penyemak akan melihat amaran "does not match the application".

Kalau pilih **Passport** sebagai jenis dokumen, slot ID depan/belakang diganti dengan satu slot "Passport photo page".

---

## Bahagian C2: Pengesahan wajah dengan kamera (prototaip)

Langkah ini memerlukan kamera (webcam atau kamera telefon) dan kad pengenalan di tangan.

1. Dalam tab **Identity Verification**, di bahagian **Face verification (camera)**, klik **Start face verification**.
2. Baca penerangan, tandakan kotak persetujuan, kemudian klik **Start camera**. Benarkan akses kamera bila browser bertanya.
3. Ikut arahan di skrin. Susunan arahan **dipilih secara rawak oleh server** setiap kali:
   - **Position your face inside the oval:** muka di tengah bujur, pandang terus ke kamera. Bujur bertukar **hijau** bila betul. Panduan seperti *"Move closer"* atau *"Move to a brighter place"* dipaparkan jika perlu.
   - **Gerakan kepala:** contohnya *Turn your head to your LEFT*, *Turn your head to your RIGHT*, *Tilt your head UP*. Gerak perlahan dan tahan sekejap.
   - **Show the FRONT of your ID card:** letakkan kad dalam kotak, dekat dengan kamera, tanpa silau.
   - **Hold your ID card next to your face:** muka dan gambar pada kad mesti kelihatan bersama.
4. Setiap langkah ada had masa 45 saat, dan keseluruhan sesi 5 minit. Kalau tamat masa, klik **Try again**.
5. Bila selesai, mesej *"Face verification completed"* dipaparkan, dan status bertukar kepada **Completed**.

**Nota:**
- Pada mod lalai, langkah ini **pilihan**. Kalau tidak dibuat, penyemak akan nampak amaran *"Face verification (camera) was not performed"*. Pentadbir boleh menjadikannya wajib dengan `KYC_REQUIRE_LIVENESS=true` dalam `server/.env`.
- Untuk ujian dengan dokumen sampel, gambar pada kad sampel bukan wajah anda. Langkah kad mungkin diterima, tetapi penyemak akan nampak *"does not match"* untuk perbandingan wajah. Itu dijangka.
- Kalau keluar mesej *"Face verification is not set up on this server"*, jalankan `npm run models:download` dalam folder `server` (lihat RUN_COMMANDS.ps1, bahagian 8f).

---

## Bahagian D: Hantar permohonan

1. Pastikan semua 4 dokumen ditanda sudah dimuat naik.
2. Klik **Submit for review**.

**Keputusan yang dijangka:** status bertukar kepada **Awaiting review**. Maklumat tidak boleh diubah lagi semasa menunggu semakan.

---

## Bahagian E: Semakan oleh KYC Officer

1. Klik profil (kanan atas), kemudian **Sign Out Session**.
2. **Sign In** semula, dan pilih peranan **KYC Officer** (Aisyah binti Kamal). Kata laluan apa-apa, contohnya `demo123`.
3. Pergi ke **Admin Center** → **Identity & Compliance** → **KYC Verification**.
4. Dalam senarai, permohonan yang ada isu ditanda dengan ikon ⚠:
   - **Check issues** (kuning): ada amaran, contohnya nama dalam dokumen tidak sepadan.
   - **Failed check** (merah): ada semakan yang gagal, contohnya nombor ID sudah digunakan.
5. Buka permohonan Aminah, kemudian:
   - lihat butiran dan muat turun dokumen;
   - baca kotak **"issues to check before deciding"** di bahagian Automated checks. Setiap perbezaan antara dokumen dan maklumat yang diisi disenaraikan, contohnya *Name on the identity document does not match the application*. Semakan automatik berjalan beberapa saat selepas permohonan dihantar; tekan **Re-run** jika keputusan belum keluar;
   - pilih keputusan **Approve**, **Reject** atau **Request changes**, dan tulis komen.
6. Di bawah Automated checks, bahagian **Face verification (camera, prototype)** menunjukkan:
   - sama ada semua gerakan diselesaikan;
   - perbandingan wajah langsung dengan gambar pada kad (*same person* atau *does not match*);
   - sama ada nombor ID pada kad yang ditunjukkan sepadan;
   - bingkai yang dirakam untuk setiap langkah. Bandingkan bingkai itu sendiri; prototaip ini tidak mengesan rakaman skrin atau deepfake.
7. Jika memilih **Approve** dan ada amaran:
   - **Amaran biasa:** tandakan kotak *"I have checked the issues raised..."* sebelum butang boleh ditekan.
   - **Semakan gagal:** isi **sebab override** (sekurang-kurangnya 15 aksara). Sebab ini direkod dalam komen keputusan dan audit.
   - **Nombor ID sudah disahkan untuk akaun lain:** tidak boleh diluluskan langsung.

---

## Bahagian F: Pengguna semak keputusan

1. **Sign Out Session**.
2. Log masuk semula sebagai Aminah (lihat Bahagian G).
3. Profile → **Identity Verification**. Status dijangka:
   - **Verified** jika diluluskan;
   - **Rejected** jika ditolak;
   - **Changes requested** jika penyemak pilih Request changes. Borang boleh diubah semula: betulkan maklumat atau muat naik dokumen baru, kemudian klik **Submit for review** sekali lagi.

---

## Bahagian G: Log masuk semula sebagai pengguna yang didaftarkan

1. **Sign In / Register** → tab **Sign In**.
2. Pilih **mana-mana peranan dahulu**. Memilih peranan akan mengisi emel persona demo secara automatik.
3. **Kemudian** padam medan **Corporate Email / Username** dan taip emel pengguna anda, contohnya `aminah.test1@example.com`.
4. Masukkan apa-apa kata laluan, kemudian klik Sign In.

Sistem akan log masuk sebagai Aminah dengan peranan yang dipilih semasa mendaftar, walaupun peranan lain dipilih di langkah 2.

---

## Ujian tambahan

| Ujian | Cara | Jangkaan |
|---|---|---|
| Dokumen tidak sepadan | Jana sampel dengan nama lain, kemudian muat naik | Penyemak nampak ikon ⚠ dan senarai perbezaan; Approve perlu pengesahan |
| Fail palsu | Tukar nama fail teks kepada `.png`, cuba muat naik | Ditolak: "not a valid JPG, PNG or PDF" |
| Nombor ID sama | Dua pengguna guna nombor ID yang sama; luluskan yang pertama | Yang kedua ditanda "Failed check" dan tidak boleh diluluskan |
| Emel berganda | Daftar sekali lagi dengan emel yang sama | Ditolak: "An account with this email address already exists" |
| Skop negara | Daftar pengguna lain dengan Country Node **Indonesia**, hantar KYC | Aisyah (Malaysia) **tidak nampak**; **Super Admin** nampak |
| Draf tersembunyi | Simpan draf tanpa Submit | Tidak muncul dalam senarai KYC Verification |
| Semak sendiri | Pengguna yang sama cuba menyemak permohonannya sendiri | Ditolak |

---

## Perkara penting

- **Mod DEMO sahaja.** Pendaftaran ini disimpan ke database melalui `POST /auth/demo-register`, yang hanya aktif bila `AUTH_MODE=mock` dalam `server/.env`. Di production, pendaftaran dibuat melalui Keycloak.
- **Kata laluan tidak disemak dalam mod DEMO.** Apa-apa kata laluan diterima semasa Sign In.
- **Akaun berdaftar diingati oleh browser yang sama sahaja.** Senarai pengguna berdaftar disimpan dalam browser (tanpa kata laluan). Dari browser lain, atau selepas data browser dipadam, pengguna itu tak boleh log masuk semula melalui skrin Sign In, walaupun rekodnya masih ada dalam database. Untuk ujian baru, daftar dengan emel baru.
- **Sentiasa Sign Out sebelum tukar pengguna.** Sesi kekal walaupun halaman di-refresh.
- **Bacaan dokumen dibuat dalam server sendiri** (teks PDF dan OCR untuk gambar), tanpa servis luar. Ia membandingkan maklumat, tetapi **tidak** mengesan dokumen palsu atau suntingan gambar; itu masih tugas penyemak.
- **Masa dipaparkan dalam waktu negara pengguna** (Malaysia: GMT+8).
- **Nombor telefon** di Profile dimulakan dengan kod negara pengguna (Malaysia: `+60`). Nombor tempatan seperti `012-345 6789` disimpan sebagai `+60123456789`.

## Masalah biasa

| Masalah | Penyelesaian |
|---|---|
| "Backend API tidak dapat dicapai" semasa Register | Backend tidak berjalan. Mulakan backend (RUN_COMMANDS.ps1, bahagian 1b). |
| "Self-registration here is only available in demo mode" | `AUTH_MODE` dalam `server/.env` bukan `mock`. |
| Tab Identity Verification gagal dimuatkan | Sign Out, kemudian log masuk semula mengikut Bahagian G. |
| KYC Officer tidak nampak permohonan | Pastikan permohonan sudah di-**Submit** (bukan draf) dan pemohon memilih Country Node **Malaysia**. |
| Dokumen ditolak semasa muat naik | Hanya JPG, PNG atau PDF, maksimum 10 MB. |
