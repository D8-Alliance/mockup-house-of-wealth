# House of Wealth

House of Wealth (HoW) is a multi-tenant Islamic circular economy platform for wealth pooling, investment, Shariah governance, financial management, asset management, AI-assisted analysis, KYC, contracts, and related services across Country Nodes and Organizations.

## Technology Stack

### Application

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Motion

### Backend

- NestJS 10
- TypeScript
- Prisma 6
- PostgreSQL
- REST API

### Infrastructure and Services

- PostgreSQL 16/17 compatible
- Docker Desktop
- Keycloak and OIDC
- ngrok for local webhook testing
- ToyyibPay sandbox for payment testing
- OpenAI-compatible AI and embedding providers

### Development and Testing

- Git and GitHub
- Visual Studio Code
- DBeaver or Prisma Studio
- Jest and ts-jest
- TypeScript compiler
- Vite production build

## Architecture

```text
                    +------------------+
                    |    Keycloak      |
                    | OIDC / MFA / SSO |
                    +--------+---------+
                             |
                             v
+------------------+  +------+-----------+  +------------------+
| React 19 + Vite  |->| NestJS REST API  |->| PostgreSQL       |
| UI / Dashboard    |  | RBAC             |  | Prisma           |
| Forms / Reports   |  | Tenant isolation |  | Migrations       |
+------------------+  | Business rules  |  +------------------+
                       | Audit logging   |
                       +------+-----------+
                              |
             +----------------+----------------+
             v                v                v
       +-----------+   +-------------+   +-------------+
       | AI/RAG    |   | ToyyibPay   |   | KYC / Files |
       | Providers |   | Payments    |   | Providers   |
       +-----------+   +-------------+   +-------------+
```

## Authentication and Authorization

Keycloak is the identity provider for OIDC, SSO, and MFA. HoW remains responsible for application authorization and tenant/business rules.

The backend is responsible for:

- Mapping IdP users to HoW users.
- Country Node context.
- Organization context.
- Roles and permissions.
- Tenant isolation.
- Project, funding, pool, membership, and payment authorization.
- Append-only audit events.

The application must not create a second independent authentication system that duplicates Keycloak. `AUTH_MODE=mock` is for local development and tests only.

## Admin Audit Endpoints

Read-only audit access is available to roles granted the `audit_logs:read` permission.

List scoped audit events:

```text
GET /admin/audit/events?page=1&limit=50&action=payment&from=2026-10-01T00:00:00.000Z
```

Export up to 10,000 scoped events as CSV:

```text
GET /admin/audit/events/export?resourceType=PaymentTransaction
```

Supported filters are `action`, `resourceType`, `userId`, `from`, and `to`. Country Admins and Organization Admins only receive events within their authorized tenant scope. Audit events are read-only; the application does not expose update or delete endpoints.

## Requirements

Install the following before starting development:

- Node.js 20 or newer.
- npm.
- PostgreSQL 16 or newer, or Docker Desktop.
- Git.
- Optional: Keycloak, DBeaver, Prisma Studio, ngrok, Visual Studio Code.

## Installation

From the project root:

```powershell
npm install
npm --prefix server install
```

Copy the backend environment template:

```powershell
copy server\.env.example server\.env
```

For local development, the default database URL should point to the local PostgreSQL instance used by the project. The currently used local Docker database is exposed at `127.0.0.1:55433`.

Example:

```env
DATABASE_URL="postgresql://postgres:password@127.0.0.1:55433/house_of_wealth_local"
AUTH_MODE=mock
DEFAULT_COUNTRY_NODE=CN-MYS
DEFAULT_ORGANISATION=ORG-PUBLIC
PORT=3001
NODE_ENV=development
```

Never commit `server/.env`.

## PostgreSQL and Prisma

Start the local PostgreSQL container if it is not already running:

```powershell
```

Generate the Prisma client and apply migrations:

```powershell
cd server
npm run prisma:generate
npx prisma migrate deploy
npx prisma migrate status
```

The database schema is managed by Prisma migrations. Migrations are the source of truth for application tables.

Developers should use this flow:

```text
Prisma schema
      |
      v
Migration SQL
      |
      v
PostgreSQL
      |
      v
DBeaver / Prisma Studio for inspection
```

Do not manually create or alter application tables in DBeaver. For a local disposable database only:

```powershell
npx prisma migrate reset
```

The reset command deletes local data and must not be used against shared or production databases.

Useful commands:

```powershell
npx prisma migrate status
npm run prisma:migrate
npm run prisma:push
npm run prisma:studio
npm run db:seed
```

## Keycloak

The development Keycloak configuration is in `keycloak/docker-compose.yml`.

Start Keycloak and its database:

```powershell
```

Default local Keycloak URL:

```text
http://localhost:8080
```

The compose file contains development credentials only. Replace them before using a shared or production environment.

## Development Servers

Start the backend in one terminal:

```powershell
cd server
npm run start:dev
```

Backend URL:

```text
http://localhost:3001
```

Start the frontend in a second terminal:

```powershell
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

Health check:

```powershell
curl.exe http://localhost:3001/health
```

Expected response contains:

```json
{"status":"ok","service":"house-of-wealth-api"}
```

## Environment Configuration

Important backend variables are defined in `server/.env.example`.

### Authentication

```env
AUTH_MODE=mock
DEFAULT_COUNTRY_NODE=CN-MYS
DEFAULT_ORGANISATION=ORG-PUBLIC
```

Use `AUTH_MODE=oidc` only after Keycloak/OIDC configuration is available.

### AI and RAG

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
RAG_EMBEDDING_MODEL=text-embedding-3-small
RAG_EMBEDDING_API_URL=
```

Empty provider credentials use the configured sandbox/fallback behavior where supported.

### ToyyibPay Sandbox

ToyyibPay credentials are server-side only:

```env
TOYYIBPAY_BASE_URL=
TOYYIBPAY_SECRET_KEY=
TOYYIBPAY_CATEGORY_CODE=
TOYYIBPAY_CALLBACK_URL=
TOYYIBPAY_RETURN_URL=http://localhost:3000/membership
```

For local webhook testing, expose the backend with ngrok:

```powershell
ngrok http 3001
```

Use the generated public URL as the callback base:

```env
TOYYIBPAY_CALLBACK_URL=https://your-tunnel.ngrok-free.app/membership/payments/toyyibpay/callback
```

The callback must be public and reachable by ToyyibPay. The backend verifies the bill status server-to-server before granting credits or activating a membership. Never expose `TOYYIBPAY_SECRET_KEY` to the frontend or commit it to Git.

## Payment Lifecycle

ToyyibPay payments use a server-side transaction record:

```text
INITIATED -> PENDING -> PAID
                     \-> FAILED
                     \-> RECONCILIATION_REQUIRED
```

Credits and membership entitlements are granted only after verified payment settlement. Callback processing is idempotent and records payment audit events.

Current integrated payment flows:

- AI credit top-up.
- Membership upgrade.

## Financial Ledger Foundation

Financial money movements are separate from the AI credit wallet. The financial ledger contains:

- `FinancialAccount` for tenant-scoped asset, liability, equity, revenue, and expense accounts.
- `LedgerTransaction` as the immutable transaction header.
- `LedgerEntry` as immutable debit/credit lines.
- Investment contribution records.
- Funding disbursement records.
- Refund records.
- Zakat payment records.
- Distribution and distribution allocation records.

Every posted transaction must have balanced debit and credit entries in one database transaction. Corrections must be represented by a reversal transaction; ledger headers and entries cannot be updated or deleted by database trigger. `FinancialLedgerService` is the only intended posting boundary and supports idempotency keys.

Financial staff settle a refund only after ToyyibPay confirms the provider-side refund:

```text
POST /membership/me/payments/:id/refund/settle
```

This endpoint records the verified refund in the ledger; it does not pretend that a provider refund has succeeded.

Investment and pool lifecycle endpoints are server-backed:

```text
PATCH /pools/:id/status
POST  /investments/orders
GET   /investments/orders
POST  /investments/orders/:id/settle
PATCH /investments/orders/:id/cancel
GET   /financial/ledger
POST  /financial/transfers
```

Investment settlement creates an immutable ledger contribution and automatically marks an open pool `FULL` when settled capital reaches the project funding target. Distribution allocations must match settled investor capital and are calculated server-side when revenue and eligible costs are supplied.

## Current Functional Modules

### Platform Foundation

- Country Nodes.
- Organizations and tenant context.
- Users, roles, permissions, and audit events.
- Feature module configuration.

### Projects and Governance

- Project lifecycle and sponsors.
- Project evidence and documents.
- AI feasibility pre-checks.
- Human evidence verification.
- Feasibility revisions and formal approvals.
- Funding and pool approval gates.

### Wealth and Finance

- Wealth pooling projects.
- Pool participants.
- Funding requests.
- Contracts and contract intelligence.
- Memberships and AI credit wallets.
- Project promotion payments.
- Zakat calculations and payments.

### AI and Data

- AI capability pricing and credit consumption.
- RAG ingestion, embeddings, and scoped retrieval.
- AI citations and citation review.
- Investment, risk, feasibility, and project analysis.

### Compliance and Operations

- KYC applications.
- Automated KYC checks and provider routing.
- Shariah reviews and jurisdiction rules.
- Append-only audit logging.

## Testing and Verification

Backend typecheck:

```powershell
cd server
npm run typecheck
```

Backend tests:

```powershell
npm test -- --runInBand
```

Frontend typecheck:

```powershell
cd ..
npm run lint
```

Frontend production build:

```powershell
npm run build
```

Backend production build:

```powershell
cd server
npm run build
```

Before committing:

```powershell
git diff --check
git status --short
```

## Database Development Rules

- Prisma migrations are the source of truth.
- Every schema change must include a migration.
- Tenant-scoped queries must filter by the authenticated user, Organization, and Country Node where applicable.
- Payment settlement must be server-verified and idempotent.
- Audit events are append-only.
- Do not use simulated payment behavior in production.
- Do not place secrets in frontend code, Git, screenshots, or documentation.
- Do not modify shared or production databases manually.

## Git Workflow

Use a feature branch for development:

```powershell
git checkout -b feature/<feature-name>
```

Commit focused changes:

```powershell
git add .
git commit -m "feat: describe the change"
```

Push and open a Pull Request:

```powershell
git push -u origin feature/<feature-name>
```

Keep `main` stable. Do not commit `.env`, API keys, passwords, private keys, database dumps, or provider secrets.

## Project Setup Verification

Run:

```powershell
node --version
npm --version
cd server
npx prisma migrate status
npm run typecheck
npm test -- --runInBand
```

Then start both development servers and verify:

- Frontend loads at `http://localhost:3000`.
- Backend health responds at `http://localhost:3001/health`.
- PostgreSQL is reachable through Prisma.
- Keycloak is reachable at `http://localhost:8080` when OIDC development is enabled.

## Deployment Direction

Development:

```text
Developer PC -> Docker/PostgreSQL -> Local API -> Local React/Vite
                                      |
                                      +-> ngrok -> ToyyibPay sandbox callbacks
```

Future staging and production:

```text
GitHub -> CI/CD -> Staging infrastructure -> Production infrastructure
```

Production should use:

- HTTPS for frontend, API, Keycloak, and webhook endpoints.
- Managed PostgreSQL with backups.
- Secret management outside Git.
- A stable callback domain instead of ngrok.
- OIDC/Keycloak rather than mock authentication.
- Payment provider production credentials only after sandbox verification.
- Database migration deployment through CI/CD.
