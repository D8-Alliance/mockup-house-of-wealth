export type ShariahStatus = 'PROPOSED' | 'UNDER_REVIEW' | 'APPROVED' | 'CONDITIONAL' | 'REJECTED';

export type IslamicContractType = 
  | 'Mudarabah'
  | 'Musharakah'
  | 'Wakalah'
  | 'Qard Hasan'
  | 'Ijarah'
  | 'Murabahah'
  | 'Custom Approved';

export interface ShariahReview {
  id: string;
  projectId: string;
  organisationId: string;
  countryNodeId: string;
  proposedContract: IslamicContractType;
  profitSharingRatioSponsorPercent: number;
  profitSharingRatioInvestorPercent: number;
  lossAllocationTerms: string; // e.g., "Losses borne by capital provider except in proven negligence"
  feeStructureDescription: string;
  underlyingAssetEligibility: string;
  status: ShariahStatus;
  shariahAdvisorId: string;
  shariahAdvisorName: string;
  shariahBoardName: string;
  fatwaReferenceNumber?: string;
  reviewComments: string;
  reviewedAt: string;
}
