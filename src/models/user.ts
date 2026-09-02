export * from '../users/userTypes';
import { AppUser as BaseAppUser } from '../users/userTypes';
import { BaseMetadata } from './baseMetadata';

export interface LegacyAppUser extends BaseAppUser {
  id: string;
  name: string;
  avatarUrl: string;
  metadata?: BaseMetadata;
}
