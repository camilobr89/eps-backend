import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AuthorizationsService } from '@/modules/authorizations/authorizations.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationTriggerService } from '@/modules/notifications/services/notification-trigger.service';

const mockNotificationTrigger = {
  trySendAppointmentReminder: jest.fn().mockResolvedValue(false),
  trySendAuthorizationExpiryWarning: jest.fn().mockResolvedValue(false),
  sendRemindersForUser: jest.fn().mockResolvedValue({
    appointmentReminders: 0,
    authorizationWarnings: 0,
  }),
  sendAllPendingReminders: jest.fn().mockResolvedValue({
    usersProcessed: 0,
    appointmentReminders: 0,
    authorizationWarnings: 0,
  }),
};

const mockPrisma = {
  authorization: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  familyMember: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
};

const userId = 'user-uuid-1';
const memberId = 'member-uuid-1';
const authId = 'auth-uuid-1';

const mockMember = { id: memberId, userId, fullName: 'Test Member' };

const mockAuthorization = {
  id: authId,
  familyMemberId: memberId,
  documentType: 'orden_medica',
  status: 'pending',
  priority: 'normal',
  expirationDate: new Date('2027-12-31'),
  createdAt: new Date(),
  services: [
    {
      id: 'svc-1',
      serviceCode: '890201',
      serviceName: 'Consulta',
      quantity: 1,
    },
  ],
  familyMember: { id: memberId, fullName: 'Test Member', userId },
  epsProvider: null,
};

const createDto = {
  familyMemberId: memberId,
  documentType: 'orden_medica',
  diagnosisCode: 'J45.0',
  services: [{ serviceCode: '890201', serviceName: 'Consulta', quantity: 1 }],
};

describe('AuthorizationsService', () => {
  let service: AuthorizationsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationsService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: NotificationTriggerService,
          useValue: mockNotificationTrigger,
        },
      ],
    }).compile();

    service = module.get<AuthorizationsService>(AuthorizationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an authorization with services', async () => {
      mockPrisma.familyMember.findFirst.mockResolvedValue(mockMember);
      mockPrisma.authorization.create.mockResolvedValue(mockAuthorization);

      const result = await service.create(userId, createDto);

      expect(mockPrisma.familyMember.findFirst).toHaveBeenCalledWith({
        where: { id: memberId, userId },
      });
      expect(mockPrisma.authorization.create).toHaveBeenCalled();
      expect(result).toEqual(mockAuthorization);
    });

    it('should throw NotFoundException if family member does not belong to user', async () => {
      mockPrisma.familyMember.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create authorization without services', async () => {
      mockPrisma.familyMember.findFirst.mockResolvedValue(mockMember);
      mockPrisma.authorization.create.mockResolvedValue({
        ...mockAuthorization,
        services: [],
      });

      const dtoWithoutServices = { ...createDto, services: undefined };
      await service.create(userId, dtoWithoutServices);

      expect(mockPrisma.authorization.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return authorizations for user family members', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.authorization.findMany.mockResolvedValue([mockAuthorization]);
      mockPrisma.authorization.count.mockResolvedValue(1);

      const result = await service.findAll(userId, {});

      expect(mockPrisma.familyMember.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: { id: true },
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should return empty paginated response if user has no family members', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId, {});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(mockPrisma.authorization.findMany).not.toHaveBeenCalled();
    });

    it('should return empty paginated response if filtering by unowned family member', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);

      const result = await service.findAll(userId, {
        familyMemberId: 'other-member-uuid',
      });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should apply status filter', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.authorization.findMany.mockResolvedValue([]);
      mockPrisma.authorization.count.mockResolvedValue(0);

      await service.findAll(userId, { status: 'pending' as any });

      const whereArg = mockPrisma.authorization.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe('pending');
    });

    it('should apply priority filter', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.authorization.findMany.mockResolvedValue([]);
      mockPrisma.authorization.count.mockResolvedValue(0);

      await service.findAll(userId, { priority: 'alta' as any });

      const whereArg = mockPrisma.authorization.findMany.mock.calls[0][0].where;
      expect(whereArg.priority).toBe('alta');
    });

    it('should apply expiringBefore filter', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.authorization.findMany.mockResolvedValue([]);
      mockPrisma.authorization.count.mockResolvedValue(0);

      await service.findAll(userId, { expiringBefore: '2026-03-01' });

      const whereArg = mockPrisma.authorization.findMany.mock.calls[0][0].where;
      expect(whereArg.expirationDate).toEqual({ lte: new Date('2026-03-01') });
    });
  });

  describe('findOne', () => {
    it('should return authorization if it belongs to user', async () => {
      mockPrisma.authorization.findUnique.mockResolvedValue(mockAuthorization);

      const result = await service.findOne(authId, userId);

      expect(result.id).toBe(authId);
    });

    it('should throw NotFoundException if authorization does not exist', async () => {
      mockPrisma.authorization.findUnique.mockResolvedValue(null);

      await expect(service.findOne(authId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if authorization belongs to another user', async () => {
      mockPrisma.authorization.findUnique.mockResolvedValue({
        ...mockAuthorization,
        familyMember: {
          ...mockAuthorization.familyMember,
          userId: 'other-user',
        },
      });

      await expect(service.findOne(authId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update authorization fields', async () => {
      mockPrisma.authorization.findUnique.mockResolvedValue(mockAuthorization);
      mockPrisma.authorization.update.mockResolvedValue({
        ...mockAuthorization,
        notes: 'Updated notes',
      });

      const result = await service.update(authId, userId, {
        notes: 'Updated notes',
      });

      expect(mockPrisma.authorization.update).toHaveBeenCalled();
      expect(result.notes).toBe('Updated notes');
    });

    it('should replace services when provided in update', async () => {
      mockPrisma.authorization.findUnique.mockResolvedValue(mockAuthorization);
      mockPrisma.authorization.update.mockResolvedValue(mockAuthorization);

      await service.update(authId, userId, {
        services: [{ serviceCode: '999', serviceName: 'New service' }],
      });

      const updateArg = mockPrisma.authorization.update.mock.calls[0][0];
      expect(updateArg.data.services).toEqual({
        deleteMany: {},
        create: [
          {
            serviceCode: '999',
            quantity: 1,
            serviceName: 'New service',
            serviceType: undefined,
          },
        ],
      });
    });

    it('should verify new family member ownership when changing familyMemberId', async () => {
      const newMemberId = 'new-member-uuid';
      mockPrisma.authorization.findUnique.mockResolvedValue(mockAuthorization);
      mockPrisma.familyMember.findFirst.mockResolvedValue({
        id: newMemberId,
        userId,
      });
      mockPrisma.authorization.update.mockResolvedValue(mockAuthorization);

      await service.update(authId, userId, { familyMemberId: newMemberId });

      expect(mockPrisma.familyMember.findFirst).toHaveBeenCalledWith({
        where: { id: newMemberId, userId },
      });
    });

    it('should throw NotFoundException if authorization not found', async () => {
      mockPrisma.authorization.findUnique.mockResolvedValue(null);

      await expect(
        service.update(authId, userId, { notes: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete authorization', async () => {
      mockPrisma.authorization.findUnique.mockResolvedValue(mockAuthorization);
      mockPrisma.authorization.delete.mockResolvedValue(mockAuthorization);

      const result = await service.remove(authId, userId);

      expect(mockPrisma.authorization.delete).toHaveBeenCalledWith({
        where: { id: authId },
      });
      expect(result.message).toBe('Authorization deleted successfully');
    });

    it('should throw NotFoundException if authorization not found', async () => {
      mockPrisma.authorization.findUnique.mockResolvedValue(null);

      await expect(service.remove(authId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('auto-expiration', () => {
    it('should mark expired authorizations with past expiration date', async () => {
      const expiredAuth = {
        ...mockAuthorization,
        expirationDate: new Date('2020-01-01'),
        status: 'pending',
      };
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.authorization.findMany.mockResolvedValue([expiredAuth]);
      mockPrisma.authorization.count.mockResolvedValue(1);
      mockPrisma.authorization.update.mockResolvedValue(expiredAuth);

      const result = await service.findAll(userId, {});

      expect(result.data[0].status).toBe('expired');
    });

    it('should not expire authorizations with future expiration date', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.authorization.findMany.mockResolvedValue([mockAuthorization]);
      mockPrisma.authorization.count.mockResolvedValue(1);

      const result = await service.findAll(userId, {});

      expect(result.data[0].status).toBe('pending');
    });

    it('should not expire authorizations that are already completed', async () => {
      const completedAuth = {
        ...mockAuthorization,
        expirationDate: new Date('2020-01-01'),
        status: 'completed',
      };
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.authorization.findMany.mockResolvedValue([completedAuth]);
      mockPrisma.authorization.count.mockResolvedValue(1);

      const result = await service.findAll(userId, {});

      expect(result.data[0].status).toBe('completed');
    });
  });
});
