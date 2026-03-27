import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';

/**
 * Common API response decorator for Unauthorized (401) errors
 */
export function ApiUnauthorizedResponse(description?: string) {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: description || 'Usuario no autenticado',
    }),
  );
}

/**
 * Common API response decorator for Not Found (404) errors
 */
export function ApiNotFoundResponse(description?: string) {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: description || 'Recurso no encontrado',
    }),
  );
}

/**
 * Common API response decorator for Bad Request (400) errors
 */
export function ApiBadRequestResponse(description?: string) {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: description || 'Datos de entrada inválidos',
    }),
  );
}

/**
 * Common API response decorator for Created (201) responses
 */
export function ApiCreatedResponse(example?: any) {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Recurso creado exitosamente',
      example,
    }),
  );
}

/**
 * Common API response decorator for OK (200) responses
 */
export function ApiOkResponse(example?: any) {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Operación exitosa',
      example,
    }),
  );
}
