import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Put, Query, RawBodyRequest, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Public, RequirePermission, Roles } from '../auth/roles.decorator';
import { FeatureModuleGuard } from '../modules/feature-module.guard';
import { RequireFeatureModule } from '../modules/feature-module.decorator';
import { KycQueueQueryDto, KycReviewDto, SaveKycDraftDto } from './kyc.dto';
import { KycService } from './kyc.service';
import { KycChecksService } from './checks/kyc-checks.service';
import { KycLivenessService } from './liveness/kyc-liveness.service';

const KYC_UPLOAD_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'];

function sendDocument(response: Response, document: { fileName: string; mimeType: string; fileContent: Uint8Array }) {
  response.setHeader('Content-Type', document.mimeType);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Disposition', `attachment; filename="${document.fileName.replace(/[^\w.\- ]/g, '_')}"`);
  response.send(Buffer.from(document.fileContent));
}

@Controller('kyc')
@UseGuards(FeatureModuleGuard)
@RequireFeatureModule('KYC_VERIFICATION')
export class KycController {
  constructor(private readonly kyc: KycService, private readonly liveness: KycLivenessService) {}

  // Applicant endpoints: any authenticated user may verify their own identity.

  @Get('me')
  mine(@CurrentUser() actor: AuthenticatedUser) {
    return this.kyc.getMine(actor);
  }

  @Put('me')
  saveDraft(@CurrentUser() actor: AuthenticatedUser, @Body() input: SaveKycDraftDto) {
    return this.kyc.saveDraft(actor, input);
  }

  @Post('me/documents/:documentType')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const extension = file.originalname.toLowerCase().split('.').pop() || '';
      if (KYC_UPLOAD_EXTENSIONS.includes(extension)) callback(null, true);
      else callback(new BadRequestException(`Unsupported file type .${extension}. Allowed: JPG, PNG, PDF.`), false);
    },
  }))
  uploadDocument(@CurrentUser() actor: AuthenticatedUser, @Param('documentType') documentType: string, @UploadedFile() file?: Express.Multer.File) {
    return this.kyc.uploadDocument(actor, documentType.toUpperCase(), file);
  }

  @Post('me/submit')
  submit(@CurrentUser() actor: AuthenticatedUser) {
    return this.kyc.submit(actor);
  }

  // Face verification (camera liveness prototype). The server issues the steps and checks every frame.

  @Get('me/liveness')
  latestLiveness(@CurrentUser() actor: AuthenticatedUser) {
    return this.liveness.latestMine(actor);
  }

  @Post('me/liveness/sessions')
  startLiveness(@CurrentUser() actor: AuthenticatedUser) {
    return this.liveness.start(actor);
  }

  @Post('me/liveness/sessions/:sessionId/steps/:step')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('frame', { limits: { fileSize: 5 * 1024 * 1024 } }))
  livenessFrame(@CurrentUser() actor: AuthenticatedUser, @Param('sessionId') sessionId: string, @Param('step') step: string, @UploadedFile() file?: Express.Multer.File) {
    return this.liveness.submitFrame(actor, sessionId, step.toUpperCase(), file);
  }

  @Get('me/documents/:documentId/download')
  async downloadMine(@CurrentUser() actor: AuthenticatedUser, @Param('documentId') documentId: string, @Res() response: Response) {
    sendDocument(response, await this.kyc.downloadMyDocument(actor, documentId));
  }

  // Reviewer endpoints (manual review by KYC officers).

  @Get('applications')
  @Roles('Super Admin', 'Country Admin', 'KYC Officer', 'Compliance Officer')
  @RequirePermission('users', 'read')
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: KycQueueQueryDto) {
    return this.kyc.listForReview(actor, query.status);
  }

  @Get('applications/:id')
  @Roles('Super Admin', 'Country Admin', 'KYC Officer', 'Compliance Officer')
  @RequirePermission('users', 'read')
  get(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.kyc.getForReview(actor, id);
  }

  @Get('applications/:id/documents/:documentId/download')
  @Roles('Super Admin', 'Country Admin', 'KYC Officer', 'Compliance Officer')
  @RequirePermission('users', 'read')
  async downloadForReview(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('documentId') documentId: string, @Res() response: Response) {
    sendDocument(response, await this.kyc.downloadForReview(actor, id, documentId));
  }

  @Post('applications/:id/review')
  @Roles('Super Admin', 'Country Admin', 'KYC Officer', 'Compliance Officer')
  @RequirePermission('users', 'approve')
  review(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: KycReviewDto) {
    return this.kyc.review(actor, id, input);
  }

  @Get('applications/:id/liveness')
  @Roles('Super Admin', 'Country Admin', 'KYC Officer', 'Compliance Officer')
  @RequirePermission('users', 'read')
  livenessForReview(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.liveness.latestForReview(actor, id);
  }

  @Get('applications/:id/liveness/frames/:frameId')
  @Roles('Super Admin', 'Country Admin', 'KYC Officer', 'Compliance Officer')
  @RequirePermission('users', 'read')
  async livenessFrameForReview(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('frameId') frameId: string, @Res() response: Response) {
    sendDocument(response, await this.liveness.frameForReview(actor, id, frameId));
  }

  @Post('applications/:id/checks/run')
  @Roles('Super Admin', 'Country Admin', 'KYC Officer', 'Compliance Officer')
  @RequirePermission('users', 'approve')
  rerunChecks(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.kyc.rerunChecks(actor, id);
  }
}

/**
 * Async results from eKYC providers. Public (providers have no user token):
 * each provider authenticates its own requests in parseWebhook, and results
 * are accepted only for a matching PENDING transaction.
 */
@Controller('kyc/webhooks')
export class KycWebhookController {
  constructor(private readonly checks: KycChecksService) {}

  @Public()
  @Post(':provider')
  @HttpCode(200)
  receive(@Param('provider') provider: string, @Req() request: RawBodyRequest<Request>) {
    if (!request.rawBody) throw new BadRequestException('Webhook body is required');
    const headers: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(request.headers)) headers[key] = Array.isArray(value) ? value[0] : value;
    return this.checks.applyWebhook(provider, { rawBody: request.rawBody, headers });
  }
}
