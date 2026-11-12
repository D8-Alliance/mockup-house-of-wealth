import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Roles } from '../auth/roles.decorator';
import { RequireFeatureModule } from '../modules/feature-module.decorator';
import { FeatureModuleGuard } from '../modules/feature-module.guard';
import { CollectionAssignDto, CollectionFollowUpDto, CollectionNoteDto, CollectionReasonDto, CollectionTimingsDto, SetDutyDto } from './leasing.dto';
import { RentCollectionService } from './rent-collection.service';

const OWNERS = ['Asset Owner', 'Asset Manager'] as const;
const TENANTS = ['Organization Admin', 'Corporate Investor', 'Project Sponsor', 'Project Manager'] as const;

/** Rent collection for the owner's team: unpaid months, reminder letters, follow-ups and the hand-over to Legal. */
@Controller('leasing')
@UseGuards(FeatureModuleGuard)
@RequireFeatureModule('ASSET_REGISTRATION')
export class RentCollectionController {
  constructor(private readonly collection: RentCollectionService) {}

  @Get('team')
  @Roles(...OWNERS)
  team(@CurrentUser() actor: AuthenticatedUser) { return this.collection.team(actor); }

  @Post('team/duties')
  @Roles(...OWNERS)
  setDuty(@CurrentUser() actor: AuthenticatedUser, @Body() body: SetDutyDto) { return this.collection.setDuty(actor, body); }

  @Get('team/timings')
  @Roles(...OWNERS)
  timings(@CurrentUser() actor: AuthenticatedUser) { return this.collection.timings(actor); }

  @Put('team/timings')
  @Roles(...OWNERS)
  setTimings(@CurrentUser() actor: AuthenticatedUser, @Body() body: CollectionTimingsDto) { return this.collection.setTimings(actor, body); }

  @Get('collections')
  @Roles(...OWNERS)
  list(@CurrentUser() actor: AuthenticatedUser) { return this.collection.list(actor); }

  @Get('collections/:id')
  @Roles(...OWNERS)
  get(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.collection.get(actor, id); }

  @Post('collections/:id/remind')
  @Roles(...OWNERS)
  remind(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: CollectionNoteDto) { return this.collection.remind(actor, id, body.note); }

  @Post('collections/:id/follow-up')
  @Roles(...OWNERS)
  followUp(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: CollectionFollowUpDto) { return this.collection.followUp(actor, id, body); }

  @Post('collections/:id/assign')
  @Roles(...OWNERS)
  assign(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: CollectionAssignDto) { return this.collection.assign(actor, id, body.userId); }

  @Post('collections/:id/legal')
  @Roles(...OWNERS)
  escalate(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: CollectionReasonDto) { return this.collection.escalate(actor, id, body.note); }

  @Post('collections/:id/close')
  @Roles(...OWNERS)
  close(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: CollectionReasonDto) { return this.collection.close(actor, id, body.note); }

  @Get('collections/:id/letters/:number')
  @Roles(...OWNERS, ...TENANTS, 'Super Admin')
  async letter(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('number', ParseIntPipe) number: number, @Query('lang') lang: string, @Res() response: Response) {
    const result = await this.collection.letter(actor, id, number, lang);
    return response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${result.filename}"` }).send(result.buffer);
  }

  /** One zip for the owner's Legal team: case cover, the Ijarah agreement, the statement of account and every reminder letter. */
  @Get('collections/:id/legal-pack')
  @Roles(...OWNERS)
  async legalPack(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Query('lang') lang: string, @Res() response: Response) {
    const result = await this.collection.legalPack(actor, id, lang);
    return response.set({ 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${result.filename}"` }).send(result.buffer);
  }

  @Get('leases/:id/reminder-letters')
  @Roles(...OWNERS, ...TENANTS)
  lettersForLease(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.collection.lettersForLease(actor, id); }
}
