import { PDPApplication } from './pdpTypes';

export const INITIAL_PDP_APPLICATIONS: PDPApplication[] = [
  {
    id: 'PDP-APP-001',
    applicationNumber: 'PDP-APP-2026-001',
    userId: 'USR-8821',
    userEmail: 'azman.sponsor@my-d8.org',
    userMobile: '+60 12 345 6789',
    countryCode: 'MYS',
    countryName: 'Malaysia',
    preferredLanguage: 'English',
    pdpType: 'Company',
    organisationName: 'FELDA Technoplant Sdn Bhd',
    tradingName: 'FELDA Agri-Infrastructure Solutions',
    registrationNumber: 'MY-SSM-197701004523',
    countryOfRegistration: 'Malaysia',
    registeredAddress: 'Tingkat 12, Balai FELDA, Jalan Gurney Satu, 54000 Kuala Lumpur, Malaysia',
    businessAddress: 'Kompleks Pertanian Lestari FELDA, 26000 Kuantan, Pahang',
    contactPhone: '+60 3 2698 7777',
    website: 'https://www.feldatechnoplant.com.my',
    businessCategory: 'Agri-Industrial & Clean Tech Infrastructure',
    dateOfIncorporation: '1977-08-15',
    taxIdentificationNumber: 'MY-TIN-C8819201948',
    representative: {
      id: 'REP-01',
      fullName: 'Tan Sri Azman Hashim',
      nationality: 'Malaysian',
      idPassportNumber: '680412-10-5593',
      position: 'Executive Chairman & Authorised Signatory',
      email: 'azman.sponsor@my-d8.org',
      mobile: '+60 12 345 6789',
      supportingDocName: 'Board_Resolution_Authorisation_Azman.pdf',
      supportingDocUrl: 'https://example.com/docs/board_res_01.pdf'
    },
    beneficialOwners: [
      {
        id: 'UBO-01',
        fullName: 'Federal Land Development Authority (FELDA)',
        nationality: 'Malaysian Statutory Body',
        idNumber: 'MY-GOV-FELDA-1956',
        ownershipPercentage: 70.0,
        isDirector: true,
        isAuthorisedSignatory: true,
        pepStatus: false
      },
      {
        id: 'UBO-02',
        fullName: 'Koperasi Permodalan FELDA Malaysia Berhad',
        nationality: 'Malaysian Cooperative',
        idNumber: 'MY-SKM-KPF-1980',
        ownershipPercentage: 30.0,
        isDirector: true,
        isAuthorisedSignatory: false,
        pepStatus: false
      }
    ],
    kybStatus: 'VERIFIED',
    documents: [
      {
        id: 'DOC-MYS-01',
        documentType: 'SSM_CORP_CERT',
        title: 'SSM_Certificate_Incorporation_FELDA_Technoplant.pdf',
        fileSize: '3.4 MB',
        uploadedAt: '2026-07-15 10:30',
        fileUrl: 'https://example.com/docs/ssm_cert.pdf',
        status: 'VERIFIED',
        required: true
      },
      {
        id: 'DOC-MYS-02',
        documentType: 'AUTH_BOARD_RES',
        title: 'Certified_Board_Resolution_D8_Platform.pdf',
        fileSize: '1.8 MB',
        uploadedAt: '2026-07-15 10:35',
        fileUrl: 'https://example.com/docs/board_res.pdf',
        status: 'VERIFIED',
        required: true
      },
      {
        id: 'DOC-MYS-03',
        documentType: 'REP_MYKAD_PASSPORT',
        title: 'MyKad_Copy_Tan_Sri_Azman_Hashim.pdf',
        fileSize: '1.2 MB',
        uploadedAt: '2026-07-15 10:40',
        fileUrl: 'https://example.com/docs/mykad_azman.pdf',
        status: 'VERIFIED',
        required: true
      },
      {
        id: 'DOC-MYS-04',
        documentType: 'BANK_CONFIRM_STATEMENT',
        title: 'Maybank_Islamic_Corporate_AMC_Statement.pdf',
        fileSize: '2.1 MB',
        uploadedAt: '2026-07-15 10:45',
        fileUrl: 'https://example.com/docs/bank_statement.pdf',
        status: 'VERIFIED',
        required: true
      }
    ],
    bankInfo: {
      bankName: 'Maybank Islamic Berhad',
      accountHolderName: 'FELDA TECHNOPLANT SDN BHD',
      accountNumber: '••••-••••-8819',
      rawAccountNumber: '564128998819',
      swiftBicCode: 'MBBEMYKLXXX',
      currency: 'MYR',
      country: 'Malaysia',
      settlementMethod: 'Corporate FPX'
    },
    compliance: {
      amlCftDeclaration: true,
      sourceOfFundsDeclaration: true,
      beneficialOwnershipAccurate: true,
      sanctionsNonMatchDeclared: true,
      regulatoryComplianceAgreed: true,
      shariahComplianceAttested: true,
      termsAndConditionsAccepted: true,
      privacyConsentGranted: true,
      declaredAt: '2026-07-15 11:00',
      declaredByIp: '175.139.221.45'
    },
    status: 'ACTIVE',
    statusHistory: [
      {
        id: 'HIST-01',
        timestamp: '2026-07-15 11:00',
        previousStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        changedByUserId: 'USR-8821',
        changedByRole: 'Project Sponsor',
        reason: 'Initial application submission with SSM and Bank docs'
      },
      {
        id: 'HIST-02',
        timestamp: '2026-07-16 09:30',
        previousStatus: 'SUBMITTED',
        newStatus: 'UNDER_REVIEW',
        changedByUserId: 'COMP-MY-01',
        changedByRole: 'Compliance Officer',
        reason: 'Compliance review started; sanctions and PEP check cleared'
      },
      {
        id: 'HIST-03',
        timestamp: '2026-07-17 14:00',
        previousStatus: 'UNDER_REVIEW',
        newStatus: 'APPROVED',
        changedByUserId: 'ADMIN-MY-01',
        changedByRole: 'Country Admin',
        reason: 'Dual-key approval completed by Country Admin (Malaysia)'
      },
      {
        id: 'HIST-04',
        timestamp: '2026-07-17 14:05',
        previousStatus: 'APPROVED',
        newStatus: 'ACTIVE',
        changedByUserId: 'SYS-ORCHESTRATOR',
        changedByRole: 'System Administrator',
        reason: 'Automated node activation and smart contract wallet provisioned'
      }
    ],
    reviewerComments: 'Verified statutory entity. AAOIFI Shariah governance structure certified for palm agritech pools.',
    activePoolsCount: 3,
    totalRaisedMYR: 12500000,
    totalDistributedMYR: 850000,
    pendingSettlementMYR: 420000,
    createdAt: '2026-07-15 09:00',
    updatedAt: '2026-08-01 10:00',
    submittedAt: '2026-07-15 11:00',
    approvedAt: '2026-07-17 14:00',
    activatedAt: '2026-07-17 14:05'
  },
  {
    id: 'PDP-APP-002',
    applicationNumber: 'PDP-APP-2026-002',
    userId: 'USR-7734',
    userEmail: 'ahmet.kaya@bosphoruslogistics.tr',
    userMobile: '+90 532 884 9201',
    countryCode: 'TUR',
    countryName: 'Türkiye',
    preferredLanguage: 'Turkish',
    pdpType: 'Company',
    organisationName: 'Bosphorus Cold Chain Logistics A.Ş.',
    tradingName: 'Bosphorus Port Cargo Terminal & Logistics',
    registrationNumber: 'TR-IST-88492011',
    countryOfRegistration: 'Türkiye',
    registeredAddress: 'Levent Mah. Cömert Sok. No: 14/A, Beşiktaş, 34330 İstanbul, Türkiye',
    businessAddress: 'Ambarlı Liman Kompleksi No: 88, Beylikdüzü, İstanbul',
    contactPhone: '+90 212 444 8899',
    website: 'https://www.bosphoruslogistics.com.tr',
    businessCategory: 'Maritime Freight & Cold Storage Logistics',
    dateOfIncorporation: '2012-04-20',
    taxIdentificationNumber: 'TR-VKN-1849201948',
    representative: {
      id: 'REP-02',
      fullName: 'Ahmet Yılmaz',
      nationality: 'Turkish',
      idPassportNumber: 'TR-18492049182',
      position: 'Managing Director & CEO',
      email: 'ahmet.kaya@bosphoruslogistics.tr',
      mobile: '+90 532 884 9201',
      supportingDocName: 'Notarized_Signature_Circular_Ahmet_Yilmaz.pdf',
      supportingDocUrl: 'https://example.com/docs/imza_sirkuleri.pdf'
    },
    beneficialOwners: [
      {
        id: 'UBO-03',
        fullName: 'Ahmet Yılmaz',
        nationality: 'Turkish',
        idNumber: 'TR-18492049182',
        ownershipPercentage: 85.0,
        isDirector: true,
        isAuthorisedSignatory: true,
        pepStatus: false
      },
      {
        id: 'UBO-04',
        fullName: 'Zeynep Kaya Yılmaz',
        nationality: 'Turkish',
        idNumber: 'TR-19401829401',
        ownershipPercentage: 15.0,
        isDirector: false,
        isAuthorisedSignatory: false,
        pepStatus: false
      }
    ],
    kybStatus: 'UNDER_REVIEW',
    documents: [
      {
        id: 'DOC-TUR-01',
        documentType: 'TICARET_SICIL',
        title: 'Ticaret_Sicil_Gazetesi_Bosphorus_2026.pdf',
        fileSize: '4.1 MB',
        uploadedAt: '2026-08-04 14:10',
        fileUrl: 'https://example.com/docs/ticaret_sicil.pdf',
        status: 'VERIFIED',
        required: true
      },
      {
        id: 'DOC-TUR-02',
        documentType: 'IMZA_SIRKULERI',
        title: 'Noter_Tasdikli_Imza_Sirkuleri.pdf',
        fileSize: '2.8 MB',
        uploadedAt: '2026-08-04 14:15',
        fileUrl: 'https://example.com/docs/imza.pdf',
        status: 'VERIFIED',
        required: true
      },
      {
        id: 'DOC-TUR-03',
        documentType: 'VERGI_LEVHASI',
        title: 'Vergi_Levhasi_2026_Guncel.pdf',
        fileSize: '1.1 MB',
        uploadedAt: '2026-08-04 14:20',
        fileUrl: 'https://example.com/docs/vergi.pdf',
        status: 'VERIFIED',
        required: true
      },
      {
        id: 'DOC-TUR-04',
        documentType: 'BANK_CONFIRM_STATEMENT',
        title: 'Ziraat_Katilim_Hesap_Cuzdani.pdf',
        fileSize: '1.9 MB',
        uploadedAt: '2026-08-04 14:25',
        fileUrl: 'https://example.com/docs/ziraat_bank.pdf',
        status: 'PENDING',
        required: true
      }
    ],
    bankInfo: {
      bankName: 'Ziraat Katılım Bankası A.Ş.',
      accountHolderName: 'BOSPHORUS COLD CHAIN LOGISTICS A.S.',
      accountNumber: '••••-••••-4920',
      rawAccountNumber: 'TR440001009988221100334920',
      swiftBicCode: 'ZRKATRISXXX',
      currency: 'TRY',
      country: 'Türkiye',
      settlementMethod: 'RTGS / Central Wire'
    },
    compliance: {
      amlCftDeclaration: true,
      sourceOfFundsDeclaration: true,
      beneficialOwnershipAccurate: true,
      sanctionsNonMatchDeclared: true,
      regulatoryComplianceAgreed: true,
      shariahComplianceAttested: true,
      termsAndConditionsAccepted: true,
      privacyConsentGranted: true,
      declaredAt: '2026-08-04 14:30',
      declaredByIp: '88.245.19.102'
    },
    status: 'UNDER_REVIEW',
    statusHistory: [
      {
        id: 'HIST-TUR-01',
        timestamp: '2026-08-04 14:30',
        previousStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        changedByUserId: 'USR-7734',
        changedByRole: 'Project Sponsor',
        reason: 'Submitted application for cold storage port warehouse Ijarah pool'
      },
      {
        id: 'HIST-TUR-02',
        timestamp: '2026-08-05 10:00',
        previousStatus: 'SUBMITTED',
        newStatus: 'UNDER_REVIEW',
        changedByUserId: 'COMP-TUR-01',
        changedByRole: 'Compliance Officer',
        reason: 'Verifying Ziraat Katilim banking verification letter & trade registry'
      }
    ],
    reviewerComments: 'Trade license and signature circular verified. Verifying Ziraat Katılım account confirmation.',
    activePoolsCount: 0,
    totalRaisedMYR: 0,
    totalDistributedMYR: 0,
    pendingSettlementMYR: 0,
    createdAt: '2026-08-04 12:00',
    updatedAt: '2026-08-05 10:00',
    submittedAt: '2026-08-04 14:30'
  },
  {
    id: 'PDP-APP-003',
    applicationNumber: 'PDP-APP-2026-003',
    userId: 'USR-6612',
    userEmail: 'dian.sastro@nusantaraprotein.id',
    userMobile: '+62 811 9882 109',
    countryCode: 'IDN',
    countryName: 'Indonesia',
    preferredLanguage: 'Bahasa Indonesia',
    pdpType: 'Company',
    organisationName: 'PT Nusantara Protein Halal Lestari',
    tradingName: 'Nusantara Halal Export & Agro Processing',
    registrationNumber: 'ID-AHU-0091823-AH.01.01.2019',
    countryOfRegistration: 'Indonesia',
    registeredAddress: 'Gedung Wisma Nusantara Lt. 18, Jl. M.H. Thamrin No. 59, Jakarta Pusat 10350',
    businessAddress: 'Kawasan Industri Halal Sidoarjo, Jawa Timur',
    contactPhone: '+62 21 3192 8877',
    website: 'https://www.nusantaraprotein.co.id',
    businessCategory: 'Halal Agro-Food Processing & Poultry Syndication',
    dateOfIncorporation: '2019-02-14',
    taxIdentificationNumber: 'ID-NPWP-918204918021000',
    representative: {
      id: 'REP-03',
      fullName: 'Dian Sastro Wardoyo',
      nationality: 'Indonesian',
      idPassportNumber: '3171048891020004',
      position: 'Direktur Utama (President Director)',
      email: 'dian.sastro@nusantaraprotein.id',
      mobile: '+62 811 9882 109',
      supportingDocName: 'Surat_Kuasa_Direksi_DSN_MUI.pdf',
      supportingDocUrl: 'https://example.com/docs/surat_kuasa.pdf'
    },
    beneficialOwners: [
      {
        id: 'UBO-05',
        fullName: 'Dian Sastro Wardoyo',
        nationality: 'Indonesian',
        idNumber: '3171048891020004',
        ownershipPercentage: 60.0,
        isDirector: true,
        isAuthorisedSignatory: true,
        pepStatus: false
      },
      {
        id: 'UBO-06',
        fullName: 'PT Agro Nusantara Ventura',
        nationality: 'Indonesian Corporate',
        idNumber: 'ID-AHU-0012948-2018',
        ownershipPercentage: 40.0,
        isDirector: true,
        isAuthorisedSignatory: false,
        pepStatus: false
      }
    ],
    kybStatus: 'CORRECTION_REQUIRED',
    documents: [
      {
        id: 'DOC-IDN-01',
        documentType: 'AKTA_PENDIRIAN',
        title: 'Akta_Pendirian_PT_Nusantara_Protein.pdf',
        fileSize: '5.2 MB',
        uploadedAt: '2026-08-01 16:00',
        fileUrl: 'https://example.com/docs/akta.pdf',
        status: 'VERIFIED',
        required: true
      },
      {
        id: 'DOC-IDN-02',
        documentType: 'NIB_OSS',
        title: 'NIB_OSS_RBA_2026.pdf',
        fileSize: '2.1 MB',
        uploadedAt: '2026-08-01 16:05',
        fileUrl: 'https://example.com/docs/nib.pdf',
        status: 'VERIFIED',
        required: true
      },
      {
        id: 'DOC-IDN-03',
        documentType: 'NPWP_BADAN',
        title: 'Kartu_NPWP_Badan_Expired_2024.pdf',
        fileSize: '0.8 MB',
        uploadedAt: '2026-08-01 16:10',
        fileUrl: 'https://example.com/docs/npwp.pdf',
        status: 'CORRECTION_REQUESTED',
        rejectionReason: 'NPWP card image is blurry and shows old format. Please upload official NPWP 16-digit format certificate.',
        required: true
      },
      {
        id: 'DOC-IDN-04',
        documentType: 'BANK_CONFIRM_STATEMENT',
        title: 'Bank_Muamalat_Rekening_Koran.pdf',
        fileSize: '2.4 MB',
        uploadedAt: '2026-08-01 16:15',
        fileUrl: 'https://example.com/docs/muamalat.pdf',
        status: 'VERIFIED',
        required: true
      }
    ],
    bankInfo: {
      bankName: 'PT Bank Muamalat Indonesia Tbk',
      accountHolderName: 'PT NUSANTARA PROTEIN HALAL LESTARI',
      accountNumber: '••••-••••-1192',
      rawAccountNumber: '1010088921192',
      swiftBicCode: 'MUAMIDJAXXX',
      currency: 'IDR',
      country: 'Indonesia',
      settlementMethod: 'RTGS / Central Wire'
    },
    compliance: {
      amlCftDeclaration: true,
      sourceOfFundsDeclaration: true,
      beneficialOwnershipAccurate: true,
      sanctionsNonMatchDeclared: true,
      regulatoryComplianceAgreed: true,
      shariahComplianceAttested: true,
      termsAndConditionsAccepted: true,
      privacyConsentGranted: true,
      declaredAt: '2026-08-01 16:30',
      declaredByIp: '182.253.110.82'
    },
    status: 'ADDITIONAL_INFORMATION_REQUIRED',
    statusHistory: [
      {
        id: 'HIST-IDN-01',
        timestamp: '2026-08-01 16:30',
        previousStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        changedByUserId: 'USR-6612',
        changedByRole: 'Project Sponsor',
        reason: 'Submitted onboarding application'
      },
      {
        id: 'HIST-IDN-02',
        timestamp: '2026-08-02 11:15',
        previousStatus: 'SUBMITTED',
        newStatus: 'ADDITIONAL_INFORMATION_REQUIRED',
        changedByUserId: 'COMP-IDN-01',
        changedByRole: 'Compliance Officer',
        reason: 'Requested re-upload of NPWP 16-digit corporate certificate'
      }
    ],
    reviewerComments: 'Akta and Bank Muamalat account confirmed. Pending updated NPWP 16 digit certificate.',
    additionalInfoRequestNote: 'Please re-upload a clear scan of the 16-digit NPWP Badan Certificate issued by DGT Indonesia.',
    activePoolsCount: 0,
    totalRaisedMYR: 0,
    totalDistributedMYR: 0,
    pendingSettlementMYR: 0,
    createdAt: '2026-08-01 14:00',
    updatedAt: '2026-08-02 11:15',
    submittedAt: '2026-08-01 16:30'
  },
  {
    id: 'PDP-APP-004',
    applicationNumber: 'PDP-APP-2026-004',
    userId: 'USR-5541',
    userEmail: 'sheikh.tariq@cairoagro.eg',
    userMobile: '+20 100 489 2011',
    countryCode: 'EGY',
    countryName: 'Egypt',
    preferredLanguage: 'Arabic',
    pdpType: 'Company',
    organisationName: 'Nile Valley Solar Agro Infrastructure S.A.E.',
    tradingName: 'Nile Agro PV Irrigation Projects',
    registrationNumber: 'EG-CR-8891024',
    countryOfRegistration: 'Egypt',
    registeredAddress: 'Building 44, 90th North Street, New Cairo, Cairo, Egypt',
    businessAddress: 'Wadi El Natrun Agro Tech Zone, Beheira Governorate',
    contactPhone: '+20 2 2810 9900',
    website: 'https://www.nilevalleysolar.eg',
    businessCategory: 'Solar Powered Agritech Irrigation & Desert Farming',
    dateOfIncorporation: '2021-06-10',
    taxIdentificationNumber: 'EG-TAX-9948201',
    representative: {
      id: 'REP-04',
      fullName: 'Eng. Tariq Al-Mansoor',
      nationality: 'Egyptian',
      idPassportNumber: 'EG-28492019482',
      position: 'Chief Executive Officer',
      email: 'sheikh.tariq@cairoagro.eg',
      mobile: '+20 100 489 2011',
      supportingDocName: 'Power_of_Attorney_FRA_Egypt.pdf',
      supportingDocUrl: 'https://example.com/docs/poa_egypt.pdf'
    },
    beneficialOwners: [
      {
        id: 'UBO-07',
        fullName: 'Eng. Tariq Al-Mansoor',
        nationality: 'Egyptian',
        idNumber: 'EG-28492019482',
        ownershipPercentage: 55.0,
        isDirector: true,
        isAuthorisedSignatory: true,
        pepStatus: false
      },
      {
        id: 'UBO-08',
        fullName: 'Cairo Clean Energy Fund',
        nationality: 'Egyptian Private Equity',
        idNumber: 'EG-FRA-PE-8849',
        ownershipPercentage: 45.0,
        isDirector: true,
        isAuthorisedSignatory: false,
        pepStatus: false
      }
    ],
    kybStatus: 'SUBMITTED',
    documents: [
      {
        id: 'DOC-EGY-01',
        documentType: 'COMMERCIAL_REGISTRY_EG',
        title: 'Commercial_Registry_Nile_Valley_2026.pdf',
        fileSize: '3.8 MB',
        uploadedAt: '2026-08-06 09:15',
        fileUrl: 'https://example.com/docs/cr_egypt.pdf',
        status: 'PENDING',
        required: true
      },
      {
        id: 'DOC-EGY-02',
        documentType: 'TAX_CARD_EG',
        title: 'Tax_Card_Egypt_FRA.pdf',
        fileSize: '1.4 MB',
        uploadedAt: '2026-08-06 09:20',
        fileUrl: 'https://example.com/docs/tax_egypt.pdf',
        status: 'PENDING',
        required: true
      },
      {
        id: 'DOC-EGY-03',
        documentType: 'BANK_CONFIRM_STATEMENT',
        title: 'Faisal_Islamic_Bank_Egypt_AMC.pdf',
        fileSize: '2.0 MB',
        uploadedAt: '2026-08-06 09:25',
        fileUrl: 'https://example.com/docs/faisal_bank.pdf',
        status: 'PENDING',
        required: true
      }
    ],
    bankInfo: {
      bankName: 'Faisal Islamic Bank of Egypt',
      accountHolderName: 'NILE VALLEY SOLAR AGRO INFRASTRUCTURE',
      accountNumber: '••••-••••-3829',
      rawAccountNumber: '109820382910',
      swiftBicCode: 'FIBEEGCAXXX',
      currency: 'EGP',
      country: 'Egypt',
      settlementMethod: 'RTGS / Central Wire'
    },
    compliance: {
      amlCftDeclaration: true,
      sourceOfFundsDeclaration: true,
      beneficialOwnershipAccurate: true,
      sanctionsNonMatchDeclared: true,
      regulatoryComplianceAgreed: true,
      shariahComplianceAttested: true,
      termsAndConditionsAccepted: true,
      privacyConsentGranted: true,
      declaredAt: '2026-08-06 09:30',
      declaredByIp: '197.38.102.14'
    },
    status: 'SUBMITTED',
    statusHistory: [
      {
        id: 'HIST-EGY-01',
        timestamp: '2026-08-06 09:30',
        previousStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        changedByUserId: 'USR-5541',
        changedByRole: 'Project Sponsor',
        reason: 'New registration submitted for Nile Valley Desert Solar Agripool'
      }
    ],
    reviewerComments: 'Awaiting compliance officer initial document review queue.',
    activePoolsCount: 0,
    totalRaisedMYR: 0,
    totalDistributedMYR: 0,
    pendingSettlementMYR: 0,
    createdAt: '2026-08-06 08:00',
    updatedAt: '2026-08-06 09:30',
    submittedAt: '2026-08-06 09:30'
  },
  {
    id: 'PDP-APP-005',
    applicationNumber: 'PDP-APP-2026-005',
    userId: 'USR-9923',
    userEmail: 'ibrahim.lawan@kanoagritech.ng',
    userMobile: '+234 803 112 9988',
    countryCode: 'NGA',
    countryName: 'Nigeria',
    preferredLanguage: 'English',
    pdpType: 'Company',
    organisationName: 'Kano Grain Silos & Solar Milling Ltd',
    tradingName: 'Kano Agro-Storage Infrastructure',
    registrationNumber: 'NG-RC-1884920',
    countryOfRegistration: 'Nigeria',
    registeredAddress: 'Plot 12, Bompai Industrial Area, Kano, Kano State, Nigeria',
    businessAddress: 'Kano Free Trade Zone Complex, Kano',
    contactPhone: '+234 64 881 9900',
    website: 'https://www.kanograins.ng',
    businessCategory: 'Post-Harvest Solar Storage & Commodity Milling',
    dateOfIncorporation: '2020-09-18',
    taxIdentificationNumber: 'NG-TIN-28492019-0001',
    representative: {
      id: 'REP-05',
      fullName: 'Alhaji Ibrahim Lawan',
      nationality: 'Nigerian',
      idPassportNumber: 'A08921102',
      position: 'Managing Director & Founder',
      email: 'ibrahim.lawan@kanoagritech.ng',
      mobile: '+234 803 112 9988',
      supportingDocName: 'CAC_Status_Report_Kano_Grains.pdf',
      supportingDocUrl: 'https://example.com/docs/cac_status.pdf'
    },
    beneficialOwners: [
      {
        id: 'UBO-09',
        fullName: 'Alhaji Ibrahim Lawan',
        nationality: 'Nigerian',
        idNumber: 'A08921102',
        ownershipPercentage: 75.0,
        isDirector: true,
        isAuthorisedSignatory: true,
        pepStatus: false
      },
      {
        id: 'UBO-10',
        fullName: 'Hajiya Amina Lawan',
        nationality: 'Nigerian',
        idNumber: 'A09918231',
        ownershipPercentage: 25.0,
        isDirector: true,
        isAuthorisedSignatory: false,
        pepStatus: false
      }
    ],
    kybStatus: 'NOT_STARTED',
    documents: [],
    bankInfo: {
      bankName: 'Jaiz Bank Plc',
      accountHolderName: 'KANO GRAIN SILOS & SOLAR MILLING LTD',
      accountNumber: '••••-••••-8849',
      rawAccountNumber: '0011998849',
      swiftBicCode: 'JAIZNGLAXXX',
      currency: 'NGN',
      country: 'Nigeria',
      settlementMethod: 'RTGS / Central Wire'
    },
    compliance: {
      amlCftDeclaration: false,
      sourceOfFundsDeclaration: false,
      beneficialOwnershipAccurate: false,
      sanctionsNonMatchDeclared: false,
      regulatoryComplianceAgreed: false,
      shariahComplianceAttested: false,
      termsAndConditionsAccepted: false,
      privacyConsentGranted: false
    },
    status: 'DRAFT',
    statusHistory: [
      {
        id: 'HIST-NGA-01',
        timestamp: '2026-08-07 15:00',
        previousStatus: 'DRAFT',
        newStatus: 'DRAFT',
        changedByUserId: 'USR-9923',
        changedByRole: 'Project Sponsor',
        reason: 'Saved draft registration session'
      }
    ],
    activePoolsCount: 0,
    totalRaisedMYR: 0,
    totalDistributedMYR: 0,
    pendingSettlementMYR: 0,
    createdAt: '2026-08-07 15:00',
    updatedAt: '2026-08-07 15:00'
  }
];
