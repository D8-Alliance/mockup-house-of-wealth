import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateMyProfileDto } from './update-my-profile.dto';
import { mergePreferences } from './users.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

describe('profile preferences', () => {
  it('keeps settings that were not part of the change', () => {
    const saved = { currency: 'MYR', preferredContracts: ['Ijarah'], notifications: { email: false, push: true } };
    expect(mergePreferences(saved, { notifications: { sms: true } })).toEqual({ currency: 'MYR', preferredContracts: ['Ijarah'], notifications: { email: false, push: true, sms: true } });
    expect(mergePreferences(saved, { currency: 'IDR' })).toEqual({ ...saved, currency: 'IDR' });
  });

  it('starts from nothing when no preferences were saved', () => {
    expect(mergePreferences(undefined, { preferredContracts: [] })).toEqual({ preferredContracts: [] });
  });

  it('refuses unknown currencies, contracts and channel values', () => {
    const errors = (body: object) => validateSync(plainToInstance(UpdateMyProfileDto, body), { whitelist: true });
    expect(errors({ preferences: { currency: 'MYR', preferredContracts: ['Mudarabah'], notifications: { email: true } } })).toHaveLength(0);
    expect(errors({ preferences: { currency: 'XYZ' } })).not.toHaveLength(0);
    expect(errors({ preferences: { preferredContracts: ['Riba loan'] } })).not.toHaveLength(0);
    expect(errors({ preferences: { notifications: { email: 'yes' } } })).not.toHaveLength(0);
  });
});
