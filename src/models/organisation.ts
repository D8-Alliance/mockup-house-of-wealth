export * from '../organisations/organisationTypes';
import { Organisation as BaseOrganisation } from '../organisations/organisationTypes';
import { BaseMetadata } from './baseMetadata';

export interface LegacyOrganisation extends BaseOrganisation {
  id: string;
  name: string;
  type: any;
  taxId?: string;
  metadata?: BaseMetadata;
}
