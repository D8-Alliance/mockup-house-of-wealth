/**
 * Which Islamic contract suits an asset, from its own facts: what it is, whether it is charged,
 * how recent its valuation is, and whether ownership is verified. Deterministic and explainable,
 * so it gives a meaningful answer without an AI model; the AI adviser builds on it.
 *
 * Basis: general principles of the AAOIFI Shariah Standards on Murabahah (No. 8), Ijarah (No. 9)
 * and Sharikah/Musharakah (No. 12). Guidance only: Legal and Shariah review decide.
 */
export type StructuringContract = 'IJARAH' | 'MUSHARAKAH' | 'MURABAHAH';
export type StructuringFit = 'RECOMMENDED' | 'POSSIBLE' | 'NOT_SUITABLE';

export interface StructuringOption {
  contract: StructuringContract;
  fit: StructuringFit;
  reasons: string[];
  /** What the asset owner takes on under this contract. */
  ownerDuties: string[];
  /** What is still needed before it can go ahead. */
  needs: string[];
}

export interface StructuringGuidance {
  options: StructuringOption[];
  concerns: string[];
  basis: string;
}

export interface StructuringAsset {
  assetType: string;
  status: string;
  isEncumbered: boolean;
  encumbranceNote: string | null;
  valuationDate: Date | null;
  valuerName: string | null;
  intendedUse: string;
  documentTypes: string[];
}

/** Assets that give a benefit (usufruct) without being used up, so they can be leased. */
const LEASABLE = new Set(['LAND', 'BUILDING', 'MACHINERY', 'VEHICLE', 'EQUIPMENT']);
const VALUATION_MAX_AGE_DAYS = 365;

export function structuringGuidance(asset: StructuringAsset, now = new Date()): StructuringGuidance {
  const concerns: string[] = [];
  const verified = asset.status === 'VERIFIED';
  if (!verified) concerns.push('Ownership is not verified yet, so this guidance is provisional. Submit the asset with proof of ownership first.');

  const valuationAgeDays = asset.valuationDate ? (now.getTime() - asset.valuationDate.getTime()) / 86_400_000 : null;
  const recentValuation = valuationAgeDays !== null && valuationAgeDays <= VALUATION_MAX_AGE_DAYS && Boolean(asset.valuerName);
  const hasValuationReport = asset.documentTypes.includes('VALUATION');

  if (asset.isEncumbered) {
    concerns.push(`The asset is charged or pledged${asset.encumbranceNote ? ` (${asset.encumbranceNote})` : ''}. Leasing or contributing it needs the chargee's written consent, and if the financing behind the charge is conventional (interest-based), Shariah review must assess it. Selling it needs the charge discharged first.`);
  }

  const leasable = LEASABLE.has(asset.assetType);
  const ijarah: StructuringOption = {
    contract: 'IJARAH',
    fit: leasable ? 'RECOMMENDED' : 'POSSIBLE',
    reasons: leasable
      ? ['You keep ownership and earn rent for the use of the asset.', 'Land, buildings, machinery and vehicles give a benefit without being used up, which is what a lease requires.']
      : ['Possible only if the asset gives a benefit without being used up; check this with the Shariah reviewer.'],
    ownerDuties: [
      'Keep ownership throughout the lease; rent is paid for the use only.',
      'Bear major maintenance, structural repairs and takaful for the asset; the lessee covers routine upkeep.',
      'Set the rent and its dates in advance for each period; no increase that is not agreed beforehand.',
      'Late-payment charges may not be kept as income; any such amount goes to charity.',
    ],
    needs: [...(verified ? [] : ['Verified ownership']), 'Lessee identity (KYC or KYB)', ...(asset.isEncumbered ? ["Chargee's consent to lease"] : [])],
  };

  const musharakahReady = recentValuation || hasValuationReport;
  const musharakah: StructuringOption = {
    contract: 'MUSHARAKAH',
    fit: musharakahReady && asset.intendedUse === 'MUSHARAKAH' ? 'RECOMMENDED' : 'POSSIBLE',
    reasons: [
      'The asset becomes your capital contribution to a partnership, valued at an agreed amount.',
      musharakahReady ? 'A valuation is available to fix the value of your contribution.' : 'A recent independent valuation is needed to fix the value of your contribution.',
    ],
    ownerDuties: [
      'Ownership becomes shared with the partners in proportion to capital.',
      'Profit is shared by the agreed ratio; losses are borne in proportion to capital, never guaranteed.',
      'No partner may be promised a fixed return or a buy-back at the original value.',
    ],
    needs: [...(verified ? [] : ['Verified ownership']), ...(musharakahReady ? [] : ['Independent valuation report, under 12 months old']), ...(asset.isEncumbered ? ["Chargee's consent to contribute the asset"] : [])],
  };
  if (!musharakahReady) concerns.push('No valuation under 12 months is recorded. A partnership contribution and any sale need an independent valuation.');

  const murabahah: StructuringOption = {
    contract: 'MURABAHAH',
    fit: asset.isEncumbered ? 'NOT_SUITABLE' : 'POSSIBLE',
    reasons: asset.isEncumbered
      ? ['A charged asset cannot be sold until the charge is discharged.']
      : ['Only if you want to sell the asset: it is sold at its disclosed cost plus an agreed profit, and ownership passes to the buyer.'],
    ownerDuties: ['Own and possess the asset before selling it.', 'Disclose the cost and the profit margin to the buyer.', 'Once agreed, the price cannot be increased for late payment.'],
    needs: [...(asset.isEncumbered ? ['Discharge of the charge'] : []), ...(musharakahReady ? [] : ['Independent valuation']), 'Transfer of title (for land and buildings, at the land office)'],
  };

  const options = [ijarah, musharakah, murabahah];
  const intended = options.find((option) => option.contract === asset.intendedUse);
  if (intended?.fit === 'NOT_SUITABLE') concerns.push(`The contract you intend (${intended.contract}) is not suitable for this asset as it stands.`);
  return { options, concerns, basis: 'Based on general principles of the AAOIFI Shariah Standards on Murabahah (No. 8), Ijarah (No. 9) and Musharakah (No. 12). This is guidance, not a fatwa: Legal and Shariah review decide.' };
}
