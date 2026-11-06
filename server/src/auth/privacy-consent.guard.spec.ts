import { allowedBeforeConsent } from './privacy-consent.guard';

describe('privacy notice before use', () => {
  it('lets a user see who they are and accept the notice, and nothing else', () => {
    expect(allowedBeforeConsent('/users/me')).toBe(true);
    expect(allowedBeforeConsent('/users/me/access')).toBe(true);
    expect(allowedBeforeConsent('/users/me/privacy-consent')).toBe(true);
    expect(allowedBeforeConsent('/users/me/privacy-consent?x=1')).toBe(true);
    expect(allowedBeforeConsent('/auth/logout')).toBe(true);
    expect(allowedBeforeConsent('/users/me/profile')).toBe(false);
    expect(allowedBeforeConsent('/investments/orders')).toBe(false);
    expect(allowedBeforeConsent('/users')).toBe(false);
  });
});
