import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Roles } from '../auth/roles.decorator';
import { RequireFeatureModule } from '../modules/feature-module.decorator';
import { FeatureModuleGuard } from '../modules/feature-module.guard';
import { CreateLeaseDto, EndLeaseDto, LeasableUnitDto, LeaseNoteDto, RecordDepositDto, RecordRentPaymentDto, RespondLeaseDto, ReturnDepositDto, ReviewLeaseDto, UpdateLeasableUnitDto } from './leasing.dto';
import { LeasingService } from './leasing.service';

const OWNERS = ['Asset Owner', 'Asset Manager'] as const;
const TENANTS = ['Organization Admin', 'Corporate Investor', 'Project Sponsor', 'Project Manager'] as const;
const REVIEWERS = ['Super Admin', 'Country Admin', 'Legal Officer', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee'] as const;

/** Direct Ijarah leases: owners list units of verified assets and companies rent them without a project. */
@Controller('leasing')
@UseGuards(FeatureModuleGuard)
@RequireFeatureModule('ASSET_REGISTRATION')
export class LeasingController {
  constructor(private readonly leasing: LeasingService) {}

  @Get('my-units')
  @Roles(...OWNERS)
  myUnits(@CurrentUser() actor: AuthenticatedUser) { return this.leasing.myUnits(actor); }

  @Post('units')
  @Roles(...OWNERS)
  createUnit(@CurrentUser() actor: AuthenticatedUser, @Body() body: LeasableUnitDto) { return this.leasing.createUnit(actor, body); }

  @Patch('units/:id')
  @Roles(...OWNERS)
  updateUnit(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateLeasableUnitDto) { return this.leasing.updateUnit(actor, id, body); }

  @Get('units')
  @Roles(...TENANTS, ...REVIEWERS)
  availableUnits(@CurrentUser() actor: AuthenticatedUser) { return this.leasing.availableUnits(actor); }

  @Get('leases')
  @Roles(...OWNERS, ...TENANTS, ...REVIEWERS)
  leases(@CurrentUser() actor: AuthenticatedUser) { return this.leasing.listLeases(actor); }

  @Get('leases/:id')
  @Roles(...OWNERS, ...TENANTS, ...REVIEWERS)
  lease(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.leasing.getLease(actor, id); }

  @Post('leases')
  @Roles(...TENANTS)
  create(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreateLeaseDto) { return this.leasing.createLease(actor, body); }

  @Post('leases/:id/respond')
  @Roles(...OWNERS, ...TENANTS)
  respond(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: RespondLeaseDto) { return this.leasing.respond(actor, id, body); }

  @Post('leases/:id/withdraw')
  @Roles(...OWNERS, ...TENANTS)
  withdraw(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: LeaseNoteDto) { return this.leasing.withdraw(actor, id, body); }

  @Post('leases/:id/review')
  @Roles(...REVIEWERS)
  review(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: ReviewLeaseDto) { return this.leasing.review(actor, id, body); }

  @Post('leases/:id/payments/:period')
  @Roles(...OWNERS)
  recordPayment(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('period') period: string, @Body() body: RecordRentPaymentDto) { return this.leasing.recordPayment(actor, id, period, body); }

  @Post('leases/:id/deposit')
  @Roles(...OWNERS)
  recordDeposit(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: RecordDepositDto) { return this.leasing.recordDeposit(actor, id, body); }

  @Post('leases/:id/deposit/refund')
  @Roles(...OWNERS)
  returnDeposit(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: ReturnDepositDto) { return this.leasing.returnDeposit(actor, id, body); }

  @Post('leases/:id/end')
  @Roles(...OWNERS)
  end(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: EndLeaseDto) { return this.leasing.endLease(actor, id, body); }
}
