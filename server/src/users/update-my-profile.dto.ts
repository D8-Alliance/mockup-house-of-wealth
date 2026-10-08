import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

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
}
