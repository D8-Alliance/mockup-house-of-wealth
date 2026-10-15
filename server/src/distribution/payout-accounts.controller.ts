import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { CreatePayoutDestinationDto } from './payout-destination.dto';
import { PayoutDestinationService } from './payout-destination.service';

/**
 * A user's own bank accounts for receiving money, on their profile. Kept apart from the
 * distributions API so it works whatever modules are switched on; settlement officers still
 * verify accounts through /distributions/payout-destinations/:id/verify.
 */
@Controller('users/me/payout-accounts')
export class PayoutAccountsController {
  constructor(private readonly destinations: PayoutDestinationService) {}

  @Get()
  list(@CurrentUser() actor: AuthenticatedUser) { return this.destinations.listMine(actor); }

  @Post()
  create(@CurrentUser() actor: AuthenticatedUser, @Body() input: CreatePayoutDestinationDto) { return this.destinations.createMine(actor, input); }

  @Patch(':id/default')
  setDefault(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.destinations.setDefault(actor, id); }

  @Delete(':id')
  remove(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.destinations.remove(actor, id); }
}
