import { Module } from '@nestjs/common';
import { DistributionModule } from '../distribution/distribution.module';
import { MembershipModule } from '../membership/membership.module';
import { NotificationModule } from '../notifications/notification.module';
import { PrismaModule } from '../prisma.module';
import { JobQueueService } from './job-queue.service';

@Module({ imports: [PrismaModule, MembershipModule, DistributionModule, NotificationModule], providers: [JobQueueService], exports: [JobQueueService] })
export class JobsModule {}
