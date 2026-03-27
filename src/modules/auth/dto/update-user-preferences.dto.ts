import { IsOptional, IsBoolean, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+573001234567',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +573001234567)',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp number (E.164 format)',
    example: '+573001234567',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'WhatsApp number must be in E.164 format (e.g., +573001234567)',
  })
  whatsappNumber?: string;

  @ApiPropertyOptional({
    description: 'Enable email notifications',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable WhatsApp notifications',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  whatsappNotifications?: boolean;
}
