import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID del miembro de familia',
  })
  @IsUUID()
  familyMemberId: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID de la autorización',
  })
  @IsUUID()
  @IsOptional()
  authorizationId?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID del servicio de autorización',
  })
  @IsUUID()
  @IsOptional()
  authorizationServiceId?: string;

  @ApiProperty({
    example: '2024-12-31T14:30:00.000Z',
    description: 'Fecha y hora de la cita',
  })
  @IsDateString()
  appointmentDate: string;

  @ApiPropertyOptional({
    example: 'Hospital Central',
    description: 'Ubicación de la cita',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    example: 'Dr. Juan Pérez',
    description: 'Nombre del médico',
  })
  @IsString()
  @IsOptional()
  doctorName?: string;

  @ApiPropertyOptional({
    example: 'Cardiología',
    description: 'Especialidad médica',
  })
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({
    example: 'Paciente requiere ayuno de 8 horas',
    description: 'Notas adicionales',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
