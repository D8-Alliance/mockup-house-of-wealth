import { PageContent } from './pageContentTypes';

export const PAGE_CONTENT_ID: Record<string, string> = {
  about: 'page-about-d8',
  members: 'page-member-states',
  news: 'page-news-updates',
  contact: 'page-contact'
};

function item(id: string, values: Record<string, string>) {
  return { id, values };
}

export const INITIAL_PAGE_CONTENT: Record<string, PageContent> = {
  about: {
    pageId: 'about',
    meta: {
      title: 'About D-8 & House of Wealth',
      subtitle:
        'House of Wealth is the flagship digital marketplace of the D-8 Organization for Economic Cooperation — connecting institutional capital and sustainable real-economy projects across nine Muslim-majority developing nations through Shariah-compliant tokenization.',
      intro:
        'House of Wealth is the flagship digital marketplace of the D-8 Organization for Economic Cooperation. It unites institutional capital, asset owners, and sustainable projects across the nine member states through Shariah-compliant tokenization, smart contracts, and transparent wealth pooling.'
    },
    sections: {
      pillars: [
        item('p1', {
          title: 'Interconnected Markets',
          detail:
            'A single cross-border layer connecting 9 sovereign economies, regulatory frameworks, and liquidity pools under one Shariah-aligned platform.'
        }),
        item('p2', {
          title: 'Islamic Circular Economy',
          detail:
            'Tokenized real-economy assets — energy, agriculture, logistics, and infrastructure — structured as Mudarabah, Musharakah, Ijarah, and Murabaha.'
        }),
        item('p3', {
          title: 'Trust & Transparency',
          detail:
            'Immutable audit ledger, autonomous zakat purification, and role-scoped access enforce accountability from origination to maturity.'
        }),
        item('p4', {
          title: 'Shariah-Compliant by Design',
          detail:
            'Every instrument and smart contract is reviewed by independent Shariah supervisory councils aligned to AAOIFI standards.'
        })
      ],
      milestones: [
        item('m1', {
          year: '1997',
          title: 'D-8 Founded',
          detail:
            'The Developing-8 Organization for Economic Cooperation is established in Istanbul to strengthen economic ties among major Muslim-majority developing states.'
        }),
        item('m2', {
          year: '2023',
          title: 'House of Wealth Concept',
          detail:
            'Member states endorse a shared digital infrastructure for cross-border Islamic finance, tokenized assets, and transparent wealth pooling.'
        }),
        item('m3', {
          year: '2024',
          title: 'Azerbaijan Joins',
          detail:
            'Azerbaijan becomes the 9th member state, broadening the network across the Caucasus into vital energy and trade corridors.'
        }),
        item('m4', {
          year: '2025',
          title: 'Network Phase 1 Live',
          detail:
            'Initial 9 country nodes go live with central-bank-aligned regulatory profiles and the first AAOIFI-certified marketplace offerings.'
        }),
        item('m5', {
          year: '2026',
          title: 'Cross-Border Scale-Up',
          detail:
            'Institutional capital, asset originators, and sovereign funds connect across all member states under a unified governance layer.'
        })
      ]
    },
    updatedAt: '2026-08-12T00:00:00Z',
    updatedBy: 'SYS-ADMIN-01'
  },

  members: {
    pageId: 'members',
    meta: {
      title: 'The 9 Member States',
      subtitle:
        'The D-8 Organization for Economic Cooperation unites eight original founding members and Azerbaijan — the newest entrant — into a single network of Islamic circular-economy markets spanning the Caucasus, South & Southeast Asia, the Middle East, and Africa.',
      intro:
        'Select a member state below to explore its regulatory profile, live project statistics, and the role each nation plays in the D-8 circular economy.'
    },
    sections: {
      contributions: [
        item('c1', {
          countryCode: 'CN-TUR',
          title: 'Türkiye',
          detail:
            'Bridging Eurasian corridors with industrial-capacity sukuk and renewable power projects.'
        }),
        item('c2', {
          countryCode: 'CN-MYS',
          title: 'Malaysia',
          detail:
            'Regional hub for AAOIFI-standard tokenization, palm-oil smart agritech, and wealth pooling.'
        }),
        item('c3', {
          countryCode: 'CN-IDN',
          title: 'Indonesia',
          detail:
            'Days of marine logistics, maritime assets, and the world\u2019s largest Muslim-majority economy.'
        }),
        item('c4', {
          countryCode: 'CN-BGD',
          title: 'Bangladesh',
          detail:
            'Scaling micro-leasing, SME capital, and halal textile supply-chain finance in South Asia.'
        }),
        item('c5', {
          countryCode: 'CN-EGY',
          title: 'Egypt',
          detail:
            'Nile-basin renewable energy and infrastructure finance at the gateway of North Africa.'
        }),
        item('c6', {
          countryCode: 'CN-NGA',
          title: 'Nigeria',
          detail:
            'Food-security, agro-industrial, and halal commodity value-chain finance across West Africa.'
        }),
        item('c7', {
          countryCode: 'CN-IRN',
          title: 'Iran',
          detail:
            'Building Islamic capital markets in the Middle East through infrastructure and portfolio capital.'
        }),
        item('c8', {
          countryCode: 'CN-PAK',
          title: 'Pakistan',
          detail:
            'Agri-sukuk and halal supply-chain finance leveraging South Asia\u2019s agriculture powerhouse.'
        }),
        item('c9', {
          countryCode: 'CN-AZE',
          title: 'Azerbaijan',
          detail:
            'Connecting the Caucasus and Caspian energy corridor with halal infrastructure finance.'
        })
      ]
    },
    updatedAt: '2026-08-12T00:00:00Z',
    updatedBy: 'SYS-ADMIN-01'
  },

  news: {
    pageId: 'news',
    meta: {
      title: 'News & Updates',
      subtitle:
        'The latest developments across the House of Wealth network — platform releases, governance milestones, regulatory alignment, and cross-border market expansion.'
    },
    sections: {
      featured: [
        item('f1', {
          tag: 'Platform Release',
          date: 'September 2026',
          title: 'Azerbaijan Node Live with Caspian Infrastructure Sukuk',
          excerpt:
            'The Baku capital markets node has on-boarded its first Caspian energy and logistics infrastructure offerings, deepening the Caucasus corridor across the wider D-8 network.'
        })
      ],
      items: [
        item('n1', {
          tag: 'Governance',
          date: 'Aug 2026',
          title: 'AAOIFI Compliance Framework v2.0 Ratified',
          excerpt:
            'Member states adopt an updated cross-border certification standard harmonising Shariah review across all nine nodes.'
        }),
        item('n2', {
          tag: 'Marketplace',
          date: 'Jul 2026',
          title: 'Cross-Border Wealth Pooling Goes Live',
          excerpt:
            'The first multi-country Musharakah wealth pool is structured across Malaysia, Indonesia, and Bangladesh.'
        }),
        item('n3', {
          tag: 'Partnership',
          date: 'Jun 2026',
          title: 'Food-Security Initiative Expands to West Africa',
          excerpt:
            'The Ibadan food-security programme scales halal commodity value-chain finance across Nigeria and Egypt.'
        }),
        item('n4', {
          tag: 'Regulatory',
          date: 'May 2026',
          title: 'Central Banks Endorse Digital Token Registry',
          excerpt:
            'Nine national regulators align on the network\u2019s immutable audit ledger and tokenised-asset registry standards.'
        }),
        item('n5', {
          tag: 'Education',
          date: 'Apr 2026',
          title: 'Islamic Circular Economy Fellowship Opens',
          excerpt:
            'A new cross-border fellowship convenes Shariah scholars and fintech leaders across the member states.'
        })
      ]
    },
    updatedAt: '2026-08-12T00:00:00Z',
    updatedBy: 'SYS-ADMIN-01'
  },

  contact: {
    pageId: 'contact',
    meta: {
      title: 'Contact Us',
      subtitle:
        'Get in touch with the House of Wealth coordination team — whether you are an institution seeking to list an offering, an investor exploring opportunities, or a member state representative.'
    },
    sections: {
      offices: [
        item('o1', {
          region: 'Central Coordination',
          city: 'Kuala Lumpur, Malaysia',
          detail: 'D-8 House of Wealth Secretariat, Menara FELDA, Platinum Park'
        }),
        item('o2', {
          region: 'Eurasia Hub',
          city: 'Istanbul, Türkiye',
          detail: 'D-8 Regional Office, Istanbul Financial Centre'
        }),
        item('o3', {
          region: 'Africa Hub',
          city: 'Cairo, Egypt',
          detail: 'North & West Africa Coordination Desk, Nile Business District'
        }),
        item('o4', {
          region: 'Caspian Hub',
          city: 'Baku, Azerbaijan',
          detail: 'Caucasus & Caspian Coordination Desk, Baku Business Centre'
        })
      ]
    },
    updatedAt: '2026-08-12T00:00:00Z',
    updatedBy: 'SYS-ADMIN-01'
  }
};
