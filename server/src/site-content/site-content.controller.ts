import { Body, Controller, Get, Put } from '@nestjs/common';
import { IsObject } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Public, RequirePermission, Roles } from '../auth/roles.decorator';
import { SiteContentService } from './site-content.service';

class SaveSiteContentDto {
  @IsObject() entries!: Record<string, unknown>;
}

/** The public site's editable pages. Visitors read; only Super Admin edits, since the site is one for all countries. */
@Controller('site-content')
export class SiteContentController {
  constructor(private readonly content: SiteContentService) {}

  @Get()
  @Public()
  published() {
    return this.content.published();
  }

  @Get('editor')
  @Roles('Super Admin')
  @RequirePermission('governance', 'update')
  all() {
    return this.content.all();
  }

  @Put()
  @Roles('Super Admin')
  @RequirePermission('governance', 'update')
  save(@CurrentUser() actor: AuthenticatedUser, @Body() body: SaveSiteContentDto) {
    return this.content.save(actor, body.entries);
  }
}
