import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  NotificationDeliveryService,
  NotificationData,
} from './services/notification-delivery.service';
import { NotificationTriggerService } from './services/notification-trigger.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotificationType } from '@prisma/client';
import { randomUUID } from 'crypto';

@Controller('notifications')
@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationDeliveryService: NotificationDeliveryService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get paginated notifications with optional filters',
  })
  @ApiQuery({ type: FilterNotificationsDto })
  @ApiQuery({ type: PaginationQueryDto })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of notifications',
    schema: {
      example: {
        items: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Notification title',
            message: 'Notification message',
            read: false,
            createdAt: '2023-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @CurrentUser() user: { id: string },
    @Query() filters: FilterNotificationsDto,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.notificationsService.findAll(user.id, filters, pagination);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Notification title',
        message: 'Notification message',
        read: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test notification' })
  @ApiQuery({
    name: 'type',
    enum: NotificationType,
    required: false,
    description: 'Type of test notification to send',
    example: NotificationType.appointment_reminder,
  })
  @ApiResponse({
    status: 200,
    description: 'Test notification sent successfully',
    schema: {
      example: {
        success: true,
        message: 'Test notification sent',
        notificationId: '123e4567-e89b-12d3-a456-426614174000',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendTestNotification(
    @CurrentUser() user: { id: string },
    @Query('type')
    type: NotificationType = NotificationType.appointment_reminder,
  ) {
    // Base data for all notification types
    const baseData = {
      title: 'Notificación de prueba',
      message: 'Esta es una notificación de prueba enviada manualmente.',
      familyMemberName: 'Paciente de Prueba',
      relatedEntityId: randomUUID(),
    };

    // Type-specific data
    let testData: NotificationData = { ...baseData };

    switch (type) {
      case NotificationType.expiration_warning:
        testData = {
          ...testData,
          authorizationNumber: 'AUT-' + Date.now().toString().slice(-6),
          expirationDate: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toLocaleDateString('es-CO'),
          daysRemaining: 7,
          epsName: 'EPS de Prueba',
          relatedEntityType: 'authorization',
        };
        break;

      case NotificationType.appointment_reminder:
        testData = {
          ...testData,
          appointmentDate: new Date().toLocaleDateString('es-CO'),
          appointmentTime: new Date().toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          location: 'Centro Médico de Prueba',
          doctorName: 'Dr. Prueba',
          specialty: 'Medicina General',
          relatedEntityType: 'appointment',
        };
        break;

      case NotificationType.ocr_completed:
        testData = {
          ...testData,
          fileName: 'documento_prueba.pdf',
          authorizationNumber: 'AUT-' + Date.now().toString().slice(-6),
          confidenceScore: 95.5,
          relatedEntityType: 'document',
        };
        break;

      default:
        // Use appointment reminder as default
        testData = {
          ...testData,
          appointmentDate: new Date().toLocaleDateString('es-CO'),
          appointmentTime: new Date().toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          location: 'Centro Médico de Prueba',
          doctorName: 'Dr. Prueba',
          specialty: 'Medicina General',
          relatedEntityType: 'appointment',
        };
    }

    const { success, notificationId } =
      await this.notificationDeliveryService.sendNotification(
        user.id,
        type,
        testData,
      );

    return {
      success,
      notificationId,
      message: success
        ? 'Test notification sent successfully'
        : 'Failed to send test notification',
    };
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all unread notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read successfully',
    schema: {
      example: {
        message: 'All notifications marked as read',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  markAllAsRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Post('send-reminders')
  @ApiOperation({
    summary: 'Send pending reminders for the current user',
    description:
      'Checks upcoming appointments (1-3 days) and expiring authorizations (1-7 days) and sends notifications.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reminders sent successfully',
    schema: {
      example: {
        appointmentReminders: 1,
        authorizationWarnings: 0,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  sendReminders(@CurrentUser() user: { id: string }) {
    return this.notificationTrigger.sendRemindersForUser(user.id);
  }

  @Post('send-reminders/all')
  @ApiOperation({
    summary: 'Send all pending reminders for all active users',
    description:
      'Scans all active users with email notifications enabled and sends pending reminders.',
  })
  @ApiResponse({
    status: 200,
    description: 'All reminders sent successfully',
    schema: {
      example: {
        usersProcessed: 5,
        appointmentReminders: 3,
        authorizationWarnings: 2,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  sendAllReminders() {
    return this.notificationTrigger.sendAllPendingReminders();
  }
}
