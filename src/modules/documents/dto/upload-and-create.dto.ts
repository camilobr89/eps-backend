import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadAndCreateDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID del miembro de la familia al que pertenece el documento',
  })
  @IsUUID()
  familyMemberId: string;
}
