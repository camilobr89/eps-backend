import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '.prisma/client';

export class FilterAppointmentDto {
  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Fecha inicial para filtrar (inclusive)',
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'Fecha final para filtrar (inclusive)',
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({
    example: 'scheduled',
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
    description: 'Estado de la cita',
  })
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID del miembro de familia',
  })
  @IsUUID()
  @IsOptional()
  familyMemberId?: string;
}
