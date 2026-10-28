import { BackendBeneficiary, SaveBeneficiaryInput } from '../services/apiClient';
import { BeneficiaryItem, HibahAkad } from '../types';
import { hasOwnerSetShare } from './estateRules';

const QABUL: Record<string, HibahAkad['qabulStatus']> = { AWAITING: 'Awaiting acceptance', ACCEPTED: 'Accepted', DECLINED: 'Declined' };

/** The server's record as the screen shows it; a faraid heir's share (none) shows as "By faraid". */
export function fromServer(row: BackendBeneficiary): BeneficiaryItem {
  return {
    id: row.id,
    name: row.name,
    relation: row.relation as BeneficiaryItem['relation'],
    distributionType: row.distributionType as BeneficiaryItem['distributionType'],
    allocationPercent: row.allocationPercent ?? 0,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    identityNumberMasked: row.identityNumberMasked,
    payoutMethod: row.payoutMethod,
    isPrimary: row.isPrimary,
    hibahAkad: row.hibahIjabAt ? { ijabDeclaredAt: row.hibahIjabAt, qabulStatus: QABUL[row.hibahQabulStatus ?? 'AWAITING'], qabulAt: row.hibahQabulAt ?? undefined } : undefined,
  };
}

/** What the screen saves. The modal has already had the donor confirm a hibah offer (ijab). */
export function toServer(item: BeneficiaryItem): SaveBeneficiaryInput {
  return {
    name: item.name,
    relation: item.relation,
    distributionType: item.distributionType,
    allocationPercent: hasOwnerSetShare(item.distributionType) ? item.allocationPercent : undefined,
    email: item.email,
    phone: item.phone,
    identityNumber: item.identityNumber,
    payoutMethod: item.payoutMethod,
    isPrimary: item.isPrimary,
    ijabConfirmed: item.distributionType === 'Hibah Amanah' ? true : undefined,
  };
}
