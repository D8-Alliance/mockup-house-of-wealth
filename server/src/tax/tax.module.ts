import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TaxController } from './tax.controller';
import { TaxProfileService } from './tax-profile.service';

@Module({ imports: [AuditModule], controllers: [TaxController], providers: [TaxProfileService], exports: [TaxProfileService] })
export class TaxModule {}
