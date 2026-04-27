import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationsService } from '../notifications.service';
import {
  NotificationType,
  DeliveryMethod,
  type Appointment,
  type Authorization,
  type FamilyMember,
  type User,
  type EpsProvider,
} from '@prisma/client';

type AppointmentWithRelations = Appointment & {
  familyMember: Pick<FamilyMember, 'id' | 'fullName'>;
};

type AuthorizationWithRelations = Authorization & {
  familyMember: Pick<FamilyMember, 'id' | 'fullName'> & {
    user: Pick<User, 'id' | 'emailNotifications'>;
  };
  epsProvider: Pick<EpsProvider, 'id' | 'name' | 'code'> | null;
};

const REMINDER_DAYS_APPOINTMENT = [1, 3];
const WARNING_DAYS_AUTHORIZATION = [1, 3, 7];

@Injectable()
export class NotificationTriggerService {
  private readonly logger = new Logger(NotificationTriggerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDeliveryService: NotificationDeliveryService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async trySendAppointmentReminder(
    appointment: AppointmentWithRelations,
  ): Promise<boolean> {
    const daysUntil = this.daysUntil(appointment.appointmentDate);
    if (!REMINDER_DAYS_APPOINTMENT.includes(daysUntil)) return false;

    const member = await this.prisma.familyMember.findUnique({
      where: { id: appointment.familyMemberId },
      select: {
        fullName: true,
        user: { select: { id: true, emailNotifications: true } },
      },
    });
    if (!member || !member.user.emailNotifications) return false;

    const userId = member.user.id;
    const hasRecent = await this.notificationsService.hasRecentNotification(
      userId,
      NotificationType.appointment_reminder,
      appointment.id,
    );
    if (hasRecent) return false;

    const result = await this.notificationDeliveryService.sendNotification(
      userId,
      NotificationType.appointment_reminder,
      {
        title: `Recordatorio de cita en ${daysUntil} día(s)`,
        message: `Tienes una cita el ${appointment.appointmentDate.toLocaleDateString('es-CO')} a las ${appointment.appointmentDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}.`,
        appointmentDate:
          appointment.appointmentDate.toLocaleDateString('es-CO'),
        appointmentTime: appointment.appointmentDate.toLocaleTimeString(
          'es-CO',
          { hour: '2-digit', minute: '2-digit' },
        ),
        location: appointment.location || undefined,
        doctorName: appointment.doctorName || undefined,
        specialty: appointment.specialty || undefined,
        familyMemberName: member.fullName,
        relatedEntityType: 'appointment',
        relatedEntityId: appointment.id,
      },
      DeliveryMethod.email,
    );

    return result.success;
  }

  async trySendAuthorizationExpiryWarning(
    authorization: AuthorizationWithRelations,
  ): Promise<boolean> {
    if (!authorization.expirationDate) return false;

    const daysUntil = this.daysUntil(authorization.expirationDate);
    if (!WARNING_DAYS_AUTHORIZATION.includes(daysUntil)) return false;

    if (!authorization.familyMember?.user?.emailNotifications) return false;

    const userId = authorization.familyMember.user.id;
    const hasRecent = await this.notificationsService.hasRecentNotification(
      userId,
      NotificationType.expiration_warning,
      authorization.id,
    );
    if (hasRecent) return false;

    const result = await this.notificationDeliveryService.sendNotification(
      userId,
      NotificationType.expiration_warning,
      {
        title: `Autorización por vencer en ${daysUntil} día(s)`,
        message: `La autorización ${authorization.requestNumber || 'N/A'} vence el ${authorization.expirationDate.toLocaleDateString('es-CO')}. Por favor agenda una cita.`,
        authorizationNumber: authorization.requestNumber || undefined,
        expirationDate:
          authorization.expirationDate.toLocaleDateString('es-CO'),
        daysRemaining: daysUntil,
        familyMemberName: authorization.familyMember.fullName,
        epsName: authorization.epsProvider?.name || 'EPS',
        relatedEntityType: 'authorization',
        relatedEntityId: authorization.id,
      },
      DeliveryMethod.email,
    );

    return result.success;
  }

  async sendRemindersForUser(userId: string): Promise<{
    appointmentReminders: number;
    authorizationWarnings: number;
  }> {
    const memberIds = (
      await this.prisma.familyMember.findMany({
        where: { userId },
        select: { id: true },
      })
    ).map((m) => m.id);

    const today = new Date();

    const upcomingAppointments = await this.prisma.appointment.findMany({
      where: {
        familyMemberId: { in: memberIds },
        appointmentDate: { gte: today },
        status: { in: ['scheduled', 'confirmed'] },
      },
      include: {
        familyMember: { select: { id: true, fullName: true } },
      },
    });

    const expiringAuthorizations = await this.prisma.authorization.findMany({
      where: {
        familyMemberId: { in: memberIds },
        expirationDate: { gte: today },
        status: { in: ['pending', 'scheduled'] },
      },
      include: {
        familyMember: {
          select: {
            id: true,
            fullName: true,
            user: { select: { id: true, emailNotifications: true } },
          },
        },
        epsProvider: { select: { id: true, name: true, code: true } },
      },
    });

    let appointmentReminders = 0;
    for (const apt of upcomingAppointments) {
      const sent = await this.trySendAppointmentReminder(apt);
      if (sent) appointmentReminders++;
    }

    let authorizationWarnings = 0;
    for (const auth of expiringAuthorizations) {
      const sent = await this.trySendAuthorizationExpiryWarning(auth);
      if (sent) authorizationWarnings++;
    }

    this.logger.log(
      `Reminders for user ${userId}: ${appointmentReminders} sent, ${authorizationWarnings} sent`,
    );

    return { appointmentReminders, authorizationWarnings };
  }

  async sendAllPendingReminders(): Promise<{
    usersProcessed: number;
    appointmentReminders: number;
    authorizationWarnings: number;
  }> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true, emailNotifications: true },
      select: { id: true },
    });

    let appointmentReminders = 0;
    let authorizationWarnings = 0;

    for (const user of users) {
      const result = await this.sendRemindersForUser(user.id);
      appointmentReminders += result.appointmentReminders;
      authorizationWarnings += result.authorizationWarnings;
    }

    this.logger.log(
      `All reminders sent: ${users.length} users, ${appointmentReminders} appointments, ${authorizationWarnings} authorizations`,
    );

    return {
      usersProcessed: users.length,
      appointmentReminders,
      authorizationWarnings,
    };
  }

  private daysUntil(date: Date): number {
    const now = new Date();
    const target = new Date(date);
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round(
      (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
}
