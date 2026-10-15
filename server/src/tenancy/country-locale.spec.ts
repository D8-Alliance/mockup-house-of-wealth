import { BadRequestException } from '@nestjs/common';
import { localPhoneDigits, normalizePhone } from './country-phone';
import { formatLocalDateTime } from './country-time';

describe('normalizePhone', () => {
  it('adds the country dialling code to a local number', () => {
    expect(normalizePhone('012-345 6789', 'CN-MYS')).toBe('+60123456789');
    expect(normalizePhone('0812 3456 7890', 'CN-IDN')).toBe('+6281234567890');
  });

  it('keeps numbers already in international form', () => {
    expect(normalizePhone('+60 12 345 6789', 'CN-IDN')).toBe('+60123456789');
    expect(normalizePhone('0060123456789', 'CN-MYS')).toBe('+60123456789');
  });

  it('rejects text that is not a phone number', () => {
    expect(() => normalizePhone('call me', 'CN-MYS')).toThrow(BadRequestException);
  });

  it('formats Malaysian numbers the way local gateways expect', () => {
    expect(localPhoneDigits('+60123456789')).toBe('0123456789');
    expect(localPhoneDigits('+6281234567890')).toBe('6281234567890');
  });
});

describe('formatLocalDateTime', () => {
  it('shows UTC timestamps in Malaysia time (GMT+8)', () => {
    expect(formatLocalDateTime(new Date('2026-10-02T01:15:00Z'), 'CN-MYS')).toBe('2 Oct 2026, 9:15 am (GMT+8)');
  });

  it('rolls over to the next day when the local time passes midnight', () => {
    expect(formatLocalDateTime(new Date('2026-10-01T17:30:00Z'), 'CN-MYS')).toBe('2 Oct 2026, 1:30 am (GMT+8)');
  });
});
