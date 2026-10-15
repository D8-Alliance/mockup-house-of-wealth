import path from 'node:path';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { assertAuthConfig } from './auth/identity.service';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Browser origins allowed to call the API. Set CORS_ORIGINS (comma-separated) in every
 * deployed environment; without it, only the local development frontend is allowed, and a
 * production server refuses to start rather than accept requests from any website.
 */
export function corsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = (env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean);
  if (configured.length) return configured;
  if (env.NODE_ENV === 'production') throw new Error('CORS_ORIGINS must list the frontend origin(s) in production, e.g. https://app.example.com');
  return ['http://localhost:3000', 'http://127.0.0.1:3000'];
}

async function bootstrap(): Promise<void> {
  // Fail fast: a production server must never start with unsigned (mock) sign-in.
  assertAuthConfig();
  // rawBody: eKYC provider webhooks are verified against the exact bytes received.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  // Behind Plesk/nginx the client address arrives in X-Forwarded-For; rate limits must use it.
  app.set('trust proxy', process.env.TRUST_PROXY ?? 'loopback');
  // Security headers. Files (PDFs, statements, KYC images) are fetched by a frontend on another
  // origin, so the resource policy allows cross-origin reads; CORS below still decides who may read.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({ origin: corsOrigins(), credentials: true, exposedHeaders: ['Content-Disposition'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Wealth Pooling API listening on http://localhost:${port}`);
  logger.log(`AUTH_MODE=${process.env.AUTH_MODE ?? 'mock'}`);
  logger.log(`CORS origins: ${corsOrigins().join(', ')}`);
  logger.log(`AI_PROVIDER=${process.env.OPENAI_API_KEY ? 'openai-compatible' : 'sandbox'}`);
  logger.log(`AI_MODEL=${process.env.OPENAI_MODEL ?? 'sandbox-contract-v1'}`);
}

if (require.main === module) void bootstrap();
