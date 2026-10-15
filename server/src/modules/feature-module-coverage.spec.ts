import { FEATURE_MODULE_KEY } from './feature-module.decorator';
import { InvestmentsController } from '../investments/investments.controller';
import { ContractsController } from '../contracts/contracts.controller';
import { ContractIntelligenceController } from '../contract-intelligence/contract-intelligence.controller';
import { ProjectsController } from '../projects/projects.controller';
import { PoolsController } from '../pools/pools.controller';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

/** Each admin switch in Module Availability must actually guard the API it names. */
describe('feature module switches guard their APIs', () => {
  it('guards whole controllers', () => {
    expect(Reflect.getMetadata(FEATURE_MODULE_KEY, InvestmentsController)).toBe('WEALTH_POOLING');
    expect(Reflect.getMetadata(FEATURE_MODULE_KEY, PoolsController)).toBe('WEALTH_POOLING');
    expect(Reflect.getMetadata(FEATURE_MODULE_KEY, ContractsController)).toBe('CONTRACTS');
    expect(Reflect.getMetadata(FEATURE_MODULE_KEY, ContractIntelligenceController)).toBe('CONTRACTS');
  });

  it('guards project document and evidence uploads with Document Vault', () => {
    const proto = ProjectsController.prototype as unknown as Record<string, unknown>;
    const guarded = Object.getOwnPropertyNames(proto).filter((name) => typeof proto[name] === 'function' && Reflect.getMetadata(FEATURE_MODULE_KEY, proto[name] as object) === 'DOCUMENT_VAULT');
    expect(guarded.length).toBe(2);
  });
});
