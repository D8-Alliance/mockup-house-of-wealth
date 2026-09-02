export type CountryNodeStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'UNDER_MAINTENANCE' | 'DEACTIVATED';
export type CountryVerificationStatus = 'VERIFIED' | 'PENDING' | 'REJECTED';

export interface CountryNode {
  countryNodeId: string; // e.g. 'CN-MYS'
  countryCode: string; // 'MYS'
  countryName: string;
  region: string; // e.g. 'Southeast Asia'
  currency: string; // 'MYR'
  timezone: string; // 'Asia/Kuala_Lumpur'
  regulatoryProfile: string; // e.g. 'BNM / Securities Commission Malaysia'
  status: CountryNodeStatus;
  verificationStatus: CountryVerificationStatus;
  createdAt: string;
  updatedAt: string;
  activeOrganisationsCount: number;
  activeUsersCount: number;
  activeProjectsCount: number;
  activePoolsCount: number;
  flagUrl: string;

  // Legacy compatibility fields
  id?: string;
  code?: string;
  name?: string;
  centralBankApproval?: boolean;
  regulatoryBody?: string;
}
