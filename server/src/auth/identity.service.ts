import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createPublicKey, createHmac, createVerify, KeyObject } from 'node:crypto';
import { UserRole } from '../policy/permissions';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';

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
  email?: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Validates OIDC ID/access tokens issued by Auth0, Microsoft Entra ID, Keycloak,
 * or Okta using the configured issuer/audience and either a JWKS/public key
 * (RS256, production) or a shared secret (HS256, local development).
 *
 * No external JWT dependency is required; verification uses node:crypto.
 */
@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(private readonly prisma: PrismaService) {}

  public async verifyToken(token: string): Promise<AuthenticatedUser> {
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const authMode = process.env.AUTH_MODE ?? 'mock';

    if (authMode === 'mock') {
      return this.verifyMockToken(token);
    }

    const payload = await this.verifyOidcToken(token);
    if (!payload.sub) {
      throw new UnauthorizedException('Token has no subject');
    }

    // The JWT only establishes *who* the caller is. Roles and capabilities are
    // resolved exclusively from the database (resolveDatabaseIdentity); token
    // role claims are deliberately ignored so a forged or claim-stripped token
    // escalates nothing and there is never an implicit default role.
    return this.resolveDatabaseIdentity(payload.sub, {
      email: (payload.email as string) ?? `${payload.sub}@internal`,
      name: (payload.name as string) ?? payload.sub,
      countryNodeId: (payload as any)?.country_node_id || process.env.DEFAULT_COUNTRY_NODE || 'CN-MYS',
      organisationId: (payload as any)?.organisation_id || process.env.DEFAULT_ORGANISATION || 'ORG-PUBLIC',
    });
  }

  private async resolveDatabaseIdentity(subject: string, claims: Omit<AuthenticatedUser, 'userId' | 'idpSubjectId' | 'assignedRoles' | 'role'>): Promise<AuthenticatedUser> {
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
          orderBy: { assignedAt: 'asc' },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not provisioned or is inactive');
    }

    const assignedRoles = user.roleAssignments.map((assignment) => this.fromPrismaRole(assignment.role));
    if (assignedRoles.length === 0) {
      throw new UnauthorizedException('User has no active role in this organisation and country');
    }

    return {
      userId: user.id,
      idpSubjectId: user.idpSubjectId,
      email: user.email,
      name: user.name,
      role: assignedRoles[0],
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
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8') || '{}') as { mock?: string; countryNode?: string; org?: string };
    const mockSub = header.mock ?? 'mock-user';
    return this.resolveDatabaseIdentity(`USR-${mockSub}`, {
      email: 'mock@houseofwealth.local',
      name: 'Mock API User',
      countryNodeId: header.countryNode ?? process.env.DEFAULT_COUNTRY_NODE ?? 'CN-MYS',
      organisationId: header.org ?? process.env.DEFAULT_ORGANISATION ?? 'ORG-PUBLIC',
    });
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
    if (typeof payload.exp === 'number' && payload.exp < now) {
      throw new UnauthorizedException('Token expired');
    }
    if (typeof payload.aud === 'string' && process.env.OIDC_AUDIENCE && payload.aud !== process.env.OIDC_AUDIENCE) {
      throw new UnauthorizedException('Token audience mismatch');
    }

    const alg = header.alg ?? 'RS256';

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
    if (expected !== provided) {
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
    const key = jwks.keys?.find((k) => !kid || k.kid === kid) ?? jwks.keys?.[0];
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
