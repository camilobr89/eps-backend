import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorDetail {
  @ApiProperty({ example: 'email', description: 'Campo que originó el error' })
  field: string;

  @ApiProperty({
    example: 'email must be a valid email',
    description: 'Detalle del error de validación',
  })
  message: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiPropertyOptional({
    type: [ErrorDetail],
    description: 'Errores de validación por campo (solo en 400)',
  })
  errors?: ErrorDetail[];

  @ApiProperty({ example: '2026-03-29T21:50:15.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/auth/register' })
  path: string;
}
