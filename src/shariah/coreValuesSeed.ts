import { ShariahContent } from './coreValuesTypes';

// Seed content transcribed from:
// "Islamic Intangible Values in a Digital Economy Framework for D-8 IDEAS SuperApp"
export const SHARIAH_CONTENT_ID = 'shariah-core-values';

export const INITIAL_SHARIAH_CONTENT: ShariahContent = {
  id: SHARIAH_CONTENT_ID,
  title: 'Shariah Governance',
  subtitle:
    'House of Wealth embeds Shariah compliance at every layer — from instrument design and smart contracts to an independent supervisory review. Every marketplace offering is screened and certified against AAOIFI standards.',
  intro:
    'This framework adapts ten standard digital-culture values for the Islamic Digital Economy. The selected terms align with Islamic ethics, Muamalat, and responsible economic practices, grounded in the teachings of the Quran and Hadith. In a SuperApp environment, these values become more than slogans — they guide product design, governance, user experience, transaction rules, data practices, social-finance programmes and the way economic value is created and distributed.',
  values: [
    {
      id: 'value-al-asalah',
      order: 1,
      arabic: 'الأصالة',
      name: 'Al-Asālah',
      translation: 'Authenticity & Credibility',
      meaning: 'Genuineness, credibility and faithfulness to substance',
      whatItMeans: 'Clearly explain products, fees and Shariah principles',
      applications: [
        'Clear disclosure of the underlying \u2018Aqd (contract)',
        'Verified halal and Shariah-compliant product information',
        'Plain-language explanations of fees and obligations',
        'Visible Shariah governance and review processes'
      ],
      guidingPrinciple:
        'Islamic identity should be reflected in the actual transaction, not only in its label.',
      simpleExample:
        'If financing is marketed as Shariah-compliant, the user can see whether the structure is Murabahah, Musharakah, Mudarabah or another recognised contract, together with the key terms.'
    },
    {
      id: 'value-al-adl',
      order: 2,
      arabic: 'العدل',
      name: 'Al-\u2018Adl',
      translation: 'Justice & Fairness',
      meaning: 'Justice, fairness and equitable treatment',
      whatItMeans: 'Give small businesses and individuals opportunities to participate',
      applications: [
        'Fair marketplace access for SMEs and micro-businesses',
        'Transparent pricing and platform fees',
        'Fair financing and investment terms',
        'Consumer and merchant protection',
        'Rules against manipulation, fraud and abusive practices'
      ],
      guidingPrinciple:
        'The platform should widen economic participation while maintaining fairness between parties.',
      simpleExample:
        'A small entrepreneur seeking RM10,000 may be connected to a suitable Shariah-compliant financing or partnership structure instead of being pushed into an exploitative interest-based arrangement.'
    },
    {
      id: 'value-at-taatuf',
      order: 3,
      arabic: 'التعاطف',
      name: 'At-Ta\u2018\u0101\u1e6duf',
      translation: 'Empathy & Human-Centred Design',
      meaning: 'Understanding and caring for the needs of others',
      whatItMeans: 'Design around users\u2019 real needs',
      applications: [
        'Accessible user journeys for elderly and low-digital-literacy users',
        'Needs-based social assistance',
        'Pathways from aid to employment or entrepreneurship',
        'Personalised support and community services'
      ],
      guidingPrinciple: 'Design technology around people, not people around technology.',
      simpleExample:
        'A low-income family may first receive food assistance, then be connected to skills training, employment, micro-enterprise support and marketplace access, creating a pathway toward self-sufficiency.'
    },
    {
      id: 'value-al-amanah',
      order: 4,
      arabic: 'الأمانة',
      name: 'Al-Am\u0101nah',
      translation: 'Trust & Integrity',
      meaning: 'Trustworthiness, responsibility and integrity',
      whatItMeans: 'Protect users\u2019 money and data and act honestly',
      applications: [
        'Secure custody of funds and data',
        'Traceable Zakat, Waqf and Sadaqah flows',
        'Clear accountability for project funds',
        'Fraud prevention and responsible governance',
        'Accurate transaction records'
      ],
      guidingPrinciple:
        'Trust is created when users can see that entrusted money and information are handled responsibly.',
      simpleExample:
        'A contributor to a RM100,000 Waqf project can see how much was received, allocated, utilised and what progress or benefit has been achieved.'
    },
    {
      id: 'value-al-ilm',
      order: 5,
      arabic: 'العلم',
      name: 'Al-\u2018Ilm',
      translation: 'Knowledge & Informed Participation',
      meaning: 'Knowledge, literacy and informed decision-making',
      whatItMeans: 'Use reliable data to make decisions',
      applications: [
        'Islamic finance and Muamalat education',
        'Financial and investment literacy',
        'Halal business guidance',
        'Entrepreneurship learning',
        'Plain-language risk disclosures'
      ],
      guidingPrinciple: 'Participation should be based on understanding, not confusion.',
      simpleExample:
        'Before joining a Musharakah investment, the user receives a short explanation of how profit sharing works, how losses are treated and what risks are involved.'
    },
    {
      id: 'value-al-kafaah',
      order: 6,
      arabic: 'الكفاءة',
      name: 'Al-Kaf\u0101\u2019ah',
      translation: 'Efficiency & Effectiveness',
      meaning: 'Efficiency, capability and effective use of resources',
      whatItMeans: 'Make payments, donations and transactions quick and easy',
      applications: [
        'Digital onboarding and verification',
        'Automated eligibility assessment where appropriate',
        'Faster payments and settlement',
        'Integrated merchant and beneficiary records',
        'Streamlined cross-border processes'
      ],
      guidingPrinciple: 'Use technology to reduce waste and increase economic and social benefit.',
      simpleExample:
        'A Zakat application that previously required repeated forms and physical visits can be submitted digitally, verified, approved, distributed and monitored through one integrated workflow.'
    },
    {
      id: 'value-al-ibda',
      order: 7,
      arabic: 'الإبداع',
      name: 'Al-Ibd\u0101\u2018',
      translation: 'Creativity & Innovation',
      meaning: 'Creativity and responsible innovation',
      whatItMeans: 'Develop innovative Islamic digital financial solutions',
      applications: [
        'Islamic fintech innovation',
        'Digital crowdfunding and investment',
        'Smart Zakat and Waqf services',
        'AI-powered business and opportunity matching',
        'Cross-border trade and commerce'
      ],
      guidingPrinciple: 'Innovate without compromising Shariah.',
      simpleExample:
        'A donor contributes RM100 through the app. Instead of the contribution disappearing into a general fund, the app connects it to a verified micro-enterprise project and provides periodic impact updates.'
    },
    {
      id: 'value-ash-shafafiyyah',
      order: 8,
      arabic: 'الشفافية',
      name: 'Ash-Shaf\u0101fiyyah',
      translation: 'Transparency & Clarity',
      meaning: 'Transparency and clarity',
      whatItMeans: 'Be transparent about funds, projects and transactions',
      applications: [
        'Real-time campaign and project dashboards',
        'Clear pricing, fees and contract terms',
        'Visible fund utilisation',
        'Progress and impact reporting',
        'Transaction histories and audit trails'
      ],
      guidingPrinciple: 'Digital transparency should convert participation into confidence.',
      simpleExample:
        'A school crowdfunding project can display its RM500,000 target, amount collected, amount utilised, project progress and number of contributors.'
    },
    {
      id: 'value-ash-shumuliyyah',
      order: 9,
      arabic: 'الشمولية',
      name: 'Ash-Shum\u016bliyyah',
      translation: 'Inclusivity & Participation',
      meaning: 'Inclusion, accessibility and broad participation',
      whatItMeans: 'Ensure people from different countries and backgrounds can participate',
      applications: [
        'Micro-enterprise and SME access',
        'Multi-language and accessible interfaces',
        'Participation by individuals and institutions',
        'Cross-border D-8 commerce',
        'Appropriate participation by Muslim and non-Muslim users'
      ],
      guidingPrinciple:
        'A digital economic ecosystem should lower barriers to participation rather than create new ones.',
      simpleExample:
        'A small seller in Bangladesh can use the same digital market infrastructure to reach buyers in Malaysia, T\u00fcrkiye or Indonesia without first becoming a large corporation.'
    },
    {
      id: 'value-al-istidamah',
      order: 10,
      arabic: 'الاستدامة',
      name: 'Al-Istid\u0101mah',
      translation: 'Sustainability & Long-Term Value',
      meaning: 'Long-term sustainability and continuity of benefit',
      whatItMeans: 'Create economic and social value that can continue long-term',
      applications: [
        'Long-term enterprise development',
        'Sustainable Waqf and social-finance models',
        'Productive asset creation',
        'Recurring economic participation',
        'Responsible environmental and social considerations'
      ],
      guidingPrinciple: 'Build economic value that can continue and circulate over time.',
      simpleExample:
        'Instead of providing RM500 of temporary support every month, a beneficiary may receive training, business equipment, financing support and marketplace access, enabling a progression from beneficiary to entrepreneur and eventually contributor.'
    }
  ],
  updatedAt: '2026-08-12T00:00:00Z',
  updatedBy: 'SYS-ADMIN-01'
};
