/**
 * Notification texts the server writes in English with values filled in (amounts, names, dates, references),
 * and their Malay wording. The server keeps one language so the record stays the same for everyone; the
 * mini-app shows it in the reader's language. `$1`, `$2`... are the values captured from the English text.
 * A text that matches nothing shows as the server wrote it.
 */
/** The asset expiry labels the server uses (server/src/assets/asset-expiry.ts), in Malay. */
const EXPIRY_LABELS: Record<string, string> = { 'road tax': 'cukai jalan', 'insurance or takaful': 'insurans atau takaful', 'puspakom inspection': 'pemeriksaan PUSPAKOM', 'jkkp certificate': 'sijil JKKP', lease: 'pajakan' };
const expiryLabel = (label: string) => EXPIRY_LABELS[label.toLowerCase()] ?? label;
const capitalised = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The sides of an agreement as the server names them, in Malay (capitalised: they start a sentence). */
const PARTY_MS: Record<string, string> = { 'asset owner': 'Pemilik aset', tenant: 'Penyewa', 'delivery partner': 'Rakan pelaksana' };

export const MS_SERVER_TEXT: Array<[RegExp, string | ((match: RegExpExecArray) => string)]> = [
  // Investments
  [/^Transfer (.+?) for (.+?) to (.+?) with reference (\S+)\. It counts in your portfolio once Finance confirms the money arrived\.$/, 'Pindahkan $1 untuk $2 ke $3 dengan rujukan $4. Ia dikira dalam portfolio anda sebaik sahaja Kewangan mengesahkan wang telah diterima.'],
  [/^Transfer (.+?) for (.+?) with reference (\S+)\. It counts in your portfolio once Finance confirms the money arrived\.$/, 'Pindahkan $1 untuk $2 dengan rujukan $3. Ia dikira dalam portfolio anda sebaik sahaja Kewangan mengesahkan wang telah diterima.'],
  [/^Finance confirmed your transfer of (.+?) to (.+?) \(order (\S+)\)\. It now counts in the pool\.$/, 'Kewangan mengesahkan pindahan anda sebanyak $1 ke $2 (pesanan $3). Kini ia dikira dalam pool.'],
  [/^Your order (\S+) for (.+?) was cancelled: (.+)$/, 'Pesanan $1 sebanyak $2 telah dibatalkan: $3'],
  [/^Your order (\S+) for (.+?) was cancelled\.$/, 'Pesanan $1 sebanyak $2 telah dibatalkan.'],
  [/^(.+?) passed its four sign-offs and is now open\. Investors in your country can subscribe\.$/, '$1 telah melepasi empat kelulusan dan kini dibuka. Pelabur di negara anda boleh melanggan.'],
  [/^(.+?) has raised its target\. You can now request the first disbursement tranche\.$/, '$1 telah mencapai sasarannya. Anda kini boleh memohon tranche pembayaran pertama.'],

  // Identity verification (KYC)
  [/^Your identity verification was approved\. You can now invest in open pools\.$/, 'Pengesahan identiti anda telah diluluskan. Anda kini boleh melabur dalam pool yang dibuka.'],
  [/^Your identity verification was rejected\. Reviewer's note: (.+)$/, 'Pengesahan identiti anda ditolak. Catatan penyemak: $1'],
  [/^The reviewer asked for changes before approving: (.+)$/, 'Penyemak meminta pembetulan sebelum meluluskan: $1'],

  // Profit and payout accounts
  [/^(.+?) from (.+?) was paid to your verified bank account\.$/, '$1 daripada $2 telah dibayar ke akaun bank anda yang disahkan.'],
  [/^The payout of (.+?) from (.+?) failed: (.+?)\. Check your payout bank account in Profile; settlement can send it again once it is corrected\.$/, 'Bayaran $1 daripada $2 gagal: $3. Semak akaun bank bayaran anda di Profil; bayaran boleh dihantar semula selepas dibetulkan.'],
  [/^Your (.+?) account (.*?) is verified\. Payouts can now be paid into it\.$/, 'Akaun $1 anda $2 telah disahkan. Bayaran kini boleh dibuat ke akaun ini.'],

  // Membership
  [/^Your (.+?) plan ends on (.+?)\. Renew it in Membership to keep your plan and AI credits; after a (\d+)-day grace period the account moves to the Free plan\.$/, 'Pelan $1 anda tamat pada $2. Perbaharuinya di Keahlian untuk mengekalkan pelan dan kredit AI anda; selepas tempoh tangguh $3 hari, akaun berpindah ke pelan Percuma.'],

  // Organisation verification (KYB)
  [/^(.+?) sent the corrections you asked for\.$/, '$1 telah menghantar pembetulan yang anda minta.'],
  [/^(.+?) submitted its registration details and documents\.$/, '$1 telah menghantar butiran pendaftaran dan dokumennya.'],

  // Asset expiry
  [/^(.+?): the (.+?) expired on (.+?)\. Renew it and upload the new document on the asset page\.$/, (m) => `${m[1]}: ${expiryLabel(m[2])} telah tamat pada ${m[3]}. Perbaharuinya dan muat naik dokumen baharu di halaman aset.`],
  [/^(.+?): the (.+?) expires on (.+?)\. Renew it and upload the new document on the asset page before then\.$/, (m) => `${m[1]}: ${expiryLabel(m[2])} tamat pada ${m[3]}. Perbaharuinya dan muat naik dokumen baharu di halaman aset sebelum tarikh itu.`],
  [/^(Road tax|Insurance or takaful|PUSPAKOM inspection|JKKP certificate|Lease) expired$/, (m) => `${capitalised(expiryLabel(m[1]))} telah tamat`],
  [/^(Road tax|Insurance or takaful|PUSPAKOM inspection|JKKP certificate|Lease) expires in (\d+) days$/, (m) => `${capitalised(expiryLabel(m[1]))} tamat dalam ${m[2]} hari`],

  // Direct leasing
  [/^(.+?) asks to rent (.+?) from (\S+) for (\d+) months at (.+?) a month \((\S+)\)\.$/, '$1 memohon menyewa $2 mulai $3 selama $4 bulan pada $5 sebulan ($6).'],
  [/^(.+?): the terms were accepted and now go to Legal and Shariah review\.$/, '$1: terma telah diterima dan kini dihantar untuk semakan Legal dan Shariah.'],
  [/^(.+?) was declined\.(?: (.+))?$/, '$1 telah ditolak. $2'],
  [/^(.+?): (.+?) a month, deposit (.+?), (\d+) months from (\S+)\.$/, '$1: $2 sebulan, deposit $3, $4 bulan mulai $5.'],
  [/^(.+?) was withdrawn\.$/, '$1 telah ditarik balik.'],
  [/^(.+?): (.+?) The owner proposes corrected terms; once the tenant accepts, it is reviewed again\.$/, '$1: $2 Pemilik mencadangkan terma yang dibetulkan; setelah penyewa menerima, ia disemak semula.'],
  [/^(.+?) is leased from (\S+) to (\S+) at (.+?) a month\. Sign the Ijarah agreement; the first month's rent and the deposit are paid to the owner's bank account\.$/, '$1 disewa dari $2 hingga $3 pada $4 sebulan. Tandatangani perjanjian Ijarah; sewa bulan pertama dan deposit dibayar ke akaun bank pemilik.'],
  [/^(.+?) now awaits the (Shariah|Legal) approval\.$/, '$1 kini menunggu kelulusan $2.'],
  [/^(.+?): the owner recorded (.+?) for (\S+) as received \(reference (.+?)\)\.$/, '$1: pemilik merekodkan $2 bagi $3 sebagai diterima (rujukan $4).'],
  [/^(.+?): the owner recorded the lease as ended\. (.*)$/, '$1: pemilik merekodkan sewaan sebagai tamat. $2'],
  [/^(.+?): Ijarah at (.+?) a month from (\S+) to (\S+) \((\S+)\)\.$/, '$1: Ijarah pada $2 sebulan dari $3 hingga $4 ($5).'],
  [/^Lease rejected by (Legal|Shariah)$/, 'Sewaan ditolak oleh $1'],
  [/^(Legal|Shariah) review: changes requested$/, 'Semakan $1: pembetulan diminta'],
  [/^(Legal|Shariah) approval given$/, 'Kelulusan $1 diberi'],

  // Hibah qabul
  [/^(.+?) (accepted|declined) your hibah \(qabul\), answered by their guardian (.+?)\.$/, (match) => `${match[1]} telah ${match[2] === 'accepted' ? 'menerima' : 'menolak'} hibah anda (qabul), dijawab oleh walinya ${match[3]}.`],
  [/^(.+?) (accepted|declined) your hibah \(qabul\)\.$/, (match) => `${match[1]} telah ${match[2] === 'accepted' ? 'menerima' : 'menolak'} hibah anda (qabul).`],

  // Lease deposit and reminders
  [/^(.+?): the owner recorded your deposit of (.+?) as received \(reference (.+?)\)\.$/, '$1: pemilik merekodkan deposit anda sebanyak $2 sebagai diterima (rujukan $3).'],
  [/^(.+?): the owner refunded (.+?) of your deposit after deductions of (.+?) \((.+)\) \(reference (.+?)\)\.$/, '$1: pemilik memulangkan $2 daripada deposit anda selepas potongan $3 ($4) (rujukan $5).'],
  [/^(.+?): the owner refunded (.+?) of your deposit \(reference (.+?)\)\.$/, '$1: pemilik memulangkan $2 daripada deposit anda (rujukan $3).'],
  [/^(.+?): the rent of (.+?) due on (\S+) is (\d+) day\(s\) late\. Pay it to the owner's bank account; the owner records it once received\.$/, '$1: sewa $2 yang perlu dibayar pada $3 sudah lewat $4 hari. Bayar ke akaun bank pemilik; pemilik merekodkannya selepas diterima.'],
  [/^(.+?): the rent of (.+?) due on (\S+) is not recorded as received, (\d+) day\(s\) after it was due\. If it reached your account, record it\.$/, '$1: sewa $2 yang perlu dibayar pada $3 belum direkod sebagai diterima, $4 hari selepas tarikhnya. Jika sudah masuk ke akaun anda, rekodkannya.'],
  [/^(.+?): the rent of (.+?) for (\S+) is due on (\S+)\. Pay it to the owner's bank account\.$/, '$1: sewa $2 bagi $3 perlu dibayar pada $4. Bayar ke akaun bank pemilik.'],
  [/^(.+?): the lease ends on (\S+), in (\d+) days\. To continue, the tenant asks for a new lease; otherwise the space is handed back on that day\.$/, '$1: sewaan tamat pada $2, dalam $3 hari. Untuk meneruskan, penyewa memohon sewaan baharu; jika tidak, ruang diserahkan semula pada hari itu.'],
  [/^(.+?): refund the deposit of (.+?) by (\S+), less only unpaid rent and repairs beyond fair wear and tear, and record it in Leasing\.$/, '$1: pulangkan deposit $2 sebelum $3, ditolak hanya sewa tertunggak dan pembaikan melebihi haus dan lusuh biasa, dan rekodkannya di Sewaan.'],

  // Agreements (lease and partnership)
  [/^Ijarah agreement for (.+?): please review$/, 'Perjanjian Ijarah untuk $1: sila semak'],
  [/^The owner drafted the Ijarah agreement for (.+?) \((\S+)\)\. Read it and agree to it\.$/, 'Pemilik telah menyediakan perjanjian Ijarah untuk $1 ($2). Bacanya dan nyatakan persetujuan anda.'],
  [/^The owner revised the agreement to version (\d+) for (.+?) \((\S+)\)\. Read it and agree to it\.$/, 'Pemilik telah menyemak semula perjanjian kepada versi $1 untuk $2 ($3). Bacanya dan nyatakan persetujuan anda.'],
  [/^Both sides agreed to version (\d+) of (\S+)\. It can now be submitted for legal review\.$/, 'Kedua-dua pihak bersetuju dengan versi $1 bagi $2. Ia kini boleh dihantar untuk semakan Legal.'],
  [/^The (asset owner|tenant|delivery partner) agreed to version (\d+) of (\S+)\. Read it and agree, or draft a revision\.$/, (match) => `${PARTY_MS[match[1]]} telah bersetuju dengan versi ${match[2]} bagi ${match[3]}. Bacanya dan nyatakan persetujuan, atau sediakan semakan semula.`],
  [/^(\S+) passed legal and Shariah review\. Each side now signs it\.$/, '$1 telah lulus semakan Legal dan Shariah. Setiap pihak kini menandatanganinya.'],
  [/^(\S+) is signed by both sides\. Next: pay the stamp duty \(LHDN STAMPS\) within 30 days; the agreement takes effect as written in it\.$/, '$1 telah ditandatangani oleh kedua-dua pihak. Seterusnya: bayar duti setem (LHDN STAMPS) dalam tempoh 30 hari; perjanjian berkuat kuasa seperti yang tertulis.'],
  [/^The (asset owner|tenant|delivery partner) signed (\S+)\. Sign it to complete the agreement\.$/, (match) => `${PARTY_MS[match[1]]} telah menandatangani ${match[2]}. Tandatanganinya untuk melengkapkan perjanjian.`],

  // Asset partnerships (asset owners)
  [/^(.+?) for (.+?) was accepted and now goes to Legal and Shariah review\.$/, '$1 untuk $2 telah diterima dan kini dihantar untuk semakan Legal dan Shariah.'],
  [/^(.+?) is committed to (.+?) from (\S+) to (\S+)\. The agreement can now be drafted\.$/, '$1 diikat kepada $2 dari $3 hingga $4. Perjanjian kini boleh disediakan.'],
  [/^(.+?) needs (\d+) × (.+?) for (.+?): (.+?)\. Offer a verified asset, or register one to take part\.$/, '$1 memerlukan $2 × $3 untuk $4: $5. Tawarkan aset yang disahkan, atau daftarkan satu untuk menyertai.'],
];

const MS_SERVER_TITLES: Record<string, string> = {
  'Pool fully funded': 'Pool dibiayai sepenuhnya',
  'Pool waiting for sign-off': 'Pool menunggu kelulusan',
  'Your membership ends in a week': 'Keahlian anda tamat dalam seminggu',
  'Organisation verified (KYB)': 'Organisasi disahkan (KYB)',
  'Organisation verification rejected': 'Pengesahan organisasi ditolak',
  'Organisation verification: changes requested': 'Pengesahan organisasi: pembetulan diminta',
  'Organisation to verify (KYB)': 'Organisasi untuk disahkan (KYB)',
  'Organisation verification corrected': 'Pengesahan organisasi telah dibetulkan',
  'A project is looking for assets': 'Sebuah projek memerlukan aset',
  'Verify your asset to take part': 'Sahkan aset anda untuk menyertai',
  'New asset offer for your project': 'Tawaran aset baharu untuk projek anda',
  'A delivery partner asks to use your asset': 'Rakan pelaksana memohon menggunakan aset anda',
  'Asset partnership accepted': 'Perkongsian aset diterima',
  'Asset partnership declined': 'Perkongsian aset ditolak',
  'New counter-offer': 'Tawaran balas baharu',
  'Asset partnership withdrawn': 'Perkongsian aset ditarik balik',
  'Asset partnership approved': 'Perkongsian aset diluluskan',
  'Offer closed': 'Tawaran ditutup',
};

/** The server's English notification title or message in Malay, when known; otherwise as written. */
export function translateServerText(text: string): string {
  if (MS_SERVER_TITLES[text]) return MS_SERVER_TITLES[text];
  for (const [pattern, malay] of MS_SERVER_TEXT) {
    const match = pattern.exec(text);
    if (match) return (typeof malay === 'function' ? malay(match) : malay.replace(/\$(\d)/g, (_, index: string) => match[Number(index)] ?? '')).trim();
  }
  return text;
}
