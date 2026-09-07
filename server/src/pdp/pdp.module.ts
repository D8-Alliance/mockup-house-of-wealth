import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PdpController } from './pdp.controller';
import { PdpService } from './pdp.service';

@Module({
  imports: [AuditModule],
  controllers: [PdpController],
  providers: [PdpService],
})
export class PdpModule {}
