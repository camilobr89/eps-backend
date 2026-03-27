import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EpsProvidersService } from './eps-providers.service';

@Controller('eps-providers')
@ApiTags('EpsProviders')
export class EpsProvidersController {
  constructor(private readonly epsProvidersService: EpsProvidersService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar EPS / proveedores',
    description:
      'Obtiene la lista de todas las EPS y proveedores de servicios de salud disponibles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de EPS obtenida exitosamente',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'EPS Sanitas',
          code: 'SANITAS',
          isActive: true,
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'EPS Sura',
          code: 'SURA',
          isActive: true,
        },
      ],
    },
  })
  findAll() {
    return this.epsProvidersService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener EPS / proveedor por ID',
    description: 'Obtiene los detalles de una EPS o proveedor específico.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la EPS/proveedor',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'EPS obtenida exitosamente',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'EPS Sanitas',
        code: 'SANITAS',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'EPS/proveedor no encontrado',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.epsProvidersService.findOne(id);
  }
}
