import { channelsForRecipient } from './notification.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

describe('channelsForRecipient', () => {
  it('sends every channel when the user saved no preferences', () => {
    expect(channelsForRecipient('IN_APP,EMAIL,PUSH', {})).toBe('IN_APP,EMAIL,PUSH');
  });

  it('drops the channels the user switched off but always keeps in-app', () => {
    const profile = { preferences: { notifications: { email: false, push: true, sms: false } } };
    expect(channelsForRecipient('IN_APP, EMAIL, PUSH, SMS', profile)).toBe('IN_APP,PUSH');
  });
});
