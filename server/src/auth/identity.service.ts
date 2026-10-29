import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createPublicKey, createHmac, createVerify, KeyObject, timingSafeEqual, createHash } from 'node:crypto';
import { PRIVILEGED_ROLES, UserRole } from '../policy/permissions';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { RoleAvailabilityService } from '../roles/role-availability.service';

export interface AuthenticatedUser {
  userId: string;
  idpSubjectId: string;
  email: string;
  name: string;
  role: UserRole;
  countryNodeId: string;
  organisationId: string;
  assignedRoles: UserRole[];
}

export interface JwtPayload {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  /** When the person signed in (seconds); a refreshed token keeps the original sign-in time. */
  auth_time?: number;
  amr?: string[];
  email?: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Signature algorithms accepted on OIDC tokens. HS256 relies on a shared secret that anyone
 * holding it can sign with, so production accepts only the identity provider's RS256 keys.
 */
export function allowedJwtAlgorithms(env: NodeJS.ProcessEnv = process.env): string[] {
  return env.NODE_ENV === 'production' ? ['RS256'] : ['RS256', 'HS256'];
}

/**
 * Refuses production settings that would let anyone sign in as anyone: mock tokens are
 * unsigned, and OIDC without an issuer, audience or public key cannot be verified.
 * Checked when the server starts; mock tokens are also refused per request.
 */
export function assertAuthConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production') return;
  if (env.AUTH_MODE !== 'oidc') throw new Error(`AUTH_MODE must be "oidc" in production (found "${env.AUTH_MODE ?? ''}"). Mock tokens are unsigned and let anyone sign in as any user.`);
  if (!env.OIDC_ISSUER || !env.OIDC_AUDIENCE) throw new Error('OIDC_ISSUER and OIDC_AUDIENCE are required in production.');
  if (!env.OIDC_JWKS_URI && !env.OIDC_PUBLIC_KEY_PEM) throw new Error('OIDC_JWKS_URI or OIDC_PUBLIC_KEY_PEM is required in production.');
}

/**
 * Validates OIDC ID/access tokens issued by Auth0, Microsoft Entra ID, Keycloak,
 * or Okta using the configured issuer/audience and either a JWKS/public key
 * (RS256, production) or a shared secret (HS256, local development only).
 *
 * No external JWT dependency is required; verification uses node:crypto.
 */
@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(private readonly prisma: PrismaService, private readonly roleAvailability: RoleAvailabilityService) {}

  public async verifyToken(token: string): Promise<AuthenticatedUser> {
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const authMode = process.env.AUTH_MODE;

    if (!authMode) {
      throw new UnauthorizedException('AUTH_MODE is not configured');
    }

    if (authMode === 'mock') {
      if (process.env.NODE_ENV === 'production') throw new UnauthorizedException('Mock sign-in is disabled in production');
      return this.verifyMockToken(token);
    }

    if (authMode !== 'oidc') {
      throw new UnauthorizedException(`Unsupported AUTH_MODE: ${authMode}`);
    }

    const payload = await this.verifyOidcToken(token);
    if (!payload.sub) {
      throw new UnauthorizedException('Token has no subject');
    }

    // The JWT only establishes *who* the caller is. Roles and capabilities are
    // resolved exclusively from the database (resolveDatabaseIdentity); token
    // role claims are deliberately ignored so a forged or claim-stripped token
    // escalates nothing and there is never an implicit default role.
    const tenant = await this.tenantFor(payload.sub, (payload as any)?.country_node_id, (payload as any)?.organisation_id);
    const identity = await this.resolveDatabaseIdentity(payload.sub, {
      email: (payload.email as string) ?? `${payload.sub}@internal`,
      name: (payload.name as string) ?? payload.sub,
      ...tenant,
    });
    if (this.requiresMfa(identity.role) && !payload.amr?.some((method: string) => method === 'otp' || method === 'webauthn')) {
      throw new UnauthorizedException('MFA is required for this role');
    }
    await this.ensureSession(token, payload, identity);
    return this.syncNameAndEmail(identity, payload);
  }

  /**
   * Which organisation and country the sign-in is for. The token may name them (Keycloak
   * attributes); otherwise they come from the user's own active roles, and only when those are
   * all in one organisation, so there is no silent default. When COUNTRY_NODE_ID is set (one
   * country per deployment), any other country is refused.
   */
  private async tenantFor(subject: string, claimedCountry?: unknown, claimedOrganisation?: unknown): Promise<{ countryNodeId: string; organisationId: string }> {
    let countryNodeId = typeof claimedCountry === 'string' && claimedCountry ? claimedCountry : '';
    let organisationId = typeof claimedOrganisation === 'string' && claimedOrganisation ? claimedOrganisation : '';
    if (!countryNodeId || !organisationId) {
      const assignments = await this.prisma.userRoleAssignment.findMany({
        where: { isActive: true, user: { OR: [{ id: subject }, { idpSubjectId: subject }] }, ...(countryNodeId ? { countryNodeId } : {}), ...(organisationId ? { organisationId } : {}) },
        select: { countryNodeId: true, organisationId: true },
      });
      const tenants = [...new Set(assignments.map((a) => `${a.countryNodeId}|${a.organisationId}`))];
      if (tenants.length === 0) throw new UnauthorizedException('User is not provisioned or has no active role in this organisation and country');
      if (tenants.length > 1) throw new UnauthorizedException('Your account belongs to more than one organisation. Ask your administrator to set your organisation on the sign-in account.');
      [countryNodeId, organisationId] = tenants[0].split('|');
    }
    const cell = process.env.COUNTRY_NODE_ID;
    if (cell && countryNodeId !== cell) throw new UnauthorizedException(`This platform serves ${cell}; your account is registered in ${countryNodeId}.`);
    return { countryNodeId, organisationId };
  }

  /**
   * The identity provider owns the name and email: a user changes them there, and the next
   * sign-in copies them here. An email already used by another account is left unchanged.
   */
  private async syncNameAndEmail(identity: AuthenticatedUser, payload: JwtPayload): Promise<AuthenticatedUser> {
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const changes: { email?: string; name?: string } = {};
    if (email && email !== identity.email.toLowerCase()) changes.email = email;
    if (name && name !== identity.name) changes.name = name;
    if (!changes.email && !changes.name) return identity;
    try {
      await this.prisma.user.update({ where: { id: identity.userId }, data: changes });
      return { ...identity, ...changes };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') || !changes.name) {
        this.logger.warn(`Could not update ${identity.userId} from the identity provider: ${error instanceof Error ? error.message : error}`);
        return identity;
      }
      this.logger.warn(`The new email of ${identity.userId} belongs to another account; only the name is updated.`);
      await this.prisma.user.update({ where: { id: identity.userId }, data: { name: changes.name } });
      return { ...identity, name: changes.name };
    }
  }

  private async resolveDatabaseIdentity(subject: string, claims: Omit<AuthenticatedUser, 'userId' | 'idpSubjectId' | 'assignedRoles' | 'role'>, preferredRole?: UserRole): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: subject },
          { id: `USR-${subject}` },
          { idpSubjectId: subject },
          { idpSubjectId: `USR-${subject}` },
        ],
      },
      include: {
        roleAssignments: {
          where: {
            isActive: true,
            countryNodeId: claims.countryNodeId,
            organisationId: claims.organisationId,
          },
          include: {
            organisation: { select: { id: true, countryNodeId: true, status: true } },
            countryNode: { select: { code: true, status: true } },
          },
          orderBy: { assignedAt: 'asc' },
        },
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not provisioned or is inactive');
    }

    const validAssignments = user.roleAssignments.filter((assignment) => assignment.organisation.status === 'ACTIVE' && assignment.countryNode.status === 'ACTIVE' && assignment.organisation.countryNodeId === assignment.countryNode.code);
    if (validAssignments.length !== user.roleAssignments.length) {
      throw new UnauthorizedException('Organisation or country node is inactive or mismatched');
    }
    // Roles a Super Admin has switched off platform-wide are ignored until switched back on.
    const disabled = await this.roleAvailability.disabledRoles();
    const assignedRoles = validAssignments.map((assignment) => this.fromPrismaRole(assignment.role)).filter((role) => !disabled.has(role));
    if (assignedRoles.length === 0) {
      throw new UnauthorizedException(validAssignments.length ? 'Your role is currently disabled on this platform' : 'User has no active role in this organisation and country');
    }

    const activeRole = preferredRole && assignedRoles.includes(preferredRole) ? preferredRole : assignedRoles[0];
    return {
      userId: user.id,
      idpSubjectId: user.idpSubjectId,
      email: user.email,
      name: user.name,
      role: activeRole,
      countryNodeId: claims.countryNodeId,
      organisationId: claims.organisationId,
      assignedRoles,
    };
  }

  private fromPrismaRole(role: PrismaUserRole): UserRole {
    return role.replace(/_/g, ' ') as UserRole;
  }

  private async verifyMockToken(token: string): Promise<AuthenticatedUser> {
    const headerB64 = token.split('.')[0] ?? '';
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8') || '{}') as { mock?: string; role?: UserRole; countryNode?: string; org?: string };
    const mockSub = header.mock ?? 'mock-user';
    return this.resolveDatabaseIdentity(`USR-${mockSub}`, {
      email: 'admin.demo@wealthpooling.my',
      name: 'Dr. Farid Hakim',
      countryNodeId: header.countryNode ?? process.env.DEFAULT_COUNTRY_NODE ?? 'CN-MYS',
      organisationId: header.org ?? process.env.DEFAULT_ORGANISATION ?? 'ORG-PUBLIC',
    }, header.role);
  }

  public async revokeToken(token: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: this.hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async ensureSession(token: string, payload: JwtPayload, identity: AuthenticatedUser): Promise<void> {
    const tokenHash = this.hashToken(token);
    const existing = await this.prisma.session.findUnique({ where: { tokenHash } });
    const expiresAt = new Date((payload.exp as number) * 1000);
    if (existing?.revokedAt || (existing && existing.expiresAt.getTime() <= Date.now())) {
      throw new UnauthorizedException('Session is revoked or expired');
    }
    if (!existing) {
      // Right after sign-in the app sends several requests with the same new token at once;
      // each may find no session yet, so a duplicate insert is skipped rather than failing.
      const created = await this.prisma.session.createMany({
        data: [{
          userId: identity.userId,
          tokenHash,
          activeRole: this.toPrismaRole(identity.role),
          countryNodeId: identity.countryNodeId,
          organisationId: identity.organisationId,
          expiresAt,
        }],
        skipDuplicates: true,
      });
      if (created.count) await this.recordSignIn(identity.userId, payload);
    }
  }

  /**
   * Keeps how the person last signed in on their profile, from the token Keycloak issued: the methods (amr, e.g.
   * pwd and otp) and the sign-in time. The User Directory shows MFA from this, so it reflects Keycloak rather than
   * a setting nobody fills in. Once per new token; a failure here never blocks the request.
   */
  private async recordSignIn(userId: string, payload: JwtPayload): Promise<void> {
    if (!Array.isArray(payload.amr) && typeof payload.auth_time !== 'number') return;
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { profile: true } });
      const profile = (user?.profile && typeof user.profile === 'object' && !Array.isArray(user.profile) ? user.profile : {}) as Record<string, unknown>;
      const methods = Array.isArray(payload.amr) ? payload.amr.filter((method): method is string => typeof method === 'string') : undefined;
      const next: Record<string, unknown> = { ...profile };
      if (methods) {
        const usedMfa = methods.some((method) => method === 'otp' || method === 'webauthn' || method === 'mfa');
        next.signInMethods = methods;
        next.mfaEnabled = usedMfa;
        next.mfaStatus = usedMfa ? 'Enabled' : 'Not used';
      }
      if (typeof payload.auth_time === 'number') next.lastLogin = new Date(payload.auth_time * 1000).toISOString();
      if (JSON.stringify(next) === JSON.stringify(profile)) return;
      await this.prisma.user.update({ where: { id: userId }, data: { profile: next as Prisma.InputJsonValue } });
    } catch (error) {
      this.logger.warn(`Could not record the sign-in of ${userId}: ${error instanceof Error ? error.message : error}`);
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private requiresMfa(role: UserRole): boolean {
    return PRIVILEGED_ROLES.has(role) || ['Country Admin', 'Organization Admin', 'Finance Officer', 'Compliance Officer', 'Auditor', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee'].includes(role);
  }

  private toPrismaRole(role: UserRole): PrismaUserRole {
    return role.replace(/ /g, '_') as PrismaUserRole;
  }

  private async verifyOidcToken(token: string): Promise<JwtPayload> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Malformed JWT');
    }
    const [headerB64, payloadB64, signatureB64] = parts;

    const header = this.decodeJson<{ alg?: string; kid?: string }>(headerB64);
    const payload = this.decodeJson<JwtPayload>(payloadB64);

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp <= now) {
      throw new UnauthorizedException('Token expired');
    }
    if (!process.env.OIDC_ISSUER || payload.iss !== process.env.OIDC_ISSUER) {
      throw new UnauthorizedException('Token issuer mismatch');
    }
    const audience = process.env.OIDC_AUDIENCE;
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audience || !audiences.includes(audience)) {
      throw new UnauthorizedException('Token audience mismatch');
    }

    // The algorithm must be stated and on the allow-list; never fall back to a default.
    const alg = header.alg;
    if (!alg || !allowedJwtAlgorithms().includes(alg)) {
      throw new UnauthorizedException(`Unsupported token algorithm: ${alg ?? 'none'}`);
    }

    if (alg === 'HS256') {
      return this.verifyHs256(token, payload);
    }

    if (alg === 'RS256') {
      const key = await this.resolvePublicKey(header.kid);
      return this.verifyRs256(token, payload, key);
    }

    throw new UnauthorizedException(`Unsupported token algorithm: ${alg}`);
  }

  private verifyHs256(token: string, payload: JwtPayload): JwtPayload {
    const secret = process.env.JWT_SHARED_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT_SHARED_SECRET not configured');
    }
    const [headerB64, payloadB64] = token.split('.');
    const expected = createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');
    const provided = token.split('.')[2];
    if (!provided || expected.length !== provided.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
      throw new UnauthorizedException('Invalid token signature');
    }
    return payload;
  }

  private verifyRs256(token: string, payload: JwtPayload, publicKey: KeyObject): JwtPayload {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    const signer = createVerify('RSA-SHA256');
    signer.update(`${headerB64}.${payloadB64}`);
    signer.end();
    const ok = signer.verify(publicKey, Buffer.from(signatureB64, 'base64url'));
    if (!ok) {
      throw new UnauthorizedException('Invalid token signature');
    }
    return payload;
  }

  private async resolvePublicKey(kid?: string): Promise<KeyObject> {
    if (process.env.OIDC_PUBLIC_KEY_PEM) {
      return createPublicKey(process.env.OIDC_PUBLIC_KEY_PEM);
    }
    const jwksUri = process.env.OIDC_JWKS_URI;
    if (!jwksUri) {
      throw new UnauthorizedException('OIDC_JWKS_URI or OIDC_PUBLIC_KEY_PEM not configured');
    }
    const res = await fetch(jwksUri);
    if (!res.ok) {
      throw new UnauthorizedException('Failed to fetch JWKS');
    }
    const jwks = (await res.json()) as { keys?: { kid?: string; n?: string; e?: string }[] };
    const key = kid ? jwks.keys?.find((k) => k.kid === kid) : jwks.keys?.[0];
    if (!key || !key.n || !key.e) {
      throw new UnauthorizedException('No usable JWKS key');
    }
    const modulus = this.normaliseBase64Url(key.n);
    const exponent = this.normaliseBase64Url(key.e);
    return createPublicKey({
      key: { kty: 'RSA', n: modulus, e: exponent },
      format: 'jwk',
    });
  }


  private decodeJson<T>(b64: string): T {
    try {
      return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as T;
    } catch {
      throw new UnauthorizedException('Invalid token payload');
    }
  }

  private normaliseBase64Url(value: string): string {
    // Node's JWK import for the public key expects unpadded base64url strings.
    return value.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  }
}
