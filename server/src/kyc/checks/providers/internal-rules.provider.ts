import { PrismaService } from '../../../prisma.service';
import { KYC_MIN_AGE_YEARS } from '../../kyc-workflow';
import { CheckContext, CheckOutcome, KycCheckProvider, KycCheckStatus, KycCheckType } from '../check-types';

const EXPIRY_WARNING_DAYS = 30;
const MYKAD_RE = /^(\d{6})-?(\d{2})-?(\d{4})$/;

const worst = (a: KycCheckStatus, b: KycCheckStatus): KycCheckStatus => {
  const order: KycCheckStatus[] = ['PASS', 'REVIEW', 'FAIL'];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
};

function yearsBetween(from: Date, to: Date): number {
  const years = to.getUTCFullYear() - from.getUTCFullYear();
  const beforeBirthday = to.getUTCMonth() < from.getUTCMonth() || (to.getUTCMonth() === from.getUTCMonth() && to.getUTCDate() < from.getUTCDate());
  return beforeBirthday ? years - 1 : years;
}

/**
 * Rule-based checks that need no external service. They catch inconsistent or
 * reused identities; they cannot tell whether a document is genuine.
 */
export class InternalRulesProvider implements KycCheckProvider {
  readonly name = 'internal';
  readonly version = '1.0.0';

  constructor(private readonly prisma: PrismaService, private readonly now: () => Date = () => new Date()) {}

  supports(check: KycCheckType): boolean {
    return check === 'DOCUMENT_CONSISTENCY' || check === 'DUPLICATE_IDENTITY';
  }

  async run(check: KycCheckType, ctx: CheckContext): Promise<CheckOutcome> {
    return check === 'DOCUMENT_CONSISTENCY' ? this.consistency(ctx) : this.duplicates(ctx);
  }

  private consistency({ subject }: CheckContext): CheckOutcome {
    const now = this.now();
    const reasons: string[] = [];
    let status: KycCheckStatus = 'PASS';

    if (!subject.idDocumentExpiry) {
      status = worst(status, 'REVIEW');
      reasons.push('No identity document expiry date was given');
    } else if (subject.idDocumentExpiry.getTime() < now.getTime()) {
      status = 'FAIL';
      reasons.push(`Identity document expired on ${subject.idDocumentExpiry.toISOString().slice(0, 10)}`);
    } else if (subject.idDocumentExpiry.getTime() - now.getTime() < EXPIRY_WARNING_DAYS * 86_400_000) {
      status = worst(status, 'REVIEW');
      reasons.push(`Identity document expires within ${EXPIRY_WARNING_DAYS} days`);
    }

    if (subject.dateOfBirth && yearsBetween(subject.dateOfBirth, now) < KYC_MIN_AGE_YEARS) {
      status = 'FAIL';
      reasons.push(`Applicant is under ${KYC_MIN_AGE_YEARS}`);
    }

    // Malaysian MyKad: the first six digits are the holder's date of birth (YYMMDD).
    if (subject.countryNodeId === 'CN-MYS' && subject.idDocumentType === 'NATIONAL_ID') {
      const match = MYKAD_RE.exec(subject.idDocumentNumber.trim());
      if (!match) {
        status = worst(status, 'REVIEW');
        reasons.push('ID number is not in MyKad format (YYMMDD-PB-####)');
      } else if (subject.dateOfBirth) {
        // Compare against the stated date of birth instead of guessing the century.
        const expected = subject.dateOfBirth.toISOString().slice(2, 10).replace(/-/g, '');
        if (match[1] !== expected) {
          status = worst(status, 'REVIEW');
          reasons.push('Date of birth does not match the MyKad number');
        }
      }
    }
    return { status, reasons };
  }

  private async duplicates({ subject }: CheckContext): Promise<CheckOutcome> {
    const normalized = subject.idDocumentNumber.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase();
    const sameId = normalized
      ? await this.prisma.$queryRaw<Array<{ status: string }>>`
          SELECT "status" FROM "KycApplication"
          WHERE "userId" <> ${subject.userId}
            AND "status" <> 'DRAFT'
            AND "idDocumentType" = ${subject.idDocumentType}
            AND upper(regexp_replace("idDocumentNumber", '[^[:alnum:]]', '', 'g')) = ${normalized}
          LIMIT 20`
      : [];
    // The same file (by SHA-256) uploaded by a different user is a strong sign of identity reuse.
    const sameFiles = await this.prisma.$queryRaw<Array<{ documentType: string }>>`
      SELECT DISTINCT d_other."documentType" FROM "KycDocument" d_own
      JOIN "KycDocument" d_other ON d_other."sha256" = d_own."sha256" AND d_other."applicationId" <> d_own."applicationId"
      JOIN "KycApplication" a_other ON a_other."id" = d_other."applicationId"
      WHERE d_own."applicationId" = ${subject.applicationId} AND a_other."userId" <> ${subject.userId}`;

    const reasons: string[] = [];
    let status: KycCheckStatus = 'PASS';
    if (sameId.some((row) => row.status === 'APPROVED')) {
      status = 'FAIL';
      reasons.push('This ID number is already verified for another user');
    } else if (sameId.length) {
      status = 'REVIEW';
      reasons.push(`This ID number appears in ${sameId.length} other user application(s)`);
    }
    if (sameFiles.length) {
      status = worst(status, 'REVIEW');
      reasons.push(`Identical file(s) uploaded by another user: ${sameFiles.map((row) => row.documentType).join(', ')}`);
    }
    return { status, reasons };
  }
}
