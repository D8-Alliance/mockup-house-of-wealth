import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Roles } from '../auth/roles.decorator';
import { MembershipService } from './membership.service';
import { ConsumeCreditsDto, TopUpCreditsDto, UpgradeMembershipDto } from './membership.dto';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('plans')
  plans() {
    return this.membershipService.getPlans();
  }

  @Get('me')
  current(@CurrentUser() actor: AuthenticatedUser) {
    return this.membershipService.getCurrent(actor);
  }

  @Get('me/billing')
  billing(@CurrentUser() actor: AuthenticatedUser) {
    return this.membershipService.billing(actor);
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

  @Get('admin/credits/analytics')
  @Roles('Super Admin', 'AI Administrator', 'Organization Admin', 'Country Admin')
  adminCreditAnalytics() {
    return this.membershipService.getAdminCreditAnalytics();
  }

  @Post('me/upgrade')
  upgrade(@CurrentUser() actor: AuthenticatedUser, @Body() input: UpgradeMembershipDto) {
    return this.membershipService.upgrade(actor, input);
  }
}
