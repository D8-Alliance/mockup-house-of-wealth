import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Roles } from '../auth/roles.decorator';
import { RequireFeatureModule } from '../modules/feature-module.decorator';
import { FeatureModuleGuard } from '../modules/feature-module.guard';
import { CreateLeaseDto, EndLeaseDto, LeasableUnitDto, LeaseNoteDto, LeaseUtilityChargeDto, OfferRenewalDto, RecordDepositDto, RecordRentPaymentDto, RejectRentPaymentDto, RenewLeaseDto, RespondLeaseDto, ReturnDepositDto, ReviewLeaseDto, UpdateLeasableUnitDto, UtilityDepositRuleDto } from './leasing.dto';
import { LeasingService } from './leasing.service';

const OWNERS = ['Asset Owner', 'Asset Manager'] as const;
const TENANTS = ['Organization Admin', 'Corporate Investor', 'Project Sponsor', 'Project Manager'] as const;
const COUNTRY_ADMINS = ['Super Admin', 'Country Admin'] as const;
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

  @Post('leases/:id/renew')
  @Roles(...TENANTS)
  renew(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: RenewLeaseDto) { return this.leasing.renewLease(actor, id, body); }

  @Post('leases/:id/offer-renewal')
  @Roles(...OWNERS)
  offerRenewal(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: OfferRenewalDto) { return this.leasing.offerRenewal(actor, id, body); }

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

  /** Accounts confirms rent another person recorded (two-person recording). */
  @Post('leases/:id/payments/:period/confirm')
  @Roles(...OWNERS)
  confirmPayment(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('period') period: string) { return this.leasing.confirmPayment(actor, id, period); }

  @Post('leases/:id/payments/:period/reject')
  @Roles(...OWNERS)
  rejectPayment(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('period') period: string, @Body() body: RejectRentPaymentDto) { return this.leasing.rejectPayment(actor, id, period, body.reason); }

  /** The statement of account (SOA): every charge billed so far and the balance, for the owner or the tenant. */
  @Get('leases/:id/statement.pdf')
  @Roles(...OWNERS, ...TENANTS, 'Super Admin')
  async statement(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Query('lang') lang: string, @Res() response: Response) {
    const result = await this.leasing.statement(actor, id, lang);
    return response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${result.filename}"` }).send(result.buffer);
  }

  /** The owner's SOA team sends this month's statement to the tenant now. */
  @Post('leases/:id/statement/send')
  @Roles(...OWNERS)
  sendStatement(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.leasing.sendStatement(actor, id); }

  @Post('leases/:id/deposit')
  @Roles(...OWNERS)
  recordDeposit(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: RecordDepositDto) { return this.leasing.recordDeposit(actor, id, body); }

  @Post('leases/:id/deposit/refund')
  @Roles(...OWNERS)
  returnDeposit(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: ReturnDepositDto) { return this.leasing.returnDeposit(actor, id, body); }

  @Post('leases/:id/utilities')
  @Roles(...OWNERS)
  addUtilityCharge(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: LeaseUtilityChargeDto) { return this.leasing.addUtilityCharge(actor, id, body); }

  @Post('leases/:id/utilities/:chargeId/paid')
  @Roles(...OWNERS)
  recordUtilityPayment(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('chargeId') chargeId: string, @Body() body: RecordRentPaymentDto) { return this.leasing.recordUtilityPayment(actor, id, chargeId, body); }

  @Post('leases/:id/utilities/:chargeId/remove')
  @Roles(...OWNERS)
  removeUtilityCharge(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('chargeId') chargeId: string, @Body() body: EndLeaseDto) { return this.leasing.removeUtilityCharge(actor, id, chargeId, body); }

  @Get('utility-deposit-rules')
  @Roles(...OWNERS, ...COUNTRY_ADMINS)
  utilityDepositRules(@CurrentUser() actor: AuthenticatedUser) { return this.leasing.utilityDepositRules(actor); }

  @Put('utility-deposit-rules')
  @Roles(...COUNTRY_ADMINS)
  setUtilityDepositRule(@CurrentUser() actor: AuthenticatedUser, @Body() body: UtilityDepositRuleDto) { return this.leasing.setUtilityDepositRule(actor, body); }

  @Delete('utility-deposit-rules/:state')
  @Roles(...COUNTRY_ADMINS)
  removeUtilityDepositRule(@CurrentUser() actor: AuthenticatedUser, @Param('state') state: string) { return this.leasing.removeUtilityDepositRule(actor, state); }

  @Post('leases/:id/end')
  @Roles(...OWNERS)
  end(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: EndLeaseDto) { return this.leasing.endLease(actor, id, body); }
}
