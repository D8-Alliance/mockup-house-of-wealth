import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { RequirePermission, Roles } from '../auth/roles.decorator';
import { RequireFeatureModule } from '../modules/feature-module.decorator';
import { FeatureModuleGuard } from '../modules/feature-module.guard';
import { ReviewAssetDto, SaveAssetDto, SitePhotoMetadataDto, SubmitAssetDto } from './asset.dto';
import { AssetsService } from './assets.service';

const OWNERS = ['Asset Owner', 'Asset Manager'] as const;
const REVIEWERS = ['Super Admin', 'Country Admin', 'Legal Officer'] as const;

/** Asset registration: owners register and submit, Country Admins and Legal Officers verify. */
@Controller('assets')
@UseGuards(FeatureModuleGuard)
@RequireFeatureModule('ASSET_REGISTRATION')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  @Roles(...OWNERS, ...REVIEWERS)
  @RequirePermission('assets', 'read')
  list(@CurrentUser() actor: AuthenticatedUser, @Query('status') status?: string) { return this.assets.list(actor, status); }

  @Get(':id')
  @Roles(...OWNERS, ...REVIEWERS)
  @RequirePermission('assets', 'read')
  get(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.assets.get(actor, id); }

  @Get(':id/structuring')
  @Roles(...OWNERS, ...REVIEWERS)
  @RequirePermission('assets', 'read')
  structuring(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.assets.structuring(actor, id); }

  @Post()
  @Roles(...OWNERS)
  @RequirePermission('assets', 'create')
  create(@CurrentUser() actor: AuthenticatedUser, @Body() input: SaveAssetDto) { return this.assets.create(actor, input); }

  @Patch(':id')
  @Roles(...OWNERS)
  @RequirePermission('assets', 'update')
  update(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: SaveAssetDto) { return this.assets.update(actor, id, input); }

  @Post(':id/documents/:documentType')
  @Roles(...OWNERS)
  @RequirePermission('assets', 'update')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  upload(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('documentType') documentType: string, @UploadedFile() file: Express.Multer.File | undefined, @Body() location: SitePhotoMetadataDto) {
    return this.assets.uploadDocument(actor, id, documentType.toUpperCase(), file, location);
  }

  @Delete(':id/documents/:documentId')
  @Roles(...OWNERS)
  @RequirePermission('assets', 'update')
  removeDocument(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('documentId') documentId: string) { return this.assets.removeDocument(actor, id, documentId); }

  @Get(':id/documents/:documentId/download')
  @Roles(...OWNERS, ...REVIEWERS)
  @RequirePermission('assets', 'read')
  async download(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Param('documentId') documentId: string, @Res() response: Response) {
    const document = await this.assets.downloadDocument(actor, id, documentId);
    response.setHeader('Content-Type', document.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', `attachment; filename="${document.fileName.replace(/[^\w.\- ]/g, '_')}"`);
    response.send(Buffer.from(document.fileContent));
  }

  @Post(':id/submit')
  @Roles(...OWNERS)
  @RequirePermission('assets', 'update')
  submit(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: SubmitAssetDto) { return this.assets.submit(actor, id, input); }

  @Post(':id/withdraw')
  @Roles(...OWNERS)
  @RequirePermission('assets', 'update')
  withdraw(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.assets.withdraw(actor, id); }

  @Post(':id/checks/run')
  @Roles(...REVIEWERS)
  @RequirePermission('assets', 'approve')
  rerunChecks(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.assets.rerunChecks(actor, id); }

  @Post(':id/review')
  @Roles(...REVIEWERS)
  @RequirePermission('assets', 'approve')
  review(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() input: ReviewAssetDto) { return this.assets.review(actor, id, input); }
}
