import { SetMetadata } from '@nestjs/common';
import { FeatureModuleKey } from './feature-module.types';

export const FEATURE_MODULE_KEY = 'feature-module';
export const RequireFeatureModule = (moduleKey: FeatureModuleKey) => SetMetadata(FEATURE_MODULE_KEY, moduleKey);
