import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    filters: FilterNotificationsDto,
    pagination: PaginationQueryDto,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const { read } = filters;

    const where = {
      userId,
      ...(read !== undefined ? { read } : {}),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return createPaginatedResponse(notifications, total, page, limit);
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { message: 'All notifications marked as read' };
  }

  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
      },
    });
  }

  async hasRecentNotification(
    userId: string,
    type: NotificationType,
    relatedEntityId: string,
    hours: number = 24,
  ): Promise<boolean> {
    const recent = await this.prisma.notification.findFirst({
      where: {
        userId,
        type,
        relatedEntityId,
        sentAt: {
          gte: new Date(Date.now() - hours * 60 * 60 * 1000),
        },
      },
    });

    return !!recent;
  }
}
