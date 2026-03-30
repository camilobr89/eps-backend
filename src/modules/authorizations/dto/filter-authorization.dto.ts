import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { AuthorizationStatus, Priority } from '.prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class FilterAuthorizationDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'pending',
    description: 'Estado de la autorización',
    enum: AuthorizationStatus,
  })
  @IsEnum(AuthorizationStatus)
  @IsOptional()
  status?: AuthorizationStatus;

  @ApiPropertyOptional({
    example: 'medium',
    description: 'Prioridad de la autorización',
    enum: Priority,
  })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID del miembro de la familia',
  })
  @IsUUID()
  @IsOptional()
  familyMemberId?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'Fecha de expiración antes de',
  })
  @IsDateString()
  @IsOptional()
  expiringBefore?: string;
}
