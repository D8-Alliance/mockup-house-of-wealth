import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notifications/notification.module';
import { CapitalTakafulController } from './capital-takaful.controller';
import { CapitalTakafulService } from './capital-takaful.service';
import { TakafulExpirySweeper } from './takaful-expiry.sweeper';

@Module({
  imports: [AuditModule, NotificationModule],
  controllers: [CapitalTakafulController],
  providers: [CapitalTakafulService, TakafulExpirySweeper],
  exports: [CapitalTakafulService],
})
export class CapitalTakafulModule {}
