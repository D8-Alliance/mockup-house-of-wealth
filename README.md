# House of Wealth (Wealth Pooling)

A Shariah-compliant investment platform for the D-8 countries. Project delivery partners (PDPs) register projects and evidence; projects go through a staged feasibility review up to the Shariah Committee; investors then fund them through pools under an akad (Mudarabah, Musharakah, Wakalah or Ijarah). Profit is shared by the akad's ratio and every money movement is posted to a hash-chained double-entry ledger.

The full description of the current system is in **[DOKUMENTASI_SISTEM.md](DOKUMENTASI_SISTEM.md)** (Malay). Work that is not finished is in **[PENDING_ACTIVITIES.md](PENDING_ACTIVITIES.md)**. If anything here disagrees with those two files, they win.

## Stack

| Part | Technology | Where |
|---|---|---|
| Web app and mini-app (`/m`) | React 19, Vite 6, Tailwind CSS 4, TypeScript 5.8 | `src/`, port 3000 |
| API | NestJS 10, Prisma 6 | `server/src/`, port 3001 |
| Database | PostgreSQL with pgvector | `server/prisma/` |
| Jobs | Redis + BullMQ worker (`npm run start:worker`) | `server/src/jobs/` |
| Sign-in | Keycloak (OIDC); `AUTH_MODE=mock` for local development only | `server/keycloak/`, [server/KEYCLOAK_SETUP.md](server/KEYCLOAK_SETUP.md) |
| Payments | ToyyibPay (FPX) | `server/src/membership/` |
| Email | Resend or SMTP | `server/src/notifications/` |
| AI | Any OpenAI-compatible endpoint; Ollama locally and on staging | `server/src/ai/` |

## Run it locally

Copy-paste commands, test users and troubleshooting are in [RUN_COMMANDS.ps1](RUN_COMMANDS.ps1). In short:

```powershell
cd server
npm ci
npx prisma migrate deploy
npm run db:seed          # sample data
npm run start:dev        # API on http://localhost:3001 (check: curl.exe http://localhost:3001/health)

cd ..
npm ci
npm run dev              # web on http://localhost:3000, mini-app on /m
```

- **Backend settings:** copy `server/.env.example` to `server/.env` and fill it in. Each setting is explained there.
- **Frontend settings:** `.env.local` (`VITE_API_BASE_URL`, `VITE_AUTH_MODE`). `VITE_AUTH_MODE=DEMO` shows built-in sample data on some screens; anything else reads the server.
- **Frontend only, no backend:** `npm run dev:demo` (recorded data; see section 3.1 of the system document).
- **ToyyibPay callbacks locally:** expose the API with `ngrok http 3001` and set `TOYYIBPAY_CALLBACK_URL` to the tunnel.

## Checks

```powershell
npx tsc --noEmit                    # web
cd server; npm run typecheck        # API, including the spec files
cd server; npx jest                 # API tests
```

## Deploying

- **Staging (DigitalOcean):** [PANDUAN_STAGING_DIGITALOCEAN.md](PANDUAN_STAGING_DIGITALOCEAN.md). After pulling: `npm ci`, `npx prisma generate`, `npm run build`, `npx prisma migrate deploy`, `pm2 restart how-api`, then build the web app.
- **Public demo (Plesk, static build):** [DEPLOYMENT_TROUBLESHOOTING_PLESK.md](DEPLOYMENT_TROUBLESHOOTING_PLESK.md).
- **Production settings:** `server/.env.production.example`. Admin Center › Security Dashboard shows which production settings are still missing.

## Rules

- Prisma migrations are the source of truth: every schema change comes with a migration. Never change shared or production tables by hand; `prisma migrate reset` is for a disposable local database only.
- Every query on tenant data is scoped to the user's organisation and country.
- Payments are verified server to server before credits, plans or orders are granted, and are idempotent.
- The audit log and the ledger are append-only (database triggers refuse updates and deletes); corrections are reversals.
- Keycloak is the only sign-in system. `AUTH_MODE=mock` and simulated payments are refused in production.
- No secrets in Git, frontend code, screenshots or documents: `.env` files, keys, passwords and database dumps stay out of the repository.
- Branches: only `main` and `feat/keycloak-oidc-auth` are used.
