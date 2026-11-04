import { Body, Controller, Delete, Get, Headers, Ip, Param, Post, Put, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Public, RequirePermission, Roles } from '../auth/roles.decorator';
import { CreatePayoutDestinationDto } from '../distribution/payout-destination.dto';
import { DeathDecisionDto, HeirConsentDto, NoteDto, PlanDecisionDto, SettlementPlanDto } from './estate-cases.dto';
import { ESTATE_CASE_ROLES, EstateCasesService } from './estate-cases.service';
import { DeathReportDto, SaveExecutorDto } from './estate.dto';
import { EstateService } from './estate.service';

const OWNERS = ['Retail Investor', 'HNWI Investor', 'Family Office', 'Asset Owner'] as const;
const CASE_ROLES = ESTATE_CASE_ROLES as unknown as Parameters<typeof Roles>;
const upload = FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } });

/** The owner's executors (wasi) or administrators. */
@Controller('estate/executors')
@Roles(...OWNERS)
export class EstateExecutorsController {
  constructor(private readonly estate: EstateService) {}

  @Get()
  @RequirePermission('profile', 'read')
  list(@CurrentUser() actor: AuthenticatedUser) { return this.estate.listExecutors(actor); }

  @Post()
  @RequirePermission('profile', 'update')
  create(@CurrentUser() actor: AuthenticatedUser, @Body() input: SaveExecutorDto) { return this.estate.saveExecutor(actor, input); }

  @Put(':id')
  @RequirePermission('profile', 'update')
  update(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: SaveExecutorDto) { return this.estate.saveExecutor(actor, input, id); }

  @Delete(':id')
  @RequirePermission('profile', 'update')
  remove(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.estate.removeExecutor(actor, id); }
}

/** Reporting a death: no sign-in (the reporter may have no account), and very few requests a minute. */
@Controller('estate/death-reports')
@Public()
export class DeathReportController {
  constructor(private readonly cases: EstateCasesService) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UseInterceptors(upload)
  report(@Body() input: DeathReportDto, @UploadedFile() file: Express.Multer.File | undefined, @Ip() ip: string, @Headers('user-agent') userAgent?: string) {
    return this.cases.report(input, file, { ip, userAgent });
  }
}

/** Estate cases, for estate officers (Country Admin and Super Admin stand in). */
@Controller('estate/cases')
@Roles(...CASE_ROLES)
export class EstateCasesController {
  constructor(private readonly cases: EstateCasesService) {}

  @Get()
  list(@CurrentUser() actor: AuthenticatedUser) { return this.cases.list(actor); }

  @Get(':id')
  get(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.cases.get(actor, id); }

  @Post(':id/death')
  decideDeath(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: DeathDecisionDto) { return this.cases.decideDeath(actor, id, body.decision, body.note); }

  @Post(':id/documents/:documentType')
  @UseInterceptors(upload)
  upload(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('documentType') documentType: string, @UploadedFile() file: Express.Multer.File | undefined) { return this.cases.uploadDocument(actor, id, documentType, file); }

  @Get(':id/documents/:documentId/download')
  async download(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('documentId') documentId: string, @Res() response: Response) {
    const document = await this.cases.downloadDocument(actor, id, documentId);
    response.setHeader('Content-Type', document.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', `attachment; filename="${document.fileName.replace(/[^\w.\- ]/g, '_')}"`);
    response.send(Buffer.from(document.fileContent));
  }

  @Post(':id/documents-verified')
  verifyDocuments(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: NoteDto) { return this.cases.verifyDocuments(actor, id, body.note); }

  @Post(':id/heir-consents')
  consent(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: HeirConsentDto) { return this.cases.recordConsent(actor, id, body); }

  @Post(':id/estate-account')
  estateAccount(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: CreatePayoutDestinationDto) { return this.cases.addEstateAccount(actor, id, body); }

  @Get(':id/recipients')
  recipients(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Query('q') q = '') { return this.cases.recipients(actor, id, q); }

  @Put(':id/plan')
  submitPlan(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: SettlementPlanDto) { return this.cases.submitPlan(actor, id, body); }

  @Post(':id/plan/decision')
  decidePlan(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: PlanDecisionDto) { return this.cases.decidePlan(actor, id, body.decision, body.note); }
}
