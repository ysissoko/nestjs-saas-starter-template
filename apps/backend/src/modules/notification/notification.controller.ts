import { BaseController } from '@common/controller/base.controller';
import { NotificationService } from './notification.service';
import { Controller, UseGuards } from '@nestjs/common';
import { Notification } from '@modules/notification/notification.entity';
import { HasPermissionsGuard } from '@guards/has-permissions.guard';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard, HasPermissionsGuard)
export class NotificationController extends BaseController<Notification> {
  constructor(private readonly notificationService: NotificationService) {
    super(notificationService);
  }
}
