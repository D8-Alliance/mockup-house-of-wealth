import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notifications/notification.module';
import { EstateController, HibahQabulController } from './estate.controller';
import { EstateService } from './estate.service';

@Module({
  imports: [AuditModule, NotificationModule],
  controllers: [EstateController, HibahQabulController],
  providers: [EstateService],
})
export class EstateModule {}
