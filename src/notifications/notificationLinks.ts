import { NavTab } from '../types';

/** Where a notification leads, by the record it is about. */
export const TAB_FOR_RESOURCE: Record<string, NavTab> = {
  AssetEngagement: 'asset-partnerships',
  ProjectAssetNeed: 'asset-partnerships',
  Asset: 'assets',
  Project: 'sponsor-portal',
  ProjectDocument: 'sponsor-portal',
  Contract: 'contracts',
  KycApplication: 'profile',
  OrganisationKyb: 'dashboard',
  ProjectSafeguardReview: 'dashboard',
  ProjectSafeguard: 'sponsor-portal',
  PdpApplication: 'sponsor-portal',
  PdpApplicationReview: 'admin-center',
  PaymentTransaction: 'billing-transactions',
};

export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
