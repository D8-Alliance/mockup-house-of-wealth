import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EstateController } from './estate.controller';
import { EstateService } from './estate.service';

@Module({
  imports: [AuditModule],
  controllers: [EstateController],
  providers: [EstateService],
})
export class EstateModule {}
