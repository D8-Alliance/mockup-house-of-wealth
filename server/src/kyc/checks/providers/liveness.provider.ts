import { PrismaService } from '../../../prisma.service';
import { LivenessResultView } from '../../liveness/kyc-liveness.service';
import { THRESHOLDS } from '../../liveness/liveness-rules';
import { CheckContext, CheckOutcome, KycCheckProvider, KycCheckType } from '../check-types';

/**
 * Reports the applicant's face-verification session (src/kyc/liveness) as the
 * LIVENESS and FACE_MATCH checks. Prototype: the movements are verified on the
 * server, but there is no anti-spoofing model, so a PASS here does not rule out
 * a screen replay or a real-time deepfake.
 *
 * Scores are mapped onto the recommendation policy (LIVENESS min 0.9, FACE_MATCH
 * min 0.85): a pass is reported at or above those minimums, a weak face match as REVIEW.
 */
export class LocalLivenessProvider implements KycCheckProvider {
  readonly name = 'local-face';
  readonly version = '0.1.0-prototype';

  constructor(private readonly prisma: PrismaService) {}

  supports(check: KycCheckType): boolean {
    return check === 'LIVENESS' || check === 'FACE_MATCH';
  }

  async run(check: KycCheckType, { subject }: CheckContext): Promise<CheckOutcome> {
    const session = await this.prisma.kycLivenessSession.findFirst({ where: { applicationId: subject.applicationId }, orderBy: { createdAt: 'desc' }, select: { status: true, result: true, completedAt: true } });
    if (!session) return { status: 'SKIPPED', reasons: ['Face verification (camera) was not performed'] };
    const result = session.result as LivenessResultView | null;
    if (session.status !== 'PASSED' || !result?.livenessPassed) {
      return { status: 'REVIEW', reasons: [`Face verification was not completed (${session.status.toLowerCase()})${result?.failureReason ? `: ${result.failureReason}` : ''}`] };
    }
    if (check === 'LIVENESS') {
      return { status: 'PASS', score: 0.95, reasons: [], raw: { completedAt: session.completedAt } };
    }

    const similarities = [result.cardFaceSimilarity, result.uploadedIdFaceSimilarity].filter((value): value is number => typeof value === 'number' && value >= 0);
    if (!similarities.length) return { status: 'REVIEW', reasons: ['The photo on the ID card could not be found to compare with the live face'] };
    const best = Math.max(...similarities);
    const reasons: string[] = [];
    if (result.idNumberOnCard === 'MISMATCH') reasons.push('The ID number on the card shown to the camera does not match the application');
    else if (result.idNumberOnCard === 'NOT_FOUND') reasons.push('The ID number on the card shown to the camera could not be read');
    if (best < THRESHOLDS.samePerson) {
      return { status: 'REVIEW', score: Math.max(0, best), reasons: [`The live face does not appear to match the ID photo (similarity ${best.toFixed(2)}, expected at least ${THRESHOLDS.samePerson})`, ...reasons] };
    }
    // Cosine 0.363 maps to 0.85 (policy minimum) and 0.663 or more to 1.0.
    const score = Math.min(1, 0.85 + (0.15 * (best - THRESHOLDS.samePerson)) / 0.3);
    return { status: reasons.length ? 'REVIEW' : 'PASS', score, reasons, raw: { cardFaceSimilarity: result.cardFaceSimilarity, uploadedIdFaceSimilarity: result.uploadedIdFaceSimilarity } };
  }
}
