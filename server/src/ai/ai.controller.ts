import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Roles } from '../auth/roles.decorator';
import { FeatureModuleGuard } from '../modules/feature-module.guard';
import { RequireFeatureModule } from '../modules/feature-module.decorator';
import { AiService } from './ai.service';
import { AiDecisionDto, ChatDto, ContractAdvisorDto, ContractDraftDto, ContractRetrievalDto, DueDiligenceDto, ProjectDueDiligenceDto, RagDocumentDto, RagSearchDto, ShariahAnalyzeDto, ShariahValidationDto } from './ai.dto';

@Controller('ai')
@UseGuards(FeatureModuleGuard)
@RequireFeatureModule('AI_INTELLIGENCE')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('chat') chat(@CurrentUser() actor: AuthenticatedUser, @Body() input: ChatDto) { return this.ai.chat(actor, input); }

  @Post('contract-advisor/analyze')
  @Roles('Super Admin', 'AI Administrator', 'Shariah Reviewer', 'Shariah Advisor', 'Legal Officer', 'Project Sponsor', 'Project Manager', 'Organization Admin', 'Retail Investor', 'HNWI Investor', 'Institutional Investor', 'Corporate Investor', 'Family Office')
  contractAdvisor(@CurrentUser() actor: AuthenticatedUser, @Body() input: ContractAdvisorDto) { return this.ai.contractAdvisor(actor, input); }

  @Post('contract-drafts/generate')
  @Roles('Super Admin', 'AI Administrator', 'Shariah Reviewer', 'Legal Officer', 'Project Sponsor', 'Project Manager', 'Organization Admin', 'Retail Investor', 'HNWI Investor', 'Institutional Investor', 'Corporate Investor', 'Family Office')
  contractDraft(@CurrentUser() actor: AuthenticatedUser, @Body() input: ContractDraftDto) { return this.ai.contractDraft(actor, input); }

  @Post('shariah/analyze')
  @Roles('Super Admin', 'AI Administrator', 'AI Model Reviewer', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee')
  shariah(@CurrentUser() actor: AuthenticatedUser, @Body() input: ShariahAnalyzeDto) { return this.ai.shariah(actor, input); }

  @Post('contracts/retrieve-clauses')
  @Roles('Super Admin', 'AI Administrator', 'AI Model Reviewer', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee', 'Legal Officer', 'Project Sponsor', 'Project Manager', 'Organization Admin')
  retrieveContractClauses(@CurrentUser() actor: AuthenticatedUser, @Body() input: ContractRetrievalDto) { return this.ai.retrieveContractClauses(actor, input); }

  @Post('contracts/validate-rules')
  @Roles('Super Admin', 'AI Administrator', 'AI Model Reviewer', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee', 'Legal Officer', 'Compliance Officer', 'Risk Officer')
  validateContractRules(@CurrentUser() actor: AuthenticatedUser, @Body() input: ShariahValidationDto) { return this.ai.validateContractRules(actor, input); }

  @Post('due-diligence/analyze')
  @Roles('Super Admin', 'AI Administrator', 'Compliance Officer', 'KYC Officer', 'KYB Officer', 'AML Officer', 'Risk Officer', 'Legal Officer', 'Project Sponsor', 'Project Manager', 'Organization Admin', 'Retail Investor', 'HNWI Investor', 'Institutional Investor', 'Corporate Investor', 'Family Office')
  dueDiligence(@CurrentUser() actor: AuthenticatedUser, @Body() input: DueDiligenceDto) { return this.ai.dueDiligence(actor, input); }

  @Post('projects/due-diligence/scan')
  @Roles('Super Admin', 'AI Administrator', 'Compliance Officer', 'KYC Officer', 'KYB Officer', 'AML Officer', 'Risk Officer', 'Legal Officer', 'Project Sponsor', 'Project Manager', 'Organization Admin', 'Retail Investor', 'HNWI Investor', 'Institutional Investor', 'Corporate Investor', 'Family Office')
  scanProjectDueDiligence(@CurrentUser() actor: AuthenticatedUser, @Body() input: ProjectDueDiligenceDto) { return this.ai.scanProjectDueDiligence(actor, input.projectId); }

  @Get('projects/:projectId/due-diligence/latest')
  @Roles('Super Admin', 'AI Administrator', 'Compliance Officer', 'KYC Officer', 'KYB Officer', 'AML Officer', 'Risk Officer', 'Legal Officer', 'Project Sponsor', 'Project Manager', 'Organization Admin', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee')
  latestDueDiligence(@CurrentUser() actor: AuthenticatedUser, @Param('projectId') projectId: string) { return this.ai.latestProjectDueDiligence(actor, projectId); }

  @Post('projects/:projectId/documents/:documentId/analyze')
  @Roles('Super Admin', 'AI Administrator', 'Compliance Officer', 'Risk Officer', 'Legal Officer', 'Project Sponsor', 'Project Manager', 'Organization Admin', 'Retail Investor', 'HNWI Investor', 'Institutional Investor', 'Corporate Investor', 'Family Office', 'Shariah Reviewer', 'Shariah Advisor', 'Shariah Committee')
  analyzeProjectDocument(@CurrentUser() actor: AuthenticatedUser, @Param('projectId') projectId: string, @Param('documentId') documentId: string) { return this.ai.analyzeProjectDocument(actor, projectId, documentId); }

  @Post('decisions/:id/review')
  @Roles('Super Admin', 'AI Administrator', 'AI Model Reviewer', 'Shariah Reviewer', 'Shariah Committee', 'Compliance Officer', 'Risk Officer')
  review(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: AiDecisionDto) { return this.ai.reviewDecision(actor, id, input); }

  @Post('rag/documents')
  @Roles('Super Admin', 'AI Administrator')
  createDocument(@CurrentUser() actor: AuthenticatedUser, @Body() input: RagDocumentDto) { return this.ai.createDocument(actor, input); }

  @Post('rag/documents/upload')
  @Roles('Super Admin', 'AI Administrator')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => callback(null, file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')),
  }))
  uploadDocument(@CurrentUser() actor: AuthenticatedUser, @Body() metadata: Partial<RagDocumentDto>, @UploadedFile() file?: Express.Multer.File) {
    return this.ai.uploadPdf(actor, metadata, file);
  }

  @Post('rag/documents/search') search(@CurrentUser() actor: AuthenticatedUser, @Body() input: RagSearchDto) { return this.ai.searchDocuments(actor, input); }

  @Get('conversations/:id') getConversation(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.ai.getConversation(actor, id);
  }
}
