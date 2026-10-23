import { OrganisationKybDocumentType, OrganisationKybStatus } from '../services/apiClient';

export const KYB_DOCUMENT_LABELS: Record<OrganisationKybDocumentType, string> = {
  SSM_PROFILE: 'SSM company profile (e-Info)',
  DIRECTORS: 'Directors (Section 58 / Form 49)',
  SHAREHOLDERS: 'Shareholders (Section 51 / Form 24)',
  BOARD_RESOLUTION: 'Board resolution on signatories',
  OTHER: 'Other',
};

export const KYB_STATUS: Record<OrganisationKybStatus, { label: string; className: string }> = {
  NOT_SUBMITTED: { label: 'Not submitted', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
  SUBMITTED: { label: 'With reviewer', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  CHANGES_REQUESTED: { label: 'Changes requested', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  APPROVED: { label: 'Verified', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  REJECTED: { label: 'Rejected', className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
};
