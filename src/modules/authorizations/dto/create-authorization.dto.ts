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
  
  export class CreateAuthorizationDto {
    @IsUUID()
    familyMemberId: string;
  
    @IsUUID()
    @IsOptional()
    epsProviderId?: string;
  
    @IsString()
    @MinLength(1)
    documentType: string;
  
    @IsString()
    @IsOptional()
    requestNumber?: string;
  
    @IsDateString()
    @IsOptional()
    issuingDate?: string;
  
    @IsDateString()
    @IsOptional()
    expirationDate?: string;
  
    @IsString()
    @IsOptional()
    diagnosisCode?: string;
  
    @IsString()
    @IsOptional()
    diagnosisDescription?: string;
  
    @IsString()
    @IsOptional()
    patientLocation?: string;
  
    @IsString()
    @IsOptional()
    serviceOrigin?: string;
  
    @IsString()
    @IsOptional()
    providerName?: string;
  
    @IsString()
    @IsOptional()
    providerNit?: string;
  
    @IsString()
    @IsOptional()
    providerCode?: string;
  
    @IsString()
    @IsOptional()
    providerAddress?: string;
  
    @IsString()
    @IsOptional()
    providerPhone?: string;
  
    @IsString()
    @IsOptional()
    providerDepartment?: string;
  
    @IsString()
    @IsOptional()
    providerCity?: string;
  
    @IsString()
    @IsOptional()
    paymentType?: string;
  
    @IsNumber()
    @IsOptional()
    copayValue?: number;
  
    @IsNumber()
    @IsOptional()
    copayPercentage?: number;
  
    @IsNumber()
    @IsOptional()
    maxValue?: number;
  
    @IsNumber()
    @IsOptional()
    weeksContributed?: number;
  
    @IsEnum(Priority)
    @IsOptional()
    priority?: Priority;
  
    @IsString()
    @IsOptional()
    notes?: string;
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateAuthorizationServiceDto)
    @IsOptional()
    services?: CreateAuthorizationServiceDto[];
  }