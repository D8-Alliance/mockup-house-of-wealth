import { ASSET_TYPE_LABELS, formatMoney } from '../../../assets/assetLabels';
import { AssetEngagement, BackendProject, RegisteredAsset } from '../../../services/apiClient';

/**
 * Fills the agreement wizard from what the platform already holds, so nobody types it twice:
 * an approved asset partnership (both parties and the agreed terms), a verified asset, or a project.
 * Everything filled stays editable, and the drafter checks it before generating.
 */
export type AgreementType = 'IJARAH' | 'MUSHARAKAH' | 'MUDARABAH' | 'WAKALAH' | 'SUKUK';

export interface AgreementStart {
  contractType: AgreementType;
  projectName: string;
  values: Record<string, string>;
  source?: string;
}

const months = (start: string, end: string) => {
  // Both dates count, so 1 Jan to 30 Jun is six months.
  const days = (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000 + 1;
  const count = Math.round(days / 30.44);
  return count > 0 ? ` (${count} month${count === 1 ? '' : 's'})` : '';
};

function assetLine(asset: { assetType: RegisteredAsset['assetType']; name: string; titleReference?: string | null; location?: string; region?: string }, id: string) {
  const where = asset.location || asset.region;
  return `${ASSET_TYPE_LABELS[asset.assetType]}: ${[asset.name, where, asset.titleReference ? `title/registration ${asset.titleReference}` : ''].filter(Boolean).join(', ')} (${id})`;
}

/** From an approved partnership: the lessor/lessee or partners, the asset and the agreed terms. */
export function startFromEngagement(engagement: AssetEngagement): AgreementStart {
  const owner = engagement.ownerOrganisationName ?? 'Asset owner';
  const pdp = engagement.project.organisationName;
  const asset = assetLine(engagement.asset, engagement.asset.id);
  const terms = engagement.terms;
  const currency = terms.currency ?? 'MYR';
  const period = `${engagement.startDate} to ${engagement.endDate}${months(engagement.startDate, engagement.endDate)}`;
  const reference = `Under asset partnership ${engagement.id}, approved by Legal and Shariah.`;
  if (engagement.akad === 'IJARAH') {
    return {
      contractType: 'IJARAH',
      projectName: engagement.project.projectName,
      source: `partnership ${engagement.id}`,
      values: {
        lessorName: owner,
        lesseeName: pdp,
        assetDescription: `${asset}. Used for the project ${engagement.project.projectName} (${engagement.project.projectCode}). ${reference}`,
        ownershipMaintained: `Yes. ${owner} keeps ownership, major maintenance and takaful of the asset; day-to-day upkeep (fuel, operator, routine servicing) is by ${terms.upkeepBy === 'OWNER' ? owner : pdp}.`,
        rentalAmount: `${formatMoney(terms.rentAmount ?? 0, currency)} ${terms.rentFrequency === 'WHOLE_PERIOD' ? 'for the whole lease period' : 'per month'}`,
        rentalFrequency: terms.rentFrequency === 'WHOLE_PERIOD' ? 'Once, for the whole period' : 'Monthly',
        leaseTerm: period,
      },
    };
  }
  const ownerShare = terms.profitSharePct ?? 0;
  return {
    contractType: 'MUSHARAKAH',
    projectName: engagement.project.projectName,
    source: `partnership ${engagement.id}`,
    values: {
      projectType: `${engagement.project.sector}: ${engagement.project.projectName} (${engagement.project.projectCode})`,
      partners: `${owner} (asset contributor); ${pdp} (managing partner, delivery partner)`,
      contributions: `${owner}: ${asset}, contributed in kind at an agreed value of ${formatMoney(terms.contributionValue ?? 0, currency)}. ${pdp}: [state its capital contribution].`,
      profitSharing: `${owner} ${ownerShare}%; ${pdp} ${Math.round((100 - ownerShare) * 100) / 100}% of distributable profit.`,
      lossAllocation: 'Losses are borne in proportion to each partner\'s capital contribution.',
      managementRights: `${pdp} manages the project's operations; decisions affecting the contributed asset need ${owner}'s consent.`,
      exitMechanism: `The partnership runs ${period}. ${reference}`,
    },
  };
}

/** From a verified asset, before any partnership: the owner and the asset itself. */
export function startFromAsset(asset: RegisteredAsset, contractType: 'IJARAH' | 'MUSHARAKAH'): AgreementStart {
  const owner = asset.organisationName ?? 'Asset owner';
  const line = assetLine(asset, asset.id);
  const value = formatMoney(asset.estimatedValue, asset.currency);
  const valuation = [asset.valuationDate?.slice(0, 10), asset.valuerName].filter(Boolean).join(' by ');
  return contractType === 'IJARAH'
    ? { contractType, projectName: asset.name, source: asset.name, values: { lessorName: owner, assetDescription: line, ownershipMaintained: `Yes, ownership remains with ${owner}.` } }
    : { contractType, projectName: asset.name, source: asset.name, values: { projectType: `Contribution of ${ASSET_TYPE_LABELS[asset.assetType].toLowerCase()}: ${asset.name}`, partners: `${owner} (asset contributor)`, contributions: `${owner}: ${line}, contributed in kind at ${value}${valuation ? ` (valuation ${valuation})` : ''}` } };
}

const CONTRACT_OF: Record<string, AgreementType> = { IJARAH: 'IJARAH', MUSHARAKAH: 'MUSHARAKAH', MUDARABAH: 'MUDARABAH', WAKALAH: 'WAKALAH', SUKUK: 'SUKUK' };

/** The project's own akad, from its proposed Shariah contract (e.g. "Ijarah (Lease)"), if it is one the wizard drafts. */
export function projectContractType(project: BackendProject): AgreementType | null {
  const key = project.proposedShariahContract.toUpperCase().match(/IJARAH|MUSHARAKAH|MUDARABAH|WAKALAH|SUKUK/)?.[0];
  return key ? CONTRACT_OF[key] : null;
}

/** From a project: its name, sector, sponsor organisation and funding. */
export function startFromProject(project: BackendProject, contractType: AgreementType, organisationName: string): AgreementStart {
  const currency = project.countryNode?.currency ?? 'MYR';
  const funding = formatMoney(Number(project.fundingRequired), currency);
  const scope = `${project.sector}: ${project.projectName} (${project.projectCode}). ${project.description}`.slice(0, 600);
  const values: Record<string, string> = {
    IJARAH: { lesseeName: organisationName },
    MUSHARAKAH: { projectType: scope, partners: `${organisationName} (managing partner)` },
    MUDARABAH: { manager: `${organisationName} (mudarib)`, capitalAmount: funding, useOfProceeds: scope },
    WAKALAH: { agent: `${organisationName} (wakil)`, agencyScope: scope },
    SUKUK: { issuer: organisationName, capitalAmount: funding, assetDescription: scope },
  }[contractType];
  return { contractType, projectName: project.projectName, source: project.projectName, values };
}

