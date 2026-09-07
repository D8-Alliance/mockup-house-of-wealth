import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [PrismaModule, AuditModule, PolicyModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
