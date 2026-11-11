# Keputusan dan Butiran Yang Diperlukan / Decisions and Details Needed

Disediakan 10 November 2026, daripada [PENDING_ACTIVITIES.md](PENDING_ACTIVITIES.md). Nombor dalam kurungan, contohnya (19.2), merujuk item dalam fail itu.
Prepared 10 November 2026 from [PENDING_ACTIVITIES.md](PENDING_ACTIVITIES.md). Numbers in brackets, e.g. (19.2), refer to items in that file.

**Cara membaca / How to read:** setiap perkara ada siapa yang perlu menjawab, soalan, pilihan, apa yang berlaku sementara menunggu, dan apa pasukan teknikal akan buat selepas keputusan. Teks BM dahulu, kemudian EN.
Each item lists who must answer, the question, the options, what happens while we wait, and what the technical team does after the decision. Malay first, then English.

**Keutamaan / Priority:** 🔴 sebelum pilot / before pilot · 🟠 tidak lama lagi / soon · 🟢 boleh tunggu / can wait

---

## Ringkasan / Summary

| Kod / Code | Perkara / Item | Siapa / Who | Keutamaan / Priority |
|---|---|---|---|
| P1 | Pelulus kedua peranan admin / Second approver for admin roles | Pemilik projek / Project owner | 🔴 |
| C1 | Had pelaburan ikut tahap KYC / Investment limits by KYC level | Compliance | 🔴 |
| C3 | Lokasi simpanan data / Data location | Compliance | 🔴 |
| C5 | Tempoh simpan data biometrik / Biometric data retention | Compliance | 🔴 |
| L4 | Notis privasi / Privacy notice | Peguam / Lawyer | 🔴 |
| S6 | Aliran pusaka / Estate flow | Shariah + Peguam / Lawyer | 🔴 |
| P2 | Had payout dua pelulus / Two-approver payout limit | Pemilik projek / Project owner | 🔴 |
| P3 | Model sewa (kutip atau rekod) / Rent model (collect or record) | Pemilik projek / Project owner | 🟠 |
| S1 | Caj lewat bayar Ijarah / Ijarah late payment charge | Shariah | 🟠 |
| S2 | Kerugian dan penutupan pool / Losses and pool closing | Shariah | 🔴 |
| S3 | Pulangan modal / Capital refunds | Shariah + Kewangan / Finance | 🔴 |
| C2 | Format laporan regulator / Regulator report formats | Compliance | 🟠 |
| C4 | Penyedia eKYC / eKYC provider | Compliance | 🟠 |
| L1–L3, L5 | Templat dan pendapat undang-undang / Templates and legal opinions | Peguam / Lawyer | 🟠 |
| T1 | Cukai / Tax | Penasihat cukai / Tax adviser | 🟠 |
| P4–P9 | Keputusan dalaman lain / Other internal decisions | Pemilik projek / Project owner | 🟢–🟠 |
| A2–A10 | Tetapan dan pihak luar / Setup and outside parties | Pelbagai / Various | 🟠 |

---

## 1. Pemilik projek / Project owner

### P1. Pelulus kedua bagi peranan admin / Second approver for admin roles (19.2) 🔴

**BM**
- **Konteks:** hanya Super Admin boleh memberi peranan admin, dan kini hanya ada seorang Super Admin. Seorang sahaja boleh memberi kuasa penuh kepada sesiapa, tanpa semakan orang kedua. Sebab setiap tambah/buang peranan sudah direkod dalam log audit (web).
- **Soalan:** siapa pelulus kedua bila peranan admin (Super Admin, Country Admin, Compliance Officer dan lain-lain) diberi?
- **Pilihan:**
  1. Lantik Super Admin kedua; setiap pemberian peranan admin perlu diluluskan oleh Super Admin yang lain.
  2. Super Admin memberi, Compliance Officer meluluskan.
  3. Super Admin memberi, Country Admin negara itu meluluskan (tidak sesuai bagi peranan peringkat platform).
- **Sementara menunggu:** seorang Super Admin boleh memberi peranan admin sendirian; log audit sahaja yang menjadi kawalan.
- **Selepas keputusan:** bina langkah "menunggu kelulusan" untuk pemberian peranan admin, dan hantar sebab dari mini-app juga.

**EN**
- **Context:** only a Super Admin can grant admin roles, and there is currently only one Super Admin. One person can give full powers to anyone with no second check. The reason for every role change is already kept in the audit log (web).
- **Question:** who is the second approver when an admin role (Super Admin, Country Admin, Compliance Officer, etc.) is granted?
- **Options:**
  1. Appoint a second Super Admin; each admin grant must be approved by the other Super Admin.
  2. The Super Admin grants, the Compliance Officer approves.
  3. The Super Admin grants, that country's Country Admin approves (not suitable for platform-level roles).
- **Meanwhile:** one Super Admin can grant admin roles alone; the audit log is the only control.
- **After the decision:** build a "pending approval" step for admin role grants, and send the reason from the mini-app too.

### P2. Had amaun payout yang perlu dua pelulus / Payout amount needing two approvers (7.3) 🔴

**BM**
- **Konteks:** payout kepada pelabur (agihan untung, pulangan modal) kini dibuat melalui fail bank manual. Agihan sudah ada pelulus kedua, tetapi tiada had amaun bagi payout individu yang besar.
- **Soalan:** melebihi berapa ringgit (atau mata wang lain) satu payout perlu dua pelulus? Adakah had berbeza ikut negara?
- **Sementara menunggu:** tiada had amaun; semua payout diproses dengan cara yang sama.
- **Selepas keputusan:** tambah semakan had dan langkah pelulus kedua dalam modul payout.

**EN**
- **Context:** payouts to investors (profit distributions, capital refunds) are made through a manual bank file. Distributions already have a second approver, but there is no amount threshold for large individual payouts.
- **Question:** above how many ringgit (or other currency) does a single payout need two approvers? Should the limit differ by country?
- **Meanwhile:** no amount threshold; all payouts are handled the same way.
- **After the decision:** add the threshold check and second-approver step to the payout module.

### P3. Model sewa terus (Ijarah) / Direct lease (Ijarah) rent model (21.1) 🟠

**BM**
- **Konteks:** keputusan sementara: penyewa bayar sewa terus ke akaun bank pemilik; platform hanya merekod, tidak memegang wang, dan tiada komisen.
- **Soalan:**
  1. Kekalkan "rekod sahaja", atau platform mengutip sewa (melalui akaun amanah) dan memindahkan kepada pemilik?
  2. Adakah platform mengenakan komisen atau yuran? (Perlu semak Akta Penilai, Pentaksir, Ejen Harta Tanah dan Pengurus Harta 1981, Akta 242, dengan peguam.)
  3. Siapa menanggung duti setem perjanjian sewa?
  4. Adakah cukai perkhidmatan dikenakan atas sewa komersial (lihat T1)?
- **Kesan:** jika platform mengutip wang, perlu akaun amanah, padanan bank dan mungkin lesen; skop kerja jauh lebih besar.

**EN**
- **Context:** interim decision: the tenant pays rent directly to the owner's bank account; the platform only records it, holds no money and takes no commission.
- **Questions:**
  1. Keep "record only", or should the platform collect rent (through a trust account) and pass it to the owner?
  2. Does the platform charge a commission or fee? (Check the Valuers, Appraisers, Estate Agents and Property Managers Act 1981, Act 242, with the lawyer.)
  3. Who pays stamp duty on the lease agreement?
  4. Does service tax apply to commercial rent (see T1)?
- **Impact:** if the platform collects money, it needs a trust account, bank matching and possibly a licence; the scope grows a lot.

### P4. Proses kutipan Al Hidayah / Al Hidayah collection process (25) 🟠

**BM**
- **Soalan 1 – skop OTG:** apa kerja sebenar pasukan lapangan (OTG) selepas peringatan 1 dan 2? Contoh: lawatan ke premis, semakan meter utiliti, pemeriksaan teknikal bangunan. Apa yang perlu direkod (gambar, lokasi GPS, nota, tandatangan penyewa)?
- **Soalan 2 – tempoh:** tempoh kini tetap dalam kod: peringatan 1 dalam 7 hari, peringatan 2 dalam 14 hari, peringatan 3 dalam 7 hari, Legal 7 hari selepas itu. Adakah setiap pemilik aset perlu boleh mengubahnya?
- **Selepas keputusan:** bina tugasan OTG di mini-app (Fasa 3) dan tetapan tempoh ikut pemilik.

**EN**
- **Question 1 – OTG scope:** what does the field team (OTG) actually do after reminders 1 and 2? For example: visiting the premises, checking utility meters, technical inspection of the building. What must be recorded (photos, GPS location, notes, tenant signature)?
- **Question 2 – periods:** the periods are fixed in code: reminder 1 within 7 days, reminder 2 within 14 days, reminder 3 within 7 days, Legal 7 days after that. Should each asset owner be able to change them?
- **After the decision:** build OTG tasks in the mini-app (phase 3) and per-owner period settings.

### P5. Keputusan kecil / Small decisions (12) 🟢

**BM**
1. **Kredit AI Organization Admin:** kini tidak perlu bayar kredit AI. Kekal percuma, atau dikenakan seperti pengguna lain?
2. **Tarikh tamat kad pengenalan 9 negara:** jadual dalam kod perlu disahkan bagi setiap negara D-8 (dan Malaysia).
3. **Data ujian dalam database mockup** (`claude.check1/2/6@test.local`, aset `ASSET-MYS-JZW65Y19`): boleh dipadam?

**EN**
1. **Organization Admin AI credits:** currently free. Keep them free, or charge like other users?
2. **ID card expiry for 9 countries:** the table in code must be confirmed for each D-8 country (and Malaysia).
3. **Test data in the mockup database** (`claude.check1/2/6@test.local`, asset `ASSET-MYS-JZW65Y19`): can it be deleted?

### P6. Kredit bonus ToyyibPay / ToyyibPay bonus credits (6.2) 🟢

**BM:** kredit bonus kini dikira sama seperti kredit yang dibeli. Patutkah bonus dikira sebagai kredit percuma (contohnya tidak boleh dipulangkan, atau digunakan selepas kredit dibeli)?
**EN:** bonus credits are currently counted the same as purchased credits. Should bonus credits be treated as free credits (for example non-refundable, or used after purchased credits)?

### P7. Kredit AI untuk Tanya / AI credits for Tanya (24.4) 🟢

**BM:** soalan yang tiada sumber tidak ditolak kredit. Adakah pelabur biasa perlu membayar kredit untuk setiap soalan di Tanya, atau percuma?
**EN:** questions with no source are not charged. Should ordinary investors pay credits for each question in Tanya, or is it free?

### P8. Bajet DigitalOcean / DigitalOcean budget (14) 🟠

**BM:** berapa bajet bulanan untuk production pilot? Cadangan minimum: pelayan 8 GB, database terurus dengan sandaran, Redis, dan Spaces untuk fail. Perlu juga keputusan lokasi data (C3).
**EN:** what is the monthly budget for the production pilot? Suggested minimum: an 8 GB server, a managed database with backups, Redis, and Spaces for files. The data location decision (C3) is also needed.

### P9. Ejen kutipan zakat / Zakat collection agent (10) 🟢

**BM:** memungut zakat tanpa dilantik oleh Majlis Agama Islam Negeri ialah kesalahan. Kini sistem hanya mengira zakat dan menghantar pengguna ke portal rasmi. Adakah pengurusan mahu memohon pelantikan? Jika ya, kutipan melalui ToyyibPay boleh dihidupkan dengan nombor rujukan pelantikan.
**EN:** collecting zakat without appointment by the State Islamic Religious Council is an offence. The system only calculates zakat and sends users to the official portal. Does management want to apply for appointment? If so, collection through ToyyibPay can be switched on with the appointment reference number.

---

## 2. Compliance

### C1. Had pelaburan ikut tahap KYC / Investment limits by KYC level (11.1) 🔴

**BM**
- **Konteks:** semakan had sudah dibina. Nilai sementara dalam `server/.env.production.example`: Tahap 1 RM10,000; Tahap 2 RM100,000; Tahap 3 tiada had. Had dikira bagi setiap mata wang, termasuk pesanan yang belum dibayar.
- **Soalan:** sahkan atau tukar nilai ini. Adakah had berbeza bagi negara lain? Adakah had ini bagi sepanjang masa atau setahun?
- **Selepas keputusan:** salin nilai ke `/opt/how/server/.env` di production.

**EN**
- **Context:** the limit check is built. Temporary values in `server/.env.production.example`: Level 1 RM10,000; Level 2 RM100,000; Level 3 no limit. Limits are per currency and include unpaid orders.
- **Question:** confirm or change these values. Do other countries need different limits? Is the limit lifetime or per year?
- **After the decision:** copy the values to `/opt/how/server/.env` in production.

### C2. Format laporan regulator / Regulator report formats (11.2) 🟠

**BM:** eksport CSV sudah ada (daftar pelabur, daftar KYC, pihak berkaitan, agihan, payout). Compliance perlu tentukan laporan yang diperlukan oleh SC, BNM dan LHDN, medan, kekerapan dan format, supaya eksport boleh disesuaikan.
**EN:** CSV exports exist (investor register, KYC register, related parties, distributions, payouts). Compliance must set out which reports the SC, BNM and LHDN need, with fields, frequency and format, so the exports can be matched.

### C3. Lokasi simpanan data / Data location (14) 🔴

**BM:** DigitalOcean tiada pusat data di Malaysia; yang paling dekat Singapura. Adakah data peribadi dan KYC pelabur Malaysia boleh disimpan di Singapura di bawah PDPA dan garis panduan SC/BNM? Jika tidak, perlu penyedia dengan pusat data di Malaysia. Keputusan ini juga perlu untuk notis privasi (L4).
**EN:** DigitalOcean has no Malaysian data centre; the closest is Singapore. Can Malaysian investors' personal and KYC data be stored in Singapore under the PDPA and SC/BNM guidelines? If not, a provider with a Malaysian data centre is needed. This is also needed for the privacy notice (L4).

### C4. Penyedia eKYC / eKYC provider (2) 🟠

**BM**
- **Konteks:** kini Compliance menyemak sendiri. Belum ada kesan muka palsu (deepfake, topeng, rakaman skrin), kesan dokumen palsu, semakan rekod kerajaan, atau saringan AML/PEP/sekatan.
- **Soalan:** penyedia mana? Perlu bandingkan kos, kontrak, lokasi data, dan pematuhan garis panduan e-KYC Bank Negara.
- **Selepas keputusan:** sambungkan penyedia; skrin tidak perlu diubah.

**EN**
- **Context:** Compliance checks by hand today. There is no detection of fake faces (deepfakes, masks, screen replays), no fake document detection, no government record check, and no AML/PEP/sanctions screening.
- **Question:** which provider? Compare cost, contract, data location and compliance with Bank Negara's e-KYC guidelines.
- **After the decision:** connect the provider; the screens don't need to change.

### C5. Data biometrik (PDPA 2010) / Biometric data (4) 🔴

**BM:** gambar wajah dan dokumen KYC kini disimpan tanpa had masa. Perlu diputuskan:
1. Berapa lama disimpan, dan dipadam secara automatik selepas itu.
2. Adakah data wajah dipadam sebaik semakan selesai.
3. Butiran rekod persetujuan (versi teks, masa, alamat IP).

**EN:** face photos and KYC documents are kept with no time limit. To decide:
1. How long they are kept, then deleted automatically.
2. Whether face data is deleted as soon as the check is done.
3. The consent record details (text version, time, IP address).

---

## 3. Penasihat Shariah / Shariah adviser

### S1. Caj lewat bayar dalam Ijarah / Late payment charge in Ijarah (25.6) 🟠

**BM:** adakah ta'widh (pampasan kerugian sebenar) atau gharamah (penalti yang disalurkan ke amal) dibenarkan, dan bagaimana dikira? Kini tiada caj lewat dikenakan; surat peringatan dan penyata menyatakan "tiada caj lewat dikenakan".
**EN:** are ta'widh (compensation for actual loss) or gharamah (a penalty channelled to charity) allowed, and how are they calculated? No late charge is applied today; reminder letters and statements say "no late charge is applied".

### S2. Kerugian dan penutupan pool / Losses and pool closing (10) 🔴

**BM**
1. Bagaimana kerugian ditolak daripada modal pelabur dalam lejar.
2. Kira akhir pool bila pool ditutup (untung/rugi akhir, yuran, pulangan).
3. Proses bila pengurus cuai (pengurus menanggung rugi).
4. Bahagian rugi rakan kongsi pengurus dalam Musharakah.

**EN**
1. How losses are taken from investors' capital in the ledger.
2. The final calculation when a pool closes (final profit/loss, fees, returns).
3. The process when the manager is negligent (the manager bears the loss).
4. The manager-partner's share of losses in Musharakah.

### S3. Pulangan modal / Capital refunds (23, 17) 🔴

**BM**
1. Bila projek tidak diteruskan: pulangan penuh, atau tolak kerugian yang berlaku? Siapa meluluskan, dan bagaimana dicatat dalam lejar? (Bersama Kewangan.)
2. Sahkan bahawa pool yang tidak capai sasaran minimum memulangkan modal penuh (sudah dibina begitu).

**EN**
1. When a project does not go ahead: full refund, or less losses incurred? Who approves, and how is it recorded in the ledger? (With Finance.)
2. Confirm that a pool that misses its minimum target returns all capital (already built this way).

### S4. Modal penaja dalam Musharakah / Sponsor capital in Musharakah (15) 🟢

**BM:** bolehkah penaja menyumbang modal sebagai sumbangan berasingan dalam terma akad? Jika ya, bagaimana bahagian untung/rugi penaja dikira?
**EN:** may the sponsor contribute capital as a separate contribution in the contract terms? If so, how is the sponsor's profit/loss share calculated?

### S5. Senarai untuk disemak / Lists to review (17, 24.1) 🟠

**BM**
1. Senarai aktiviti haram platform (`server/src/shariah/prohibited-activities.ts`), digunakan untuk semakan aset, perkongsian dan sewaan.
2. Standard AAOIFI yang sudah diganti (contoh FAS 1 1993 diganti FAS 1 2022) perlu ditanda lapuk dalam pangkalan pengetahuan.

**EN**
1. The platform's prohibited-activities list (`server/src/shariah/prohibited-activities.ts`), used in asset, partnership and lease checks.
2. Superseded AAOIFI standards (e.g. FAS 1 1993 replaced by FAS 1 2022) must be marked outdated in the knowledge base.

### S6. Aliran pusaka / Estate flow (16.1) 🔴

**BM:** wajib sebelum pilot, bersama peguam dan pemegang amanah: lapor kematian, pembekuan akaun, dokumen mahkamah, pelan pembahagian, pindahan pelaburan, persetujuan waris, qabul hibah, teks panduan dan surat amanah.
**EN:** required before the pilot, with the lawyer and the trustee: death reporting, account freeze, court documents, distribution plan, investment transfer, heirs' consent, hibah acceptance (qabul), guidance text and trust letters.

---

## 4. Peguam / Lawyer

### L1. Templat pindaan perjanjian / Agreement amendment template (5) 🟠

**BM:** pindaan kini memuatkan teks perjanjian penuh bertajuk "Amendment to ...". Perlu templat yang hanya menyatakan klausa yang berubah.
**EN:** amendments currently contain the full agreement text titled "Amendment to ...". A template stating only the changed clauses is needed.

### L2. Semakan templat Musharakah dan Ijarah / Musharakah and Ijarah template review (17.7) 🔴

**BM:** templat perjanjian perlu disemak peguam dan penasihat Shariah sebelum digunakan dengan pihak sebenar.
**EN:** the agreement templates must be reviewed by the lawyer and the Shariah adviser before use with real parties.

### L3. Tandatangan elektronik dan duti setem / Electronic signatures and stamp duty (17.5) 🟠

**BM:** pendapat undang-undang: adakah tandatangan OTP sah bagi perjanjian ini di bawah Akta Tandatangan Digital/Perdagangan Elektronik; bila perlu penyedia berlesen (MSC Trustgate / Pos Digicert); dan cara duti setem dibayar.
**EN:** legal opinion: are OTP signatures valid for these agreements under the Digital Signature / Electronic Commerce Acts; when is a licensed provider (MSC Trustgate / Pos Digicert) needed; and how is stamp duty paid.

### L4. Notis privasi / Privacy notice (19.1) 🔴

**BM:** deraf sudah ada. Perlu: nama syarikat, nombor SSM, pegawai perlindungan data, lokasi data (C3), tempoh simpanan (C5), kemudian semakan peguam dan diterbitkan. Server sudah menolak pengguna yang belum menerima notis semasa.
**EN:** a draft exists. Needed: company name, SSM number, data protection officer, data location (C3), retention periods (C5), then legal review and publication. The server already blocks users who have not accepted the current notice.

### L5. Pewaris tanpa akaun / Heirs without an account (16.2) 🟠

**BM:** pewaris kini mesti daftar dan lulus KYC untuk menerima pelaburan. Jika pewaris tidak mahu menyertai platform, apa jalan lain (contoh bayar tunai kepada pentadbir pusaka)?
**EN:** heirs must currently register and pass KYC to receive investments. If an heir does not want to join, what is the alternative (e.g. paying cash to the estate administrator)?

---

## 5. Penasihat cukai / Tax adviser

### T1. Cukai / Tax (10, 21) 🟠

**BM**
1. Cukai pegangan bagi pelabur bukan pemastautin: kadar, potongan semasa agihan, bayaran kepada LHDN (bergantung pada struktur pool).
2. Cukai perkhidmatan 8% atas yuran platform, jika terpakai.
3. e-Invois MyInvois bila jualan melebihi RM1 juta.
4. Cukai perkhidmatan atas sewa komersial (sewaan terus).
5. Peraturan cukai negara D-8 lain.
6. Penyata kewangan platform (hasil yuran, imbangan duga, lejar am).

**EN**
1. Withholding tax for non-resident investors: rate, deduction at distribution, payment to LHDN (depends on the pool structure).
2. 8% service tax on platform fees, if applicable.
3. MyInvois e-invoicing once sales exceed RM1 million.
4. Service tax on commercial rent (direct leases).
5. Tax rules in the other D-8 countries.
6. Platform financial statements (fee income, trial balance, general ledger).

---

## 6. Tetapan dan pihak luar / Setup and outside parties

| Kod / Code | BM | EN | Rujukan / Ref |
|---|---|---|---|
| A2 🟠 | ToyyibPay: uji di staging, kemudian buka akaun live dan buat satu bayaran kecil. | ToyyibPay: test on staging, then open the live account and make one small payment. | 6 |
| A3 🟠 | Pilih penyedia payout bank/DuitNow dan dapatkan format fail bayaran pukal bank. | Choose a bank/DuitNow payout provider and get the bank's bulk payment file format. | 7.1, 22.1 |
| A4 🔴 | Butiran akaun amanah sebenar bagi setiap negara (bank, nama, nombor, SWIFT). | Real trust account details for each country (bank, name, number, SWIFT). | 20.1 |
| A5 🟠 | Spesifikasi SSO dan push daripada D8 Ideas. | SSO and push specification from D8 Ideas. | 20.2 |
| A6 🟠 | Isi SMTP Keycloak (emel "Forgot password"). | Fill Keycloak SMTP ("Forgot password" emails). | 20.4 |
| A7 🟠 | Staging: `KYC_DATA_ENCRYPTION_KEY`, `RAG_EMBEDDING_MODEL`, `OPENAI_API_KEY`. | Staging: `KYC_DATA_ENCRYPTION_KEY`, `RAG_EMBEDDING_MODEL`, `OPENAI_API_KEY`. | 19.4, 24.2, 14 |
| A8 🟠 | Hidupkan peranan Auditor di Admin Center › Role Availability. | Enable the Auditor role in Admin Center › Role Availability. | 11.4 |
| A9 🟢 | Akses data SSM, e-Tanah, JPJ, JKKP; sijil tandatangan yang dipercayai Adobe. | Access to SSM, e-Tanah, JPJ, JKKP data; an Adobe-trusted signing certificate. | 17 |
| A10 🟢 | Blockchain fasa 2: pilih rangkaian, dompet, cara simpan kunci, bajet yuran. | Blockchain phase 2: choose the network, wallet, key storage and fee budget. | 9 |

---

## 7. Boleh dibina sekarang tanpa menunggu / Can be built now without waiting

| BM | EN | Rujukan / Ref |
|---|---|---|
| Semakan dokumen diubah: tandatangan digital PDF, banding teks PDF dengan teks imbasan. | Altered document checks: PDF digital signatures, compare PDF text with scanned text. | 1 |

---

## Langkah seterusnya yang dicadangkan / Suggested next steps

**BM:** emel Resend sudah siap (A1). Seterusnya dapatkan (1) keputusan pelulus kedua (P1), dan (2) pengesahan Compliance tentang had KYC dan lokasi data (C1, C3). Ini membuka paling banyak kerja dan diperlukan untuk pilot.

**EN:** Resend email is done (A1). Next, get (1) the second-approver decision (P1) and (2) Compliance's sign-off on KYC limits and data location (C1, C3). These unblock the most work and are needed for the pilot.
