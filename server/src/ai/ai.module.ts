import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FeatureModuleModule } from '../modules/feature-module.module';
import { MembershipModule } from '../membership/membership.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { RagEmbeddingService } from './rag-embedding.service';
import { OpenAiProvider, SandboxAiProvider } from './ai.provider';
import { ContractClauseRetriever } from './contract-clause-retriever.service';

@Module({
  imports: [AuditModule, FeatureModuleModule, MembershipModule],
  controllers: [AiController],
  providers: [
    AiService,
    ContractClauseRetriever,
    RagEmbeddingService,
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
