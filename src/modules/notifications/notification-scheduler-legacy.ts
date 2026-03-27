import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 8 * * *', {
    timeZone: 'America/Bogota',
  })
  async checkExpiringAuthorizations() {
    this.logger.log('Checking expiring authorizations...');

    const today = new Date();
    const daysToCheck = [7, 3, 1];

    for (const days of daysToCheck) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + days);

      const authorizations = await this.prisma.authorization.findMany({
        where: {
          expirationDate: {
            gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            lt: new Date(targetDate.setHours(23, 59, 59, 999)),
          },
          status: {
            in: ['pending', 'scheduled'],
          },
        },
        include: {
          familyMember: {
            include: {
              user: true,
            },
          },
        },
      });

      this.logger.log(
        `Found ${authorizations.length} authorizations expiring in ${days} day(s)`,
      );

      for (const auth of authorizations) {
        const hasRecent = await this.notificationsService.hasRecentNotification(
          auth.familyMember.user.id,
          NotificationType.expiration_warning,
          auth.id,
          24,
        );

        if (hasRecent) {
          continue;
        }

        await this.notificationsService.createNotification({
          userId: auth.familyMember.user.id,
          title: `Autorización por vencer en ${days} día(s)`,
          message: `La autorización ${auth.requestNumber || 'N/A'} vence el ${auth.expirationDate?.toLocaleDateString('es-CO')}. Por favor agenda una cita.`,
          type: NotificationType.expiration_warning,
          relatedEntityType: 'authorization',
          relatedEntityId: auth.id,
        });
      }
    }

    this.logger.log('Finished checking expiring authorizations');
  }

  @Cron('0 8 * * *', {
    timeZone: 'America/Bogota',
  })
  async checkUpcomingAppointments() {
    this.logger.log('Checking upcoming appointments...');

    const today = new Date();
    const daysToCheck = [1, 3];

    for (const days of daysToCheck) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + days);

      const appointments = await this.prisma.appointment.findMany({
        where: {
          appointmentDate: {
            gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            lt: new Date(targetDate.setHours(23, 59, 59, 999)),
          },
          status: {
            in: ['scheduled', 'confirmed'],
          },
        },
        include: {
          familyMember: {
            include: {
              user: true,
            },
          },
        },
      });

      this.logger.log(
        `Found ${appointments.length} appointments in ${days} day(s)`,
      );

      for (const appointment of appointments) {
        const hasRecent = await this.notificationsService.hasRecentNotification(
          appointment.familyMember.user.id,
          NotificationType.appointment_reminder,
          appointment.id,
          24,
        );

        if (hasRecent) {
          continue;
        }

        await this.notificationsService.createNotification({
          userId: appointment.familyMember.user.id,
          title: `Recordatorio de cita en ${days} día(s)`,
          message: `Tienes una cita el ${appointment.appointmentDate.toLocaleDateString('es-CO')} a las ${appointment.appointmentDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}.`,
          type: NotificationType.appointment_reminder,
          relatedEntityType: 'appointment',
          relatedEntityId: appointment.id,
        });
      }
    }

    this.logger.log('Finished checking upcoming appointments');
  }
}
