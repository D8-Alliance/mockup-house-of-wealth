import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { readFileSync } from 'node:fs';

if (process.env.RUN_INTEGRATION_TESTS === 'true') {
describe('PostgreSQL and Redis integration', () => {
  const prisma = new PrismaClient();
  const password = process.env.REDIS_PASSWORD || (process.env.REDIS_PASSWORD_FILE ? readFileSync(process.env.REDIS_PASSWORD_FILE, 'utf8').trim() : undefined);
  const queue = new Queue('house-of-wealth-background', { connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT || 6379), password, ...(process.env.REDIS_TLS === 'true' ? { tls: { ca: process.env.REDIS_CA_CERT_FILE ? readFileSync(process.env.REDIS_CA_CERT_FILE) : undefined } } : {}) } });

  afterAll(async () => {
    await queue.close();
    await prisma.$disconnect();
  });

  it('connects to PostgreSQL and Redis and round-trips a job', async () => {
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
    await queue.waitUntilReady();
    const job = await queue.add('integration-probe', { createdAt: new Date().toISOString() }, { removeOnComplete: true });
    expect(job.id).toBeDefined();
  });
});
} else {
  test.skip('PostgreSQL and Redis integration requires RUN_INTEGRATION_TESTS=true', () => undefined);
}
