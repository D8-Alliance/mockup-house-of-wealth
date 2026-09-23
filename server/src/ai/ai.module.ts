import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FeatureModuleModule } from '../modules/feature-module.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenAiProvider, SandboxAiProvider } from './ai.provider';

@Module({
  imports: [AuditModule, FeatureModuleModule],
  controllers: [AiController],
  providers: [
    AiService,
    SandboxAiProvider,
    OpenAiProvider,
    {
      provide: 'AI_PROVIDER',
      inject: [SandboxAiProvider, OpenAiProvider],
      useFactory: (sandbox: SandboxAiProvider, openai: OpenAiProvider) => process.env.OPENAI_API_KEY ? openai : sandbox,
    },
  ],
})
export class AiModule {}
