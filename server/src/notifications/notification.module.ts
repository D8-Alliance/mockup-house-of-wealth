import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationOutboxPoller } from './notification-outbox.poller';

@Module({ imports: [PrismaModule, AuditModule], controllers: [NotificationController], providers: [NotificationService, NotificationDeliveryService, NotificationOutboxPoller], exports: [NotificationService] })
export class NotificationModule {}
