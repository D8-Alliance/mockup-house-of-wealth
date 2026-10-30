import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermission, Roles } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { InvestmentsService } from './investments.service';
import { FeatureModuleGuard } from '../modules/feature-module.guard';
import { RequireFeatureModule } from '../modules/feature-module.decorator';
import { CancelInvestmentOrderDto, CreateInvestmentOrderDto, SettleInvestmentOrderDto } from './investments.dto';

@Controller('investments')
@UseGuards(FeatureModuleGuard)
@RequireFeatureModule('WEALTH_POOLING')
@RequirePermission('pooling', 'read')
export class InvestmentsController {
  constructor(private readonly investments: InvestmentsService) {}

  @Post('orders')
  create(@CurrentUser() actor: AuthenticatedUser, @Body() input: CreateInvestmentOrderDto) { return this.investments.createOrder(actor, input); }

  @Get('settlement-queue')
  @Roles('Super Admin', 'Settlement Officer', 'Portfolio Manager', 'Finance Officer')
  settlementQueue(@CurrentUser() actor: AuthenticatedUser) { return this.investments.settlementQueue(actor); }

  @Get('orders')
  list(@CurrentUser() actor: AuthenticatedUser) { return this.investments.listOrders(actor); }

  /** The signed-in investor's holding in each pool; investor accounts only. */
  @Get('positions')
  positions(@CurrentUser() actor: AuthenticatedUser) { return this.investments.positions(actor); }

  /** The investor's profit from each distribution period; investor accounts only. */
  @Get('distributions')
  distributions(@CurrentUser() actor: AuthenticatedUser) { return this.investments.myDistributions(actor); }

  /** Where the investor transfers the money for their own order, and the reference to use. */
  @Get('orders/:id/payment-instructions')
  paymentInstructions(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.investments.paymentInstructions(actor, id); }

  @Get('orders/:id')
  get(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.investments.getOrder(actor, id); }

  // Mirrors SETTLEMENT_ROLES in InvestmentsService; investors cannot settle (confirm payment of) orders.
  @Post('orders/:id/settle')
  @Roles('Super Admin', 'Settlement Officer', 'Portfolio Manager', 'Finance Officer')
  settle(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: SettleInvestmentOrderDto) { return this.investments.settle(actor, id, input.paymentReference); }

  @Patch('orders/:id/cancel')
  cancel(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: CancelInvestmentOrderDto) { return this.investments.cancel(actor, id, input.reason); }
}
