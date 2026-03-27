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
  HttpStatus,
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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { FilterAppointmentDto } from './dto/filter-appointment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('appointments')
@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una nueva cita',
    description:
      'Crea una nueva cita médica para un miembro de familia del usuario autenticado',
  })
  @ApiBody({ type: CreateAppointmentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Cita creada exitosamente',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      familyMemberId: '123e4567-e89b-12d3-a456-426614174000',
      authorizationId: '123e4567-e89b-12d3-a456-426614174000',
      authorizationServiceId: '123e4567-e89b-12d3-a456-426614174000',
      appointmentDate: '2024-12-31T14:30:00.000Z',
      location: 'Hospital Central',
      doctorName: 'Dr. Juan Pérez',
      specialty: 'Cardiología',
      notes: 'Paciente requiere ayuno de 8 horas',
      status: 'scheduled',
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Usuario no autenticado',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Miembro de familia no encontrado o no pertenece al usuario',
  })
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las citas del usuario',
    description:
      'Retorna una lista de citas del usuario autenticado, opcionalmente filtradas por fecha, estado o miembro de familia',
  })
  @ApiQuery({ type: FilterAppointmentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de citas obtenida exitosamente',
    example: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        familyMemberId: '123e4567-e89b-12d3-a456-426614174000',
        appointmentDate: '2024-12-31T14:30:00.000Z',
        location: 'Hospital Central',
        doctorName: 'Dr. Juan Pérez',
        specialty: 'Cardiología',
        status: 'scheduled',
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z',
      },
    ],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Usuario no autenticado',
  })
  findAll(
    @CurrentUser() user: { id: string },
    @Query() filters: FilterAppointmentDto,
  ) {
    return this.appointmentsService.findAll(user.id, filters);
  }

  @Get('upcoming')
  @ApiOperation({
    summary: 'Obtener citas próximas del usuario',
    description:
      'Retorna las citas futuras del usuario autenticado (con fecha igual o posterior a la actual)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de citas próximas obtenida exitosamente',
    example: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        familyMemberId: '123e4567-e89b-12d3-a456-426614174000',
        appointmentDate: '2024-12-31T14:30:00.000Z',
        location: 'Hospital Central',
        doctorName: 'Dr. Juan Pérez',
        specialty: 'Cardiología',
        status: 'scheduled',
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z',
      },
    ],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Usuario no autenticado',
  })
  findUpcoming(@CurrentUser() user: { id: string }) {
    return this.appointmentsService.findUpcoming(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una cita por ID',
    description:
      'Retorna una cita específica del usuario autenticado por su ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID de la cita',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cita obtenida exitosamente',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      familyMemberId: '123e4567-e89b-12d3-a456-426614174000',
      authorizationId: '123e4567-e89b-12d3-a456-426614174000',
      authorizationServiceId: '123e4567-e89b-12d3-a456-426614174000',
      appointmentDate: '2024-12-31T14:30:00.000Z',
      location: 'Hospital Central',
      doctorName: 'Dr. Juan Pérez',
      specialty: 'Cardiología',
      notes: 'Paciente requiere ayuno de 8 horas',
      status: 'scheduled',
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'ID inválido (no es un UUID válido)',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Usuario no autenticado',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cita no encontrada o no pertenece al usuario',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.appointmentsService.findOne(id, user.id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar una cita existente',
    description:
      'Actualiza los datos de una cita específica del usuario autenticado',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID de la cita',
  })
  @ApiBody({ type: UpdateAppointmentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cita actualizada exitosamente',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      familyMemberId: '123e4567-e89b-12d3-a456-426614174000',
      authorizationId: '123e4567-e89b-12d3-a456-426614174000',
      authorizationServiceId: '123e4567-e89b-12d3-a456-426614174000',
      appointmentDate: '2024-12-31T14:30:00.000Z',
      location: 'Hospital Central',
      doctorName: 'Dr. Juan Pérez',
      specialty: 'Cardiología',
      notes: 'Paciente requiere ayuno de 8 horas',
      status: 'confirmed',
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-16T14:30:00.000Z',
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Usuario no autenticado',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cita no encontrada o no pertenece al usuario',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una cita',
    description: 'Elimina una cita específica del usuario autenticado',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID de la cita',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cita eliminada exitosamente',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      familyMemberId: '123e4567-e89b-12d3-a456-426614174000',
      appointmentDate: '2024-12-31T14:30:00.000Z',
      location: 'Hospital Central',
      doctorName: 'Dr. Juan Pérez',
      specialty: 'Cardiología',
      status: 'cancelled',
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-17T09:00:00.000Z',
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'ID inválido (no es un UUID válido)',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Usuario no autenticado',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cita no encontrada o no pertenece al usuario',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.appointmentsService.remove(id, user.id);
  }
}
