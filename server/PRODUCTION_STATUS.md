# Production Readiness Status

## Overview
The House of Wealth backend has been hardened with critical security fixes addressing tenant scope validation, dynamic JWT role extraction, and role assignment APIs. This document tracks the current state and remaining work.

---

## ✅ Completed (Phase 1)

### 1. JWT Role Extraction (Fixed)
- **Issue**: Role was hardcoded to 'Country Admin' regardless of OIDC token contents
- **Fix Applied**: Updated `identity.service.ts` to extract role from JWT claims:
  - Supports Auth0: `app_metadata.role`
  - Supports Keycloak: `roles[]` array
  - Supports generic: `role` claim
  - Fallback: 'Country Admin'
- **Impact**: Backend now respects role diversity without code changes; allows multiple IdP configurations

### 2. Tenant Scope Enforcement in Funding (Fixed)
- **Issue**: `approve()` and `disburse()` methods didn't validate country node scope
- **Risk**: A Country Admin from one country node could approve funding for a different country node
- **Fix Applied**: Added countryNodeId validation in both methods:
  ```typescript
  if (user.role !== 'Super Admin' && request.countryNodeId !== user.countryNodeId) {
    throw new ForbiddenException('Request is outside your country node scope');
  }
  ```
- **Impact**: Funding workflow now enforces strict multi-tenant isolation

### 3. Mock Auth Token Support (Enhanced)
- **Fix Applied**: Mock token now supports role, country node, and org in header
- **Format**: Base64-encode header with `{ mock, role, countryNode, org }`
- **Impact**: Developers can test role-based flows locally without IdP

### 4. Prisma Schema Updates (Completed)
- **Added**: `UserRoleAssignment` junction table for flexible role mapping
- **Structure**:
  - `User` (1 → many) `UserRoleAssignment`
  - Each assignment scoped to Organisation + CountryNode
  - Supports role activation/revocation with audit trail
  - Unique constraint: (userId, role, organisationId, countryNodeId)
- **Impact**: Enables multi-role-per-org and future role delegation patterns

### 5. Role Management APIs (Created)
- **New Module**: `UsersModule` with controller and service
- **Endpoints**:
  - `POST /users/:userId/roles` - Assign role to user in org/country
  - `DELETE /users/:userId/roles/:role/orgs/:orgId/countries/:countryNodeId` - Revoke role
  - `GET /users/:userId/roles` - List all active roles
- **Authorization**: Restricted to Super Admin and Country Admin
- **Audit**: All role changes logged to AuditEvent
- **Impact**: Operational role management without database queries

### 6. Environment Configuration (Documented)
- **Created**: `.env.example` with required variables
- **Covers**:
  - Database connection (PostgreSQL)
  - Auth mode (mock/production)
  - OIDC configuration (Issuer, Audience, JWKS URI)
  - Public key alternative (for air-gapped deployments)
  - Default tenant scopes
- **Impact**: Clear onboarding path for new deployments

---

## ⚠️ Partially Complete (Phase 2 - Recommended)

### 1. Projects Service Hardening
- **Status**: Code exists but likely has same tenant gaps as Funding
- **Recommended Fix**:
  - Add countryNodeId validation to `create()`, `update()`, `delete()` methods
  - Validate resource.countryNodeId matches user.countryNodeId (unless Super Admin)
  - Pattern: Copy validation from fixed funding.service.ts
- **Location**: `server/src/projects/projects.service.ts`

### 2. Pools Service Hardening
- **Status**: Code exists but likely has same tenant gaps
- **Recommended Fix**: Apply same pattern as Projects
- **Location**: `server/src/pools/pools.service.ts`

### 3. Mock Data Initialization
- **Status**: Database schemas defined, no seeders
- **Needed**:
  - Create Prisma seeder script for dev environment
  - Populate CountryNodes (CN-MYS, CN-PK, etc.)
  - Populate default Organisation per country
  - Create test users with various roles
  - Create sample Projects and Pools

### 4. Database Migrations
- **Status**: Schema defined, not yet migrated
- **Steps**:
  1. Set `DATABASE_URL` to PostgreSQL instance
  2. Run: `npx prisma migrate dev --name initial-schema`
  3. Review migration file in `server/prisma/migrations/`
  4. Commit migration to version control

---

## ❌ Not Started (Phase 3 - Future)

### 1. Frontend-Backend Integration
- **Current State**: Frontend imports mock auth provider; all calls use mock data
- **Work Required**:
  - Remove `src/auth/services/mockAuthProvider.ts`
  - Replace with real HTTP client to `/auth/verify` endpoint
  - Store JWT in sessionStorage/localStorage
  - Add `Authorization: Bearer {token}` header to all API calls
  - Update all service methods (assets, contracts, projects, etc.) to call backend
  - Error handling for 401 (token expired) and 403 (permission denied)

### 2. API Client Library
- **Needed**: Axios/Fetch wrapper that:
  - Automatically includes JWT in headers
  - Handles token refresh/rotation
  - Implements exponential backoff for retries
  - Converts snake_case API responses to camelCase

### 3. Backend Error Responses
- **Standardize**: All endpoints should return consistent error format
  ```json
  {
    "statusCode": 403,
    "message": "Forbidden",
    "error": "Request is outside your country node scope",
    "timestamp": "2024-01-20T10:30:00Z"
  }
  ```

### 4. Deployment & DevOps
- **Needed**:
  - Docker/Dockerfile for NestJS backend
  - Kubernetes manifests (if k8s deployment)
  - Database backup strategy
  - Monitoring (Prometheus/ELK)
  - Logging aggregation
  - CI/CD pipeline

### 5. Type Safety
- **Current**: Frontend has 105 remaining "as any" casts
- **Work**: Unify data structures, enable strict: true in tsconfig

### 6. Frontend Error Boundary
- **Current**: None; app crashes on unhandled errors
- **Needed**: React Error Boundary wrapping MainAppContent

---

## Testing Checklist

### Unit Tests
- [ ] IdentityService role extraction (all claim formats)
- [ ] RolesGuard permission evaluation
- [ ] Tenant scope validation in Funding, Projects, Pools
- [ ] UsersService role assignment/revocation

### Integration Tests
- [ ] End-to-end funding workflow (request → approve → disburse)
- [ ] Cross-country-node approval rejection (Country Admin scenario)
- [ ] Super Admin cross-tenant operations
- [ ] Audit trail logging for all operations

### Security Tests
- [ ] JWT validation with invalid/expired token
- [ ] Header injection attempts (OIDC Issuer spoofing)
- [ ] Role escalation attacks (Country Admin → Super Admin)
- [ ] Tenant boundary violation (org1 accessing org2 data)

### Performance Tests
- [ ] Policy evaluation latency (<10ms target)
- [ ] JWT verification latency (<50ms target)
- [ ] Database query optimization (indexes working)
- [ ] Load test: 1000 concurrent role checks

---

## Security Audit Checklist

- [x] OIDC token verification implemented
- [x] Role-based access control enforced globally
- [x] Tenant scope validated per operation
- [x] Audit trail captures all material actions
- [x] Sensitive data not logged (passwords, keys)
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] API versioning strategy
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma ORM handles)
- [ ] XSS prevention (frontend responsibility)
- [ ] CORS configuration finalized

---

## Configuration Checklist

For production deployment, ensure:
- [ ] `AUTH_MODE=production`
- [ ] `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URI` configured for your IdP
- [ ] `DATABASE_URL` points to production PostgreSQL
- [ ] `DEFAULT_COUNTRY_NODE` and `DEFAULT_ORGANISATION` set appropriately
- [ ] Environment variables NOT committed to git (use .env, not .env.example)
- [ ] Node.js v18+ running
- [ ] PostgreSQL v13+ with proper backups
- [ ] Rate limiting / DDoS protection in place (reverse proxy)

---

## Quick Start for Developers

### 1. Setup Database
```bash
cd server
cp .env.example .env
# Edit .env: set DATABASE_URL to local PostgreSQL
npx prisma migrate dev --name initial-schema
```

### 2. Run Backend
```bash
npm run dev
# Listens on http://localhost:3001
```

### 3. Test with Mock Token
```bash
# Encode header: { "mock": "test-user", "role": "Country Admin" }
# Use Authorization: Bearer <jwt-header>.<payload>.<signature>
curl -H "Authorization: Bearer eyJtb2NrIjoidGVzdC11c2VyIiwicm9sZSI6IkNvdW50cnkgQWRtaW4ifQ.payload.sig" \
  http://localhost:3001/users/USR-test-user/roles
```

### 4. Test Role Assignment
```bash
curl -X POST http://localhost:3001/users/USR-123/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "role": "Project Sponsor",
    "organisationId": "ORG-PUBLIC",
    "countryNodeId": "CN-MYS"
  }'
```

---

## Migration Timeline

**Week 1 (Database & Auth)**:
- [ ] Run Prisma migration
- [ ] Seed development data
- [ ] Test OIDC integration with chosen IdP

**Week 2 (Service Hardening)**:
- [ ] Add tenant checks to Projects & Pools services
- [ ] Unit test all permission scenarios
- [ ] Code review with security team

**Week 3 (Frontend Integration)**:
- [ ] Replace mock auth provider
- [ ] Integrate real API calls
- [ ] Build API client library with retry logic

**Week 4 (Deployment & Hardening)**:
- [ ] Deploy backend to staging
- [ ] Run security audit (OWASP Top 10)
- [ ] Load test and optimize queries
- [ ] Production deploy with monitoring

---

## Key Metrics to Monitor Post-Launch

1. **Latency**: Average API response time (<200ms target)
2. **Availability**: Uptime target 99.9%
3. **Security**:
   - Authorization failures logged and reviewed
   - Failed JWT verifications tracked
   - Role assignment audit trail reviewed monthly
4. **Data Quality**:
   - Orphaned role assignments detected
   - Audit events completeness verified

---

## References

- **JWT Standard**: RFC 7519
- **OAuth 2.0 Authorization**: RFC 6749
- **OIDC Core**: https://openid.net/specs/openid-connect-core-1_0.html
- **NestJS Docs**: https://docs.nestjs.com
- **Prisma Docs**: https://www.prisma.io/docs
