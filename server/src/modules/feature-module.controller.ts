import { BadRequestException, Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { FeatureModuleService } from './feature-module.service';
import { UpdateFeatureModuleDto } from './feature-module.dto';
import { FeatureModuleKey, FEATURE_MODULE_KEYS } from './feature-module.types';

@Controller('admin/modules')
export class FeatureModuleController {
  constructor(private readonly modules: FeatureModuleService) {}

  @Get()
  @Roles('Super Admin', 'AI Administrator', 'Security Administrator', 'Country Admin', 'Organization Admin', 'Auditor')
  list() {
    return this.modules.list();
  }

  @Patch(':moduleKey')
  @Roles('Super Admin', 'AI Administrator', 'Security Administrator')
  update(
    @Param('moduleKey') moduleKey: string,
    @Body() input: UpdateFeatureModuleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!FEATURE_MODULE_KEYS.includes(moduleKey as FeatureModuleKey)) {
      throw new BadRequestException(`Unsupported feature module: ${moduleKey}`);
    }
    return this.modules.update(moduleKey as FeatureModuleKey, input, actor);
  }
}
