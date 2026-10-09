import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { CreateContractClauseDto, CreateContractInputSchemaDto, CreateContractTemplateDto, CreateDocumentVersionDto, CreateShariahRuleDto } from './contract-intelligence.dto';
import { ContractIntelligenceService } from './contract-intelligence.service';
import { AgreementGenerationService } from './agreement-generation.service';
import { AgreementReviewDto, AgreementWizardDto } from './agreement.dto';

@Controller('contract-intelligence')
export class ContractIntelligenceController {
  constructor(private readonly engine: ContractIntelligenceService, private readonly agreements: AgreementGenerationService) {}

  @Get('agreements') listAgreements(@CurrentUser() actor: AuthenticatedUser) { return this.agreements.list(actor); }
  @Post('agreements/drafts') createAgreementDraft(@Body() input: AgreementWizardDto, @CurrentUser() actor: AuthenticatedUser) { return this.agreements.createDraft(actor, input); }
  @Get('agreements/:agreementId') agreement(@Param('agreementId') id: string, @CurrentUser() actor: AuthenticatedUser) { return this.agreements.get(actor, id); }
  @Post('agreements/:agreementId/review') reviewAgreement(@Param('agreementId') id: string, @Body() input: AgreementReviewDto, @CurrentUser() actor: AuthenticatedUser) { return this.agreements.review(actor, id, input); }
  @Get('agreements/:agreementId/download/:format') async downloadAgreement(@Param('agreementId') id: string, @Param('format') format: 'docx' | 'pdf', @CurrentUser() actor: AuthenticatedUser, @Res() response: Response) { if (!['docx', 'pdf'].includes(format)) return response.status(400).json({ message: 'Format must be docx or pdf' }); const result = await this.agreements.render(actor, id, format); return response.set({ 'Content-Type': result.contentType, 'Content-Disposition': `attachment; filename="${result.filename}"` }).send(result.buffer); }

  @Get('templates') templates(@CurrentUser() actor: AuthenticatedUser, @Query('contractType') contractType?: string) { return this.engine.listTemplates(actor, contractType); }
  @Post('templates') createTemplate(@Body() input: CreateContractTemplateDto, @CurrentUser() actor: AuthenticatedUser) { return this.engine.createTemplate(input, actor); }

  @Get('clauses') clauses(@CurrentUser() actor: AuthenticatedUser, @Query('contractType') contractType?: string) { return this.engine.listClauses(actor, contractType); }
  @Post('clauses') createClause(@Body() input: CreateContractClauseDto, @CurrentUser() actor: AuthenticatedUser) { return this.engine.createClause(input, actor); }

  @Get('input-schemas') inputSchemas(@CurrentUser() actor: AuthenticatedUser, @Query('contractType') contractType?: string) { return this.engine.listInputSchemas(actor, contractType); }
  @Post('input-schemas') createInputSchema(@Body() input: CreateContractInputSchemaDto, @CurrentUser() actor: AuthenticatedUser) { return this.engine.createInputSchema(input, actor); }

  @Get('rules') rules(@CurrentUser() actor: AuthenticatedUser, @Query('contractType') contractType?: string, @Query('jurisdiction') jurisdiction?: string) { return this.engine.listRules(actor, contractType, jurisdiction); }
  @Post('rules') createRule(@Body() input: CreateShariahRuleDto, @CurrentUser() actor: AuthenticatedUser) { return this.engine.createRule(input, actor); }

  @Get('documents/:documentId/versions') documentVersions(@Param('documentId') documentId: string, @CurrentUser() actor: AuthenticatedUser) { return this.engine.listDocumentVersions(documentId, actor); }
  @Post('documents/:documentId/versions') createDocumentVersion(@Param('documentId') documentId: string, @Body() input: CreateDocumentVersionDto, @CurrentUser() actor: AuthenticatedUser) { return this.engine.createDocumentVersion(documentId, input, actor); }
}
