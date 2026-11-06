import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { PRIVACY_NOTICE_VERSION } from '../users/privacy-notice';
import { AuthenticatedRequest } from './oidc.guard';
import { SKIP_AUTH_KEY } from './roles.decorator';

/** What a signed-in user may call before accepting the privacy notice: who they are, and the notice itself. */
const BEFORE_CONSENT = [/^\/users\/me$/, /^\/users\/me\/access$/, /^\/users\/me\/privacy-consent$/, /^\/auth\//];

/** Whether this request may go ahead without the current notice accepted (pure, for tests). */
export function allowedBeforeConsent(path: string): boolean {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
  return BEFORE_CONSENT.some((pattern) => pattern.test(clean));
}

/**
 * PDPA: a signed-in user must accept the current privacy notice before the API serves them anything else.
 * The web and the mini-app ask first (PrivacyConsentGate); this makes the server refuse too, so another client
 * cannot skip the notice. Applies with Keycloak sign-in (staging, production); local mock sign-in and the
 * automated tests are left as they are.
 */
@Injectable()
export class PrivacyConsentGuard implements CanActivate {
  /** Users already known to have accepted the current notice; acceptance cannot be withdrawn through the API. */
  private readonly accepted = new Set<string>();

  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if ((process.env.AUTH_MODE ?? 'mock') !== 'oidc') return true;
    if (this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user || allowedBeforeConsent(request.path ?? request.url)) return true;
    const key = `${user.userId}|${PRIVACY_NOTICE_VERSION}`;
    if (this.accepted.has(key)) return true;
    const consent = await this.prisma.privacyConsent.findUnique({ where: { userId_noticeVersion: { userId: user.userId, noticeVersion: PRIVACY_NOTICE_VERSION } }, select: { id: true } });
    if (!consent) throw new ForbiddenException('Read and accept the privacy notice before using the platform.');
    this.accepted.add(key);
    return true;
  }
}
