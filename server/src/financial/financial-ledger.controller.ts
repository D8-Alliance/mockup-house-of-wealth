import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { CreateFinancialAccountDto, TransferFinancialAccountDto } from './financial-ledger.dto';
import { FinancialLedgerService } from './financial-ledger.service';

@Controller('financial')
@RequirePermission('ledger', 'read')
export class FinancialLedgerController {
  constructor(private readonly ledger: FinancialLedgerService) {}

  @Get('accounts')
  accounts(@CurrentUser() actor: AuthenticatedUser) {
    return this.ledger.listAccounts(actor);
  }

  @Get('accounts/:id/balance')
  balance(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.ledger.getBalance(actor, id);
  }

  @Get('ledger')
  ledgerTransactions(@CurrentUser() actor: AuthenticatedUser) {
    return this.ledger.listLedger(actor);
  }

  @Post('accounts')
  @RequirePermission('ledger', 'create')
  createAccount(@CurrentUser() actor: AuthenticatedUser, @Body() input: CreateFinancialAccountDto) {
    return this.ledger.createAccount(actor, input);
  }

  @Post('transfers')
  @RequirePermission('ledger', 'update')
  transfer(@CurrentUser() actor: AuthenticatedUser, @Body() input: TransferFinancialAccountDto) {
    return this.ledger.transfer(actor, input);
  }
}
