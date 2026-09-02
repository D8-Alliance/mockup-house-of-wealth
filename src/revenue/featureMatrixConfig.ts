import { FeatureMatrixItem } from './revenueTypes';

export const COMPREHENSIVE_FEATURE_MATRIX: FeatureMatrixItem[] = [
  {
    id: 'feat_marketplace',
    category: 'Core Access',
    name: 'Basic Marketplace',
    description: 'Browse, explore and invest in verified Shariah asset pools across D-8 economies.',
    free: 'Full Open Access',
    plus: 'Full Open Access',
    professional: 'Full Open Access',
    enterprise: 'Full Open Access + Private Tranches'
  },
  {
    id: 'feat_search',
    category: 'Core Access',
    name: 'Advanced Search',
    description: 'Filter by asset class, AAOIFI standard, IRR, tenor, geographic node and takaful coverage.',
    free: 'Basic Filters',
    plus: 'Advanced Filters & Multi-tag',
    professional: 'Institutional Query Engine',
    enterprise: 'Custom SQL & API Querying'
  },
  {
    id: 'feat_ai_assistant',
    category: 'AI Intelligence',
    name: 'AI Assistant',
    description: 'Natural language Islamic wealth advisor powered by fine-tuned Shariah intelligence.',
    free: '20 queries / mo',
    plus: '100 queries / mo',
    professional: '400 queries / mo',
    enterprise: 'Unlimited Custom Models'
  },
  {
    id: 'feat_ai_project_analysis',
    category: 'AI Intelligence',
    name: 'AI Project Analysis',
    description: 'Automated synthesis of project feasibility, commodity risk, and cash flow projections.',
    free: 'Basic Summary',
    plus: 'Full AI Feasibility Breakdown',
    professional: 'Deep Multi-Factor Scenario Modeling',
    enterprise: 'Sovereign-Grade Dossier Analysis'
  },
  {
    id: 'feat_ai_invest_intel',
    category: 'AI Intelligence',
    name: 'AI Investment Intelligence',
    description: 'Predictive ROI modeling, yield spread comparison, and macroeconomic Shariah indicators.',
    free: false,
    plus: 'Standard Forecasting',
    professional: 'Advanced Yield Optimization',
    enterprise: 'Real-time Cross-Border Predictive Suite'
  },
  {
    id: 'feat_ai_risk_analysis',
    category: 'Risk & Due Diligence',
    name: 'AI Risk Analysis',
    description: 'Counterparty default risk, commodity price volatility, weather risk & ESG scoring.',
    free: 'Basic Risk Flagging',
    plus: 'Comprehensive Risk Matrix',
    professional: 'Deep Multi-variable Stress Testing',
    enterprise: 'Institutional Enterprise Risk Engine'
  },
  {
    id: 'feat_ai_portfolio',
    category: 'AI Intelligence',
    name: 'AI Portfolio Analysis',
    description: 'Multi-asset allocation rebalancing, Islamic wealth distribution, and Zakat calculation.',
    free: 'Single Portfolio Tracker',
    plus: 'Multi-Currency Rebalancer',
    professional: 'Family Office Multi-Entity Engine',
    enterprise: 'Apex Multi-Hierarchy Consolidation'
  },
  {
    id: 'feat_ai_contract',
    category: 'Risk & Due Diligence',
    name: 'AI Contract Analysis',
    description: 'Automated AAOIFI & Shariah contract screening for Gharar, Riba, and Maysir clauses.',
    free: false,
    plus: 'Up to 5 Contracts / mo',
    professional: 'Unlimited Contract Scans',
    enterprise: 'Enterprise Clause Library & Custom Fatwas'
  },
  {
    id: 'feat_ai_due_diligence',
    category: 'Risk & Due Diligence',
    name: 'AI Due Diligence',
    description: 'Algorithmic vetting of project sponsor track record, legal filings, and escrow conditions.',
    free: 'Executive Summary Only',
    plus: 'Standard Due Diligence Dossiers',
    professional: 'Institutional Deep-Dive Reports',
    enterprise: 'On-Demand Forensic Scholar Audits'
  },
  {
    id: 'feat_premium_reports',
    category: 'Risk & Due Diligence',
    name: 'Premium Reports',
    description: 'Curated institutional research publications on D-8 agriculture, renewable energy & Sukuk.',
    free: 'Abstracts Only',
    plus: '3 Free Reports / mo',
    professional: 'Unlimited Catalog Access',
    enterprise: 'Bespoke Research Commissioning'
  },
  {
    id: 'feat_alerts',
    category: 'Core Access',
    name: 'Alerts',
    description: 'Real-time notifications on pool openings, harvest payouts, and risk threshold flags.',
    free: 'Standard Email Alerts',
    plus: 'Instant Push, SMS & WhatsApp',
    professional: 'Priority Pre-Market Deal Alerts',
    enterprise: 'Real-time Webhook & SIEM Feeds'
  },
  {
    id: 'feat_project_tools',
    category: 'Ecosystem & Governance',
    name: 'Project Tools',
    description: 'Syndicate room collaboration, milestone inspection logs, and distribution schedule calculators.',
    free: 'Standard Investor Tools',
    plus: 'Enhanced Syndicate Workspaces',
    professional: 'Institutional Deal Room Lead Tools',
    enterprise: 'Co-Origination & Sovereign Structuring'
  },
  {
    id: 'feat_pdp_tools',
    category: 'Ecosystem & Governance',
    name: 'PDP Tools',
    description: 'Project Development Partner campaign creation, milestone escrow releases, and investor Q&A.',
    free: false,
    plus: 'Basic PDP Discovery Link',
    professional: 'Full PDP Sponsor Suite',
    enterprise: 'Apex Multi-Estate Sponsor Suite'
  },
  {
    id: 'feat_org_management',
    category: 'Ecosystem & Governance',
    name: 'Organisation Management',
    description: 'Multi-seat access, role-based authorization, team activity logs, and entity grouping.',
    free: '1 User Seat',
    plus: 'Up to 2 Family Seats',
    professional: 'Up to 5 Professional Seats',
    enterprise: 'Unlimited Enterprise Seats & Custom RBAC'
  },
  {
    id: 'feat_api',
    category: 'Ecosystem & Governance',
    name: 'API',
    description: 'Programmatic REST / GraphQL endpoints for portfolio sync, Shariah data feeds, and pricing.',
    free: false,
    plus: 'Read-only Webhooks',
    professional: 'Full REST API (1k req/day)',
    enterprise: 'High-Throughput Dedicated API Endpoint'
  },
  {
    id: 'feat_analytics',
    category: 'Core Access',
    name: 'Advanced Analytics',
    description: 'Macroeconomic D-8 trade flows, currency volatility indices, and Shariah asset correlations.',
    free: 'Standard Performance Charts',
    plus: 'Advanced Risk & Yield Visualizer',
    professional: 'Institutional Multi-Factor Terminal',
    enterprise: 'Custom Data Lake & BI Connectors'
  }
];
