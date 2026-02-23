import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { AuthorizationStatus, Priority } from '.prisma/client';

export class FilterAuthorizationDto {
  @IsEnum(AuthorizationStatus)
  @IsOptional()
  status?: AuthorizationStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsUUID()
  @IsOptional()
  familyMemberId?: string;

  @IsDateString()
  @IsOptional()
  expiringBefore?: string;
}