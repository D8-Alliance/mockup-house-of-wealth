import { NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/identity.service';
import { AiService } from './ai.service';
import { OFFER_ADVISOR_SYSTEM_PROMPT } from './offer-advisor-prompt';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

const actor: AuthenticatedUser = { userId: 'USR-AO', idpSubjectId: 'USR-AO', email: 'ao@example.test', name: 'AO', role: 'Asset Owner', countryNodeId: 'CN-MYS', organisationId: 'ORG-AO', assignedRoles: ['Asset Owner'] };

describe('AI suggestion while offering an asset to a project need', () => {
  const need = { id: 'NEED-MYS-1', title: 'Land for a nursery', assetType: 'LAND', quantity: 1, location: 'Jengka', startDate: new Date('2027-03-01'), endDate: new Date('2027-12-31'), preferredAkad: 'MUSHARAKAH', project: { projectName: 'FELCRA replanting', sector: 'Agro-Industrial', organisation: { name: 'FELCRA' } } };
  const prisma = {
    projectAssetNeed: { findFirst: jest.fn() },
    aiRun: { create: jest.fn().mockResolvedValue({ id: 'RUN-1' }), update: jest.fn().mockImplementation(async ({ data }) => ({ id: 'RUN-1', ...data })) },
  };
  const membership = { consumeCredits: jest.fn().mockResolvedValue({ cost: 20 }), refundFailedUse: jest.fn() };
  const provider = { providerName: 'test', modelName: 'test', generate: jest.fn().mockResolvedValue({ recommendation: { primaryStructure: 'Ijarah' }, requiresHumanReview: true }) };
  const assets = { adviserContext: jest.fn().mockResolvedValue({ subjectId: 'ASSET-MYS-1', asset: { assetType: 'LAND' }, guidance: { options: [] } }) };
  const service = new AiService(prisma as never, { recordActor: jest.fn() } as never, membership as never, {} as never, {} as never, provider as never, assets as never);

  beforeEach(() => jest.clearAllMocks());

  it('sends the need and its own instructions to the model, and charges like the asset adviser', async () => {
    prisma.projectAssetNeed.findFirst.mockResolvedValueOnce(need);
    await service.assetOfferAdvisor(actor, 'NEED-MYS-1', 'ASSET-MYS-1');
    expect(assets.adviserContext).toHaveBeenCalledWith(actor, 'ASSET-MYS-1');
    expect(membership.consumeCredits).toHaveBeenCalledWith(actor, 'CONTRACT_ANALYSIS', 'ASSET-MYS-1');
    expect(provider.generate).toHaveBeenCalledWith(expect.objectContaining({
      featureKey: 'asset_offer_advisor',
      systemPrompt: OFFER_ADVISOR_SYSTEM_PROMPT,
      context: expect.objectContaining({ need: expect.objectContaining({ preferredAkad: 'MUSHARAKAH', deliveryPartner: 'FELCRA', startDate: '2027-03-01' }) }),
    }));
  });

  it('refuses a need that is no longer open, before charging', async () => {
    prisma.projectAssetNeed.findFirst.mockResolvedValueOnce(null);
    await expect(service.assetOfferAdvisor(actor, 'NEED-MYS-1', 'ASSET-MYS-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(membership.consumeCredits).not.toHaveBeenCalled();
  });
});
