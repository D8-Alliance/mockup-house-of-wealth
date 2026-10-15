import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { HashChainService } from './hash-chain.service';

@Module({
  providers: [AuditService, HashChainService],
  controllers: [AuditController],
  exports: [AuditService, HashChainService],
})
export class AuditModule {}
