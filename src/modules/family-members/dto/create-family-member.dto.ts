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
  
  export class CreateFamilyMemberDto {
    @IsUUID()
    @IsOptional()
    epsProviderId?: string;
  
    @IsString()
    @MinLength(2)
    fullName: string;
  
    @IsEnum(DocumentType)
    @IsOptional()
    documentType?: DocumentType;
  
    @IsString()
    @IsOptional()
    documentNumber?: string;
  
    @IsDateString()
    @IsOptional()
    birthDate?: string;
  
    @IsString()
    @IsOptional()
    address?: string;
  
    @IsString()
    @IsOptional()
    phone?: string;
  
    @IsString()
    @IsOptional()
    cellphone?: string;
  
    @IsEmail()
    @IsOptional()
    email?: string;
  
    @IsString()
    @IsOptional()
    department?: string;
  
    @IsString()
    @IsOptional()
    city?: string;
  
    @IsString()
    @IsOptional()
    regime?: string;
  
    @IsString()
    @MinLength(2)
    relationship: string;
  }