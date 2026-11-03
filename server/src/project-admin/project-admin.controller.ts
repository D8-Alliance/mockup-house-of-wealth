import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Roles } from '../auth/roles.decorator';
import { ProjectAdminReasonDto } from './project-admin.dto';
import { ProjectAdminService } from './project-admin.service';

/** Administrators take a problem project out of the lists (archive) or halt it while it is looked into (suspend). */
@Controller('project-admin')
@Roles('Super Admin', 'Country Admin')
export class ProjectAdminController {
  constructor(private readonly projects: ProjectAdminService) {}

  @Get('projects')
  list(@CurrentUser() actor: AuthenticatedUser) { return this.projects.list(actor); }

  @Post('projects/:id/archive')
  archive(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: ProjectAdminReasonDto) { return this.projects.archive(actor, id, body.reason); }

  @Post('projects/:id/restore')
  restore(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: ProjectAdminReasonDto) { return this.projects.restore(actor, id, body.reason); }

  @Post('projects/:id/suspend')
  suspend(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: ProjectAdminReasonDto) { return this.projects.suspend(actor, id, body.reason); }

  @Post('projects/:id/resume')
  resume(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: ProjectAdminReasonDto) { return this.projects.resume(actor, id, body.reason); }
}
