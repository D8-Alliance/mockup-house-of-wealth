import { Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermission, Roles } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './audit.dto';
import { HashChainService } from './hash-chain.service';

@Controller('admin/audit')
@RequirePermission('audit_logs', 'read')
export class AuditController {
  constructor(private readonly audit: AuditService, private readonly hashChain: HashChainService) {}

  @Get('events')
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: AuditQueryDto) {
    return this.audit.list(actor, query);
  }

  /** Recomputes the audit and ledger hash chains; platform-wide, so limited to Super Admin and Auditor. */
  @Get('integrity')
  @Roles('Super Admin', 'Auditor')
  integrity() {
    return this.hashChain.verifyAll();
  }

  /** Seals records not yet in the chain (normally done by the background worker every 5 minutes). */
  @Post('integrity/seal')
  @Roles('Super Admin')
  async seal() {
    return { sealed: await this.hashChain.sealAll(), ...(await this.hashChain.verifyAll()) };
  }

  @Get('events/export')
  async export(@CurrentUser() actor: AuthenticatedUser, @Query() query: AuditQueryDto, @Res() response: Response) {
    const result = await this.audit.exportCsv(actor, query);
    return response.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${result.fileName}"` }).send(result.content);
  }
}
