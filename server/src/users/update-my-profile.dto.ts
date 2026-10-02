import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMyProfileDto {
  // Any common format is accepted ("012-345 6789", "+60 12 345 6789"); stored as E.164. Empty clears it.
  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;
}
