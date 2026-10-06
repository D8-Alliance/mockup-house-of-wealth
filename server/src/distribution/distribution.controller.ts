import { Body, Controller, Get, Headers, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public, RequirePermission, Roles } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { FeatureModuleGuard } from '../modules/feature-module.guard';
import { RequireFeatureModule } from '../modules/feature-module.decorator';
import { CreateDistributionDto, DistributionDecisionDto, DistributionRejectionDto, PayoutFailureDto, RecordPeriodResultDto, SubmitPayoutDto } from './distribution.dto';
import { DistributionService } from './distribution.service';
import { PayoutDestinationService } from './payout-destination.service';
import { CreatePayoutDestinationDto } from './payout-destination.dto';

@Controller('distributions')
@UseGuards(FeatureModuleGuard)
@RequireFeatureModule('WEALTH_POOLING')
export class DistributionController {
  constructor(private readonly distributions: DistributionService, private readonly destinations: PayoutDestinationService) {}

  @Get()
  @RequirePermission('pooling', 'read')
  list(@CurrentUser() actor: AuthenticatedUser) {
    return this.distributions.list(actor);
  }

  @Get('payout-destinations')
  @RequirePermission('ledger', 'read')
  listDestinations(@CurrentUser() actor: AuthenticatedUser) { return this.destinations.list(actor); }

  @Post('payout-destinations')
  @RequirePermission('ledger', 'read')
  createDestination(@CurrentUser() actor: AuthenticatedUser, @Body() input: CreatePayoutDestinationDto) { return this.destinations.create(actor, input); }

  @Post('payout-destinations/:id/verify')
  @Roles('Super Admin', 'Settlement Officer')
  @RequirePermission('ledger', 'update')
  verifyDestination(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.destinations.verify(actor, id); }

  @Post()
  @Roles('Super Admin', 'Settlement Officer')
  @RequirePermission('ledger', 'update')
  create(@CurrentUser() actor: AuthenticatedUser, @Body() input: CreateDistributionDto) {
    return this.distributions.create(actor, input);
  }

  /** Records a loss, or profit absorbed by earlier losses, without a payout. */
  @Post('period-results')
  @Roles('Super Admin', 'Settlement Officer')
  recordPeriodResult(@CurrentUser() actor: AuthenticatedUser, @Body() input: RecordPeriodResultDto) {
    return this.distributions.recordPeriodResult(actor, input);
  }

  @Post(':id/submit')
  @Roles('Super Admin', 'Settlement Officer')
  @RequirePermission('ledger', 'update')
  submit(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.distributions.submit(actor, id); }

  @Post(':id/approve')
  @Roles('Super Admin', 'Settlement Officer')
  @RequirePermission('ledger', 'update')
  approve(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: DistributionDecisionDto) { return this.distributions.approve(actor, id, input.comment); }

  @Post(':id/reject')
  @Roles('Super Admin', 'Settlement Officer')
  @RequirePermission('ledger', 'update')
  reject(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: DistributionRejectionDto) { return this.distributions.reject(actor, id, input.comment); }

  @Post(':id/process')
  @Roles('Super Admin', 'Settlement Officer')
  @RequirePermission('ledger', 'update')
  process(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.distributions.process(actor, id); }

  @Post('payouts/:payoutId/submit')
  @Roles('Super Admin', 'Settlement Officer')
  @RequirePermission('ledger', 'update')
  submitPayout(@CurrentUser() actor: AuthenticatedUser, @Param('payoutId') payoutId: string, @Body() input: SubmitPayoutDto) { return this.distributions.submitPayout(actor, payoutId, input.providerReference); }

  @Post('payouts/:payoutId/settle')
  @Roles('Super Admin', 'Settlement Officer')
  @RequirePermission('ledger', 'update')
  settlePayout(@CurrentUser() actor: AuthenticatedUser, @Param('payoutId') payoutId: string) { return this.distributions.settlePayout(actor, payoutId); }

  @Post('payouts/:payoutId/fail')
  @Roles('Super Admin', 'Settlement Officer')
  @RequirePermission('ledger', 'update')
  failPayout(@CurrentUser() actor: AuthenticatedUser, @Param('payoutId') payoutId: string, @Body() input: PayoutFailureDto) { return this.distributions.failPayout(actor, payoutId, input.reason); }

  @Post('payouts/:payoutId/retry')
  @Roles('Super Admin', 'Settlement Officer')
  @RequirePermission('ledger', 'update')
  retryPayout(@CurrentUser() actor: AuthenticatedUser, @Param('payoutId') payoutId: string) { return this.distributions.retryPayout(actor, payoutId); }

  @Post('payouts/:payoutId/reverse')
  @Roles('Super Admin', 'Settlement Officer')
  @RequirePermission('ledger', 'update')
  reversePayout(@CurrentUser() actor: AuthenticatedUser, @Param('payoutId') payoutId: string, @Body() input: PayoutFailureDto) { return this.distributions.reversePayout(actor, payoutId, input.reason); }

  @Post('payouts/reconcile')
  @Roles('Super Admin', 'Settlement Officer')
  @RequirePermission('ledger', 'update')
  reconcilePayouts(@CurrentUser() actor: AuthenticatedUser) { return this.distributions.reconcilePayouts(actor); }

  @Post('payouts/webhook/:provider')
  @Public()
  async payoutWebhook(@Param('provider') provider: string, @Headers('x-payout-signature') signature: string | undefined, @Req() request: Request, @Body() body: Record<string, unknown>) {
    const secret = process.env.PAYOUT_WEBHOOK_SECRET;
    const rawBody = (request as Request & { rawBody?: Buffer }).rawBody || Buffer.from(JSON.stringify(body));
    if (!secret || !signature) throw new UnauthorizedException('Payout webhook is not configured.');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const supplied = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer)) throw new UnauthorizedException('Invalid payout webhook signature.');
    const eventId = String(body.eventId || body.id || '');
    const payoutId = String(body.payoutId || body.payoutInstructionId || '');
    const status = String(body.status || '').toUpperCase();
    if (!eventId || !payoutId || !['SUBMITTED', 'SETTLED', 'FAILED'].includes(status)) throw new UnauthorizedException('Invalid payout webhook payload.');
    return this.distributions.handleProviderWebhook(provider, eventId, payoutId, String(body.eventType || status), status, body.providerReference ? String(body.providerReference) : undefined, body);
  }
}
