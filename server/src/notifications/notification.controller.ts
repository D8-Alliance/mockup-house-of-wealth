import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { NotificationService } from './notification.service';

@Controller('notifications')
@RequirePermission('dashboard', 'read')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(@CurrentUser() actor: AuthenticatedUser) { return this.notifications.list(actor); }

  @Get('unread-count')
  unreadCount(@CurrentUser() actor: AuthenticatedUser) { return this.notifications.unreadCount(actor); }

  @Post(':id/read')
  markRead(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.notifications.markRead(actor, id); }

  @Post('read-all')
  markAllRead(@CurrentUser() actor: AuthenticatedUser) { return this.notifications.markAllRead(actor); }
}
