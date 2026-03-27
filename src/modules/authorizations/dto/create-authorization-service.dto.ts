import { IsString, IsInt, IsOptional, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuthorizationServiceDto {
  @ApiProperty({ example: 'SERV001', description: 'Código del servicio' })
  @IsString()
  @MinLength(1)
  serviceCode: string;

  @ApiPropertyOptional({ example: 1, description: 'Cantidad del servicio' })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number = 1;

  @ApiProperty({
    example: 'Consulta médica general',
    description: 'Nombre del servicio',
  })
  @IsString()
  @MinLength(1)
  serviceName: string;

  @ApiPropertyOptional({ example: 'Consulta', description: 'Tipo de servicio' })
  @IsString()
  @IsOptional()
  serviceType?: string;
}
