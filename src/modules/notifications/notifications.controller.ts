import {
  Controller,
  Get,
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('notifications')
@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
}
