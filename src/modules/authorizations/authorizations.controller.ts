import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AuthorizationsService } from './authorizations.service';
import { CreateAuthorizationDto } from './dto/create-authorization.dto';
import { UpdateAuthorizationDto } from './dto/update-authorization.dto';
import { FilterAuthorizationDto } from './dto/filter-authorization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('authorizations')
@ApiTags('Authorizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AuthorizationsController {
  constructor(private readonly authorizationsService: AuthorizationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una nueva autorización',
    description:
      'Crea una nueva autorización para un familiar del usuario autenticado.',
  })
  @ApiBody({ type: CreateAuthorizationDto })
  @ApiResponse({
    status: 201,
    description: 'Autorización creada exitosamente',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        requestNumber: 'AUTH-2024-001',
        familyMemberId: '123e4567-e89b-12d3-a456-426614174001',
        epsProviderId: '123e4567-e89b-12d3-a456-426614174002',
        priority: 'medium',
        status: 'pending',
        expirationDate: '2024-12-31T23:59:59.000Z',
        services: [
          {
            id: '123e4567-e89b-12d3-a456-426614174003',
            serviceCode: 'CONSULTA',
            serviceName: 'Consulta médica general',
            serviceType: 'consultation',
            quantity: 1,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 404,
    description: 'Familiar o EPS no encontrada',
  })
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAuthorizationDto,
  ) {
    return this.authorizationsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar autorizaciones',
    description:
      'Obtiene una lista paginada de autorizaciones del usuario autenticado, con filtros opcionales.',
  })
  @ApiQuery({ type: FilterAuthorizationDto })
  @ApiResponse({
    status: 200,
    description: 'Lista de autorizaciones obtenida exitosamente',
    schema: {
      example: {
        items: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            requestNumber: 'AUTH-2024-001',
            familyMemberId: '123e4567-e89b-12d3-a456-426614174001',
            epsProviderId: '123e4567-e89b-12d3-a456-426614174002',
            priority: 'medium',
            status: 'pending',
            expirationDate: '2024-12-31T23:59:59.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  findAll(
    @CurrentUser() user: { id: string },
    @Query() filters: FilterAuthorizationDto,
  ) {
    return this.authorizationsService.findAll(user.id, filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una autorización por ID',
    description:
      'Obtiene los detalles de una autorización específica del usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la autorización',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Autorización obtenida exitosamente',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        requestNumber: 'AUTH-2024-001',
        familyMemberId: '123e4567-e89b-12d3-a456-426614174001',
        epsProviderId: '123e4567-e89b-12d3-a456-426614174002',
        priority: 'medium',
        status: 'pending',
        expirationDate: '2024-12-31T23:59:59.000Z',
        services: [
          {
            id: '123e4567-e89b-12d3-a456-426614174003',
            serviceCode: 'CONSULTA',
            serviceName: 'Consulta médica general',
            serviceType: 'consultation',
            quantity: 1,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 404,
    description: 'Autorización no encontrada',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.authorizationsService.findOne(id, user.id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar una autorización',
    description:
      'Actualiza una autorización existente del usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la autorización a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateAuthorizationDto })
  @ApiResponse({
    status: 200,
    description: 'Autorización actualizada exitosamente',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        requestNumber: 'AUTH-2024-001',
        familyMemberId: '123e4567-e89b-12d3-a456-426614174001',
        epsProviderId: '123e4567-e89b-12d3-a456-426614174002',
        priority: 'high',
        status: 'scheduled',
        expirationDate: '2024-12-31T23:59:59.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 404,
    description: 'Autorización no encontrada',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateAuthorizationDto,
  ) {
    return this.authorizationsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una autorización',
    description: 'Elimina una autorización del usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la autorización a eliminar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Autorización eliminada exitosamente',
    schema: {
      example: {
        message: 'Autorización eliminada',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 404,
    description: 'Autorización no encontrada',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.authorizationsService.remove(id, user.id);
  }
}
