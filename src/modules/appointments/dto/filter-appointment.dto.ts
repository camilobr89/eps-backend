import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { AppointmentStatus } from '.prisma/client';

export class FilterAppointmentDto {
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @IsUUID()
  @IsOptional()
  familyMemberId?: string;
}
