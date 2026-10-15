import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { Public, Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { RoleAvailabilityService } from './role-availability.service';

export class UpdateRoleAvailabilityDto {
  @IsBoolean() enabled!: boolean;
}

@Controller()
export class RoleAvailabilityController {
  constructor(private readonly roles: RoleAvailabilityService) {}

  // Public: the sign-in and sign-up screens list only the roles that are switched on.
  @Public()
  @Get('roles/availability')
  list() {
    return this.roles.list();
  }

  @Patch('admin/roles/:role/availability')
  @Roles('Super Admin')
  update(@Param('role') role: string, @Body() input: UpdateRoleAvailabilityDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.roles.update(role, input.enabled, actor);
  }
}
