import { MfaChallenge } from '../types/authTypes';
import { auditLogger } from '../../audit/auditLogger';

class MfaServiceStore {
  private activeChallenges: Map<string, MfaChallenge> = new Map();

  public requiresMfa(role: string, mfaStatus?: string): boolean {
    if (mfaStatus === 'Enforced') return true;
    const privilegedRoles = [
      'Super Admin',
      'Country Admin',
      'Security Administrator',
      'Organization Admin',
      'Finance Officer',
      'Compliance Officer',
      'Auditor'
    ];
    return privilegedRoles.includes(role);
  }

  public createChallenge(userId: string): MfaChallenge {
    const challenge: MfaChallenge = {
      challengeId: `MFA-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId,
      channel: 'AuthenticatorApp',
      expiresInSeconds: 300,
      maxAttempts: 3,
      attemptsRemaining: 3
    };
    this.activeChallenges.set(challenge.challengeId, challenge);
    return challenge;
  }

  public verifyOtp(challengeId: string, otpCode: string, userMeta: { userId: string; orgId: string; countryId: string; role: string }): { success: boolean; error?: string } {
    const challenge = this.activeChallenges.get(challengeId);
    
    // In mock provider, '482910' or any 6-digit code provided is accepted if attempts > 0
    if (otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
      if (challenge) {
        challenge.attemptsRemaining -= 1;
      }
      auditLogger.logEvent({
        userId: userMeta.userId,
        organisationId: userMeta.orgId,
        countryNodeId: userMeta.countryId,
        role: userMeta.role,
        action: 'MFA_FAILED' as any,
        resourceType: 'Authentication',
        resourceId: challengeId,
        result: 'Denied',
        metadata: { reason: 'Invalid format or code' }
      });
      return { success: false, error: 'Invalid 6-digit code format.' };
    }

    if (challenge && challenge.attemptsRemaining <= 0) {
      auditLogger.logEvent({
        userId: userMeta.userId,
        organisationId: userMeta.orgId,
        countryNodeId: userMeta.countryId,
        role: userMeta.role,
        action: 'ACCOUNT_LOCKED' as any,
        resourceType: 'Authentication',
        resourceId: challengeId,
        result: 'Denied',
        metadata: { reason: 'Exceeded max MFA attempts' }
      });
      return { success: false, error: 'Maximum MFA attempts exceeded. Account challenge locked.' };
    }

    auditLogger.logEvent({
      userId: userMeta.userId,
      organisationId: userMeta.orgId,
      countryNodeId: userMeta.countryId,
      role: userMeta.role,
      action: 'MFA_SUCCESS' as any,
      resourceType: 'Authentication',
      resourceId: challengeId,
      result: 'Success',
      metadata: { channel: challenge?.channel || 'AuthenticatorApp' }
    });

    if (challenge) {
      this.activeChallenges.delete(challengeId);
    }
    return { success: true };
  }
}

export const mfaService = new MfaServiceStore();
