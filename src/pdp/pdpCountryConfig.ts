import { PDPCountryConfig } from './pdpTypes';

export const INITIAL_PDP_COUNTRY_CONFIGS: Record<string, PDPCountryConfig> = {
  MYS: {
    countryCode: 'MYS',
    countryName: 'Malaysia',
    flagUrl: 'https://flagcdn.com/w80/my.png',
    primaryCurrency: 'MYR',
    supportedCurrencies: ['MYR', 'USD', 'EUR'],
    supportedLanguages: ['English', 'Bahasa Melayu'],
    enabledPdpTypes: ['Company', 'Organisation', 'Institution', 'Individual'],
    regulatoryAuthority: 'Bank Negara Malaysia (BNM) / Securities Commission Malaysia (SCM)',
    approvalWorkflow: 'Dual-Key (Compliance + Country Admin)',
    defaultSettlementMethod: 'Corporate FPX',
    isEnabled: true,
    requiredDocuments: [
      {
        docType: 'SSM_CORP_CERT',
        label: 'SSM Certificate of Incorporation / Section 14 & 17',
        description: 'Official Companies Commission of Malaysia (SSM) registration certificate.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'AUTH_BOARD_RES',
        label: 'Board Resolution for Authorised Representative',
        description: 'Certified extract of Board Resolution authorizing the PDP platform representative.',
        applicableTypes: ['Company', 'Organisation', 'Institution'],
        mandatory: true
      },
      {
        docType: 'REP_MYKAD_PASSPORT',
        label: 'Representative MyKad or Valid Passport',
        description: 'Color scan of Malaysian MyKad or international passport of the signatory.',
        applicableTypes: ['Individual', 'Company', 'Organisation', 'Institution'],
        mandatory: true
      },
      {
        docType: 'UBO_PASSPORT_ID',
        label: 'Beneficial Owner (UBO >25%) Identification',
        description: 'Identity documents for all ultimate individual beneficial owners.',
        applicableTypes: ['Company', 'Organisation', 'Institution'],
        mandatory: true
      },
      {
        docType: 'BANK_CONFIRM_STATEMENT',
        label: 'Bank Account Confirmation Letter / Statement',
        description: 'Recent corporate bank statement or bank attestation letter within 3 months.',
        applicableTypes: ['Individual', 'Company', 'Organisation', 'Institution'],
        mandatory: true
      },
      {
        docType: 'SHARIAH_COMPLIANCE_CERT',
        label: 'Shariah Advisory Attestation / Charter (Optional)',
        description: 'Internal Shariah governance policy or advisory sign-off if available.',
        applicableTypes: ['Company', 'Organisation', 'Institution'],
        mandatory: false
      }
    ]
  },
  IDN: {
    countryCode: 'IDN',
    countryName: 'Indonesia',
    flagUrl: 'https://flagcdn.com/w80/id.png',
    primaryCurrency: 'IDR',
    supportedCurrencies: ['IDR', 'USD', 'MYR'],
    supportedLanguages: ['Bahasa Indonesia', 'English'],
    enabledPdpTypes: ['Company', 'Organisation', 'Institution'],
    regulatoryAuthority: 'Otoritas Jasa Keuangan (OJK) / Bank Indonesia / DSN-MUI',
    approvalWorkflow: 'Dual-Key (Compliance + Country Admin)',
    defaultSettlementMethod: 'RTGS / Central Wire',
    isEnabled: true,
    requiredDocuments: [
      {
        docType: 'AKTA_PENDIRIAN',
        label: 'Akta Pendirian PT & SK Kemenkumham',
        description: 'Deed of Establishment approved by Ministry of Law and Human Rights.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'NIB_OSS',
        label: 'Nomor Induk Berusaha (NIB) / Izin Usaha',
        description: 'Single Business Identification Number from Online Single Submission (OSS).',
        applicableTypes: ['Company', 'Organisation', 'Institution'],
        mandatory: true
      },
      {
        docType: 'REP_KTP_PASSPORT',
        label: 'KTP Direktur / Passport Signatory',
        description: 'Identity card of the Director / Authorized Representative.',
        applicableTypes: ['Company', 'Organisation', 'Institution'],
        mandatory: true
      },
      {
        docType: 'NPWP_BADAN',
        label: 'NPWP Badan Usaha (Tax Card)',
        description: 'Corporate Tax Identification Number document from Direktorat Jenderal Pajak.',
        applicableTypes: ['Company', 'Organisation', 'Institution'],
        mandatory: true
      },
      {
        docType: 'BANK_CONFIRM_STATEMENT',
        label: 'Rekening Koran Bank Perusahaan',
        description: 'Corporate bank statement within the last 90 days.',
        applicableTypes: ['Company', 'Organisation', 'Institution'],
        mandatory: true
      }
    ]
  },
  TUR: {
    countryCode: 'TUR',
    countryName: 'Türkiye',
    flagUrl: 'https://flagcdn.com/w80/tr.png',
    primaryCurrency: 'TRY',
    supportedCurrencies: ['TRY', 'USD', 'EUR'],
    supportedLanguages: ['Turkish', 'English'],
    enabledPdpTypes: ['Company', 'Institution', 'Organisation'],
    regulatoryAuthority: 'Banking Regulation and Supervision Agency (BDDK) / CMB',
    approvalWorkflow: 'Dual-Key (Compliance + Country Admin)',
    defaultSettlementMethod: 'RTGS / Central Wire',
    isEnabled: true,
    requiredDocuments: [
      {
        docType: 'TICARET_SICIL',
        label: 'Ticaret Sicil Gazetesi (Trade Registry Gazette)',
        description: 'Official Trade Registry Gazette record of company registration.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'FAALIYET_BELGESI',
        label: 'Faaliyet Belgesi (Chamber of Commerce Activity Certificate)',
        description: 'Certificate of ongoing activity from the Istanbul / Regional Chamber of Commerce.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'IMZA_SIRKULERI',
        label: 'İmza Sirküleri (Signature Circular)',
        description: 'Notarized Signature Circular for authorized company executives.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'VERGI_LEVHASI',
        label: 'Vergi Levhası (Tax Plate)',
        description: 'Current year official Turkish Tax Plate registration.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'BANK_CONFIRM_STATEMENT',
        label: 'Banka Hesap Cüzdanı / Ekstresi',
        description: 'Official bank account verification letter or recent statement.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      }
    ]
  },
  NGA: {
    countryCode: 'NGA',
    countryName: 'Nigeria',
    flagUrl: 'https://flagcdn.com/w80/ng.png',
    primaryCurrency: 'NGN',
    supportedCurrencies: ['NGN', 'USD'],
    supportedLanguages: ['English', 'Hausa', 'Yoruba'],
    enabledPdpTypes: ['Company', 'Organisation', 'Institution'],
    regulatoryAuthority: 'Central Bank of Nigeria (CBN) / Securities and Exchange Commission (SEC)',
    approvalWorkflow: 'Dual-Key (Compliance + Country Admin)',
    defaultSettlementMethod: 'RTGS / Central Wire',
    isEnabled: true,
    requiredDocuments: [
      {
        docType: 'CAC_CERT',
        label: 'Corporate Affairs Commission (CAC) Certificate',
        description: 'Certificate of Incorporation issued by CAC Nigeria.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'MEMART',
        label: 'CAC Form 1.1 / Memorandum & Articles of Association',
        description: 'Certified True Copy of MEMART with share capital distribution.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'NIN_BVN_PASSPORT',
        label: 'Director National ID / International Passport & BVN',
        description: 'Government issued photo ID with verified BVN details.',
        applicableTypes: ['Company', 'Organisation', 'Institution'],
        mandatory: true
      },
      {
        docType: 'FIRS_TIN',
        label: 'Federal Inland Revenue Service (FIRS) TIN Certificate',
        description: 'Official corporate tax clearance / TIN certificate.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'BANK_CONFIRM_STATEMENT',
        label: 'Corporate Bank Reference Letter / Statement',
        description: 'Bank confirmation letter from a CBN-licensed commercial bank.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      }
    ]
  },
  EGY: {
    countryCode: 'EGY',
    countryName: 'Egypt',
    flagUrl: 'https://flagcdn.com/w80/eg.png',
    primaryCurrency: 'EGP',
    supportedCurrencies: ['EGP', 'USD', 'EUR'],
    supportedLanguages: ['Arabic', 'English'],
    enabledPdpTypes: ['Company', 'Organisation', 'Institution'],
    regulatoryAuthority: 'Financial Regulatory Authority (FRA) / Central Bank of Egypt (CBE)',
    approvalWorkflow: 'Dual-Key (Compliance + Country Admin)',
    defaultSettlementMethod: 'RTGS / Central Wire',
    isEnabled: true,
    requiredDocuments: [
      {
        docType: 'COMMERCIAL_REGISTRY_EG',
        label: 'Commercial Register Extract (السجل التجاري)',
        description: 'Recent certified copy from Egyptian Commercial Registry Office.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'TAX_CARD_EG',
        label: 'Corporate Tax Card (البطاقة الضريبية)',
        description: 'Official Tax Card issued by the Egyptian Tax Authority.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'NATIONAL_ID_REP_EG',
        label: 'Egyptian National ID / Passport of Representative',
        description: 'Color copy of National ID card for authorized signatory.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'BANK_CONFIRM_STATEMENT',
        label: 'Official Bank Attestation Letter',
        description: 'Corporate bank account confirmation from an Egyptian bank.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      }
    ]
  },
  PAK: {
    countryCode: 'PAK',
    countryName: 'Pakistan',
    flagUrl: 'https://flagcdn.com/w80/pk.png',
    primaryCurrency: 'PKR',
    supportedCurrencies: ['PKR', 'USD'],
    supportedLanguages: ['English', 'Urdu'],
    enabledPdpTypes: ['Company', 'Organisation', 'Institution'],
    regulatoryAuthority: 'State Bank of Pakistan (SBP) / SECP',
    approvalWorkflow: 'Dual-Key (Compliance + Country Admin)',
    defaultSettlementMethod: 'RTGS / Central Wire',
    isEnabled: true,
    requiredDocuments: [
      {
        docType: 'SECP_CERT',
        label: 'SECP Certificate of Incorporation',
        description: 'Securities and Exchange Commission of Pakistan registration certificate.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'FBR_NTN',
        label: 'Federal Board of Revenue (FBR) NTN Certificate',
        description: 'National Tax Number certificate for corporate entity.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'CNIC_REP_PAK',
        label: 'Representative Computerized National Identity Card (CNIC)',
        description: 'Valid NADRA CNIC or NICOP of the authorized director.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'BANK_CONFIRM_STATEMENT',
        label: 'Bank Account Maintenance Certificate (AMC)',
        description: 'Original bank maintenance certificate issued by Pakistani commercial bank.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      }
    ]
  },
  BGD: {
    countryCode: 'BGD',
    countryName: 'Bangladesh',
    flagUrl: 'https://flagcdn.com/w80/bd.png',
    primaryCurrency: 'BDT',
    supportedCurrencies: ['BDT', 'USD'],
    supportedLanguages: ['Bengali', 'English'],
    enabledPdpTypes: ['Company', 'Organisation', 'Institution'],
    regulatoryAuthority: 'Bangladesh Bank / Bangladesh Securities & Exchange Commission (BSEC)',
    approvalWorkflow: 'Dual-Key (Compliance + Country Admin)',
    defaultSettlementMethod: 'RTGS / Central Wire',
    isEnabled: true,
    requiredDocuments: [
      {
        docType: 'RJSC_CERT',
        label: 'RJSC Certificate of Incorporation',
        description: 'Registrar of Joint Stock Companies and Firms certificate.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'TRADE_LICENSE_BD',
        label: 'Valid Municipal Trade License',
        description: 'Current fiscal year city corporation trade license.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'E_TIN_BIN',
        label: 'e-TIN & Business Identification Number (BIN)',
        description: 'National Board of Revenue tax and VAT registration certificates.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'NID_REP_BD',
        label: 'Representative Smart National ID (NID)',
        description: 'Smart NID card of authorized managing director.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'BANK_CONFIRM_STATEMENT',
        label: 'Bank Solvency Certificate',
        description: 'Official bank solvency certificate issued by scheduled bank.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      }
    ]
  },
  IRN: {
    countryCode: 'IRN',
    countryName: 'Iran',
    flagUrl: 'https://flagcdn.com/w80/ir.png',
    primaryCurrency: 'IRR',
    supportedCurrencies: ['IRR', 'USD', 'EUR'],
    supportedLanguages: ['Persian', 'English'],
    enabledPdpTypes: ['Company', 'Organisation', 'Institution'],
    regulatoryAuthority: 'Central Bank of Iran (CBI) / Securities and Exchange Organization (SEO)',
    approvalWorkflow: 'Dual-Key (Compliance + Country Admin)',
    defaultSettlementMethod: 'D-8 Cross-Border Clearing',
    isEnabled: true,
    requiredDocuments: [
      {
        docType: 'CORP_REG_IRN',
        label: 'Official Company Registration Certificate (ثبت شرکت)',
        description: 'Companies Registration General Office certificate.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'OFFICIAL_GAZETTE_IRN',
        label: 'Official Gazette Notice (روزنامه رسمی)',
        description: 'Latest publication of board of directors and authorized signatories.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'NATIONAL_CODE_REP_IRN',
        label: 'Representative National ID Card (کارت ملی)',
        description: 'National smart identity card of the CEO/Director.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      },
      {
        docType: 'BANK_CONFIRM_STATEMENT',
        label: 'Bank Account Verification Letter',
        description: 'Attestation from an authorized banking institution.',
        applicableTypes: ['Company', 'Institution'],
        mandatory: true
      }
    ]
  }
};
