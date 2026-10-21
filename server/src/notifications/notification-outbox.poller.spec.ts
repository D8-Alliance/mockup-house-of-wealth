import { NotificationOutboxPoller } from './notification-outbox.poller';
import { NotificationService } from './notification.service';

jest.mock('./notification.service', () => ({ NotificationService: class {} }));

describe('NotificationOutboxPoller', () => {
  it('processes the outbox, never two runs at once, and survives a failure', async () => {
    let release: () => void = () => undefined;
    const processOutbox = jest.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; })).mockRejectedValueOnce(new Error('database down'));
    const poller = new NotificationOutboxPoller({ processOutbox } as unknown as NotificationService);
    const first = poller.tick();
    await poller.tick();
    expect(processOutbox).toHaveBeenCalledTimes(1);
    release();
    await first;
    await expect(poller.tick()).resolves.toBeUndefined();
    expect(processOutbox).toHaveBeenCalledTimes(2);
  });

  it('does not start a timer when a worker handles the outbox', () => {
    const previous = process.env.WORKER_ENABLED;
    process.env.WORKER_ENABLED = 'true';
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    new NotificationOutboxPoller({ processOutbox: jest.fn() } as unknown as NotificationService).onModuleInit();
    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
    process.env.WORKER_ENABLED = previous;
  });
});
