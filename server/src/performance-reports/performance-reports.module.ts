import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notifications/notification.module';
import { PrismaModule } from '../prisma.module';
import { PerformanceReportsController } from './performance-reports.controller';
import { PerformanceReportsService } from './performance-reports.service';

@Module({ imports: [PrismaModule, AuditModule, NotificationModule], controllers: [PerformanceReportsController], providers: [PerformanceReportsService] })
export class PerformanceReportsModule {}
