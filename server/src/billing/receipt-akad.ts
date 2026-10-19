/**
 * The Shariah contract (akad) behind each kind of platform payment, printed on its receipt.
 * Platform fees are payment for a service, so the akad is Ijarah (hire of services) and the
 * fee is ujrah. The wording should be confirmed by the platform's Shariah adviser.
 */
export interface ReceiptAkad {
  name: string;
  explanation: string;
}

const IJARAH = 'Ijarah (hire of services)';

export const RECEIPT_AKAD: Record<'MEMBERSHIP' | 'AI_CREDIT_TOP_UP' | 'PROJECT_PROMOTION', ReceiptAkad> = {
  MEMBERSHIP: {
    name: IJARAH,
    explanation: 'The member hires the platform\'s services for the subscription period. The membership fee is ujrah (a known fee for a known service and period), not an investment, deposit or loan.',
  },
  AI_CREDIT_TOP_UP: {
    name: IJARAH,
    explanation: 'AI credits are ujrah paid in advance for AI services used later. Each credit pays for a service whose credit price is shown before it is used. The amount is not an investment, deposit or loan and earns no return.',
  },
  PROJECT_PROMOTION: {
    name: IJARAH,
    explanation: 'The sponsor hires the platform to promote the project for the campaign period. The fee is ujrah for that placement only; it is not an investment and does not affect Shariah, compliance or risk review of the project.',
  },
};
