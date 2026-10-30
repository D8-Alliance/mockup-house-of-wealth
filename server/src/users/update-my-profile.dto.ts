import 'reflect-metadata';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { PAYOUT_CURRENCIES } from '../distribution/payout-destination.dto';

export const PREFERRED_CONTRACTS = ['Mudarabah', 'Musharakah', 'Ijarah', 'Murabahah', 'Wakalah', 'Sukuk'] as const;
export const ESTATE_FRAMEWORKS = ['Islamic', 'Civil'] as const;
export const APP_LANGUAGES = ['en', 'ms'] as const;

/** Which delivery channels the user accepts. In-app notifications always arrive. */
export class NotificationPreferencesDto {
  @IsOptional() @IsBoolean() email?: boolean;
  @IsOptional() @IsBoolean() push?: boolean;
  @IsOptional() @IsBoolean() sms?: boolean;
}

export class ProfilePreferencesDto {
  @IsOptional() @IsIn(PAYOUT_CURRENCIES) currency?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(PREFERRED_CONTRACTS.length) @IsIn(PREFERRED_CONTRACTS, { each: true }) preferredContracts?: string[];
  @IsOptional() @ValidateNested() @Type(() => NotificationPreferencesDto) notifications?: NotificationPreferencesDto;
  /** Whether the owner's estate instructions follow Islamic rules (faraid, wasiyyah, hibah) or a civil will. */
  @IsOptional() @IsIn(ESTATE_FRAMEWORKS) estateFramework?: string;
  /** The app's display language, kept with the account so it follows the user to another phone. */
  @IsOptional() @IsIn(APP_LANGUAGES) language?: string;
}

/**
 * A profile picture is either an https link or a small inline PNG/JPEG/WEBP image
 * (the app shrinks uploads to 256x256 before sending). SVG is refused: it can carry
 * script. Empty clears the picture.
 */
export const AVATAR_URL_PATTERN = /^$|^https:\/\/\S+$|^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export class UpdateMyProfileDto {
  // Any common format is accepted ("012-345 6789", "+60 12 345 6789"); stored as E.164. Empty clears it.
  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(4096)
  pushToken?: string;

  // ~90 KB of base64 keeps the request under the API's 100 KB JSON limit.
  @IsOptional() @IsString() @MaxLength(90_000, { message: 'The picture is too large. Choose a smaller image.' })
  @Matches(AVATAR_URL_PATTERN, { message: 'The picture must be an https link or a PNG, JPEG or WEBP image.' })
  avatarUrl?: string;

  // An IANA time zone such as Asia/Kuala_Lumpur.
  @IsOptional() @IsString() @MaxLength(60) @Matches(/^[A-Za-z]+(\/[A-Za-z_-]+)+$/, { message: 'Choose a time zone from the list.' })
  timezone?: string;

  @IsOptional() @IsString() @MaxLength(1000, { message: 'Keep the bio under 1,000 characters.' })
  bio?: string;

  @IsOptional() @ValidateNested() @Type(() => ProfilePreferencesDto)
  preferences?: ProfilePreferencesDto;
}
