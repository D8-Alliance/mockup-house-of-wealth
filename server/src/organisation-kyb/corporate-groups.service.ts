import { Body, ConflictException, Controller, Delete, ForbiddenException, Get, Injectable, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma.service';
import { KYB_REVIEWER_ROLES } from './organisation-kyb.service';
import { normaliseGroupName } from './organisation-group';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SaveCorporateGroupDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(120, { each: true }) aliases?: string[];
}

/** Other spellings: trimmed, without blanks, repeats or the official name itself. */
function cleanAliases(name: string, aliases: readonly string[] = []): string[] {
  const seen = new Set([normaliseGroupName(name)]);
  return aliases.map((alias) => alias.trim()).filter((alias) => {
    const key = normaliseGroupName(alias);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * The corporate groups of a country, kept by the KYB reviewers and administrators. An organisation's declared
 * group is stored under the official name when it matches the name or another spelling, so two organisations of
 * one group are always found as related parties. Saving a group also moves organisations already using one of
 * its spellings to the official name.
 */
@Injectable()
export class CorporateGroupsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  list(actor: AuthenticatedUser) {
    return this.prisma.corporateGroup.findMany({ where: { countryNodeId: actor.countryNodeId }, orderBy: { name: 'asc' }, select: { id: true, name: true, aliases: true, updatedAt: true } });
  }

  async create(actor: AuthenticatedUser, input: SaveCorporateGroupDto) {
    this.assertKeeper(actor);
    await this.assertNameFree(actor.countryNodeId, input.name);
    const group = await this.prisma.corporateGroup.create({ data: { countryNodeId: actor.countryNodeId, name: input.name, aliases: cleanAliases(input.name, input.aliases), createdBy: actor.userId } });
    const moved = await this.applyToOrganisations(actor.countryNodeId, group);
    await this.audit.recordActor(actor, { action: 'corporate_group.create', resourceType: 'CorporateGroup', resourceId: group.id, countryNodeId: actor.countryNodeId, metadata: { name: group.name, aliases: group.aliases, organisationsUpdated: moved } });
    return { ...group, organisationsUpdated: moved };
  }

  async update(actor: AuthenticatedUser, id: string, input: SaveCorporateGroupDto) {
    this.assertKeeper(actor);
    const existing = await this.find(actor, id);
    await this.assertNameFree(actor.countryNodeId, input.name, id);
    const group = await this.prisma.corporateGroup.update({ where: { id }, data: { name: input.name, aliases: cleanAliases(input.name, [...(input.aliases ?? []), ...(existing.name !== input.name ? [existing.name] : [])]) } });
    const moved = await this.applyToOrganisations(actor.countryNodeId, group);
    await this.audit.recordActor(actor, { action: 'corporate_group.update', resourceType: 'CorporateGroup', resourceId: id, countryNodeId: actor.countryNodeId, metadata: { from: { name: existing.name, aliases: existing.aliases }, to: { name: group.name, aliases: group.aliases }, organisationsUpdated: moved } });
    return { ...group, organisationsUpdated: moved };
  }

  /** Removing a group leaves the organisations' declared names as they are. */
  async remove(actor: AuthenticatedUser, id: string) {
    this.assertKeeper(actor);
    const existing = await this.find(actor, id);
    await this.prisma.corporateGroup.delete({ where: { id } });
    await this.audit.recordActor(actor, { action: 'corporate_group.delete', resourceType: 'CorporateGroup', resourceId: id, countryNodeId: actor.countryNodeId, metadata: { name: existing.name, aliases: existing.aliases } });
    return { id };
  }

  /** Organisations of the country whose declared group is one of the group's spellings now carry its official name. */
  private async applyToOrganisations(countryNodeId: string, group: { name: string; aliases: string[] }) {
    const spellings = new Set([group.name, ...group.aliases].map(normaliseGroupName));
    const organisations = await this.prisma.organisation.findMany({ where: { countryNodeId, groupName: { not: null } }, select: { id: true, groupName: true } });
    const toMove = organisations.filter((row) => row.groupName !== group.name && spellings.has(normaliseGroupName(row.groupName)));
    if (toMove.length) await this.prisma.organisation.updateMany({ where: { id: { in: toMove.map((row) => row.id) } }, data: { groupName: group.name } });
    return toMove.length;
  }

  private async assertNameFree(countryNodeId: string, name: string, exceptId?: string) {
    const groups = await this.prisma.corporateGroup.findMany({ where: { countryNodeId, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { name: true, aliases: true } });
    const key = normaliseGroupName(name);
    const clash = groups.find((group) => [group.name, ...group.aliases].some((spelling) => normaliseGroupName(spelling) === key));
    if (clash) throw new ConflictException(`"${name}" is already ${clash.name === name ? 'a group' : `a spelling of ${clash.name}`}.`);
  }

  private async find(actor: AuthenticatedUser, id: string) {
    const group = await this.prisma.corporateGroup.findFirst({ where: { id, countryNodeId: actor.countryNodeId } });
    if (!group) throw new NotFoundException('Corporate group not found.');
    return group;
  }

  private assertKeeper(actor: AuthenticatedUser) {
    if (!KYB_REVIEWER_ROLES.includes(actor.role)) throw new ForbiddenException('Only KYB reviewers and administrators keep the group list.');
  }
}

@Controller('corporate-groups')
export class CorporateGroupsController {
  constructor(private readonly groups: CorporateGroupsService) {}

  /** The country's groups, for the KYB form's suggestions and the reviewers. */
  @Get()
  list(@CurrentUser() actor: AuthenticatedUser) { return this.groups.list(actor); }

  @Post()
  @Roles('Super Admin', 'Country Admin', 'KYB Officer', 'Compliance Officer')
  create(@CurrentUser() actor: AuthenticatedUser, @Body() body: SaveCorporateGroupDto) { return this.groups.create(actor, body); }

  @Patch(':id')
  @Roles('Super Admin', 'Country Admin', 'KYB Officer', 'Compliance Officer')
  update(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: SaveCorporateGroupDto) { return this.groups.update(actor, id, body); }

  @Delete(':id')
  @Roles('Super Admin', 'Country Admin', 'KYB Officer', 'Compliance Officer')
  remove(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.groups.remove(actor, id); }
}
