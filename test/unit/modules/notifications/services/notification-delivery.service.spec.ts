import { Test, TestingModule } from '@nestjs/testing';
import { NotificationDeliveryService } from '@/modules/notifications/services/notification-delivery.service';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/modules/notifications/services/email.service';
import { NotificationType, DeliveryMethod } from '@prisma/client';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
  notification: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockEmailService = {
  sendAuthorizationExpirationReminder: jest.fn(),
  sendAppointmentReminder: jest.fn(),
  sendOcrCompletionNotification: jest.fn(),
};

describe('NotificationDeliveryService', () => {
  let service: NotificationDeliveryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDeliveryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<NotificationDeliveryService>(
      NotificationDeliveryService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendNotification', () => {
    const userId = 'user-123';
    const type = NotificationType.expiration_warning;
    const data = {
      title: 'Authorization Expiring',
      message: 'Your authorization is expiring soon',
      relatedEntityType: 'authorization',
      relatedEntityId: 'auth-456',
      authorizationNumber: 'AUTH-789',
      expirationDate: '2024-12-31',
      daysRemaining: 7,
      familyMemberName: 'Jane Doe',
      epsName: 'Salud Total',
    };

    it('should send notification successfully via email', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        fullName: 'John Doe',
        emailNotifications: true,
      };
      const mockNotification = {
        id: 'notif-123',
        userId,
        title: data.title,
        message: data.message,
        type,
        deliveryMethod: DeliveryMethod.email,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockEmailService.sendAuthorizationExpirationReminder.mockResolvedValue(
        true,
      );
      mockPrismaService.notification.update.mockResolvedValue({});

      const result = await service.sendNotification(userId, type, data);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          emailNotifications: true,
        },
      });
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          title: data.title,
          message: data.message,
          type,
          deliveryMethod: DeliveryMethod.email,
          relatedEntityType: data.relatedEntityType,
          relatedEntityId: data.relatedEntityId,
        },
      });
      expect(
        mockEmailService.sendAuthorizationExpirationReminder,
      ).toHaveBeenCalledWith(mockUser.email, {
        recipientName: mockUser.fullName,
        authorizationNumber: data.authorizationNumber,
        expirationDate: data.expirationDate,
        daysRemaining: data.daysRemaining,
        familyMemberName: data.familyMemberName,
        epsName: data.epsName,
        authorizationId: data.relatedEntityId,
      });
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotification.id },
        data: {
          emailSent: true,
          emailError: null,
        },
      });
      expect(result).toEqual({
        success: true,
        notificationId: mockNotification.id,
      });
    });

    it('should return failure when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.sendNotification(userId, type, data);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalled();
      expect(mockPrismaService.notification.create).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false });
    });

    it('should return failure when email notifications are disabled', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        fullName: 'John Doe',
        emailNotifications: false,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.sendNotification(userId, type, data);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalled();
      expect(mockPrismaService.notification.create).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false });
    });

    it('should handle email sending failure', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        fullName: 'John Doe',
        emailNotifications: true,
      };
      const mockNotification = {
        id: 'notif-123',
        userId,
        title: data.title,
        message: data.message,
        type,
        deliveryMethod: DeliveryMethod.email,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockEmailService.sendAuthorizationExpirationReminder.mockResolvedValue(
        false,
      );
      mockPrismaService.notification.update.mockResolvedValue({});

      const result = await service.sendNotification(userId, type, data);

      expect(
        mockEmailService.sendAuthorizationExpirationReminder,
      ).toHaveBeenCalled();
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotification.id },
        data: {
          emailSent: false,
          emailError: 'Failed to send email',
        },
      });
      expect(result).toEqual({
        success: false,
        notificationId: mockNotification.id,
      });
    });

    it('should handle email sending exception', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        fullName: 'John Doe',
        emailNotifications: true,
      };
      const mockNotification = {
        id: 'notif-123',
        userId,
        title: data.title,
        message: data.message,
        type,
        deliveryMethod: DeliveryMethod.email,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      const error = new Error('SMTP error');
      mockEmailService.sendAuthorizationExpirationReminder.mockRejectedValue(
        error,
      );
      mockPrismaService.notification.update.mockResolvedValue({});

      const result = await service.sendNotification(userId, type, data);

      expect(
        mockEmailService.sendAuthorizationExpirationReminder,
      ).toHaveBeenCalled();
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotification.id },
        data: {
          emailSent: false,
          emailError: 'SMTP error',
        },
      });
      expect(result).toEqual({
        success: false,
        notificationId: mockNotification.id,
      });
    });

    it('should handle user without email', async () => {
      const mockUser = {
        id: userId,
        email: null,
        fullName: 'John Doe',
        emailNotifications: true,
      };
      const mockNotification = {
        id: 'notif-123',
        userId,
        title: data.title,
        message: data.message,
        type,
        deliveryMethod: DeliveryMethod.email,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue({});

      const result = await service.sendNotification(userId, type, data);

      expect(
        mockEmailService.sendAuthorizationExpirationReminder,
      ).not.toHaveBeenCalled();
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotification.id },
        data: {
          emailSent: false,
          emailError: null,
        },
      });
      expect(result).toEqual({
        success: false,
        notificationId: mockNotification.id,
      });
    });

    it('should send appointment reminder notification', async () => {
      const appointmentType = NotificationType.appointment_reminder;
      const appointmentData = {
        title: 'Appointment Reminder',
        message: 'You have an appointment tomorrow',
        relatedEntityType: 'appointment',
        relatedEntityId: 'appt-123',
        appointmentDate: '2024-12-25',
        appointmentTime: '10:00 AM',
        location: 'Hospital Central',
        doctorName: 'Dr. Smith',
        specialty: 'Cardiology',
        familyMemberName: 'Jane Doe',
      };
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        fullName: 'John Doe',
        emailNotifications: true,
      };
      const mockNotification = {
        id: 'notif-123',
        userId,
        title: appointmentData.title,
        message: appointmentData.message,
        type: appointmentType,
        deliveryMethod: DeliveryMethod.email,
        relatedEntityType: appointmentData.relatedEntityType,
        relatedEntityId: appointmentData.relatedEntityId,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockEmailService.sendAppointmentReminder.mockResolvedValue(true);
      mockPrismaService.notification.update.mockResolvedValue({});

      const result = await service.sendNotification(
        userId,
        appointmentType,
        appointmentData,
      );

      expect(mockEmailService.sendAppointmentReminder).toHaveBeenCalledWith(
        mockUser.email,
        {
          recipientName: mockUser.fullName,
          appointmentDate: appointmentData.appointmentDate,
          appointmentTime: appointmentData.appointmentTime,
          location: appointmentData.location,
          doctorName: appointmentData.doctorName,
          specialty: appointmentData.specialty,
          familyMemberName: appointmentData.familyMemberName,
          appointmentId: appointmentData.relatedEntityId,
        },
      );
      expect(result.success).toBe(true);
    });

    it('should send OCR completion notification', async () => {
      const ocrType = NotificationType.ocr_completed;
      const ocrData = {
        title: 'OCR Processing Complete',
        message: 'Your document has been processed',
        relatedEntityType: 'document',
        relatedEntityId: 'doc-123',
        fileName: 'document.pdf',
        authorizationNumber: 'AUTH-456',
        familyMemberName: 'Jane Doe',
        confidenceScore: 0.85,
        documentId: 'doc-123',
      };
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        fullName: 'John Doe',
        emailNotifications: true,
      };
      const mockNotification = {
        id: 'notif-123',
        userId,
        title: ocrData.title,
        message: ocrData.message,
        type: ocrType,
        deliveryMethod: DeliveryMethod.email,
        relatedEntityType: ocrData.relatedEntityType,
        relatedEntityId: ocrData.relatedEntityId,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockEmailService.sendOcrCompletionNotification.mockResolvedValue(true);
      mockPrismaService.notification.update.mockResolvedValue({});

      const result = await service.sendNotification(userId, ocrType, ocrData);

      expect(
        mockEmailService.sendOcrCompletionNotification,
      ).toHaveBeenCalledWith(mockUser.email, {
        recipientName: mockUser.fullName,
        fileName: ocrData.fileName,
        authorizationNumber: ocrData.authorizationNumber,
        familyMemberName: ocrData.familyMemberName,
        confidenceScore: ocrData.confidenceScore,
        documentId: ocrData.relatedEntityId,
      });
      expect(result.success).toBe(true);
    });

    it('should return false for unsupported notification type', async () => {
      const unsupportedType = NotificationType.ocr_failed;
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        fullName: 'John Doe',
        emailNotifications: true,
      };
      const mockNotification = {
        id: 'notif-123',
        userId,
        title: data.title,
        message: data.message,
        type: unsupportedType,
        deliveryMethod: DeliveryMethod.email,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue({});

      const result = await service.sendNotification(
        userId,
        unsupportedType,
        data,
      );

      expect(
        mockEmailService.sendAuthorizationExpirationReminder,
      ).not.toHaveBeenCalled();
      expect(mockEmailService.sendAppointmentReminder).not.toHaveBeenCalled();
      expect(
        mockEmailService.sendOcrCompletionNotification,
      ).not.toHaveBeenCalled();
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotification.id },
        data: {
          emailSent: false,
          emailError: 'Failed to send email',
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('getDeliveryStats', () => {
    const userId = 'user-123';

    it('should return delivery statistics', async () => {
      const mockNotifications = [
        { emailSent: true, emailError: null },
        { emailSent: true, emailError: null },
        { emailSent: false, emailError: 'Failed' },
        { emailSent: false, emailError: null },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(
        mockNotifications,
      );

      const result = await service.getDeliveryStats(userId);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: {
          emailSent: true,
          emailError: true,
        },
      });
      expect(result).toEqual({
        total: 4,
        emailSent: 2,
        emailFailed: 1,
      });
    });

    it('should handle empty notifications', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      const result = await service.getDeliveryStats(userId);

      expect(result).toEqual({
        total: 0,
        emailSent: 0,
        emailFailed: 0,
      });
    });
  });
});
