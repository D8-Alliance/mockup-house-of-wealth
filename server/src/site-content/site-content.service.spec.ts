import { BadRequestException } from '@nestjs/common';
import { SiteContentService } from './site-content.service';
import { AuthenticatedUser } from '../auth/identity.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const admin = { userId: 'SA', role: 'Super Admin', countryNodeId: 'CN-MYS', organisationId: 'ORG-1' } as unknown as AuthenticatedUser;

function setup(rows: Array<{ key: string; value: unknown }> = []) {
  const prisma = {
    siteContentEntry: {
      findMany: jest.fn(async () => rows),
      upsert: jest.fn((args: unknown) => args),
      deleteMany: jest.fn((args: unknown) => args),
    },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
  };
  const audit = { recordActor: jest.fn() };
  return { prisma, audit, service: new SiteContentService(prisma as never, audit as never) };
}

describe('SiteContentService', () => {
  it('shows visitors published content only, never drafts or revision history', async () => {
    const { service } = setup([
      { key: 'how.page.page-about-d8.published', value: { title: 'About' } },
      { key: 'how.page.page-about-d8.draft', value: { title: 'Draft' } },
      { key: 'how.shariah.revisions', value: [] },
      { key: 'how.shariah.status', value: 'published' },
    ]);
    expect(await service.published()).toEqual({ 'how.page.page-about-d8.published': { title: 'About' }, 'how.shariah.status': 'published' });
  });

  it('saves and removes the keys sent, and records who did it', async () => {
    const { prisma, audit, service } = setup();
    await service.save(admin, { 'how.shariah.content': { body: 'x' }, 'how.shariah.draft': null });
    expect(prisma.siteContentEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { key: 'how.shariah.content' }, create: expect.objectContaining({ updatedBy: 'SA' }) }));
    expect(prisma.siteContentEntry.deleteMany).toHaveBeenCalledWith({ where: { key: 'how.shariah.draft' } });
    expect(audit.recordActor).toHaveBeenCalledWith(admin, expect.objectContaining({ action: 'site_content.save', metadata: { keys: ['how.shariah.content', 'how.shariah.draft'] } }));
  });

  it('refuses keys outside the public pages and oversized content', async () => {
    const { service } = setup();
    await expect(service.save(admin, { 'how.secret.key': 1 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.save(admin, { 'how.shariah.content': 'x'.repeat(200_001) })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.save(admin, {})).rejects.toBeInstanceOf(BadRequestException);
  });
});
