import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole, USER_ROLES } from '../policy/permissions';

export class AssignRoleDto {
  @IsEnum(USER_ROLES, { message: 'role must be a valid UserRole' })
  role!: UserRole;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  organisationId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  countryNodeId!: string;

  /** Why the role is given; kept in the audit log. The web asks for it; the mini-app does not send one yet. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}