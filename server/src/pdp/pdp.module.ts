import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notifications/notification.module';
import { PdpController } from './pdp.controller';
import { PdpService } from './pdp.service';

@Module({
  imports: [AuditModule, NotificationModule],
  controllers: [PdpController],
  providers: [PdpService],
})
export class PdpModule {}
