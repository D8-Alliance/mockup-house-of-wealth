import path from 'node:path';
import dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.WORKER_ENABLED = 'true';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const shutdown = async () => { await app.close(); process.exit(0); };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

void bootstrap();
