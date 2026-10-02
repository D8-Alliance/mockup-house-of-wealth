import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Public, RequirePermission, Roles } from '../auth/roles.decorator';
import { MembershipService } from './membership.service';
import { ConsumeCreditsDto, ReconcilePaymentsDto, TopUpCreditsDto, UpgradeMembershipDto } from './membership.dto';
import { SettleRefundDto } from './refund.dto';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('plans')
  plans() {
    return this.membershipService.getPlans();
  }

  @Get('me')
  current(@CurrentUser() actor: AuthenticatedUser) {
    return this.membershipService.getMembershipStatus(actor);
  }

  @Get('me/billing')
  billing(@CurrentUser() actor: AuthenticatedUser) {
    return this.membershipService.billing(actor);
  }

  @Get('ai-capabilities')
  capabilities() {
    return this.membershipService.getCapabilityPricing();
  }

  @Get('me/credits')
  credits(@CurrentUser() actor: AuthenticatedUser) {
    return this.membershipService.getCreditSummary(actor);
  }

  @Get('me/credits/usage')
  creditUsage(@CurrentUser() actor: AuthenticatedUser) {
    return this.membershipService.getCreditUsage(actor);
  }

  @Get('me/transactions')
  transactions(@CurrentUser() actor: AuthenticatedUser) {
    return this.membershipService.getTransactions(actor);
  }

  @Get('me/transactions/:id/receipt')
  async transactionReceipt(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Res() response: Response) {
    const receipt = await this.membershipService.getTransactionReceipt(actor, id);
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${receipt.receiptNumber}.txt"`);
    response.send(receipt.content);
  }

  @Post('me/credits/consume')
  consumeCredits(@CurrentUser() actor: AuthenticatedUser, @Body() input: ConsumeCreditsDto) {
    return this.membershipService.consumeCredits(actor, input.operationKey, input.targetEntity);
  }

  @Post('me/credits/top-up')
  topUpCredits(@CurrentUser() actor: AuthenticatedUser, @Body() input: TopUpCreditsDto) {
    return this.membershipService.topUpCredits(actor, input.packageId, input.paymentMethod);
  }

  @Post('me/payments/:id/verify')
  verifyPayment(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.membershipService.verifyToyyibPayPayment(actor, id);
  }

  @Post('me/payments/:id/refund/settle')
  @Roles('Super Admin', 'Settlement Officer')
  @RequirePermission('ledger', 'update')
  settleRefund(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: SettleRefundDto) {
    return this.membershipService.settleVerifiedRefund(actor, id, input.amount, input.reason);
  }

  @Post('admin/payments/reconcile')
  @Roles('Super Admin', 'Settlement Officer')
  @RequirePermission('ledger', 'update')
  reconcilePayments(@CurrentUser() actor: AuthenticatedUser, @Body() input: ReconcilePaymentsDto) {
    return this.membershipService.reconcileOpenPayments(actor, input.limit);
  }

  @Post('me/payments/:id/cancel')
  cancelPayment(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.membershipService.cancelToyyibPayPayment(actor, id);
  }

  @Get('admin/credits/analytics')
  @Roles('Super Admin', 'AI Administrator', 'Organization Admin', 'Country Admin')
  adminCreditAnalytics(@CurrentUser() actor: AuthenticatedUser) {
    return this.membershipService.getAdminCreditAnalytics(actor);
  }

  @Post('me/upgrade')
  upgrade(@CurrentUser() actor: AuthenticatedUser, @Body() input: UpgradeMembershipDto) {
    return this.membershipService.upgrade(actor, input);
  }

  @Public()
  @Post('payments/toyyibpay/callback')
  toyyibPayCallback(@Body() input: Record<string, unknown>) {
    return this.membershipService.handleToyyibPayCallback(input);
  }
}
