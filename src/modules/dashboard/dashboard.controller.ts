import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Obtener resumen del dashboard',
    description:
      'Devuelve estadísticas y resumen de autorizaciones, citas y notificaciones del usuario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen obtenido exitosamente',
    schema: {
      example: {
        totalAuthorizations: 5,
        pendingAuthorizations: 2,
        upcomingAppointments: 3,
        unreadNotifications: 1,
        expiringAuthorizations: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            requestNumber: 'AUTH-2024-001',
            expirationDate: '2024-12-31T23:59:59.000Z',
            daysLeft: 7,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  getSummary(@CurrentUser() user: { id: string }) {
    return this.dashboardService.getSummary(user.id);
  }

  @Get('timeline')
  @ApiOperation({
    summary: 'Obtener línea de tiempo de eventos',
    description:
      'Devuelve una línea de tiempo con eventos próximos (autorizaciones por vencer, citas, notificaciones).',
  })
  @ApiResponse({
    status: 200,
    description: 'Línea de tiempo obtenida exitosamente',
    schema: {
      example: [
        {
          type: 'appointment',
          title: 'Cita médica',
          description: 'Consulta con cardiólogo',
          date: '2024-12-31T14:30:00.000Z',
          entityId: '123e4567-e89b-12d3-a456-426614174000',
        },
        {
          type: 'expiration',
          title: 'Autorización por vencer',
          description: 'Autorización AUTH-2024-001 vence en 7 días',
          date: '2024-12-31T23:59:59.000Z',
          entityId: '123e4567-e89b-12d3-a456-426614174001',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  getTimeline(@CurrentUser() user: { id: string }) {
    return this.dashboardService.getTimeline(user.id);
  }
}
