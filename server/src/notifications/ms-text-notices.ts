/** Notification titles and messages in Malay that ms-text.ts does not hold: funding, reports, estate, and the later leasing work. */
export const MS_NOTICE_TITLES: Record<string, string> = {
  // Agreements
  'Agreement ready for legal review': 'Perjanjian sedia untuk semakan Legal',
  'Agreement: the other side agreed': 'Perjanjian: pihak satu lagi telah bersetuju',
  'Agreement signed by both sides': 'Perjanjian ditandatangani oleh kedua-dua pihak',
  'Agreement: the other side signed': 'Perjanjian: pihak satu lagi telah menandatangani',
  'Agreement approved: ready to sign': 'Perjanjian diluluskan: sedia untuk ditandatangani',
  'Agreement: changes requested': 'Perjanjian: pembetulan diminta',
  'Signed agreement failed its integrity check': 'Perjanjian bertandatangan gagal semakan integriti',
  // Investments and payouts
  'Profit paid to your bank account': 'Keuntungan dibayar ke akaun bank anda',
  'Profit payout did not go through': 'Pembayaran keuntungan tidak berjaya',
  'Bank account verified': 'Akaun bank disahkan',
  'Order received: transfer to complete it': 'Pesanan diterima: buat pindahan untuk melengkapkannya',
  'Money returned': 'Wang dipulangkan',
  'Investment confirmed': 'Pelaburan disahkan',
  'Investment order cancelled': 'Pesanan pelaburan dibatalkan',
  'Pool open to investors': 'Pool dibuka kepada pelabur',
  'Pool did not reach its minimum': 'Pool tidak mencapai jumlah minimum',
  'Refunds to make': 'Bayaran balik perlu dibuat',
  'Pool closed': 'Pool ditutup',
  'Unpaid order cancelled': 'Pesanan belum dibayar dibatalkan',
  // Projects, tranches and reports
  'Project resumed': 'Projek disambung semula',
  'Project withdrawn': 'Projek ditarik balik',
  'Project restored': 'Projek dipulihkan',
  'Project suspended': 'Projek digantung',
  'Do not transfer for now': 'Jangan pindahkan wang buat masa ini',
  'Tranche release to approve': 'Pelepasan tranche untuk diluluskan',
  'Tranche approved, ready to release': 'Tranche diluluskan, sedia untuk dilepaskan',
  'Tranche release rejected': 'Pelepasan tranche ditolak',
  'Tranche released': 'Tranche dilepaskan',
  'Performance report to verify': 'Laporan prestasi untuk disahkan',
  'Performance report verified': 'Laporan prestasi disahkan',
  'Performance report returned': 'Laporan prestasi dikembalikan',
  'New project performance report': 'Laporan prestasi projek baharu',
  'PDP application corrected': 'Permohonan PDP telah dibetulkan',
  'PDP application to review': 'Permohonan PDP untuk disemak',
  'Asset to verify first': 'Aset perlu disahkan dahulu',
  'Asset partnership to review': 'Perkongsian aset untuk disemak',
  // Estate
  'Hibah accepted': 'Hibah diterima',
  'Hibah declined': 'Hibah ditolak',
  'Death reported': 'Kematian dilaporkan',
  'Estate settlement plan to approve': 'Pelan penyelesaian pusaka untuk diluluskan',
  'Inherited investment': 'Pelaburan warisan',
  'Death report not accepted': 'Laporan kematian tidak diterima',
  'Death report verified': 'Laporan kematian disahkan',
  'Court documents verified': 'Dokumen mahkamah disahkan',
  'Estate settled': 'Pusaka telah diselesaikan',
  'we have verified the death certificate and frozen the account. Next we need the faraid certificate (Sijil Faraid) from the Syariah court, or the grant of probate or letters of administration. Please send it to the estate officer when you have it.': 'kami telah mengesahkan sijil kematian dan membekukan akaun. Seterusnya kami memerlukan Sijil Faraid daripada Mahkamah Syariah, atau geran probet atau surat kuasa mentadbir. Sila hantar kepada pegawai pusaka apabila anda memperolehnya.',
  'we have verified the court documents. The estate officer is now preparing how the investments pass to the heirs. Each heir who receives a holding needs a verified investor account; we will contact them.': 'kami telah mengesahkan dokumen mahkamah. Pegawai pusaka kini menyediakan cara pelaburan dipindahkan kepada waris. Setiap waris yang menerima pegangan memerlukan akaun pelabur yang disahkan; kami akan menghubungi mereka.',
  'the investments held on the platform have now passed to the heirs named in the settlement plan, and each of them has been told. Any profit still due is paid to the estate bank account.': 'pelaburan yang dipegang di platform kini telah dipindahkan kepada waris yang dinamakan dalam pelan penyelesaian, dan setiap seorang telah dimaklumkan. Sebarang keuntungan yang masih perlu dibayar akan dibayar ke akaun bank pusaka.',
  // Leasing
  'The owner offers to renew': 'Pemilik menawarkan pembaharuan sewaan',
  'A company asks to rent your space': 'Sebuah syarikat memohon menyewa ruang anda',
  'Lease terms accepted': 'Terma sewaan diterima',
  'Lease request declined': 'Permohonan sewa ditolak',
  'New lease terms proposed': 'Terma sewaan baharu dicadangkan',
  'Lease request withdrawn': 'Permohonan sewa ditarik balik',
  'Lease approved': 'Sewaan diluluskan',
  'Rent received': 'Sewa diterima',
  'Lease ended': 'Sewaan tamat',
  'Deposit received': 'Deposit diterima',
  'Deposit refunded': 'Deposit dipulangkan',
  'Deposit carried over': 'Deposit dibawa ke sewaan baharu',
  'Rent overdue': 'Sewa tertunggak',
  'Rent not received': 'Sewa belum diterima',
  'Rent due today': 'Sewa perlu dibayar hari ini',
  'Rent due soon': 'Sewa perlu dibayar tidak lama lagi',
  'Lease ending soon': 'Sewaan akan tamat',
  'Deposit refund overdue': 'Pemulangan deposit lewat',
  'Deposit refund due': 'Deposit perlu dipulangkan',
  'Lease to review': 'Sewaan untuk disemak',
  'Utility bill to pay': 'Bil utiliti perlu dibayar',
  'Utility bill received': 'Bil utiliti diterima',
  'Utility bill removed': 'Bil utiliti dibuang',
  'Utility bill overdue': 'Bil utiliti tertunggak',
  // AI
  'AI request did not finish': 'Permintaan AI tidak selesai',
  'Your AI request was interrupted before it answered. Please try again.': 'Permintaan AI anda terganggu sebelum sempat dijawab. Sila cuba lagi.',
};

const UTILITY_MS: Record<string, string> = { electricity: 'elektrik', water: 'air', sewerage: 'pembetungan', other: 'lain-lain' };
const utility = (kind: string) => UTILITY_MS[kind] ?? kind;
const PARTY_MS: Record<string, string> = { 'asset owner': 'Pemilik aset', 'delivery partner': 'Rakan pelaksana' };
const AGREEMENT_STEP_MS: Record<string, string> = { legal: 'Legal', Shariah: 'Shariah' };

export const MS_NOTICE_PATTERNS: Array<[RegExp, string | ((match: RegExpExecArray) => string)]> = [
  // Leasing: renewals, deposits carried over, utility bills
  [/^(.+?) asks to renew (.+?), from (\S+) for (\d+) months at (.+?) a month \((\S+), renewing (\S+)\)\.$/, '$1 memohon memperbaharui $2, mulai $3 selama $4 bulan pada $5 sebulan ($6, membaharui $7).'],
  [/^(.+?): the owner offers to renew from (\S+) for (\d+) months at (.+?) a month \((\S+), renewing (\S+)\)\.$/, '$1: pemilik menawarkan pembaharuan mulai $2 selama $3 bulan pada $4 sebulan ($5, membaharui $6).'],
  [/^(.+?): (.+?) of the deposits held under (\S+) carries over to (\S+)\. (.+?) is still to be paid to the owner's bank account\.$/, '$1: $2 daripada deposit yang dipegang di bawah $3 dibawa ke $4. $5 masih perlu dibayar ke akaun bank pemilik.'],
  [/^(.+?): (.+?) of the deposits held under (\S+) carries over to (\S+)\. Nothing more is to be paid\.$/, '$1: $2 daripada deposit yang dipegang di bawah $3 dibawa ke $4. Tiada bayaran lain diperlukan.'],
  [/^(.+?): the (\w+) bill for (\S+) is (.+?) \(bill (.+?)\)\. Pay it to the owner's bank account by (\S+)\.$/, (m) => `${m[1]}: bil ${utility(m[2])} bagi ${m[3]} ialah ${m[4]} (bil ${m[5]}). Bayar ke akaun bank pemilik sebelum ${m[6]}.`],
  [/^(.+?): the owner recorded the (\w+) bill for (\S+) as received \(reference (.+?)\)\.$/, (m) => `${m[1]}: pemilik merekodkan bil ${utility(m[2])} bagi ${m[3]} sebagai diterima (rujukan ${m[4]}).`],
  [/^(.+?): the owner removed the (\w+) bill for (\S+)\. (.*)$/, (m) => `${m[1]}: pemilik membuang bil ${utility(m[2])} bagi ${m[3]}. ${m[4]}`],
  [/^(.+?): the (\w+) bill of (.+?) for (\S+) was due on (\S+)\. Pay it to the owner's bank account\.$/, (m) => `${m[1]}: bil ${utility(m[2])} sebanyak ${m[3]} bagi ${m[4]} perlu dibayar pada ${m[5]}. Bayar ke akaun bank pemilik.`],
  [/^(.+?): the lease ends on (\S+), in (\d+) days\. To continue, the tenant asks to renew or the owner offers it in Leasing; otherwise the space is handed back on that day\.$/, '$1: sewaan tamat pada $2, dalam $3 hari. Untuk meneruskan, penyewa memohon pembaharuan atau pemilik menawarkannya di Sewaan; jika tidak, ruang diserahkan semula pada hari itu.'],

  // Rent collection
  [/^(.+?): the rent of (.+?) for (\S+) is unpaid\. Send reminder 1 by (\S+) \((\S+)\)\.$/, '$1: sewa $2 bagi $3 belum dibayar. Hantar peringatan 1 sebelum $4 ($5).'],
  [/^(.+?): the rent of (.+?) for (\S+) is unpaid\. Please pay by (\S+)\. Reminder letter (\d) \((\S+)\) is on the lease\.$/, '$1: sewa $2 bagi $3 belum dibayar. Sila bayar sebelum $4. Surat peringatan $5 ($6) ada pada sewaan.'],
  [/^(\S+): the rent for (\S+) \((.+?)\) is yours to follow up\.$/, '$1: sewa bagi $2 ($3) kini di bawah tindakan susulan anda.'],
  [/^(\S+): rent for (\S+) is still unpaid; send reminder (\d) \(was due (\S+)\)\.$/, '$1: sewa bagi $2 masih belum dibayar; hantar peringatan $3 (perlu dibuat pada $4).'],
  [/^(\S+): rent for (\S+) is still unpaid; hand it to Legal \(was due (\S+)\)\.$/, '$1: sewa bagi $2 masih belum dibayar; serahkan kepada Legal (perlu dibuat pada $3).'],
  [/^(\S+): (.+?), rent for (\S+) \((.+?)\) is unpaid after three reminders\. (.*)$/, '$1: $2, sewa bagi $3 ($4) belum dibayar selepas tiga peringatan. $5'],

  // Asset partnerships
  [/^Asset partnership rejected by (Legal|Shariah)$/, 'Perkongsian aset ditolak oleh $1'],
  [/^(.+?) for (.+?): the other side proposed new terms\.$/, '$1 untuk $2: pihak satu lagi mencadangkan terma baharu.'],
  [/^(.+?) for (.+?): (.+) The (asset owner|delivery partner) makes a counter-offer with the corrected terms; once accepted, it is reviewed again\.$/, (m) => `${m[1]} untuk ${m[2]}: ${m[3]} ${PARTY_MS[m[4]]} membuat tawaran balas dengan terma yang dibetulkan; setelah diterima, ia disemak semula.`],
  [/^(.+?) for (.+?): (Ijarah|Musharakah) from (\S+) to (\S+) \((\S+)\)\.$/, '$1 untuk $2: $3 dari $4 hingga $5 ($6).'],
  [/^(.+?) for (.+?) \((\S+)\)\.$/, '$1 untuk $2 ($3).'],
  [/^(.+?) for (.+?) now awaits the (Shariah|Legal) approval\.$/, '$1 untuk $2 kini menunggu kelulusan $3.'],
  [/^(.+?) needs this type of asset \((.+?)\)\. (.+?) is not verified yet: (.+?)\. Only verified assets can be offered, so act soon\.$/, '$1 memerlukan jenis aset ini ($2). $3 belum disahkan: $4. Hanya aset yang disahkan boleh ditawarkan, jadi segera ambil tindakan.'],
  [/^A project needs this type of asset\. (.+?) is waiting for verification; verifying it soon lets its owner offer it\.$/, 'Sebuah projek memerlukan jenis aset ini. $1 sedang menunggu pengesahan; mengesahkannya segera membolehkan pemiliknya menawarkannya.'],

  // Agreements
  [/^Agreement for (.+?): please review$/, 'Perjanjian untuk $1: sila semak'],
  [/^Agreement for (legal|Shariah) review$/, (m) => `Perjanjian untuk semakan ${AGREEMENT_STEP_MS[m[1]]}`],
  [/^(\S+) \((.+?), version (\d+)\) is waiting for your (legal|Shariah) review\.$/, (m) => `${m[1]} (${m[2]}, versi ${m[3]}) sedang menunggu semakan ${AGREEMENT_STEP_MS[m[4]]} anda.`],
  [/^The (asset owner|delivery partner) revised the agreement to version (\d+) for (.+?) in (.+?) \((\S+)\)\. Read it and agree, or draft a revision\.$/, (m) => `${PARTY_MS[m[1]]} telah menyemak semula perjanjian kepada versi ${m[2]} untuk ${m[3]} dalam ${m[4]} (${m[5]}). Bacanya dan nyatakan persetujuan, atau sediakan semakan semula.`],
  [/^The (asset owner|delivery partner) drafted the agreement for (.+?) in (.+?) \((\S+)\)\. Read it and agree, or draft a revision\.$/, (m) => `${PARTY_MS[m[1]]} telah menyediakan perjanjian untuk ${m[2]} dalam ${m[3]} (${m[4]}). Bacanya dan nyatakan persetujuan, atau sediakan semakan semula.`],
  [/^(\S+): (.+?)\. Either side drafts a revision, then both agree again\.$/, '$1: $2. Mana-mana pihak menyediakan semakan semula, kemudian kedua-duanya bersetuju sekali lagi.'],
  [/^Your code to sign (\S+)$/, 'Kod anda untuk menandatangani $1'],
  [/^Your code to sign (\S+) \(version (\d+)\) is (\d+)\. It expires in (\d+) minutes\. If you did not ask for it, do not share it and tell the platform\.$/, 'Kod anda untuk menandatangani $1 (versi $2) ialah $3. Kod ini tamat dalam $4 minit. Jika anda tidak memintanya, jangan kongsikan dan maklumkan kepada platform.'],

  // Estate
  [/^A death has been reported for (.+?) \(case (\S+)\)\. Check the death certificate and verify or reject the report\.$/, 'Kematian telah dilaporkan bagi $1 (kes $2). Semak sijil kematian dan sahkan atau tolak laporan ini.'],
  [/^Case (\S+): a settlement plan is waiting for a second officer's approval\.$/, 'Kes $1: pelan penyelesaian sedang menunggu kelulusan pegawai kedua.'],
  [/^(.+?) in (.+?) has passed to you from an estate \(case (\S+)\)\. It now shows in your Investments under the same akad terms\.$/, '$1 dalam $2 telah dipindahkan kepada anda daripada pusaka (kes $3). Ia kini dipaparkan dalam Pelaburan anda dengan terma akad yang sama.'],
  [/^(.+?) offers you a hibah$/, '$1 menawarkan hibah kepada anda'],
  [/^(.+?) has made you a hibah \(gift\) of part of their investments on Wealth Pooling, to pass to you as set out in their estate instructions\. To accept or decline it \(qabul\), open (\S+) before (\S+)\. You will need the last four characters of your ID number\. If you did not expect this, ignore it\.$/, '$1 telah memberi anda hibah sebahagian pelaburannya di Wealth Pooling, untuk diserahkan kepada anda seperti dalam arahan pusakanya. Untuk menerima atau menolaknya (qabul), buka $2 sebelum $3. Anda memerlukan empat aksara terakhir nombor pengenalan anda. Jika anda tidak menjangkakan ini, abaikan sahaja.'],
  [/^we could not accept the death report you sent: (.+)\. You may send a new report with a clearer death certificate\.$/, 'kami tidak dapat menerima laporan kematian yang anda hantar: $1. Anda boleh menghantar laporan baharu dengan sijil kematian yang lebih jelas.'],

  // Tranches
  [/^(.+?) asks for (.+?) for "(.+?)"\.$/, '$1 memohon $2 untuk "$3".'],
  [/^(.+?) for "(.+?)" was approved and waits for release\.$/, '$1 untuk "$2" telah diluluskan dan menunggu pelepasan.'],
  [/^The release of (.+?) for "(.+?)" was rejected: (.+?)\. Fix it and ask again\.$/, 'Pelepasan $1 untuk "$2" ditolak: $3. Betulkan dan mohon semula.'],
  [/^(.+?) for "(.+?)" was released to the project\.$/, '$1 untuk "$2" telah dilepaskan kepada projek.'],

  // Pools and investments
  [/^Finance sent back (.+?) for order (\S+) \(bank reference (.+?)\), because (.+?) did not reach its minimum\.$/, 'Kewangan telah memulangkan $1 bagi pesanan $2 (rujukan bank $3), kerana $4 tidak mencapai jumlah minimum.'],
  [/^(.+?) raised (.+?), below its minimum of (.+?), so it will not go ahead\. Finance will return your money in full to your bank account; you will be told when it is sent\.$/, '$1 mengumpul $2, di bawah minimum $3, jadi ia tidak akan diteruskan. Kewangan akan memulangkan wang anda sepenuhnya ke akaun bank anda; anda akan dimaklumkan apabila ia dihantar.'],
  [/^(.+?) missed its minimum \((.+?) of (.+?)\)\. Return each investor's money and record the bank reference under Refunds \(Admin Center › Settlement Clearing, or Financials › Profit distribution\)\.$/, '$1 tidak mencapai minimum ($2 daripada $3). Pulangkan wang setiap pelabur dan rekod rujukan bank di bawah Refunds (Admin Center › Settlement Clearing, atau Financials › Profit distribution).'],
  [/^(.+?) raised (.+?), below its minimum of (.+?)\. Investors are being refunded\.$/, '$1 mengumpul $2, di bawah minimum $3. Wang pelabur sedang dipulangkan.'],
  [/^(.+?) reached its closing date with (.+?) raised and no longer takes investment\.$/, '$1 mencapai tarikh tutup dengan $2 terkumpul dan tidak lagi menerima pelaburan.'],
  [/^(.+?) closed before your transfer was confirmed, so your order was cancelled\. Do not transfer for it; if you already did, contact support for a refund\.$/, '$1 ditutup sebelum pindahan anda disahkan, jadi pesanan anda dibatalkan. Jangan buat pindahan untuknya; jika sudah, hubungi khidmat pelanggan untuk bayaran balik.'],
  [/^(.+?) for (.+?) needs its Shariah, compliance, risk and authorised sign-offs before it can open\.$/, '$1 untuk $2 memerlukan kelulusan Shariah, pematuhan, risiko dan pihak berkuasa sebelum boleh dibuka.'],

  // Delivery partners and reports
  [/^(.+?) \((\S+)\) sent the information you asked for\.$/, '$1 ($2) telah menghantar maklumat yang anda minta.'],
  [/^(.+?) \((\S+)\) applied to become a project delivery partner\.$/, '$1 ($2) memohon untuk menjadi rakan pelaksana projek.'],
  [/^(.+?): (.+) Open the Sponsor Portal to correct the application and submit it again\.$/, '$1: $2 Buka Sponsor Portal untuk membetulkan permohonan dan menghantarnya semula.'],
  [/^(.+?): the Q(\d) (\d{4}) performance report is waiting for an auditor\.$/, '$1: laporan prestasi S$2 $3 sedang menunggu juruaudit.'],
  [/^(.+?): the (.+?) report is verified and now visible to investors\.$/, '$1: laporan $2 telah disahkan dan kini boleh dilihat oleh pelabur.'],
  [/^(.+?): the auditor returned the (.+?) report: (.*)$/, '$1: juruaudit mengembalikan laporan $2: $3'],
  [/^(.+?): the verified (.+?) performance report is in Investments\.$/, '$1: laporan prestasi $2 yang disahkan ada dalam Pelaburan.'],

  // AI
  [/^Your AI request was interrupted before it answered\. Your (\d+) credits were returned\. Please try again\.$/, 'Permintaan AI anda terganggu sebelum sempat dijawab. $1 kredit anda telah dikembalikan. Sila cuba lagi.'],
];
