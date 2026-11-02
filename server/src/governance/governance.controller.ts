import { Body, Controller, Get, Param, Patch, Post, Put, Res } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Roles } from '../auth/roles.decorator';
import { CreateIncidentDto, SaveFatwaDto, SaveRiskDto, UpdateIncidentDto } from './governance.dto';
import { FATWA_EDITORS, FATWA_READERS, GOVERNANCE_READERS, GovernanceService, RISK_EDITORS, RISK_READERS } from './governance.service';

const roles = (list: string[]) => list as unknown as Parameters<typeof Roles>;

/** Admin Center governance: dashboards, reports, risk register, incidents, fatwas, fees, approvals, country rules. */
@Controller('governance')
export class GovernanceController {
  constructor(private readonly governance: GovernanceService) {}

  @Get('dashboards/compliance')
  @Roles(...roles(GOVERNANCE_READERS))
  compliance(@CurrentUser() actor: AuthenticatedUser) { return this.governance.complianceDashboard(actor); }

  @Get('dashboards/audit')
  @Roles(...roles(GOVERNANCE_READERS))
  audit(@CurrentUser() actor: AuthenticatedUser) { return this.governance.auditDashboard(actor); }

  @Get('dashboards/finance')
  @Roles(...roles(GOVERNANCE_READERS))
  finance(@CurrentUser() actor: AuthenticatedUser) { return this.governance.financeDashboard(actor); }

  @Get('dashboards/security')
  @Roles(...roles(GOVERNANCE_READERS))
  security(@CurrentUser() actor: AuthenticatedUser) { return this.governance.securityDashboard(actor); }

  @Get('reports')
  @Roles(...roles(GOVERNANCE_READERS))
  reports(@CurrentUser() actor: AuthenticatedUser) { return this.governance.reports(actor); }

  @Get('reports/:key')
  @Roles(...roles(GOVERNANCE_READERS))
  async report(@CurrentUser() actor: AuthenticatedUser, @Param('key') key: string, @Res() response: Response) {
    const file = await this.governance.report(actor, key);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    response.send(file.content);
  }

  @Get('risks')
  @Roles(...roles(RISK_READERS))
  risks(@CurrentUser() actor: AuthenticatedUser) { return this.governance.risks(actor); }

  @Post('risks')
  @Roles(...roles(RISK_EDITORS))
  createRisk(@CurrentUser() actor: AuthenticatedUser, @Body() body: SaveRiskDto) { return this.governance.saveRisk(actor, body); }

  @Put('risks/:id')
  @Roles(...roles(RISK_EDITORS))
  updateRisk(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: SaveRiskDto) { return this.governance.saveRisk(actor, body, id); }

  @Get('incidents')
  @Roles(...roles(RISK_READERS))
  incidents(@CurrentUser() actor: AuthenticatedUser) { return this.governance.incidents(actor); }

  @Post('incidents')
  @Roles(...roles(RISK_EDITORS))
  createIncident(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreateIncidentDto) { return this.governance.createIncident(actor, body); }

  @Patch('incidents/:id')
  @Roles(...roles(RISK_EDITORS))
  updateIncident(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateIncidentDto) { return this.governance.updateIncident(actor, id, body); }

  @Get('fatwas')
  @Roles(...roles(FATWA_READERS))
  fatwas(@CurrentUser() actor: AuthenticatedUser) { return this.governance.fatwas(actor); }

  @Post('fatwas')
  @Roles(...roles(FATWA_EDITORS))
  createFatwa(@CurrentUser() actor: AuthenticatedUser, @Body() body: SaveFatwaDto) { return this.governance.saveFatwa(actor, body); }

  @Put('fatwas/:id')
  @Roles(...roles(FATWA_EDITORS))
  updateFatwa(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: SaveFatwaDto) { return this.governance.saveFatwa(actor, body, id); }

  @Get('approval-matrix')
  @Roles(...roles(GOVERNANCE_READERS))
  approvalMatrix(@CurrentUser() actor: AuthenticatedUser) { return this.governance.approvalMatrix(actor); }

  @Get('fees')
  @Roles(...roles(GOVERNANCE_READERS))
  fees(@CurrentUser() actor: AuthenticatedUser) { return this.governance.fees(actor); }

  @Get('country-rules')
  @Roles(...roles(GOVERNANCE_READERS))
  countryRules(@CurrentUser() actor: AuthenticatedUser) { return this.governance.countryRules(actor); }
}
