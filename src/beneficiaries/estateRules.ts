import { useState } from 'react';
import { BeneficiaryItem } from '../types';

/**
 * How an individual's estate passes on. The platform does not record religion, so the account
 * owner chooses: Islamic (faraid, hibah and wasiyyah) or civil (a will, for non-Muslims).
 * Final distribution always follows the Syariah court's faraid certificate, or the grant of
 * probate or letters of administration; these instructions guide the estate officer.
 */
export type EstateFramework = 'Islamic' | 'Civil';

type DistributionType = BeneficiaryItem['distributionType'];

/** A Muslim may bequeath at most one-third of the estate. */
export const WASIYYAH_LIMIT_PCT = 100 / 3;

/** Always faraid heirs, so a wasiyyah to them needs the other heirs' consent and is not offered here. */
export const FARAID_HEIR_RELATIONS: BeneficiaryItem['relation'][] = ['Spouse', 'Child', 'Parent'];

const INSTITUTIONS: BeneficiaryItem['relation'][] = ['Waqf Foundation', 'Zakat Institution'];

export const TYPES_BY_FRAMEWORK: Record<EstateFramework, DistributionType[]> = {
  Islamic: ['Hibah Amanah', 'Wasiyyah', 'Faraid Heir', 'Profit Share', 'Zakat & Sadaqah'],
  Civil: ['Will Beneficiary', 'Profit Share', 'Zakat & Sadaqah'],
};

/** A faraid heir's share is fixed by law, so the owner does not set a percentage. */
export const hasOwnerSetShare = (type: DistributionType) => type !== 'Faraid Heir';

export const wasiyyahTotal = (items: BeneficiaryItem[]) =>
  items.filter(item => item.distributionType === 'Wasiyyah').reduce((sum, item) => sum + (item.allocationPercent || 0), 0);

export const willTotal = (items: BeneficiaryItem[]) =>
  items.filter(item => item.distributionType === 'Will Beneficiary').reduce((sum, item) => sum + (item.allocationPercent || 0), 0);

/** Returns why the beneficiary is not allowed, or null. `others` excludes the one being edited. */
export function estateRuleError(item: Pick<BeneficiaryItem, 'relation' | 'distributionType' | 'allocationPercent'>, others: BeneficiaryItem[]): string | null {
  if (item.distributionType === 'Wasiyyah') {
    if (FARAID_HEIR_RELATIONS.includes(item.relation)) {
      return `A wasiyyah cannot go to a faraid heir (${item.relation.toLowerCase()}) unless the other heirs agree. Give to an heir during your lifetime with Hibah Amanah, or leave their share to faraid.`;
    }
    const total = wasiyyahTotal(others) + item.allocationPercent;
    if (total > WASIYYAH_LIMIT_PCT + 0.001) {
      return `Wasiyyah is limited to one-third (33.33%) of the estate. With this one it would be ${total.toFixed(2)}%.`;
    }
  }
  if (item.distributionType === 'Faraid Heir' && INSTITUTIONS.includes(item.relation)) {
    return 'An institution cannot be a faraid heir. Use Wasiyyah (up to one-third) or Zakat & Sadaqah instead.';
  }
  if (item.distributionType === 'Will Beneficiary' && willTotal(others) + item.allocationPercent > 100) {
    return 'The shares under your will cannot add up to more than 100%.';
  }
  return null;
}

const STORAGE_KEY = 'how-estate-framework';

/** The owner's chosen framework, remembered in this browser (beneficiaries are not yet stored on the server). */
export function useEstateFramework(): [EstateFramework, (framework: EstateFramework) => void] {
  const [framework, setFramework] = useState<EstateFramework>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'Civil' ? 'Civil' : 'Islamic';
    } catch {
      return 'Islamic';
    }
  });
  const update = (next: EstateFramework) => {
    setFramework(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice lasts for this visit only.
    }
  };
  return [framework, update];
}
