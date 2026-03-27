import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from './email.service';
import { WhatsAppService } from './whatsapp.service';
import { NotificationType, DeliveryMethod } from '@prisma/client';

interface NotificationData {
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
    private readonly whatsappService: WhatsAppService,
  ) {}

  async sendNotification(
    userId: string,
    type: NotificationType,
    data: NotificationData,
    deliveryMethod: DeliveryMethod = DeliveryMethod.both,
  ) {
    try {
      // Get user with preferences
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          whatsappNumber: true,
          emailNotifications: true,
          whatsappNotifications: true,
        },
      });

      if (!user) {
        this.logger.error(`User ${userId} not found`);
        return false;
      }

      // Determine which methods to use based on user preferences and deliveryMethod
      const shouldSendEmail =
        user.emailNotifications &&
        (deliveryMethod === DeliveryMethod.email ||
          deliveryMethod === DeliveryMethod.both);

      const shouldSendWhatsApp =
        user.whatsappNotifications &&
        user.whatsappNumber &&
        (deliveryMethod === DeliveryMethod.whatsapp ||
          deliveryMethod === DeliveryMethod.both);

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
      let whatsappSent = false;
      let emailError: string | null = null;
      let whatsappError: string | null = null;

      // Send email if requested and user has email
      if (shouldSendEmail && user.email) {
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

      // Send WhatsApp if requested and user has WhatsApp number
      if (shouldSendWhatsApp && user.whatsappNumber) {
        try {
          // Validate WhatsApp number format
          const isValidNumber = this.whatsappService.validateNumber(
            user.whatsappNumber,
          );
          if (isValidNumber) {
            whatsappSent = await this.sendByWhatsApp(
              type,
              user.whatsappNumber,
              user.fullName,
              data,
            );
            if (!whatsappSent) {
              whatsappError = 'Failed to send WhatsApp message';
            }
          } else {
            whatsappError = 'Invalid WhatsApp number format';
            this.logger.warn(
              `Invalid WhatsApp number for user ${userId}: ${user.whatsappNumber}`,
            );
          }
        } catch (error) {
          whatsappError =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `WhatsApp sending failed for user ${userId}:`,
            error,
          );
        }
      }

      // Update notification with delivery status
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          emailSent,
          whatsappSent,
          emailError,
          whatsappError,
        },
      });

      // Log summary
      this.logger.log(
        `Notification ${notification.id} sent to user ${userId}: ` +
          `Email: ${emailSent ? '✓' : '✗'}, WhatsApp: ${whatsappSent ? '✓' : '✗'}`,
      );

      return emailSent || whatsappSent;
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${userId}:`,
        error,
      );
      return false;
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

  private async sendByWhatsApp(
    type: NotificationType,
    phoneNumber: string,
    recipientName: string,
    data: NotificationData,
  ): Promise<boolean> {
    switch (type) {
      case NotificationType.expiration_warning:
        return await this.whatsappService.sendAuthorizationExpirationReminder(
          phoneNumber,
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
        return await this.whatsappService.sendAppointmentReminder(phoneNumber, {
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
        return await this.whatsappService.sendOcrCompletionNotification(
          phoneNumber,
          {
            recipientName,
            fileName: data.fileName!,
            authorizationNumber: data.authorizationNumber!,
            familyMemberName: data.familyMemberName!,
            confidenceScore: data.confidenceScore!,
            documentId: data.relatedEntityId!,
          },
        );

      default:
        this.logger.warn(`Unsupported WhatsApp notification type: ${type}`);
        return false;
    }
  }

  async getDeliveryStats(userId: string): Promise<{
    total: number;
    emailSent: number;
    whatsappSent: number;
    emailFailed: number;
    whatsappFailed: number;
  }> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      select: {
        emailSent: true,
        whatsappSent: true,
        emailError: true,
        whatsappError: true,
      },
    });

    const stats = {
      total: notifications.length,
      emailSent: 0,
      whatsappSent: 0,
      emailFailed: 0,
      whatsappFailed: 0,
    };

    notifications.forEach((notification) => {
      if (notification.emailSent) stats.emailSent++;
      if (notification.emailError) stats.emailFailed++;
      if (notification.whatsappSent) stats.whatsappSent++;
      if (notification.whatsappError) stats.whatsappFailed++;
    });

    return stats;
  }

  async getSandboxInstructions(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { whatsappNotifications: true, whatsappNumber: true },
    });

    if (!user || !user.whatsappNotifications) {
      return null;
    }

    return this.whatsappService.getSandboxInstructions();
  }
}
