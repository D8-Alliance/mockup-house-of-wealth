import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermission, Roles } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() actor: AuthenticatedUser) {
    return this.dashboard.summary(actor);
  }

  @Get('network')
  @Roles('Super Admin', 'Country Admin')
  @RequirePermission('dashboard', 'read')
  network(@CurrentUser() actor: AuthenticatedUser) {
    return this.dashboard.network(actor);
  }

  @Get('workflows')
  @Roles('Super Admin', 'Country Admin')
  @RequirePermission('dashboard', 'read')
  workflows(@CurrentUser() actor: AuthenticatedUser) {
    return this.dashboard.workflows(actor);
  }

  @Get('permissions')
  @Roles('Super Admin', 'Country Admin')
  @RequirePermission('dashboard', 'read')
  permissions() {
    return this.dashboard.permissions();
  }
}
