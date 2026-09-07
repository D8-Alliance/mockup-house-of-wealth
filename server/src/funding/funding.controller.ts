import { Controller, Get, Param, Post } from '@nestjs/common';
import { Roles, RequirePermission } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { FundingService } from './funding.service';

@Controller('funding')
export class FundingController {
  constructor(private readonly fundingService: FundingService) {}

  @Post('projects/:projectId/requests')
  @Roles('Project Sponsor', 'Project Manager', 'Organization Admin', 'Country Admin')
  @RequirePermission('approvals', 'create')
  request(@Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.request(projectId, user);
  }

  @Post('requests/:requestId/approve')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin')
  @RequirePermission('approvals', 'approve')
  approve(@Param('requestId') requestId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.approve(requestId, user);
  }

  @Post('requests/:requestId/disburse')
  @Roles('Country Admin', 'Super Admin')
  @RequirePermission('approvals', 'disburse')
  disburse(@Param('requestId') requestId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.disburse(requestId, user);
  }

  @Get('requests/:projectId')
  @RequirePermission('approvals', 'read')
  list(@Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.list(projectId, user);
  }
}
