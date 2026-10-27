import { Body, Controller, Delete, Get, Param, Post, Put, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Roles } from '../auth/roles.decorator';
import { CapitalDepositDto, CapitalPledgeDto, ProjectRiskFlagsDto, SafeguardReviewDto, TakafulPolicyDto } from './capital-takaful.dto';
import { CAPITAL_REVIEWER_ROLES, CapitalTakafulService, TAKAFUL_REVIEWER_ROLES } from './capital-takaful.service';

const REVIEWERS = [...new Set([...CAPITAL_REVIEWER_ROLES, ...TAKAFUL_REVIEWER_ROLES])] as unknown as Parameters<typeof Roles>;
const upload = FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } });

function sendFile(response: Response, file: { fileName: string; mimeType: string; fileContent: Uint8Array }) {
  response.setHeader('Content-Type', file.mimeType);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Disposition', `attachment; filename="${file.fileName.replace(/[^\w.\- ]/g, '_')}"`);
  response.send(Buffer.from(file.fileContent));
}

/** A project's capital (pledged, proved, deposited) and its takaful cover. */
@Controller()
export class CapitalTakafulController {
  constructor(private readonly safeguards: CapitalTakafulService) {}

  @Get('safeguards/queue')
  @Roles(...REVIEWERS)
  queue(@CurrentUser() actor: AuthenticatedUser) { return this.safeguards.queue(actor); }

  @Get('projects/:id/safeguards')
  view(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.safeguards.view(actor, id); }

  @Put('projects/:id/safeguards/risk-flags')
  riskFlags(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: ProjectRiskFlagsDto) { return this.safeguards.setRiskFlags(actor, id, body); }

  @Post('projects/:id/capital')
  pledge(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: CapitalPledgeDto) { return this.safeguards.pledge(actor, id, body); }

  @Delete('projects/:id/capital/:commitmentId')
  remove(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('commitmentId') commitmentId: string) { return this.safeguards.removePledge(actor, id, commitmentId); }

  @Post('projects/:id/capital/:commitmentId/evidence')
  @UseInterceptors(upload)
  evidence(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('commitmentId') commitmentId: string, @UploadedFile() file: Express.Multer.File | undefined) { return this.safeguards.uploadEvidence(actor, id, commitmentId, file); }

  @Post('projects/:id/capital/:commitmentId/review')
  reviewCapital(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('commitmentId') commitmentId: string, @Body() body: SafeguardReviewDto) { return this.safeguards.reviewCapital(actor, id, commitmentId, body.decision, body.note); }

  @Post('projects/:id/capital/:commitmentId/deposit')
  deposit(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('commitmentId') commitmentId: string, @Body() body: CapitalDepositDto) { return this.safeguards.recordDeposit(actor, id, commitmentId, body.reference); }

  @Get('projects/:id/capital/:commitmentId/evidence')
  async downloadEvidence(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('commitmentId') commitmentId: string, @Res() response: Response) {
    sendFile(response, await this.safeguards.evidence(actor, id, commitmentId));
  }

  @Post('projects/:id/takaful')
  @UseInterceptors(upload)
  addPolicy(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: TakafulPolicyDto, @UploadedFile() file: Express.Multer.File | undefined) { return this.safeguards.addPolicy(actor, id, body, file); }

  @Post('projects/:id/takaful/:policyId/review')
  reviewPolicy(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('policyId') policyId: string, @Body() body: SafeguardReviewDto) { return this.safeguards.reviewPolicy(actor, id, policyId, body.decision, body.note); }

  @Get('projects/:id/takaful/:policyId/document')
  async policyDocument(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('policyId') policyId: string, @Res() response: Response) {
    sendFile(response, await this.safeguards.policyDocument(actor, id, policyId));
  }
}
