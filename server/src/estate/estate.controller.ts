import { Body, Controller, Delete, Get, Headers, Ip, Param, Post, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Public, RequirePermission, Roles } from '../auth/roles.decorator';
import { HibahAnswerDto, SaveBeneficiaryDto } from './estate.dto';
import { EstateService } from './estate.service';

/** Individuals and asset owners keep estate instructions; staff and institutions do not. Each sees only their own. */
const OWNERS = ['Retail Investor', 'HNWI Investor', 'Family Office', 'Asset Owner'] as const;

@Controller('estate/beneficiaries')
@Roles(...OWNERS)
export class EstateController {
  constructor(private readonly estate: EstateService) {}

  @Get()
  @RequirePermission('profile', 'read')
  list(@CurrentUser() actor: AuthenticatedUser) { return this.estate.list(actor); }

  @Post()
  @RequirePermission('profile', 'update')
  create(@CurrentUser() actor: AuthenticatedUser, @Body() input: SaveBeneficiaryDto) { return this.estate.create(actor, input); }

  @Put(':id')
  @RequirePermission('profile', 'update')
  update(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: SaveBeneficiaryDto) { return this.estate.update(actor, id, input); }

  @Post(':id/primary')
  @RequirePermission('profile', 'update')
  setPrimary(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.estate.setPrimary(actor, id); }

  /** A one-time link for the hibah recipient to accept or decline (qabul). */
  @Post(':id/qabul-request')
  @RequirePermission('profile', 'update')
  requestQabul(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.estate.requestQabul(actor, id); }

  @Delete(':id')
  @RequirePermission('profile', 'update')
  remove(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.estate.remove(actor, id); }
}

/**
 * The hibah recipient's qabul link: no sign-in (the recipient may have no account), a handful of requests a
 * minute, and the link itself is the secret, checked against the recipient's ID and name.
 */
@Controller('estate/hibah')
@Public()
export class HibahQabulController {
  constructor(private readonly estate: EstateService) {}

  @Get(':token')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  offer(@Param('token') token: string) { return this.estate.hibahOffer(token); }

  @Post(':token')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  answer(@Param('token') token: string, @Body() input: HibahAnswerDto, @Ip() ip: string, @Headers('user-agent') userAgent?: string) { return this.estate.answerHibah(token, input, { ip, userAgent }); }
}
