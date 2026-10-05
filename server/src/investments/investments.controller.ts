import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermission, Roles } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { InvestmentsService } from './investments.service';
import { CancelInvestmentOrderDto, CreateInvestmentOrderDto } from './investments.dto';

@Controller('investments')
@RequirePermission('pooling', 'read')
export class InvestmentsController {
  constructor(private readonly investments: InvestmentsService) {}

  @Post('orders')
  create(@CurrentUser() actor: AuthenticatedUser, @Body() input: CreateInvestmentOrderDto) { return this.investments.createOrder(actor, input); }

  @Get('orders')
  list(@CurrentUser() actor: AuthenticatedUser) { return this.investments.listOrders(actor); }

  @Get('orders/:id')
  get(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.investments.getOrder(actor, id); }

  // Mirrors SETTLEMENT_ROLES in InvestmentsService; investors cannot settle (confirm payment of) orders.
  @Post('orders/:id/settle')
  @Roles('Super Admin', 'Settlement Officer', 'Portfolio Manager')
  settle(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.investments.settle(actor, id); }

  @Patch('orders/:id/cancel')
  cancel(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: CancelInvestmentOrderDto) { return this.investments.cancel(actor, id, input.reason); }
}
