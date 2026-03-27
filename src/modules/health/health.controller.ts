import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Verificar salud del sistema',
    description:
      'Verifica el estado de conectividad de los servicios dependientes (base de datos, Redis, MinIO).',
  })
  @ApiResponse({
    status: 200,
    description: 'Todos los servicios están operativos',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z',
        services: {
          database: { status: 'ok', responseTime: 15 },
          redis: { status: 'ok', responseTime: 5 },
          minio: { status: 'ok', responseTime: 120 },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Uno o más servicios no están disponibles',
    schema: {
      example: {
        status: 'error',
        timestamp: '2024-01-01T00:00:00.000Z',
        services: {
          database: { status: 'ok', responseTime: 15 },
          redis: { status: 'error', error: 'Connection refused' },
          minio: { status: 'ok', responseTime: 120 },
        },
      },
    },
  })
  async check(@Res() res: Response) {
    const health = await this.healthService.check();

    const statusCode =
      health.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json(health);
  }
}
