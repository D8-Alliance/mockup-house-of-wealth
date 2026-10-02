import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './audit.dto';

@Controller('admin/audit')
@RequirePermission('audit_logs', 'read')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('events')
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: AuditQueryDto) {
    return this.audit.list(actor, query);
  }

  @Get('events/export')
  async export(@CurrentUser() actor: AuthenticatedUser, @Query() query: AuditQueryDto, @Res() response: Response) {
    const result = await this.audit.exportCsv(actor, query);
    return response.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${result.fileName}"` }).send(result.content);
  }
}
