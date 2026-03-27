import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import { FilterNotificationsDto } from '@/modules/notifications/dto/filter-notifications.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { NotificationType } from '@prisma/client';

const mockPrismaService = {
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const userId = 'user-123';
    const filters: FilterNotificationsDto = {};
    const pagination: PaginationQueryDto = { page: 1, limit: 20 };

    it('should return paginated notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-123',
          title: 'Test Notification',
          message: 'This is a test',
          type: NotificationType.expiration_warning,
          read: false,
          sentAt: new Date(),
        },
      ];
      const total = 1;

      mockPrismaService.notification.findMany.mockResolvedValue(
        mockNotifications,
      );
      mockPrismaService.notification.count.mockResolvedValue(total);

      const result = await service.findAll(userId, filters, pagination);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { sentAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result.data).toEqual(mockNotifications);
      expect(result.meta.total).toBe(total);
    });

    it('should filter by read status when provided', async () => {
      const filtersWithRead: FilterNotificationsDto = { read: true };
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count.mockResolvedValue(0);

      await service.findAll(userId, filtersWithRead, pagination);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId, read: true },
        orderBy: { sentAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should handle pagination correctly', async () => {
      const customPagination: PaginationQueryDto = { page: 2, limit: 10 };
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count.mockResolvedValue(0);

      await service.findAll(userId, filters, customPagination);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { sentAt: 'desc' },
        skip: 10,
        take: 10,
      });
    });
  });

  describe('markAsRead', () => {
    const userId = 'user-123';
    const notificationId = 'notif-456';

    it('should mark notification as read', async () => {
      const mockNotification = {
        id: notificationId,
        userId,
        read: false,
      };
      const updatedNotification = { ...mockNotification, read: true };

      mockPrismaService.notification.findFirst.mockResolvedValue(
        mockNotification,
      );
      mockPrismaService.notification.update.mockResolvedValue(
        updatedNotification,
      );

      const result = await service.markAsRead(userId, notificationId);

      expect(mockPrismaService.notification.findFirst).toHaveBeenCalledWith({
        where: { id: notificationId, userId },
      });
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { read: true },
      });
      expect(result).toEqual(updatedNotification);
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead(userId, notificationId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.notification.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if notification belongs to another user', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead(userId, notificationId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    const userId = 'user-123';

    it('should mark all notifications as read', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead(userId);

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, read: false },
        data: { read: true },
      });
      expect(result).toEqual({ message: 'All notifications marked as read' });
    });
  });

  describe('createNotification', () => {
    const notificationData = {
      userId: 'user-123',
      title: 'New Notification',
      message: 'This is a new notification',
      type: NotificationType.expiration_warning,
      relatedEntityType: 'authorization',
      relatedEntityId: 'auth-789',
    };

    it('should create a notification', async () => {
      const createdNotification = {
        id: 'new-notif',
        ...notificationData,
        read: false,
        sentAt: new Date(),
      };

      mockPrismaService.notification.create.mockResolvedValue(
        createdNotification,
      );

      const result = await service.createNotification(notificationData);

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: notificationData,
      });
      expect(result).toEqual(createdNotification);
    });
  });

  describe('hasRecentNotification', () => {
    const userId = 'user-123';
    const type = NotificationType.expiration_warning;
    const relatedEntityId = 'entity-456';

    it('should return true when recent notification exists', async () => {
      const recentNotification = {
        id: 'notif-1',
        userId,
        type,
        relatedEntityId,
        sentAt: new Date(),
      };

      mockPrismaService.notification.findFirst.mockResolvedValue(
        recentNotification,
      );

      const result = await service.hasRecentNotification(
        userId,
        type,
        relatedEntityId,
        24,
      );

      expect(mockPrismaService.notification.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          type,
          relatedEntityId,
          sentAt: {
            gte: expect.any(Date),
          },
        },
      });
      expect(result).toBe(true);
    });

    it('should return false when no recent notification exists', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      const result = await service.hasRecentNotification(
        userId,
        type,
        relatedEntityId,
        24,
      );

      expect(result).toBe(false);
    });

    it('should use custom hours parameter', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      await service.hasRecentNotification(userId, type, relatedEntityId, 48);

      const call = mockPrismaService.notification.findFirst.mock.calls[0];
      const whereClause = call[0].where;
      const expectedDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

      // Check that the gte date is approximately correct (within 1 second)
      const gteDate = whereClause.sentAt.gte;
      expect(gteDate.getTime()).toBeCloseTo(expectedDate.getTime(), -1000);
    });
  });
});
