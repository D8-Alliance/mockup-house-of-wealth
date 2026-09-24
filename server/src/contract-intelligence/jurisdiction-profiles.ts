export interface JurisdictionProfile {
  name: string;
  legalSystem: string;
  islamicFinanceAuthority: string;
  shariahReference: string;
  regulatoryDocuments: string[];
}

export const D8_JURISDICTIONS = ['Malaysia', 'Türkiye', 'Indonesia', 'Pakistan', 'Bangladesh', 'Egypt', 'Nigeria', 'Iran', 'Azerbaijan'] as const;

export const JURISDICTION_PROFILES: Record<string, JurisdictionProfile> = {
  Malaysia: { name: 'Malaysia', legalSystem: 'Common law with a statutory Islamic finance framework', islamicFinanceAuthority: 'Bank Negara Malaysia and Securities Commission Malaysia; SAC BNM and SAC SC', shariahReference: 'BNM Shariah Resolutions and SAC SC resolutions', regulatoryDocuments: ['Islamic Financial Services Act 2013', 'Securities Commission Malaysia Islamic Capital Market guidelines', 'BNM policy documents'] },
  'Türkiye': { name: 'Türkiye', legalSystem: 'Civil law', islamicFinanceAuthority: 'Banking Regulation and Supervision Agency and Participation Banks Association advisory bodies', shariahReference: 'Participation banking advisory standards and AAOIFI references where adopted', regulatoryDocuments: ['Banking Regulation and Supervision Agency rules', 'Capital Markets Board participation finance regulations', 'Participation finance guidance'] },
  Indonesia: { name: 'Indonesia', legalSystem: 'Civil law', islamicFinanceAuthority: 'Otoritas Jasa Keuangan and National Sharia Board of Indonesian Ulema Council (DSN-MUI)', shariahReference: 'DSN-MUI fatwas and OJK Sharia financial services regulations', regulatoryDocuments: ['OJK Islamic banking regulations', 'OJK Islamic capital market regulations', 'DSN-MUI fatwas'] },
  Pakistan: { name: 'Pakistan', legalSystem: 'Common law with Islamic banking legislation and standards', islamicFinanceAuthority: 'State Bank of Pakistan Shariah Board and Securities and Exchange Commission of Pakistan', shariahReference: 'SBP Shariah Governance Framework and approved Shariah standards', regulatoryDocuments: ['SBP Islamic Banking Guidelines', 'SBP Shariah Governance Framework', 'SECP Sukuk and Islamic capital market regulations'] },
  Bangladesh: { name: 'Bangladesh', legalSystem: 'Common law', islamicFinanceAuthority: 'Bangladesh Bank Shariah Advisory Committee and Islamic banking supervisory framework', shariahReference: 'Bangladesh Bank Islamic banking guidelines and approved bank Shariah standards', regulatoryDocuments: ['Bangladesh Bank Islamic Banking Guidelines', 'Bangladesh Bank prudential regulations', 'BSEC Islamic securities requirements'] },
  Egypt: { name: 'Egypt', legalSystem: 'Civil law', islamicFinanceAuthority: 'Central Bank of Egypt and Financial Regulatory Authority; recognised institutional Shariah boards', shariahReference: 'Applicable CBE and FRA Islamic finance and Sukuk guidance', regulatoryDocuments: ['Central Bank of Egypt banking regulations', 'Financial Regulatory Authority Sukuk regulations', 'Egyptian capital markets regulations'] },
  Nigeria: { name: 'Nigeria', legalSystem: 'Common law with federal financial regulation', islamicFinanceAuthority: 'Central Bank of Nigeria and Financial Regulation Advisory Council of Experts', shariahReference: 'CBN non-interest banking framework and approved Shariah opinions', regulatoryDocuments: ['CBN non-interest banking guidelines', 'SEC Nigeria Sukuk rules', 'CBN Shariah governance requirements'] },
  Iran: { name: 'Iran', legalSystem: 'Civil law with a statutory interest-free banking framework', islamicFinanceAuthority: 'Central Bank of Iran Shariah Council', shariahReference: 'Interest-Free Banking Act and Central Bank Shariah Council guidance', regulatoryDocuments: ['Usury-Free Banking Operations Act', 'Central Bank of Iran banking directives', 'Iran capital market Islamic finance rules'] },
  Azerbaijan: { name: 'Azerbaijan', legalSystem: 'Civil law', islamicFinanceAuthority: 'Central Bank of the Republic of Azerbaijan; institution-level Shariah governance applies', shariahReference: 'Applicable Central Bank guidance and AAOIFI references where adopted', regulatoryDocuments: ['Central Bank banking regulations', 'Azerbaijan securities market regulations', 'Institutional Shariah governance policies'] },
};

export const getJurisdictionProfile = (jurisdiction: string) => JURISDICTION_PROFILES[jurisdiction] || null;
