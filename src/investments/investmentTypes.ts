export type InvestmentOrderStatus = 
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAYMENT_PENDING'
  | 'SETTLED'
  | 'ALLOCATED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'REFUNDED';

export type InvestorType = 
  | 'Retail Investor'
  | 'HNWI Investor'
  | 'Institutional Investor'
  | 'Corporate Investor'
  | 'Family Office'
  | 'Portfolio Manager';

export interface InvestorSuitabilityProfile {
  investorId: string;
  investorName: string;
  investorType: InvestorType;
  riskProfile: 'Conservative' | 'Moderate' | 'Balanced' | 'Growth' | 'Aggressive';
  experienceLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Institutional';
  investmentObjective: 'Capital Preservation' | 'Income Generation' | 'Capital Growth' | 'Zakat Purified Impact';
  eligibilityPassed: boolean;
  evaluatedAt: string;
}

export interface InvestmentOrder {
  investmentId: string;
  investorId: string;
  investorName: string;
  investorType: InvestorType;
  poolId: string;
  poolName: string;
  organisationId: string;
  countryNodeId: string;
  amount: number;
  currency: string;
  contractType: string;
  indicativeReturnRate: number;
  status: InvestmentOrderStatus;
  paymentReference?: string;
  createdAt: string;
  settledAt?: string;
}
