import { NotificationService } from './notification.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

/** One outbox row and the Prisma calls processOutbox makes on it. */
function setup(channels: string) {
  let row: Record<string, unknown> = { id: 'OUT-1', dedupeKey: 'k', recipientUserId: 'U1', organisationId: 'O1', countryNodeId: 'CN-MYS', type: 'T', title: 'Title', message: 'Body', channels, deliveredChannels: '', status: 'PENDING', attempts: 0, createdAt: new Date() };
  const prisma = {
    notificationOutbox: {
      findMany: jest.fn(async () => (row.status === 'PENDING' ? [{ ...row }] : [])),
      updateMany: jest.fn(async ({ data }: { data: Record<string, unknown> }) => { row = { ...row, status: data.status }; return { count: 1 }; }),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => { row = { ...row, ...data }; return row; }),
    },
    user: { findUnique: jest.fn(async () => ({ email: 'investor@example.test', profile: { pushToken: 'device-1' } })) },
    notification: { upsert: jest.fn(async () => ({})) },
  };
  const delivery = { deliverEach: jest.fn() };
  const service = new NotificationService(prisma as never, {} as never, delivery as never);
  return { service, delivery, current: () => row };
}

describe('notification outbox retries', () => {
  it('retries only the channel that failed, never re-sending one that went out', async () => {
    const { service, delivery, current } = setup('IN_APP,EMAIL,PUSH');
    delivery.deliverEach.mockResolvedValueOnce([{ channel: 'EMAIL', outcome: 'SENT' }, { channel: 'PUSH', outcome: 'FAILED', reason: 'FCM 503' }]);
    await service.processOutbox();
    expect(current()).toMatchObject({ status: 'PENDING', deliveredChannels: 'EMAIL' });
    expect(current().lastError).toContain('PUSH: FCM 503');

    current().nextAttemptAt = new Date(0);
    delivery.deliverEach.mockResolvedValueOnce([{ channel: 'PUSH', outcome: 'SENT' }]);
    await service.processOutbox();
    expect(delivery.deliverEach).toHaveBeenLastCalledWith(expect.objectContaining({ channels: 'IN_APP,PUSH' }));
    expect(current()).toMatchObject({ status: 'PROCESSED', deliveredChannels: 'EMAIL,PUSH', lastError: null });
  });

  it('finishes with the skipped channels noted when a channel is not set up', async () => {
    const { service, delivery, current } = setup('IN_APP,EMAIL,SMS');
    delivery.deliverEach.mockResolvedValueOnce([{ channel: 'EMAIL', outcome: 'SENT' }, { channel: 'SMS', outcome: 'SKIPPED', reason: 'not configured' }]);
    await service.processOutbox();
    expect(current()).toMatchObject({ status: 'PROCESSED', deliveredChannels: 'EMAIL,SMS' });
    expect(current().lastError).toBe('Skipped SMS (not configured)');
  });

  it('passes a stored file to the email and drops it once sent', async () => {
    const { service, delivery, current } = setup('IN_APP,EMAIL');
    Object.assign(current(), { attachmentName: 'statement.pdf', attachment: new Uint8Array([37, 80, 68, 70]) });
    delivery.deliverEach.mockResolvedValueOnce([{ channel: 'EMAIL', outcome: 'SENT' }]);
    await service.processOutbox();
    expect(delivery.deliverEach).toHaveBeenCalledWith(expect.objectContaining({ attachment: { filename: 'statement.pdf', content: Buffer.from('%PDF') } }));
    expect(current()).toMatchObject({ status: 'PROCESSED', attachment: null });
  });
});
