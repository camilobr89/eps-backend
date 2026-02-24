import { IsString, IsInt, IsOptional, Min, MinLength } from 'class-validator';

export class CreateAuthorizationServiceDto {
  @IsString()
  @MinLength(1)
  serviceCode: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number = 1;

  @IsString()
  @MinLength(1)
  serviceName: string;

  @IsString()
  @IsOptional()
  serviceType?: string;
}
