import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
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
}