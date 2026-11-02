import { Body, Controller, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Roles } from '../auth/roles.decorator';
import { INVESTOR_ROLES } from '../pools/pool-access';
import { ReviewPerformanceReportDto, SavePerformanceReportDto } from './performance-reports.dto';
import { PerformanceReportsService, REPORT_VERIFIER_ROLES, REPORT_WRITER_ROLES } from './performance-reports.service';

const roles = (list: string[]) => list as unknown as Parameters<typeof Roles>;

/** Quarterly project performance reports: the PDP fills them, an auditor verifies them, investors read them. */
@Controller('performance-reports')
export class PerformanceReportsController {
  constructor(private readonly reports: PerformanceReportsService) {}

  @Get('queue')
  @Roles(...roles(REPORT_VERIFIER_ROLES))
  queue(@CurrentUser() actor: AuthenticatedUser) { return this.reports.queue(actor); }

  @Get('mine')
  @Roles(...roles([...INVESTOR_ROLES]))
  mine(@CurrentUser() actor: AuthenticatedUser) { return this.reports.forInvestor(actor); }

  @Get('projects/:projectId')
  list(@CurrentUser() actor: AuthenticatedUser, @Param('projectId') projectId: string) { return this.reports.list(actor, projectId); }

  @Put('projects/:projectId/:year/:quarter')
  @Roles(...roles(REPORT_WRITER_ROLES))
  save(@CurrentUser() actor: AuthenticatedUser, @Param('projectId') projectId: string, @Param('year', ParseIntPipe) year: number, @Param('quarter', ParseIntPipe) quarter: number, @Body() body: SavePerformanceReportDto) {
    return this.reports.save(actor, projectId, year, quarter, body);
  }

  @Post('projects/:projectId/:year/:quarter/submit')
  @Roles(...roles(REPORT_WRITER_ROLES))
  submit(@CurrentUser() actor: AuthenticatedUser, @Param('projectId') projectId: string, @Param('year', ParseIntPipe) year: number, @Param('quarter', ParseIntPipe) quarter: number) {
    return this.reports.submit(actor, projectId, year, quarter);
  }

  @Post(':id/review')
  @Roles(...roles(REPORT_VERIFIER_ROLES))
  review(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: ReviewPerformanceReportDto) { return this.reports.review(actor, id, body); }
}
