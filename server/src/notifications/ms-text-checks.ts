/** What the KYC checks and the agreement text checks write in English, in Malay, for the mini-app's Reviews screens. */
const FIELD_MS: Record<string, string> = { Name: 'Nama', 'ID number': 'Nombor ID', 'Date of birth': 'Tarikh lahir', Address: 'Alamat', Date: 'Tarikh' };
const SOURCE_MS: Record<string, string> = { 'identity document': 'dokumen pengenalan', 'proof of address': 'bukti alamat' };
const DOCUMENT_MS: Record<string, string> = { 'ID card (front)': 'kad pengenalan (depan)', 'ID card (back)': 'kad pengenalan (belakang)', passport: 'pasport', 'proof of address': 'bukti alamat' };
const OUTCOME_MS: Record<string, string> = { failed: 'gagal', 'needs review': 'perlu disemak', 'could not be run': 'tidak dapat dijalankan' };

export const MS_CHECK_TEXT: Record<string, string> = {
  // Findings
  'identity document': 'dokumen pengenalan',
  'proof of address': 'bukti alamat',
  Name: 'Nama',
  'ID number': 'Nombor ID',
  'Date of birth': 'Tarikh lahir',
  Address: 'Alamat',
  Date: 'Tarikh',
  'Issued by': 'Dikeluarkan oleh',
  'Address on MyKad': 'Alamat pada MyKad',
  'Under 3 months old': 'Kurang daripada 3 bulan',
  'Not recognised': 'Tidak dikenali',
  'Not a known utility, telco, bank or government issuer: check the document is a genuine bill or statement.': 'Bukan pengeluar utiliti, telco, bank atau kerajaan yang dikenali: pastikan dokumen ini bil atau penyata yang tulen.',
  'Different from the entered address, which is normal if the applicant has moved: the proof of address matches it.': 'Berbeza daripada alamat yang diisi, iaitu perkara biasa jika pemohon sudah berpindah: bukti alamat sepadan dengannya.',
  'Different from the entered address, and the proof of address does not confirm it either.': 'Berbeza daripada alamat yang diisi, dan bukti alamat juga tidak mengesahkannya.',
  // Reasons
  'No date was found on the proof of address - check it is under 3 months old': 'Tiada tarikh dijumpai pada bukti alamat: pastikan ia kurang daripada 3 bulan',
  'No identity document expiry date was given': 'Tarikh tamat dokumen pengenalan tidak diberi',
  'ID number is not in MyKad format (YYMMDD-PB-####)': 'Nombor ID bukan dalam format MyKad (YYMMDD-PB-####)',
  'Date of birth does not match the MyKad number': 'Tarikh lahir tidak sepadan dengan nombor MyKad',
  'This ID number is already verified for another user': 'Nombor ID ini sudah disahkan untuk pengguna lain',
  'Face verification (camera) was not performed': 'Semakan wajah (kamera) tidak dilakukan',
  'The photo on the ID card could not be found to compare with the live face': 'Gambar pada kad pengenalan tidak dijumpai untuk dibandingkan dengan wajah sebenar',
  'The ID number on the card shown to the camera does not match the application': 'Nombor ID pada kad yang ditunjukkan kepada kamera tidak sepadan dengan permohonan',
  'The ID number on the card shown to the camera could not be read': 'Nombor ID pada kad yang ditunjukkan kepada kamera tidak dapat dibaca',
  'The front of the ID is not an image (JPG/PNG) the ML service can read': 'Bahagian depan ID bukan imej (JPG/PNG) yang boleh dibaca oleh perkhidmatan ML',
  'The ID photo or selfie is not an image (JPG/PNG) the ML service can read': 'Gambar ID atau swafoto bukan imej (JPG/PNG) yang boleh dibaca oleh perkhidmatan ML',
  'Possible photo of a screen': 'Mungkin gambar skrin',
  'Readable and consistent; authenticity is not verified by this provider': 'Boleh dibaca dan konsisten; ketulenan tidak disahkan oleh penyedia ini',
  // Face verification that stopped
  'The session expired before all steps were completed.': 'Sesi tamat sebelum semua langkah selesai.',
  // Agreement text checks
  'No blanks left in the text': 'Tiada ruang kosong dalam teks',
  'Every field is filled in.': 'Semua ruang telah diisi.',
  'Governing law and disputes': 'Undang-undang dan pertikaian',
  'Governing law or dispute resolution is stated.': 'Undang-undang atau penyelesaian pertikaian dinyatakan.',
  'Say which law governs and how disputes are resolved (e.g. AIAC arbitration).': 'Nyatakan undang-undang yang terpakai dan cara pertikaian diselesaikan (cth. timbang tara AIAC).',
  'Default and termination': 'Kemungkiran dan penamatan',
  'Default, termination or exit is covered.': 'Kemungkiran, penamatan atau keluar telah diliputi.',
  'Say what counts as default and how the agreement ends.': 'Nyatakan apa yang dikira kemungkiran dan bagaimana perjanjian tamat.',
  'Losses borne by capital': 'Kerugian ditanggung mengikut modal',
  'Losses follow the capital contributions.': 'Kerugian mengikut sumbangan modal.',
  "The text must say losses are borne in proportion to each partner's capital.": 'Teks mesti menyatakan kerugian ditanggung mengikut nisbah modal setiap rakan kongsi.',
  'Profit shared by an agreed ratio': 'Keuntungan dikongsi mengikut nisbah yang dipersetujui',
  'A profit ratio is stated.': 'Nisbah keuntungan dinyatakan.',
  "State each partner's share of profit as a percentage of actual profit.": 'Nyatakan bahagian setiap rakan kongsi sebagai peratusan keuntungan sebenar.',
  'No guaranteed return': 'Tiada pulangan terjamin',
  'The text says no return is guaranteed.': 'Teks menyatakan tiada pulangan dijamin.',
  'Say that no partner is guaranteed a profit or the return of capital.': 'Nyatakan bahawa tiada rakan kongsi dijamin keuntungan atau pemulangan modal.',
  'Value of a contribution in kind': 'Nilai sumbangan bukan tunai',
  'The agreed value of the contributed asset is stated.': 'Nilai aset yang disumbangkan seperti dipersetujui dinyatakan.',
  'An asset contributed as capital needs an agreed value, ideally from an independent valuation (AAOIFI Shariah Standard 12).': 'Aset yang disumbangkan sebagai modal memerlukan nilai yang dipersetujui, sebaiknya daripada penilaian bebas (AAOIFI Shariah Standard 12).',
  'Lessor keeps ownership': 'Pemberi sewa kekal sebagai pemilik',
  'Ownership stays with the lessor.': 'Pemilikan kekal pada pemberi sewa.',
  'Say that ownership of the asset stays with the lessor throughout.': 'Nyatakan bahawa pemilikan aset kekal pada pemberi sewa sepanjang tempoh.',
  'Rent and payment dates known': 'Sewa dan tarikh bayaran diketahui',
  'The rent must be a known amount (or formula) with known payment dates.': 'Sewa mesti jumlah (atau formula) yang diketahui dengan tarikh bayaran yang diketahui.',
  'Major maintenance and takaful with the lessor': 'Penyelenggaraan utama dan takaful oleh pemberi sewa',
  'Major maintenance or takaful is allocated.': 'Penyelenggaraan utama atau takaful telah ditetapkan.',
  'Say the lessor bears major maintenance and takaful; the lessee only day-to-day upkeep.': 'Nyatakan pemberi sewa menanggung penyelenggaraan utama dan takaful; penyewa hanya penjagaan harian.',
  'Late payment wording': 'Ayat bayaran lewat',
  "Late payment charges may not be income to the lessor: any charge must go to charity (gharamah) beyond actual costs (ta'widh). Check the wording.": "Caj bayaran lewat tidak boleh menjadi pendapatan pemberi sewa: sebarang caj melebihi kos sebenar (ta'widh) mesti disalurkan kepada amal (gharamah). Semak ayatnya.",
  'Carries the approved partnership terms': 'Mengandungi terma perkongsian yang diluluskan',
  'The approved terms appear in the text.': 'Terma yang diluluskan ada dalam teks.',
  // Grounds for a reasoned approval (src/ai/features/contract/agreementOverride.ts)
  'your note reads as a refusal': 'nota anda berbunyi seperti penolakan',
};

const list = (text: string, separator: string) => text.split(separator).map((item) => translateCheckText(item) ?? item).join(separator);

const MS_CHECK_PATTERNS: Array<[RegExp, (match: RegExpExecArray) => string]> = [
  [/^Could not read any text from the (.+) - check it manually$/, (m) => `Tiada teks dapat dibaca daripada ${DOCUMENT_MS[m[1]] ?? m[1]}: semak secara manual`],
  [/^(Name|ID number|Date of birth|Address) on the (identity document|proof of address) does not match the application \(entered: "(.*)"\)$/, (m) => `${FIELD_MS[m[1]]} pada ${SOURCE_MS[m[2]]} tidak sepadan dengan permohonan (diisi: "${m[3]}")`],
  [/^(Name|ID number|Date of birth|Address) could not be found on the (identity document|proof of address)$/, (m) => `${FIELD_MS[m[1]]} tidak dijumpai pada ${SOURCE_MS[m[2]]}`],
  [/^The proof of address is dated (\S+), older than 3 months$/, (m) => `Bukti alamat bertarikh ${m[1]}, lebih daripada 3 bulan`],
  [/^Identity document expired on (\S+)$/, (m) => `Dokumen pengenalan tamat pada ${m[1]}`],
  [/^Identity document expires within (\d+) days$/, (m) => `Dokumen pengenalan tamat dalam ${m[1]} hari`],
  [/^Applicant is under (\d+)$/, (m) => `Pemohon berumur bawah ${m[1]} tahun`],
  [/^This ID number appears in (\d+) other user application\(s\)$/, (m) => `Nombor ID ini ada dalam ${m[1]} permohonan pengguna lain`],
  [/^Identical file\(s\) uploaded by another user: (.+)$/, (m) => `Fail yang sama dimuat naik oleh pengguna lain: ${m[1]}`],
  [/^Face verification was not completed \((\w+)\)(?:: (.+))?$/, (m) => `Semakan wajah tidak selesai (${m[1]})${m[2] ? `: ${m[2]}` : ''}`],
  [/^The live face does not appear to match the ID photo \(similarity ([\d.]+), expected at least ([\d.]+)\)$/, (m) => `Wajah sebenar nampaknya tidak sepadan dengan gambar ID (persamaan ${m[1]}, sekurang-kurangnya ${m[2]})`],
  [/^The ML service cannot read (.+); review the document manually$/, (m) => `Perkhidmatan ML tidak dapat membaca ${m[1] === 'passports' ? 'pasport' : m[1].replace('national IDs from', 'kad pengenalan dari')}; semak dokumen secara manual`],
  [/^No face detected in the (.+); ask for a clearer capture$/, (m) => `Tiada wajah dikesan pada ${m[1]}; minta gambar yang lebih jelas`],
  [/^Step (S+) was not completed within (d+) seconds.$/, (m) => `Langkah ${m[1]} tidak selesai dalam ${m[2]} saat.`],
  // The overall recommendation: "DOCUMENT: needs review (reason; reason)"
  [/^(\w+): (failed|needs review|could not be run)(?: \((.+)\))?$/, (m) => `${m[1]}: ${OUTCOME_MS[m[2]]}${m[3] ? ` (${list(m[3], '; ')})` : ''}`],
  [/^(\w+): waiting for the provider$/, (m) => `${m[1]}: menunggu penyedia`],
  [/^(\w+): provider returned no score$/, (m) => `${m[1]}: penyedia tidak memberi skor`],
  [/^(\w+): score ([\d.]+) far below ([\d.]+)$/, (m) => `${m[1]}: skor ${m[2]} jauh di bawah ${m[3]}`],
  [/^(\w+): score ([\d.]+) below ([\d.]+)$/, (m) => `${m[1]}: skor ${m[2]} di bawah ${m[3]}`],
  [/^(Name|ID number|Date of birth) does not match the (.+)$/, (m) => `${FIELD_MS[m[1]]} tidak sepadan dengan ${m[2]}`],
  [/^The (.+) shows an expired identity document \((.+)\)$/, (m) => `${m[1]} menunjukkan dokumen pengenalan yang tamat (${m[2]})`],
  // Agreement text checks
  [/^Still to fill: (.+)\.$/, (m) => `Masih perlu diisi: ${m[1]}.`],
  [/^Not found in the text: (.+)\. The agreement should match what Legal and Shariah approved, or explain the change\.$/, (m) => `Tidak dijumpai dalam teks: ${m[1]}. Perjanjian patut sepadan dengan yang diluluskan Legal dan Shariah, atau terangkan perubahannya.`],
  [/^(\d+) text checks? failed: (.+)$/, (m) => `${m[1]} semakan teks gagal: ${list(m[2], ', ')}`],
  [/^the AI scan found (\d+) serious gaps?$/, (m) => `imbasan AI menemui ${m[1]} jurang serius`],
];

/** The Malay of a check's wording, or null when it has none. */
export function translateCheckText(text: string): string | null {
  const known = MS_CHECK_TEXT[text];
  if (known) return known;
  for (const [pattern, malay] of MS_CHECK_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return malay(match);
  }
  return null;
}
