import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { FamilyMembersService } from './family-members.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('family-members')
@ApiTags('FamilyMembers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class FamilyMembersController {
  constructor(private readonly familyMembersService: FamilyMembersService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo familiar',
    description:
      'Crea un nuevo registro de familiar asociado al usuario autenticado.',
  })
  @ApiBody({ type: CreateFamilyMemberDto })
  @ApiResponse({
    status: 201,
    description: 'Familiar creado exitosamente',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        fullName: 'Juan Pérez',
        documentType: 'CC',
        documentNumber: 'CC123456789',
        birthDate: '1990-01-15',
        address: 'Calle 123 #45-67',
        phone: '6012345678',
        cellphone: '3001234567',
        email: 'juan.perez@example.com',
        department: 'Antioquia',
        city: 'Medellín',
        regime: 'contributivo',
        relationship: 'Hijo',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        epsProviderId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2025-01-15T10:30:00.000Z',
        updatedAt: '2025-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Proveedor EPS no encontrado' })
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateFamilyMemberDto,
  ) {
    return this.familyMembersService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los familiares',
    description:
      'Retorna una lista de todos los familiares asociados al usuario autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de familiares obtenida exitosamente',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          fullName: 'Juan Pérez',
          documentType: 'CC',
          documentNumber: 'CC123456789',
          birthDate: '1990-01-15',
          address: 'Calle 123 #45-67',
          phone: '6012345678',
          cellphone: '3001234567',
          email: 'juan.perez@example.com',
          department: 'Antioquia',
          city: 'Medellín',
          regime: 'contributivo',
          relationship: 'Hijo',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          epsProviderId: '123e4567-e89b-12d3-a456-426614174000',
          createdAt: '2025-01-15T10:30:00.000Z',
          updatedAt: '2025-01-15T10:30:00.000Z',
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174000',
          fullName: 'María García',
          documentType: 'CC',
          documentNumber: 'CC987654321',
          birthDate: '1985-05-20',
          address: 'Carrera 56 #78-90',
          phone: '6018765432',
          cellphone: '3109876543',
          email: 'maria.garcia@example.com',
          department: 'Cundinamarca',
          city: 'Bogotá',
          regime: 'subsidiado',
          relationship: 'Cónyuge',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          epsProviderId: '223e4567-e89b-12d3-a456-426614174000',
          createdAt: '2025-01-16T14:20:00.000Z',
          updatedAt: '2025-01-16T14:20:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.familyMembersService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un familiar por ID',
    description:
      'Retorna un familiar específico por su ID. El familiar debe pertenecer al usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del familiar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Familiar obtenido exitosamente',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        fullName: 'Juan Pérez',
        documentType: 'CC',
        documentNumber: 'CC123456789',
        birthDate: '1990-01-15',
        address: 'Calle 123 #45-67',
        phone: '6012345678',
        cellphone: '3001234567',
        email: 'juan.perez@example.com',
        department: 'Antioquia',
        city: 'Medellín',
        regime: 'contributivo',
        relationship: 'Hijo',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        epsProviderId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2025-01-15T10:30:00.000Z',
        updatedAt: '2025-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido (no es un UUID válido)',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Familiar no encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.familyMembersService.findOne(id, user.id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar un familiar existente',
    description:
      'Actualiza los datos de un familiar existente por su ID. Solo se pueden actualizar campos proporcionados.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del familiar a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateFamilyMemberDto })
  @ApiResponse({
    status: 200,
    description: 'Familiar actualizado exitosamente',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        fullName: 'Juan Pérez Actualizado',
        documentType: 'CC',
        documentNumber: 'CC123456789',
        birthDate: '1990-01-15',
        address: 'Calle 123 #45-67',
        phone: '6012345678',
        cellphone: '3001234567',
        email: 'juan.perez@example.com',
        department: 'Antioquia',
        city: 'Medellín',
        regime: 'contributivo',
        relationship: 'Hijo',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        epsProviderId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2025-01-15T10:30:00.000Z',
        updatedAt: '2025-01-16T09:45:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Familiar no encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateFamilyMemberDto,
  ) {
    return this.familyMembersService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un familiar',
    description:
      'Elimina un familiar existente por su ID. Solo puede ser eliminado por el usuario propietario.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del familiar a eliminar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Familiar eliminado exitosamente',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        fullName: 'Juan Pérez',
        documentType: 'CC',
        documentNumber: 'CC123456789',
        birthDate: '1990-01-15',
        address: 'Calle 123 #45-67',
        phone: '6012345678',
        cellphone: '3001234567',
        email: 'juan.perez@example.com',
        department: 'Antioquia',
        city: 'Medellín',
        regime: 'contributivo',
        relationship: 'Hijo',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        epsProviderId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2025-01-15T10:30:00.000Z',
        updatedAt: '2025-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido (no es un UUID válido)',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Familiar no encontrado' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.familyMembersService.remove(id, user.id);
  }
}
