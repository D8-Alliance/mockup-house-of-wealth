import { UserRole } from '../rbac/types';

/**
 * Lets another screen open the AI Wealth Engine on a specific section, e.g. the dashboard's
 * "Draft Agreement" button opening Agreement Generation. The engine reads it once when it opens.
 */
let pendingSection: string | null = null;

export function openAiEngineSection(section: string): void {
  pendingSection = section;
}

/** Details an agreement starts from, e.g. a verified asset's name, title and value. Read once. */
export interface AgreementPrefill {
  contractType: 'IJARAH' | 'MUSHARAKAH';
  projectName: string;
  values: Record<string, string>;
}

let pendingPrefill: AgreementPrefill | null = null;

export function openAgreementFor(prefill: AgreementPrefill): void {
  pendingPrefill = prefill;
  pendingSection = 'agreement-generation';
}

export function takeAgreementPrefill(): AgreementPrefill | null {
  const prefill = pendingPrefill;
  pendingPrefill = null;
  return prefill;
}

export function takeAiEngineSection(): string | null {
  const section = pendingSection;
  pendingSection = null;
  return section;
}

/**
 * Agreement types each drafter may draft (mirrors AGREEMENT_TYPES_BY_ROLE on the server).
 * A delivery partner finances a project; an asset owner provides an asset, leased or
 * contributed as capital. Roles not listed (administrators) may draft any type.
 */
const AGREEMENT_TYPES_BY_ROLE: Partial<Record<UserRole, string[]>> = {
  'Project Sponsor': ['MUDARABAH', 'MUSHARAKAH', 'WAKALAH', 'SUKUK'],
  'Project Manager': ['MUDARABAH', 'MUSHARAKAH', 'WAKALAH', 'SUKUK'],
  'Asset Owner': ['IJARAH', 'MUSHARAKAH'],
};

/** Roles that draft agreements (mirrors DRAFTER_ROLES on the server). */
const DRAFTER_ROLES: UserRole[] = ['Project Sponsor', 'Project Manager', 'Asset Owner', 'Organization Admin', 'Country Admin', 'Super Admin'];

export const canDraftAgreement = (role: UserRole) => DRAFTER_ROLES.includes(role);

export function agreementTypesFor<T extends string>(role: UserRole, all: readonly T[]): T[] {
  const allowed = AGREEMENT_TYPES_BY_ROLE[role];
  return allowed ? all.filter(type => allowed.includes(type)) : [...all];
}
