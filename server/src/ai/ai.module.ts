import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { AuditModule } from '../audit/audit.module';
import { FeatureModuleModule } from '../modules/feature-module.module';
import { MembershipModule } from '../membership/membership.module';
import { NotificationModule } from '../notifications/notification.module';
import { StuckAiRunSweeper } from './stuck-ai-run.sweeper';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { RagEmbeddingService } from './rag-embedding.service';
import { CitationAuditService } from './citation-audit.service';
import { OpenAiProvider, SandboxAiProvider } from './ai.provider';
import { ContractClauseRetriever } from './contract-clause-retriever.service';

@Module({
  imports: [AuditModule, FeatureModuleModule, MembershipModule, AssetsModule, NotificationModule],
  controllers: [AiController],
  providers: [
    AiService,
    StuckAiRunSweeper,
    ContractClauseRetriever,
    RagEmbeddingService,
    CitationAuditService,
    SandboxAiProvider,
    OpenAiProvider,
    {
      provide: 'AI_PROVIDER',
      inject: [SandboxAiProvider, OpenAiProvider],
      useFactory: (sandbox: SandboxAiProvider, openai: OpenAiProvider) => process.env.OPENAI_API_KEY ? openai : sandbox,
    },
  ],
  exports: [AiService, ContractClauseRetriever],
})
export class AiModule {}
