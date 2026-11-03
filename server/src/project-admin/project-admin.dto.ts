import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Why an administrator archives, restores, suspends or resumes a project; investors and the sponsor see it. */
export class ProjectAdminReasonDto {
  @Transform(trim) @IsString() @MinLength(5, { message: 'Give a reason of at least 5 characters; the sponsor and investors see it.' }) @MaxLength(1000) reason!: string;
}
