# Pending Activities

Kerja yang sudah dikenal pasti tetapi ditangguhkan. Kemas kini status apabila kerja dimulakan atau selesai.

## 1. Pengesanan dokumen bukti yang diubah (tamper detection)

- **Status:** Ditangguhkan (dicatat 2026-10-01)
- **Kawasan:** `analyzeProjectDocument` dalam `server/src/ai/ai.service.ts`, `uploadEvidence` dalam `server/src/projects/`

**Keadaan sekarang:** Pengesahan bukti projek hanya memadankan kata kunci (regex) pada teks yang diekstrak. Tiada model AI dan tiada pemeriksaan integriti. PDF palsu yang mengandungi kata kunci yang betul akan mendapat status `VERIFIED` (status ini hanya bermaksud "sedia untuk semakan manusia"). Satu-satunya perlindungan ialah semakan manusia dalam aliran feasibility.

**Cadangan, mengikut keutamaan:**
1. Simpan hash SHA-256 fail semasa muat naik, supaya perubahan selepas muat naik dapat dikesan.
2. Periksa metadata PDF: tarikh dicipta berbanding tarikh diubah, dan perisian yang menghasilkan fail.
3. Kesan suntingan bertambah (incremental update), iaitu lebih daripada satu penanda `%%EOF`.
4. Sahkan tandatangan digital PDF (PAdES) jika ada.
5. Bandingkan lapisan teks dengan OCR imej halaman untuk mengesan teks tersembunyi atau ditindih.
6. Semak silang dengan sumber pengeluar dokumen (contohnya SSM atau pejabat tanah).

Langkah 1 hingga 3 murah dan tidak memerlukan pakej baharu.

## 2. Keputusan: penyedia eKYC luar

- **Status:** Separuh siap (2026-10-01). Lapisan semakan automatik sudah dibina dalam `server/src/kyc/checks` (kontrak penyedia, routing, mod bayangan, webhook), termasuk adapter `inhouse-ml` untuk servis ML ekyc (DOCUMENT dan FACE_MATCH; ia membaca dokumen tetapi tidak mengesan pemalsuan). Belum diputuskan: penyedia untuk LIVENESS (perlukan rakaman video), REGISTRY dan AML_SCREENING, serta pengesanan pemalsuan dokumen.
- **Kawasan:** `server/src/kyc/`

Modul KYC sekarang menggunakan semakan manual oleh KYC Officer. Perlu diputuskan sama ada akan diintegrasikan dengan penyedia eKYC luar (pengesanan liveness, padanan muka, pengesahan dokumen). Jika ya, keputusan penyedia boleh direkodkan sebagai input tambahan kepada `KycApplication`, dan kelulusan akhir masih oleh pegawai.

## 3. Semakan KYB (PDP) tidak mengikut skop tenant

- **Status:** Selesai (2026-10-01). Kelulusan kini terhad kepada negara sendiri (kecuali Super Admin, yang global), semakan sendiri disekat, body disahkan dengan `KybReviewDto`, dan keputusan serentak dikawal.
- **Kawasan:** `reviewKyb` dalam `server/src/pdp/pdp.service.ts` dan `pdp.controller.ts`

`reviewKyb` mencari permohonan dengan `id` sahaja, jadi KYB Officer dari mana-mana negara boleh meluluskan permohonan PDP negara lain. Body `{ decision, justification }` juga ditaip secara inline, jadi tidak disahkan oleh `ValidationPipe`. Selain itu, kelulusan tidak disekat untuk pemohon yang menyemak permohonan sendiri. Baiki mengikut corak `server/src/kyc/kyc.service.ts`.
