import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Priority } from '.prisma/client';
import { CreateAuthorizationServiceDto } from './create-authorization-service.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuthorizationDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID del miembro de la familia',
  })
  @IsUUID()
  familyMemberId: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID del proveedor EPS',
  })
  @IsUUID()
  @IsOptional()
  epsProviderId?: string;

  @ApiProperty({
    example: 'Carta de autorización',
    description: 'Tipo de documento',
  })
  @IsString()
  @MinLength(1)
  documentType: string;

  @ApiPropertyOptional({
    example: 'REQ-2024-001',
    description: 'Número de solicitud',
  })
  @IsString()
  @IsOptional()
  requestNumber?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'Fecha de emisión',
  })
  @IsDateString()
  @IsOptional()
  issuingDate?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'Fecha de expiración',
  })
  @IsDateString()
  @IsOptional()
  expirationDate?: string;

  @ApiPropertyOptional({
    example: 'E11.9',
    description: 'Código de diagnóstico',
  })
  @IsString()
  @IsOptional()
  diagnosisCode?: string;

  @ApiPropertyOptional({
    example: 'Diabetes mellitus tipo 2 sin complicaciones',
    description: 'Descripción del diagnóstico',
  })
  @IsString()
  @IsOptional()
  diagnosisDescription?: string;

  @ApiPropertyOptional({
    example: 'Hospitalización',
    description: 'Ubicación del paciente',
  })
  @IsString()
  @IsOptional()
  patientLocation?: string;

  @ApiPropertyOptional({
    example: 'Remisión médica',
    description: 'Origen del servicio',
  })
  @IsString()
  @IsOptional()
  serviceOrigin?: string;

  @ApiPropertyOptional({
    example: 'Hospital Central',
    description: 'Nombre del proveedor',
  })
  @IsString()
  @IsOptional()
  providerName?: string;

  @ApiPropertyOptional({
    example: '901234567-8',
    description: 'NIT del proveedor',
  })
  @IsString()
  @IsOptional()
  providerNit?: string;

  @ApiPropertyOptional({
    example: 'PROV001',
    description: 'Código del proveedor',
  })
  @IsString()
  @IsOptional()
  providerCode?: string;

  @ApiPropertyOptional({
    example: 'Calle 123 #45-67',
    description: 'Dirección del proveedor',
  })
  @IsString()
  @IsOptional()
  providerAddress?: string;

  @ApiPropertyOptional({
    example: '+573001234567',
    description: 'Teléfono del proveedor',
  })
  @IsString()
  @IsOptional()
  providerPhone?: string;

  @ApiPropertyOptional({
    example: 'Antioquia',
    description: 'Departamento del proveedor',
  })
  @IsString()
  @IsOptional()
  providerDepartment?: string;

  @ApiPropertyOptional({
    example: 'Medellín',
    description: 'Ciudad del proveedor',
  })
  @IsString()
  @IsOptional()
  providerCity?: string;

  @ApiPropertyOptional({ example: 'Copago', description: 'Tipo de pago' })
  @IsString()
  @IsOptional()
  paymentType?: string;

  @ApiPropertyOptional({ example: 50000, description: 'Valor del copago' })
  @IsNumber()
  @IsOptional()
  copayValue?: number;

  @ApiPropertyOptional({ example: 10, description: 'Porcentaje del copago' })
  @IsNumber()
  @IsOptional()
  copayPercentage?: number;

  @ApiPropertyOptional({
    example: 1000000,
    description: 'Valor máximo autorizado',
  })
  @IsNumber()
  @IsOptional()
  maxValue?: number;

  @ApiPropertyOptional({ example: 52, description: 'Semanas cotizadas' })
  @IsNumber()
  @IsOptional()
  weeksContributed?: number;

  @ApiPropertyOptional({
    example: 'medium',
    description: 'Prioridad de la autorización',
    enum: Priority,
  })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({
    example: 'Notas adicionales',
    description: 'Notas adicionales',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    example: [],
    description: 'Servicios autorizados',
    type: [CreateAuthorizationServiceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAuthorizationServiceDto)
  @IsOptional()
  services?: CreateAuthorizationServiceDto[];
}
