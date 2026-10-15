/**
 * Privacy notice under the Personal Data Protection Act 2010 (Malaysia). Section 7(3) requires
 * it in both Malay and English. DRAFT: to be reviewed by the legal adviser before real users
 * are onboarded; text in [brackets] must be filled in.
 *
 * The version must match PRIVACY_NOTICE_VERSION in server/src/users/privacy-notice.ts. Changing
 * the text means a new version, and every user is asked to accept it again.
 */
export const PRIVACY_NOTICE_VERSION = 'MYS-2026-10-DRAFT-1';

export interface NoticeSection {
  title: string;
  body: string[];
}

export const PRIVACY_NOTICE: Record<'ms' | 'en', { heading: string; draftLabel: string; sections: NoticeSection[] }> = {
  ms: {
    heading: 'Notis Privasi (Akta Perlindungan Data Peribadi 2010)',
    draftLabel: 'DERAF untuk semakan undang-undang',
    sections: [
      { title: '1. Siapa kami', body: ['Platform D-8 Wealth Pooling dikendalikan oleh [nama syarikat pengendali dan nombor pendaftaran SSM], [alamat]. Kami ialah pengguna data bagi data peribadi anda.'] },
      { title: '2. Data yang kami kumpul', body: [
        'Maklumat akaun: nama, e-mel, nombor telefon, organisasi dan negara.',
        'Pengesahan identiti (KYC): nombor dan salinan kad pengenalan atau pasport, tarikh lahir, alamat, gambar wajah dan rakaman liveness.',
        'Maklumat kewangan: akaun bank untuk bayaran, pelaburan, agihan keuntungan, zakat dan cukai.',
        'Arahan pusaka (jika anda menggunakannya): benefisiari, hibah, wasiat dan waris faraid.',
        'Rekod penggunaan: log masuk, alamat IP dan jejak audit.',
      ] },
      { title: '3. Data sensitif', body: ['Data biometrik (gambar wajah dan liveness) dan maklumat berkaitan agama (contohnya faraid dan zakat) ialah data peribadi sensitif. Kami memprosesnya hanya dengan persetujuan nyata anda, untuk tujuan yang dinyatakan di bawah.'] },
      { title: '4. Tujuan', body: [
        'Membuka dan mengurus akaun anda.',
        'Mengesahkan identiti serta mematuhi undang-undang pencegahan pengubahan wang haram (AMLA) dan peraturan pengawal selia.',
        'Memproses pelaburan, bayaran, agihan keuntungan, zakat dan cukai.',
        'Semakan Shariah, undang-undang dan audit.',
        'Menghubungi anda tentang akaun, transaksi dan perubahan perkhidmatan.',
      ] },
      { title: '5. Kepada siapa data dizahirkan', body: ['Penyedia pengesahan identiti, bank dan penyedia pembayaran, pihak berkuasa zakat, penasihat Shariah, juruaudit, pengawal selia dan pihak berkuasa undang-undang apabila dikehendaki, serta penyedia hosting dan e-mel yang memproses data bagi pihak kami.'] },
      { title: '6. Pemindahan ke luar Malaysia', body: ['Data anda mungkin disimpan atau diproses di luar Malaysia, termasuk [lokasi pusat data, contohnya Singapura], dengan perlindungan yang setara dengan PDPA.'] },
      { title: '7. Wajib atau sukarela', body: ['Maklumat akaun dan KYC adalah wajib untuk melabur atau menerima bayaran. Tanpanya, kami tidak dapat membuka akaun pelaburan atau memproses transaksi anda. Arahan pusaka adalah sukarela.'] },
      { title: '8. Tempoh simpanan', body: ['Rekod kewangan dan KYC disimpan selama tempoh yang dikehendaki undang-undang (sekurang-kurangnya [6] tahun selepas akaun ditutup). Data lain dipadam atau dianonimkan apabila tidak diperlukan lagi.'] },
      { title: '9. Hak anda', body: ['Anda boleh meminta akses kepada data anda, membetulkannya, menarik balik persetujuan atau mengehadkan pemprosesan dengan menghubungi kami. Menarik balik persetujuan mungkin bermakna kami tidak dapat meneruskan perkhidmatan pelaburan.'] },
      { title: '10. Hubungi kami', body: ['[Pegawai Perlindungan Data], [e-mel], [telefon], [alamat].'] },
    ],
  },
  en: {
    heading: 'Privacy Notice (Personal Data Protection Act 2010)',
    draftLabel: 'DRAFT for legal review',
    sections: [
      { title: '1. Who we are', body: ['The D-8 Wealth Pooling platform is operated by [operator company name and SSM registration number], [address]. We are the data user for your personal data.'] },
      { title: '2. Data we collect', body: [
        'Account details: name, email, phone number, organisation and country.',
        'Identity verification (KYC): ID card or passport number and copy, date of birth, address, face photo and liveness recording.',
        'Financial details: bank accounts for payouts, investments, profit distributions, zakat and tax.',
        'Estate instructions (if you use them): beneficiaries, hibah, wasiyyah and faraid heirs.',
        'Usage records: sign-ins, IP address and audit trail.',
      ] },
      { title: '3. Sensitive data', body: ['Biometric data (face photo and liveness) and religion-related information (for example faraid and zakat) are sensitive personal data. We process them only with your explicit consent, for the purposes below.'] },
      { title: '4. Purposes', body: [
        'Opening and managing your account.',
        'Verifying your identity and complying with anti-money-laundering law (AMLA) and regulators\' rules.',
        'Processing investments, payments, profit distributions, zakat and tax.',
        'Shariah, legal and audit review.',
        'Contacting you about your account, transactions and changes to the service.',
      ] },
      { title: '5. Who we disclose data to', body: ['Identity verification providers, banks and payment providers, zakat authorities, Shariah advisers, auditors, regulators and law enforcement when required, and the hosting and email providers that process data on our behalf.'] },
      { title: '6. Transfers outside Malaysia', body: ['Your data may be stored or processed outside Malaysia, including in [data centre location, e.g. Singapore], with protection equivalent to the PDPA.'] },
      { title: '7. Obligatory or voluntary', body: ['Account and KYC details are obligatory to invest or receive payments. Without them we cannot open an investment account or process your transactions. Estate instructions are voluntary.'] },
      { title: '8. Retention', body: ['Financial and KYC records are kept for as long as the law requires (at least [6] years after the account is closed). Other data is deleted or anonymised when no longer needed.'] },
      { title: '9. Your rights', body: ['You may ask to access or correct your data, withdraw consent or limit processing by contacting us. Withdrawing consent may mean we cannot continue the investment service.'] },
      { title: '10. Contact us', body: ['[Data Protection Officer], [email], [phone], [address].'] },
    ],
  },
};
