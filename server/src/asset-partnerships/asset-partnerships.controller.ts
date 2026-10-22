import { Body, Controller, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Roles } from '../auth/roles.decorator';
import { RequireFeatureModule } from '../modules/feature-module.decorator';
import { FeatureModuleGuard } from '../modules/feature-module.guard';
import { AssetListingDto, CreateAssetNeedDto, CreateEngagementDto, RespondEngagementDto, ReviewEngagementDto, UpdateNeedStatusDto, WithdrawEngagementDto } from './asset-partnership.dto';
import { AssetPartnershipsService } from './asset-partnerships.service';

const OWNERS = ['Asset Owner', 'Asset Manager'] as const;
const PDP = ['Project Sponsor', 'Project Manager', 'Organization Admin'] as const;
const REVIEWERS = ['Super Admin', 'Country Admin', 'Legal Officer', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee'] as const;

/** Asset owners and delivery partners (PDPs) bring verified assets into projects under an approved akad. */
@Controller('asset-partnerships')
@UseGuards(FeatureModuleGuard)
@RequireFeatureModule('ASSET_REGISTRATION')
export class AssetPartnershipsController {
  constructor(private readonly partnerships: AssetPartnershipsService) {}

  @Put('assets/:assetId/listing')
  @Roles(...OWNERS)
  setListing(@CurrentUser() actor: AuthenticatedUser, @Param('assetId') assetId: string, @Body() body: AssetListingDto) { return this.partnerships.setListing(actor, assetId, body); }

  @Get('listed-assets')
  @Roles(...PDP, ...REVIEWERS)
  listedAssets(@CurrentUser() actor: AuthenticatedUser, @Query('type') type?: string) { return this.partnerships.listedAssets(actor, type); }

  @Get('needs')
  @Roles(...OWNERS, ...PDP, ...REVIEWERS)
  needs(@CurrentUser() actor: AuthenticatedUser) { return this.partnerships.listNeeds(actor); }

  @Post('needs')
  @Roles(...PDP)
  createNeed(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreateAssetNeedDto) { return this.partnerships.createNeed(actor, body); }

  @Get('needs/:id/offers')
  @Roles(...PDP, ...REVIEWERS)
  compareOffers(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.partnerships.compareOffers(actor, id); }

  @Patch('needs/:id/status')
  @Roles(...PDP)
  needStatus(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateNeedStatusDto) { return this.partnerships.updateNeedStatus(actor, id, body); }

  @Get('engagements')
  @Roles(...OWNERS, ...PDP, ...REVIEWERS)
  engagements(@CurrentUser() actor: AuthenticatedUser) { return this.partnerships.listEngagements(actor); }

  @Get('engagements/:id')
  @Roles(...OWNERS, ...PDP, ...REVIEWERS)
  engagement(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.partnerships.getEngagement(actor, id); }

  /** The system's checks for the Legal and Shariah reviewers of an accepted partnership. */
  @Get('engagements/:id/checks')
  @Roles(...REVIEWERS)
  checks(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.partnerships.reviewChecks(actor, id); }

  /** The history checked against the audit log, with when each party saw the other side's changes. */
  @Get('engagements/:id/record')
  @Roles(...OWNERS, ...PDP, ...REVIEWERS)
  record(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.partnerships.engagementRecord(actor, id); }

  @Get('engagements/:id/record.pdf')
  @Roles(...OWNERS, ...PDP, ...REVIEWERS)
  async recordPdf(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Res() response: Response) {
    const { filename, buffer } = await this.partnerships.engagementRecordPdf(actor, id);
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"` }).send(buffer);
  }

  @Post('engagements/:id/seen')
  @Roles(...OWNERS, ...PDP)
  seen(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.partnerships.markSeen(actor, id); }

  @Post('engagements')
  @Roles(...OWNERS, ...PDP)
  create(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreateEngagementDto) { return this.partnerships.createEngagement(actor, body); }

  @Post('engagements/:id/respond')
  @Roles(...OWNERS, ...PDP)
  respond(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: RespondEngagementDto) { return this.partnerships.respond(actor, id, body); }

  @Post('engagements/:id/withdraw')
  @Roles(...OWNERS, ...PDP)
  withdraw(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: WithdrawEngagementDto) { return this.partnerships.withdraw(actor, id, body); }

  @Post('engagements/:id/review')
  @Roles(...REVIEWERS)
  review(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: ReviewEngagementDto) { return this.partnerships.review(actor, id, body); }
}
