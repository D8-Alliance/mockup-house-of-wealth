import path from 'node:path';
import dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function bootstrap(): Promise<void> {
  // rawBody: eKYC provider webhooks are verified against the exact bytes received.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Wealth Pooling API listening on http://localhost:${port}`);
  logger.log(`AUTH_MODE=${process.env.AUTH_MODE ?? 'mock'}`);
  logger.log(`AI_PROVIDER=${process.env.OPENAI_API_KEY ? 'openai-compatible' : 'sandbox'}`);
  logger.log(`AI_MODEL=${process.env.OPENAI_MODEL ?? 'sandbox-contract-v1'}`);
}

void bootstrap();
