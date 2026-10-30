import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma.module';
import { CollectionAccountController } from './collection-account.controller';
import { CollectionAccountService } from './collection-account.service';

@Module({ imports: [PrismaModule, AuditModule], controllers: [CollectionAccountController], providers: [CollectionAccountService], exports: [CollectionAccountService] })
export class CollectionAccountModule {}
