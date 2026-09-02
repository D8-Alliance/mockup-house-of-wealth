export type ScopeLevel = 'Global' | 'Country' | 'Organisation' | 'Assigned' | 'Self';

export interface DataScope {
  userId: string;
  role: string;
  scopeLevel: ScopeLevel;
  countryNodeId?: string;
  organisationId?: string;
  assignedResourceIds?: string[]; // E.g., specific pool IDs, contract IDs, project IDs
}
