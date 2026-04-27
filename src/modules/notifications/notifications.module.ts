import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './services/email.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { NotificationTriggerService } from './services/notification-trigger.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    NotificationDeliveryService,
    NotificationTriggerService,
  ],
  exports: [
    NotificationsService,
    NotificationDeliveryService,
    NotificationTriggerService,
  ],
})
export class NotificationsModule {}
