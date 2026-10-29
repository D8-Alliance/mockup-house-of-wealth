import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Roles } from '../auth/roles.decorator';
import { OrganisationDetailsDto, OrganisationKybReviewDto } from './organisation-kyb.dto';
import { KYB_REVIEWER_ROLES, KYB_SUBMITTER_ROLES, OrganisationKybService } from './organisation-kyb.service';

const SUBMITTERS = KYB_SUBMITTER_ROLES as unknown as Parameters<typeof Roles>;
const REVIEWERS = KYB_REVIEWER_ROLES as unknown as Parameters<typeof Roles>;

/** An organisation's registration details and business verification (KYB). */
@Controller('organisations')
export class OrganisationKybController {
  constructor(private readonly kyb: OrganisationKybService) {}

  @Get('me/kyb')
  mine(@CurrentUser() actor: AuthenticatedUser) { return this.kyb.mine(actor); }

  @Put('me/kyb')
  @Roles(...SUBMITTERS)
  save(@CurrentUser() actor: AuthenticatedUser, @Body() body: OrganisationDetailsDto) { return this.kyb.saveDetails(actor, body); }

  @Post('me/kyb/documents/:documentType')
  @Roles(...SUBMITTERS)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  upload(@CurrentUser() actor: AuthenticatedUser, @Param('documentType') documentType: string, @UploadedFile() file: Express.Multer.File | undefined) { return this.kyb.upload(actor, documentType, file); }

  @Delete('me/kyb/documents/:documentId')
  @Roles(...SUBMITTERS)
  remove(@CurrentUser() actor: AuthenticatedUser, @Param('documentId') documentId: string) { return this.kyb.removeDocument(actor, documentId); }

  @Post('me/kyb/submit')
  @Roles(...SUBMITTERS)
  submit(@CurrentUser() actor: AuthenticatedUser) { return this.kyb.submit(actor); }

  @Get()
  @Roles('Super Admin', 'Country Admin')
  directory(@CurrentUser() actor: AuthenticatedUser) { return this.kyb.directory(actor); }

  @Get('kyb')
  @Roles(...REVIEWERS)
  queue(@CurrentUser() actor: AuthenticatedUser, @Query('status') status?: string) { return this.kyb.queue(actor, status); }

  @Get(':id/kyb')
  @Roles(...REVIEWERS)
  forReview(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.kyb.forReview(actor, id); }

  @Post(':id/kyb/review')
  @Roles(...REVIEWERS)
  review(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: OrganisationKybReviewDto) { return this.kyb.review(actor, id, body.decision, body.note); }

  @Get(':id/kyb/documents/:documentId/download')
  async download(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('documentId') documentId: string, @Res() response: Response) {
    const document = await this.kyb.download(actor, id, documentId);
    response.setHeader('Content-Type', document.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', `attachment; filename="${document.fileName.replace(/[^\w.\- ]/g, '_')}"`);
    response.send(Buffer.from(document.fileContent));
  }
}
