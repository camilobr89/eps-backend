import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTriggerService } from '@/modules/notifications/services/notification-trigger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationDeliveryService } from '@/modules/notifications/services/notification-delivery.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { NotificationType, DeliveryMethod } from '@prisma/client';

const USER_ID = 'user-uuid-1';
const MEMBER_ID = 'member-uuid-1';
const APPT_ID = 'appt-uuid-1';
const AUTH_ID = 'auth-uuid-1';
const EPS_ID = 'eps-uuid-1';

const mockMember = {
  id: MEMBER_ID,
  fullName: 'John Doe',
  user: { id: USER_ID, emailNotifications: true },
};

const mockMemberNoEmail = {
  id: MEMBER_ID,
  fullName: 'Jane Doe',
  user: { id: USER_ID, emailNotifications: false },
};

const mockEpsProvider = {
  id: EPS_ID,
  name: 'EPS Test',
  code: 'EPS001',
};

function futureDate(daysFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(12, 0, 0, 0);
  return d;
}

function buildAppointment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: APPT_ID,
    familyMemberId: MEMBER_ID,
    appointmentDate: futureDate(3),
    location: 'Hospital Central',
    doctorName: 'Dr. Smith',
    specialty: 'Cardiology',
    status: 'scheduled',
    familyMember: { id: MEMBER_ID, fullName: 'John Doe' },
    ...overrides,
  } as Parameters<NotificationTriggerService['trySendAppointmentReminder']>[0];
}

function buildAuthorization(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: AUTH_ID,
    familyMemberId: MEMBER_ID,
    requestNumber: 'REQ-123',
    expirationDate: futureDate(7),
    status: 'pending',
    familyMember: {
      id: MEMBER_ID,
      fullName: 'John Doe',
      user: { id: USER_ID, emailNotifications: true },
    },
    epsProvider: mockEpsProvider,
    ...overrides,
  } as Parameters<
    NotificationTriggerService['trySendAuthorizationExpiryWarning']
  >[0];
}

describe('NotificationTriggerService', () => {
  let service: NotificationTriggerService;
  let mockPrisma: Record<string, unknown>;
  let mockDelivery: Record<string, jest.Mock>;
  let mockNotifService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockPrisma = {
      familyMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      notification: {
        findFirst: jest.fn(),
      },
      appointment: {
        findMany: jest.fn(),
      },
      authorization: {
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    mockDelivery = {
      sendNotification: jest.fn().mockResolvedValue({ success: true }),
    };

    mockNotifService = {
      hasRecentNotification: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTriggerService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: NotificationDeliveryService,
          useValue: mockDelivery,
        },
        {
          provide: NotificationsService,
          useValue: mockNotifService,
        },
      ],
    }).compile();

    service = module.get<NotificationTriggerService>(
      NotificationTriggerService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trySendAppointmentReminder', () => {
    it('should return false when daysUntil is not 1 or 3', async () => {
      const apt = buildAppointment({ appointmentDate: futureDate(5) });
      const result = await service.trySendAppointmentReminder(apt);
      expect(result).toBe(false);
    });

    it('should return false when member not found', async () => {
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(null);
      const apt = buildAppointment({ appointmentDate: futureDate(1) });
      const result = await service.trySendAppointmentReminder(apt);
      expect(result).toBe(false);
    });

    it('should return false when emailNotifications is disabled', async () => {
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(
        mockMemberNoEmail,
      );
      const apt = buildAppointment({ appointmentDate: futureDate(1) });
      const result = await service.trySendAppointmentReminder(apt);
      expect(result).toBe(false);
    });

    it('should return false when recent notification already sent', async () => {
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(
        mockMember,
      );
      mockNotifService.hasRecentNotification.mockResolvedValue(true);
      const apt = buildAppointment({ appointmentDate: futureDate(1) });
      const result = await service.trySendAppointmentReminder(apt);
      expect(result).toBe(false);
      expect(mockDelivery.sendNotification).not.toHaveBeenCalled();
    });

    it('should send notification for appointment 1 day away', async () => {
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(
        mockMember,
      );
      const apt = buildAppointment({ appointmentDate: futureDate(1) });
      const result = await service.trySendAppointmentReminder(apt);
      expect(result).toBe(true);
      expect(mockDelivery.sendNotification).toHaveBeenCalledWith(
        USER_ID,
        NotificationType.appointment_reminder,
        expect.objectContaining({
          title: expect.stringContaining('1 día'),
          relatedEntityType: 'appointment',
          relatedEntityId: APPT_ID,
          familyMemberName: 'John Doe',
        }),
        DeliveryMethod.email,
      );
    });

    it('should send notification for appointment 3 days away', async () => {
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(
        mockMember,
      );
      const apt = buildAppointment({ appointmentDate: futureDate(3) });
      const result = await service.trySendAppointmentReminder(apt);
      expect(result).toBe(true);
      expect(mockDelivery.sendNotification).toHaveBeenCalledWith(
        USER_ID,
        NotificationType.appointment_reminder,
        expect.objectContaining({
          title: expect.stringContaining('3 día'),
        }),
        DeliveryMethod.email,
      );
    });

    it('should handle null location, doctorName, and specialty', async () => {
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(
        mockMember,
      );
      const apt = buildAppointment({
        appointmentDate: futureDate(1),
        location: null,
        doctorName: null,
        specialty: null,
      });
      const result = await service.trySendAppointmentReminder(apt);
      expect(result).toBe(true);
      expect(mockDelivery.sendNotification).toHaveBeenCalledWith(
        USER_ID,
        NotificationType.appointment_reminder,
        expect.objectContaining({
          location: undefined,
          doctorName: undefined,
          specialty: undefined,
        }),
        DeliveryMethod.email,
      );
    });

    it('should return false when delivery fails', async () => {
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(
        mockMember,
      );
      mockDelivery.sendNotification.mockResolvedValue({ success: false });
      const apt = buildAppointment({ appointmentDate: futureDate(1) });
      const result = await service.trySendAppointmentReminder(apt);
      expect(result).toBe(false);
    });
  });

  describe('trySendAuthorizationExpiryWarning', () => {
    it('should return false when no expirationDate', async () => {
      const auth = buildAuthorization({ expirationDate: null });
      const result = await service.trySendAuthorizationExpiryWarning(auth);
      expect(result).toBe(false);
    });

    it('should return false when daysUntil not in [1, 3, 7]', async () => {
      const auth = buildAuthorization({ expirationDate: futureDate(10) });
      const result = await service.trySendAuthorizationExpiryWarning(auth);
      expect(result).toBe(false);
    });

    it('should return false when emailNotifications is disabled', async () => {
      const auth = buildAuthorization({
        familyMember: {
          id: MEMBER_ID,
          fullName: 'Jane Doe',
          user: { id: USER_ID, emailNotifications: false },
        },
      });
      const result = await service.trySendAuthorizationExpiryWarning(auth);
      expect(result).toBe(false);
    });

    it('should return false when recent notification already sent', async () => {
      mockNotifService.hasRecentNotification.mockResolvedValue(true);
      const auth = buildAuthorization({ expirationDate: futureDate(7) });
      const result = await service.trySendAuthorizationExpiryWarning(auth);
      expect(result).toBe(false);
      expect(mockDelivery.sendNotification).not.toHaveBeenCalled();
    });

    it('should send warning for authorization expiring in 7 days', async () => {
      const auth = buildAuthorization({ expirationDate: futureDate(7) });
      const result = await service.trySendAuthorizationExpiryWarning(auth);
      expect(result).toBe(true);
      expect(mockDelivery.sendNotification).toHaveBeenCalledWith(
        USER_ID,
        NotificationType.expiration_warning,
        expect.objectContaining({
          title: expect.stringContaining('7 día'),
          relatedEntityType: 'authorization',
          relatedEntityId: AUTH_ID,
          daysRemaining: 7,
        }),
        DeliveryMethod.email,
      );
    });

    it('should send warning for authorization expiring in 3 days', async () => {
      const auth = buildAuthorization({ expirationDate: futureDate(3) });
      const result = await service.trySendAuthorizationExpiryWarning(auth);
      expect(result).toBe(true);
      expect(mockDelivery.sendNotification).toHaveBeenCalledWith(
        USER_ID,
        NotificationType.expiration_warning,
        expect.objectContaining({
          title: expect.stringContaining('3 día'),
          daysRemaining: 3,
        }),
        DeliveryMethod.email,
      );
    });

    it('should send warning for authorization expiring in 1 day', async () => {
      const auth = buildAuthorization({ expirationDate: futureDate(1) });
      const result = await service.trySendAuthorizationExpiryWarning(auth);
      expect(result).toBe(true);
      expect(mockDelivery.sendNotification).toHaveBeenCalledWith(
        USER_ID,
        NotificationType.expiration_warning,
        expect.objectContaining({
          title: expect.stringContaining('1 día'),
          daysRemaining: 1,
        }),
        DeliveryMethod.email,
      );
    });

    it('should handle null epsProvider gracefully', async () => {
      const auth = buildAuthorization({
        expirationDate: futureDate(7),
        epsProvider: null,
      });
      const result = await service.trySendAuthorizationExpiryWarning(auth);
      expect(result).toBe(true);
      expect(mockDelivery.sendNotification).toHaveBeenCalledWith(
        USER_ID,
        NotificationType.expiration_warning,
        expect.objectContaining({
          epsName: 'EPS',
        }),
        DeliveryMethod.email,
      );
    });

    it('should handle missing requestNumber', async () => {
      const auth = buildAuthorization({
        expirationDate: futureDate(7),
        requestNumber: null,
      });
      const result = await service.trySendAuthorizationExpiryWarning(auth);
      expect(result).toBe(true);
    });

    it('should return false when delivery fails', async () => {
      mockDelivery.sendNotification.mockResolvedValue({ success: false });
      const auth = buildAuthorization({ expirationDate: futureDate(7) });
      const result = await service.trySendAuthorizationExpiryWarning(auth);
      expect(result).toBe(false);
    });
  });

  describe('sendRemindersForUser', () => {
    it('should scan and send appointment reminders', async () => {
      (mockPrisma.familyMember.findMany as jest.Mock).mockResolvedValue([
        { id: MEMBER_ID },
      ]);
      (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([
        buildAppointment({ appointmentDate: futureDate(1) }),
      ]);
      (mockPrisma.authorization.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.familyMember.findUnique as jest.Mock).mockResolvedValue(
        mockMember,
      );

      const result = await service.sendRemindersForUser(USER_ID);

      expect(result.appointmentReminders).toBe(1);
      expect(result.authorizationWarnings).toBe(0);
      expect(mockDelivery.sendNotification).toHaveBeenCalled();
    });

    it('should scan and send authorization warnings', async () => {
      (mockPrisma.familyMember.findMany as jest.Mock).mockResolvedValue([
        { id: MEMBER_ID },
      ]);
      (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.authorization.findMany as jest.Mock).mockResolvedValue([
        buildAuthorization({ expirationDate: futureDate(7) }),
      ]);

      const result = await service.sendRemindersForUser(USER_ID);

      expect(result.appointmentReminders).toBe(0);
      expect(result.authorizationWarnings).toBe(1);
      expect(mockDelivery.sendNotification).toHaveBeenCalled();
    });

    it('should handle zero family members', async () => {
      (mockPrisma.familyMember.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.authorization.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.sendRemindersForUser(USER_ID);

      expect(result.appointmentReminders).toBe(0);
      expect(result.authorizationWarnings).toBe(0);
    });

    it('should count only eligible items', async () => {
      (mockPrisma.familyMember.findMany as jest.Mock).mockResolvedValue([
        { id: MEMBER_ID },
      ]);
      (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([
        buildAppointment({ appointmentDate: futureDate(10) }),
      ]);
      (mockPrisma.authorization.findMany as jest.Mock).mockResolvedValue([
        buildAuthorization({ expirationDate: futureDate(10) }),
      ]);

      const result = await service.sendRemindersForUser(USER_ID);

      expect(result.appointmentReminders).toBe(0);
      expect(result.authorizationWarnings).toBe(0);
      expect(mockDelivery.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('sendAllPendingReminders', () => {
    it('should iterate active users with email notifications enabled', async () => {
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: USER_ID },
      ]);
      (mockPrisma.familyMember.findMany as jest.Mock).mockResolvedValue([
        { id: MEMBER_ID },
      ]);
      (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.authorization.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.sendAllPendingReminders();

      expect(result.usersProcessed).toBe(1);
      expect(result.appointmentReminders).toBe(0);
      expect(result.authorizationWarnings).toBe(0);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { isActive: true, emailNotifications: true },
        select: { id: true },
      });
    });

    it('should aggregate results from multiple users', async () => {
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);
      (mockPrisma.familyMember.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.authorization.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.sendAllPendingReminders();

      expect(result.usersProcessed).toBe(2);
    });
  });
});
