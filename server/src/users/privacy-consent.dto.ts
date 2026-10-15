import { IsString, MaxLength } from 'class-validator';

export class AcceptPrivacyNoticeDto {
  @IsString() @MaxLength(60) version!: string;
}
