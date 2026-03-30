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
import { ApiOperation, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { FamilyMembersService } from './family-members.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
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
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('family-members')
@ApiController('FamilyMembers')
export class FamilyMembersController {
  constructor(private readonly familyMembersService: FamilyMembersService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo familiar',
    description:
      'Crea un nuevo registro de familiar asociado al usuario autenticado.',
  })
  @ApiBody({ type: CreateFamilyMemberDto })
  @ApiCreatedResponse(ExampleSchemas.familyMember)
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse('Proveedor EPS no encontrado')
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
      'Retorna una lista paginada de todos los familiares asociados al usuario autenticado.',
  })
  @ApiQuery({ type: PaginationQueryDto })
  @ApiOkResponse(ExampleSchemas.familyMemberList)
  @ApiUnauthorizedResponse()
  findAll(
    @CurrentUser() user: { id: string },
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.familyMembersService.findAll(user.id, pagination);
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
    example: ExampleSchemas.uuid,
  })
  @ApiOkResponse(ExampleSchemas.familyMember)
  @ApiBadRequestResponse('ID inválido (no es un UUID válido)')
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse('Familiar no encontrado')
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
    example: ExampleSchemas.uuid,
  })
  @ApiBody({ type: UpdateFamilyMemberDto })
  @ApiOkResponse(ExampleSchemas.familyMemberUpdated)
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse('Familiar no encontrado')
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
    example: ExampleSchemas.uuid,
  })
  @ApiOkResponse(ExampleSchemas.familyMember)
  @ApiBadRequestResponse('ID inválido (no es un UUID válido)')
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse('Familiar no encontrado')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.familyMembersService.remove(id, user.id);
  }
}
