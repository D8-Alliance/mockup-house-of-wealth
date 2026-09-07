import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IdentityService, AuthenticatedUser } from './identity.service';
import { SKIP_AUTH_KEY } from './roles.decorator';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Extracts the Authorization: Bearer token and resolves it into an
 * AuthenticatedUser via the IdentityService (OIDC/JWKS or mock mode).
 */
@Injectable()
export class OidcGuard implements CanActivate {
  constructor(
    private readonly identityService: IdentityService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipAuth) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const user = await this.identityService.verifyToken(token);
    (request as AuthenticatedRequest).user = user;
    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' ? token : undefined;
  }
}
