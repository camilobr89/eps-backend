import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from './email.service';
import { NotificationType, DeliveryMethod } from '@prisma/client';

export interface NotificationData {
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  // Authorization expiration specific data
  authorizationNumber?: string;
  expirationDate?: string;
  daysRemaining?: number;
  familyMemberName?: string;
  epsName?: string;
  // Appointment specific data
  appointmentDate?: string;
  appointmentTime?: string;
  location?: string;
  doctorName?: string;
  specialty?: string;
  // OCR specific data
  fileName?: string;
  confidenceScore?: number;
  documentId?: string;
}

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async sendNotification(
    userId: string,
    type: NotificationType,
    data: NotificationData,
    deliveryMethod: DeliveryMethod = DeliveryMethod.email,
  ): Promise<{ success: boolean; notificationId?: string }> {
    try {
      // Get user with preferences
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          emailNotifications: true,
        },
      });

      if (!user) {
        this.logger.error(`User ${userId} not found`);
        return { success: false };
      }

      // Check if user wants email notifications
      if (!user.emailNotifications) {
        this.logger.log(`User ${userId} has email notifications disabled`);
        return { success: false };
      }

      // Create notification record first
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          title: data.title,
          message: data.message,
          type,
          deliveryMethod,
          relatedEntityType: data.relatedEntityType,
          relatedEntityId: data.relatedEntityId,
        },
      });

      let emailSent = false;
      let emailError: string | null = null;

      // Send email if user has email
      if (user.email) {
        try {
          emailSent = await this.sendByEmail(
            type,
            user.email,
            user.fullName,
            data,
          );
          if (!emailSent) {
            emailError = 'Failed to send email';
          }
        } catch (error) {
          emailError = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Email sending failed for user ${userId}:`, error);
        }
      }

      // Update notification with delivery status
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          emailSent,
          emailError,
        },
      });

      // Log summary
      this.logger.log(
        `Notification ${notification.id} sent to user ${userId}: ` +
          `Email: ${emailSent ? '✓' : '✗'}`,
      );

      return {
        success: emailSent,
        notificationId: notification.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${userId}:`,
        error,
      );
      return { success: false };
    }
  }

  private async sendByEmail(
    type: NotificationType,
    email: string,
    recipientName: string,
    data: NotificationData,
  ): Promise<boolean> {
    switch (type) {
      case NotificationType.expiration_warning:
        return await this.emailService.sendAuthorizationExpirationReminder(
          email,
          {
            recipientName,
            authorizationNumber: data.authorizationNumber!,
            expirationDate: data.expirationDate!,
            daysRemaining: data.daysRemaining!,
            familyMemberName: data.familyMemberName!,
            epsName: data.epsName!,
            authorizationId: data.relatedEntityId!,
          },
        );

      case NotificationType.appointment_reminder:
        return await this.emailService.sendAppointmentReminder(email, {
          recipientName,
          appointmentDate: data.appointmentDate!,
          appointmentTime: data.appointmentTime!,
          location: data.location!,
          doctorName: data.doctorName!,
          specialty: data.specialty!,
          familyMemberName: data.familyMemberName!,
          appointmentId: data.relatedEntityId!,
        });

      case NotificationType.ocr_completed:
        return await this.emailService.sendOcrCompletionNotification(email, {
          recipientName,
          fileName: data.fileName!,
          authorizationNumber: data.authorizationNumber!,
          familyMemberName: data.familyMemberName!,
          confidenceScore: data.confidenceScore!,
          documentId: data.relatedEntityId!,
        });

      default:
        this.logger.warn(`Unsupported email notification type: ${type}`);
        return false;
    }
  }

  async getDeliveryStats(userId: string): Promise<{
    total: number;
    emailSent: number;
    emailFailed: number;
  }> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      select: {
        emailSent: true,
        emailError: true,
      },
    });

    const stats = {
      total: notifications.length,
      emailSent: 0,
      emailFailed: 0,
    };

    notifications.forEach((notification) => {
      if (notification.emailSent) stats.emailSent++;
      if (notification.emailError) stats.emailFailed++;
    });

    return stats;
  }
}
