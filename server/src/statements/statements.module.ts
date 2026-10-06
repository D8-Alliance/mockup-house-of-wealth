import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StatementsController } from './statements.controller';
import { StatementsService } from './statements.service';

@Module({ imports: [AuditModule], controllers: [StatementsController], providers: [StatementsService] })
export class StatementsModule {}
