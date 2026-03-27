import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationScheduler } from './notification-scheduler-v2';
import { EmailService } from './services/email.service';
import { WhatsAppService } from './services/whatsapp.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationScheduler,
    EmailService,
    WhatsAppService,
    NotificationDeliveryService,
  ],
  exports: [NotificationsService, NotificationDeliveryService],
})
export class NotificationsModule {}
