import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Decorator that applies common API controller decorators
 * @param tag The API tag name for grouping endpoints
 * @returns Combined decorators
 */
export function ApiController(tag: string) {
  return applyDecorators(
    ApiTags(tag),
    ApiBearerAuth(),
    UseGuards(JwtAuthGuard),
  );
}
