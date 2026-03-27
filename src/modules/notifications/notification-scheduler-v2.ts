import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { NotificationType, DeliveryMethod } from '@prisma/client';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDeliveryService: NotificationDeliveryService,
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
          epsProvider: true,
        },
      });

      this.logger.log(
        `Found ${authorizations.length} authorizations expiring in ${days} day(s)`,
      );

      for (const auth of authorizations) {
        // Skip if user doesn't want any notifications
        if (
          !auth.familyMember.user.emailNotifications &&
          !auth.familyMember.user.whatsappNotifications
        ) {
          continue;
        }

        // Determine delivery method based on user preferences
        let deliveryMethod: DeliveryMethod;
        if (
          auth.familyMember.user.whatsappNotifications &&
          auth.familyMember.user.whatsappNumber
        ) {
          // Priority to WhatsApp if enabled and number exists
          deliveryMethod = DeliveryMethod.whatsapp;
        } else if (auth.familyMember.user.emailNotifications) {
          // Fallback to email if enabled
          deliveryMethod = DeliveryMethod.email;
        } else {
          // Skip if no delivery method available
          continue;
        }

        // Format data for notification
        const notificationData = {
          title: `Autorización por vencer en ${days} día(s)`,
          message: `La autorización ${auth.requestNumber || 'N/A'} vence el ${auth.expirationDate?.toLocaleDateString('es-CO')}. Por favor agenda una cita.`,
          authorizationNumber: auth.requestNumber || undefined,
          expirationDate: auth.expirationDate?.toLocaleDateString('es-CO'),
          daysRemaining: days,
          familyMemberName: auth.familyMember.fullName,
          epsName: auth.epsProvider?.name || 'EPS',
          relatedEntityType: 'authorization',
          relatedEntityId: auth.id,
        };

        // Send notification
        await this.notificationDeliveryService.sendNotification(
          auth.familyMember.user.id,
          NotificationType.expiration_warning,
          notificationData,
          deliveryMethod,
        );
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
        // Skip if user doesn't want any notifications
        if (
          !appointment.familyMember.user.emailNotifications &&
          !appointment.familyMember.user.whatsappNotifications
        ) {
          continue;
        }

        // Determine delivery method based on user preferences
        let deliveryMethod: DeliveryMethod;
        if (
          appointment.familyMember.user.whatsappNotifications &&
          appointment.familyMember.user.whatsappNumber
        ) {
          // Priority to WhatsApp if enabled and number exists
          deliveryMethod = DeliveryMethod.whatsapp;
        } else if (appointment.familyMember.user.emailNotifications) {
          // Fallback to email if enabled
          deliveryMethod = DeliveryMethod.email;
        } else {
          // Skip if no delivery method available
          continue;
        }

        // Format data for notification
        const notificationData = {
          title: `Recordatorio de cita en ${days} día(s)`,
          message: `Tienes una cita el ${appointment.appointmentDate.toLocaleDateString('es-CO')} a las ${appointment.appointmentDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}.`,
          appointmentDate:
            appointment.appointmentDate.toLocaleDateString('es-CO'),
          appointmentTime: appointment.appointmentDate.toLocaleTimeString(
            'es-CO',
            {
              hour: '2-digit',
              minute: '2-digit',
            },
          ),
          location: appointment.location || undefined,
          doctorName: appointment.doctorName || undefined,
          specialty: appointment.specialty || undefined,
          familyMemberName: appointment.familyMember.fullName,
          relatedEntityType: 'appointment',
          relatedEntityId: appointment.id,
        };

        // Send notification
        await this.notificationDeliveryService.sendNotification(
          appointment.familyMember.user.id,
          NotificationType.appointment_reminder,
          notificationData,
          deliveryMethod,
        );
      }
    }

    this.logger.log('Finished checking upcoming appointments');
  }

  @Cron('0 9 * * *', {
    timeZone: 'America/Bogota',
  })
  async sendDailySummary() {
    this.logger.log('Sending daily summary...');

    // Get all active users
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      include: {
        familyMembers: {
          include: {
            authorizations: {
              where: {
                expirationDate: {
                  gte: new Date(),
                  lt: new Date(new Date().setDate(new Date().getDate() + 7)),
                },
                status: {
                  in: ['pending', 'scheduled'],
                },
              },
            },
            appointments: {
              where: {
                appointmentDate: {
                  gte: new Date(),
                  lt: new Date(new Date().setDate(new Date().getDate() + 7)),
                },
                status: {
                  in: ['scheduled', 'confirmed'],
                },
              },
            },
          },
        },
      },
    });

    for (const user of users) {
      // Skip users with no notifications enabled
      if (!user.emailNotifications && !user.whatsappNotifications) {
        continue;
      }

      // Count upcoming items
      let expiringCount = 0;
      let appointmentCount = 0;

      user.familyMembers.forEach((member) => {
        expiringCount += member.authorizations.length;
        appointmentCount += member.appointments.length;
      });

      // Only send summary if there are items
      if (expiringCount > 0 || appointmentCount > 0) {
        // Determine delivery method
        let deliveryMethod: DeliveryMethod;
        if (user.whatsappNotifications && user.whatsappNumber) {
          deliveryMethod = DeliveryMethod.whatsapp;
        } else if (user.emailNotifications) {
          deliveryMethod = DeliveryMethod.email;
        } else {
          continue;
        }

        const summaryMessage = this.createDailySummaryMessage(
          user.fullName,
          expiringCount,
          appointmentCount,
        );

        await this.notificationDeliveryService.sendNotification(
          user.id,
          NotificationType.appointment_reminder, // Reusing type for summary
          {
            title: 'Resumen Diario - Gestión EPS',
            message: summaryMessage,
          },
          deliveryMethod,
        );
      }
    }

    this.logger.log('Finished sending daily summaries');
  }

  private createDailySummaryMessage(
    userName: string,
    expiringCount: number,
    appointmentCount: number,
  ): string {
    let message = `Hola ${userName},\n\n`;
    message += `📊 *Resumen Diario - Gestión EPS*\n\n`;

    if (expiringCount > 0) {
      message += `🔔 *Autorizaciones por vencer:* ${expiringCount}\n`;
      message += `   - Revisa las que vencen en los próximos 7 días\n`;
    }

    if (appointmentCount > 0) {
      message += `📅 *Citas próximas:* ${appointmentCount}\n`;
      message += `   - Confirma horarios y ubicaciones\n`;
    }

    if (expiringCount === 0 && appointmentCount === 0) {
      message += `✅ Todo al día\n`;
      message += `   - No hay autorizaciones por vencer ni citas próximas\n`;
    }

    message += `\n🔗 Accede al sistema: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`;
    message += `\n_Este es un mensaje automático. No responder._`;

    return message;
  }
}
