import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles, RequirePermission } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor')
  @RequirePermission('marketplace', 'read')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.list(user);
  }

  @Get(':id')
  @RequirePermission('marketplace', 'read')
  get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.get(id, user);
  }

  @Post()
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Manager')
  @RequirePermission('assets', 'create')
  create(@Body() body: CreateProjectDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.create(body, user);
  }
}

export interface CreateProjectDto {
  projectCode: string;
  projectName: string;
  description: string;
  organisationId: string;
  countryNodeId: string;
  sector: string;
  totalProjectCost: number;
  sponsorContribution: number;
  fundingRequired: number;
  proposedShariahContract: string;
  projectSponsorId: string;
}
