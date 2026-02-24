import {
    IsString,
    IsUUID,
    IsOptional,
    IsDateString,
  } from 'class-validator';
  
  export class CreateAppointmentDto {
    @IsUUID()
    familyMemberId: string;
  
    @IsUUID()
    @IsOptional()
    authorizationId?: string;
  
    @IsUUID()
    @IsOptional()
    authorizationServiceId?: string;
  
    @IsDateString()
    appointmentDate: string;
  
    @IsString()
    @IsOptional()
    location?: string;
  
    @IsString()
    @IsOptional()
    doctorName?: string;
  
    @IsString()
    @IsOptional()
    specialty?: string;
  
    @IsString()
    @IsOptional()
    notes?: string;
  }