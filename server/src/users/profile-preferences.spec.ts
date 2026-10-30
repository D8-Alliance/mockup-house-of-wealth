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
    expect(mergePreferences({ currency: 'MYR' }, { estateFramework: 'Civil', language: 'ms' })).toEqual({ currency: 'MYR', estateFramework: 'Civil', language: 'ms' });
  });

  it('refuses unknown currencies, contracts and channel values', () => {
    const errors = (body: object) => validateSync(plainToInstance(UpdateMyProfileDto, body), { whitelist: true });
    expect(errors({ preferences: { currency: 'MYR', preferredContracts: ['Mudarabah'], notifications: { email: true } } })).toHaveLength(0);
    expect(errors({ preferences: { currency: 'XYZ' } })).not.toHaveLength(0);
    expect(errors({ preferences: { preferredContracts: ['Riba loan'] } })).not.toHaveLength(0);
    expect(errors({ preferences: { notifications: { email: 'yes' } } })).not.toHaveLength(0);
  });
});

describe('profile timezone and bio', () => {
  const errors = (body: object) => validateSync(plainToInstance(UpdateMyProfileDto, body), { whitelist: true });

  it('accepts an IANA time zone and a short bio', () => {
    expect(errors({ timezone: 'Asia/Kuala_Lumpur', bio: 'Head of IT, Al-Hidayah Group.' })).toHaveLength(0);
    expect(errors({ timezone: 'America/Argentina/Buenos_Aires' })).toHaveLength(0);
  });

  it('refuses anything that is not a time zone, and an overlong bio', () => {
    expect(errors({ timezone: 'GMT+8; DROP TABLE' })).not.toHaveLength(0);
    expect(errors({ bio: 'x'.repeat(1001) })).not.toHaveLength(0);
  });
});
