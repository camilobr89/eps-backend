import {
  IsString,
  IsOptional,
  IsUUID,
  IsEmail,
  IsEnum,
  IsDateString,
  MinLength,
} from 'class-validator';
import { DocumentType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFamilyMemberDto {
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID del proveedor EPS',
  })
  @IsUUID()
  @IsOptional()
  epsProviderId?: string;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo del familiar',
  })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiPropertyOptional({
    example: 'CC',
    description: 'Tipo de documento',
    enum: DocumentType,
  })
  @IsEnum(DocumentType)
  @IsOptional()
  documentType?: DocumentType;

  @ApiPropertyOptional({
    example: 'CC123456789',
    description: 'Número de documento',
  })
  @IsString()
  @IsOptional()
  documentNumber?: string;

  @ApiPropertyOptional({
    example: '1990-01-15',
    description: 'Fecha de nacimiento (formato YYYY-MM-DD)',
  })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({
    example: 'Calle 123 #45-67',
    description: 'Dirección de residencia',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    example: '6012345678',
    description: 'Teléfono fijo',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: '3001234567',
    description: 'Teléfono celular',
  })
  @IsString()
  @IsOptional()
  cellphone?: string;

  @ApiPropertyOptional({
    example: 'juan.perez@example.com',
    description: 'Correo electrónico',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 'Antioquia',
    description: 'Departamento de residencia',
  })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({
    example: 'Medellín',
    description: 'Ciudad de residencia',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    example: 'contributivo',
    description: 'Régimen de salud',
  })
  @IsString()
  @IsOptional()
  regime?: string;

  @ApiProperty({
    example: 'Hijo',
    description: 'Parentesco con el titular',
  })
  @IsString()
  @MinLength(2)
  relationship: string;
}
