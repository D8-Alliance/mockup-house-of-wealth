import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles, RequirePermission } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { FundingService } from './funding.service';
import { FeatureModuleGuard } from '../modules/feature-module.guard';
import { RequireFeatureModule } from '../modules/feature-module.decorator';
import { RejectFundingRequestDto, RequestTrancheDto } from './funding.dto';

/** Tranche releases: the project side asks, Finance approves, the Country Admin releases the money. */
const APPROVERS = ['Super Admin', 'Country Admin', 'Finance Officer'] as const;

@Controller('funding')
@UseGuards(FeatureModuleGuard)
@RequireFeatureModule('WEALTH_POOLING')
export class FundingController {
  constructor(private readonly fundingService: FundingService) {}

  @Post('projects/:projectId/requests')
  // The project side raises funding requests; Country Admin approves them, and the permission matrix gives Organization Admin no approvals:create.
  @Roles('Project Sponsor', 'Project Manager')
  @RequirePermission('approvals', 'create')
  request(@Param('projectId') projectId: string, @Body() body: RequestTrancheDto, @CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.request(projectId, body.milestoneId, user);
  }

  @Get('queue')
  @Roles(...APPROVERS)
  @RequirePermission('approvals', 'read')
  queue(@CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.queue(user);
  }

  @Post('requests/:requestId/approve')
  @Roles(...APPROVERS)
  @RequirePermission('approvals', 'approve')
  approve(@Param('requestId') requestId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.approve(requestId, user);
  }

  @Post('requests/:requestId/reject')
  @Roles(...APPROVERS)
  @RequirePermission('approvals', 'approve')
  reject(@Param('requestId') requestId: string, @Body() body: RejectFundingRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.fundingService.reject(requestId, body.note, user);
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
