# Wealth Pooling Application Architecture

This diagram reflects the current repository architecture. It intentionally
does not show Laravel, Inertia, or shared backend/frontend domain modules,
because the current implementation uses React/Vite and NestJS/Prisma.

```mermaid
flowchart LR
    classDef frontend fill:#e8f7fb,stroke:#1397ae,stroke-width:2px,color:#123b55
    classDef business fill:#eef8ff,stroke:#63b5d3,stroke-width:1px,color:#123b55
    classDef backend fill:#edf4ff,stroke:#21639a,stroke-width:2px,color:#123b55
    classDef infra fill:#e7f8f5,stroke:#159b9b,stroke-width:2px,color:#123b55
    classDef external fill:#f4efff,stroke:#8b5cf6,stroke-width:2px,color:#38206b
    classDef partial fill:#fff7e6,stroke:#e3a229,stroke-width:2px,color:#65400b

    subgraph F[FRONTEND - React 19 + Vite + TypeScript]
      F1[UI components, layouts, cards, tables, modals]
      F2[Dashboard, assets, marketplace, pooling, contracts]
      F3[RBAC screen guards and role-aware navigation]
      F4[API client with bearer token]
      F5[Local demo providers and mock data]
      F1 --> F2
      F2 --> F3
      F2 --> F4
      F2 --> F5
    end

    subgraph B[BUSINESS CAPABILITIES]
      B1[Identity and tenant context]
      B2[Projects and wealth pools]
      B3[Funding requests and approvals]
      B4[Contracts and lifecycle]
      B5[PDP onboarding and documents]
      B6[Shariah reviews and human decisions]
      B7[Audit, ledger, zakat, membership]
      B8[AI advisory layer - mock provider / partial API integration]
      B9[Frontend-only pooling workflows - approvals, distributions, exits]
    end

    subgraph S[BACKEND - NestJS + Prisma]
      S1[OIDC guard and session validation]
      S2[Roles guard and policy engine]
      S3[ProjectsController / ProjectsService]
      S4[PoolsController / PoolsService]
      S5[FundingController / FundingService]
      S6[ContractsController / ContractsService]
      S7[PDP and membership services]
      S8[Shariah review and decision API]
      S9[AuditService - append-only events]
    end

    subgraph I[INFRASTRUCTURE]
      I1[(PostgreSQL)]
      I2[Keycloak OIDC + MFA]
      I3[Local NestJS API :3001]
      I4[Local Vite app :3000]
      I5[Docker / VPS deployment - postponed]
    end

    F4 -->|REST / JSON + Bearer token| S
    F5 -.->|Demo fallback only| B8
    B1 --> F3
    B2 --> S3
    B2 --> S4
    B3 --> S5
    B4 --> S6
    B5 --> S7
    B6 --> S8
    B7 --> S9
    B8 -.->|Not yet server-side| S
    B9 -.->|Not yet connected| S4
    S1 --> I2
    S2 --> S1
    S3 --> I1
    S4 --> I1
    S5 --> I1
    S6 --> I1
    S7 --> I1
    S8 --> I1
    S9 --> I1
    I4 --> F
    I3 --> S
    I5 -.-> I1

    class F,F1,F2,F3,F4,F5 frontend
    class B,B1,B2,B3,B4,B5,B6,B7 business
    class B8,B9 partial
    class S,S1,S2,S3,S4,S5,S6,S7,S8,S9 backend
    class I,I1,I3,I4,I5 infra
    class I2 external
```

## Current Layer Responsibilities

| Layer | Current implementation | Status |
|---|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, local RBAC UX | Implemented prototype |
| Business capabilities | Dashboard, assets, contracts, PDP, project/pool foundation, Shariah review foundation | Mixed: partial backend and frontend mock workflows |
| Backend | NestJS controllers/services, Prisma ORM, PostgreSQL persistence, policy and audit services | Foundation implemented |
| Identity | Keycloak OIDC, PKCE, MFA claims, server-side role mapping | Production integration prepared; live deployment pending |
| Shariah backend | Persisted reviews and human decisions with tenant/RBAC/audit controls | Implemented foundation |
| AI layer | Frontend mock provider, local governance/audit state, Shariah API review creation/decision integration | AI analysis backend pending |
| Pooling | Backend project/pool/funding foundation; frontend approval/distribution/exit mock services | Partial |
| Infrastructure | Local PostgreSQL and local API/frontend; VPS/Docker deployment postponed | Development-ready, production pending |

## Important Boundaries

- The frontend communicates with the backend through REST/JSON; it is not an Inertia application.
- The backend is authoritative for authentication, authorization, tenant scope, persistence, and audit events.
- Frontend RBAC controls visibility only and must not be treated as a security boundary.
- AI output is advisory and cannot approve contracts, activate pools, or execute transactions.
- The current AI provider is a mock provider; a server-side AI gateway is still required.
- The current frontend pooling approval, distribution, exit, and secondary-market flows are not yet connected to backend persistence.
- Docker/VPS deployment remains postponed while local PostgreSQL is used for development.
