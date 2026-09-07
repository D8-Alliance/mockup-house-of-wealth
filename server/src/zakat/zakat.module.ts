import { Module } from '@nestjs/common';
import { ZakatController } from './zakat.controller';
import { ZakatService } from './zakat.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ZakatController],
  providers: [ZakatService],
})
export class ZakatModule {}
