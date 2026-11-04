import { IsBoolean, IsEmail, IsIn, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { DISTRIBUTION_TYPES, RELATIONS } from './estate-rules';

export class SaveBeneficiaryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsIn(RELATIONS as unknown as string[])
  relation!: string;

  @IsIn(DISTRIBUTION_TYPES as unknown as string[])
  distributionType!: string;

  /** Left out for a faraid heir. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  allocationPercent?: number;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  /** National ID or passport number. Left out on an edit to keep the one stored. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  identityNumber?: string;

  @IsString()
  @MaxLength(80)
  payoutMethod!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  /** Hibah Amanah: the donor confirms the offer (ijab) is voluntary and made of sound mind. */
  @IsOptional()
  @IsBoolean()
  ijabConfirmed?: boolean;

  /** Wasiyyah to a faraid heir or above one-third: the owner confirms it holds only if the heirs agree after death. */
  @IsOptional()
  @IsBoolean()
  heirConsentAcknowledged?: boolean;
}

export const EXECUTOR_KINDS = ['INDIVIDUAL', 'AMANAH_RAYA', 'TRUST_COMPANY', 'LAWYER'] as const;

/** The owner's executor (wasi) or administrator. */
export class SaveExecutorDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsIn(EXECUTOR_KINDS as unknown as string[]) kind!: string;
  @IsOptional() @IsString() @MaxLength(60) relation?: string;
  @IsOptional() @IsEmail() @MaxLength(200) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  /** National ID, passport or company number; left out on an edit to keep the one stored. Needed to report a death. */
  @IsOptional() @IsString() @MaxLength(40) identityNumber?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

/**
 * A death reported by a recorded executor or beneficiary, without signing in. Sent as multipart form fields with
 * the death certificate as `file`; the identity checks happen on the server.
 */
export class DeathReportDto {
  /** The deceased's national ID or passport number, as in their KYC. */
  @IsString() @MinLength(5) @MaxLength(40) deceasedIdNumber!: string;
  @IsString() @MinLength(3) @MaxLength(160) deceasedName!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Enter the date of death as YYYY-MM-DD.' }) dateOfDeath!: string;
  @IsString() @MinLength(3) @MaxLength(160) reporterName!: string;
  /** The last four characters of the reporter's own ID, as the deceased recorded it. */
  @Matches(/^[A-Za-z0-9]{4}$/, { message: 'Enter the last four characters of your ID number.' }) reporterIdLast4!: string;
  @IsString() @MinLength(2) @MaxLength(60) reporterRelation!: string;
  @IsOptional() @IsEmail() @MaxLength(200) reporterEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) reporterPhone?: string;
}

/** The hibah recipient's answer on the qabul link, checked against what the donor recorded about them. */
export class HibahAnswerDto {
  @IsIn(['ACCEPT', 'DECLINE']) decision!: 'ACCEPT' | 'DECLINE';
  /** The recipient's full name, or the guardian's when answering for a minor. */
  @IsString() @MinLength(3) @MaxLength(160) fullName!: string;
  /** The last four characters of the recipient's national ID or passport number. */
  @Matches(/^[A-Za-z0-9]{4}$/, { message: 'Enter the last four characters of the ID number.' }) identityLast4!: string;
  @IsOptional() @IsBoolean() asGuardian?: boolean;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
