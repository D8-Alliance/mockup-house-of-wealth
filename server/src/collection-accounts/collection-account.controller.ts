import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { RequirePermission, Roles } from '../auth/roles.decorator';
import { SaveCollectionAccountDto } from './collection-account.dto';
import { CollectionAccountService } from './collection-account.service';

/** The platform's trust account per country. Investors see it with their order's payment instructions instead. */
@Controller('collection-accounts')
export class CollectionAccountController {
  constructor(private readonly accounts: CollectionAccountService) {}

  @Get()
  @Roles('Super Admin', 'Country Admin', 'Finance Officer', 'Settlement Officer', 'Treasury Officer')
  @RequirePermission('dashboard', 'read')
  list(@CurrentUser() actor: AuthenticatedUser) { return this.accounts.list(actor); }

  @Put(':countryNodeId')
  @Roles('Super Admin')
  @RequirePermission('governance', 'update')
  save(@CurrentUser() actor: AuthenticatedUser, @Param('countryNodeId') countryNodeId: string, @Body() input: SaveCollectionAccountDto) { return this.accounts.save(actor, countryNodeId, input); }
}
