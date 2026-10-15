import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TaxModule } from '../tax/tax.module';
import { StatementsController } from './statements.controller';
import { StatementsService } from './statements.service';

@Module({ imports: [AuditModule, TaxModule], controllers: [StatementsController], providers: [StatementsService] })
export class StatementsModule {}
