import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { FilterAppointmentDto } from './dto/filter-appointment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiController } from '../../common/decorators/api-controller.decorator';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '../../common/decorators/api-responses.decorator';
import { ExampleSchemas } from '../../common/schemas/examples';

@Controller('appointments')
@ApiController('Appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una nueva cita',
    description:
      'Crea una nueva cita médica para un miembro de familia del usuario autenticado',
  })
  @ApiBody({ type: CreateAppointmentDto })
  @ApiCreatedResponse(ExampleSchemas.appointment)
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse(
    'Miembro de familia no encontrado o no pertenece al usuario',
  )
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
  @ApiOkResponse([ExampleSchemas.appointmentSimple])
  @ApiUnauthorizedResponse()
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
  @ApiOkResponse(ExampleSchemas.appointmentUpcomingList)
  @ApiUnauthorizedResponse()
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
    example: ExampleSchemas.uuid,
    description: 'UUID de la cita',
  })
  @ApiOkResponse(ExampleSchemas.appointment)
  @ApiBadRequestResponse('ID inválido (no es un UUID válido)')
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse('Cita no encontrada o no pertenece al usuario')
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
    example: ExampleSchemas.uuid,
    description: 'UUID de la cita',
  })
  @ApiBody({ type: UpdateAppointmentDto })
  @ApiOkResponse(ExampleSchemas.appointmentUpdated)
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse('Cita no encontrada o no pertenece al usuario')
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
    example: ExampleSchemas.uuid,
    description: 'UUID de la cita',
  })
  @ApiOkResponse(ExampleSchemas.appointmentCancelled)
  @ApiBadRequestResponse('ID inválido (no es un UUID válido)')
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse('Cita no encontrada o no pertenece al usuario')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.appointmentsService.remove(id, user.id);
  }
}
