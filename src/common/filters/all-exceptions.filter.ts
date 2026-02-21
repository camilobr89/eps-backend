import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
  } from '@nestjs/common';
  import { Request, Response } from 'express';
  import { ErrorResponseDto } from '../dto/error-response.dto';
  
  @Catch()
  export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);
  
    catch(exception: unknown, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();
  
      const errorResponse = this.buildErrorResponse(exception, request.url);
  
      // Log solo errores 500 con stack trace
      if (errorResponse.statusCode >= 500) {
        this.logger.error(
          `${request.method} ${request.url} - ${errorResponse.statusCode}`,
          exception instanceof Error ? exception.stack : String(exception),
        );
      }
  
      response.status(errorResponse.statusCode).json(errorResponse);
    }
  
    private buildErrorResponse(exception: unknown, path: string): ErrorResponseDto {
      // 1. HttpException de NestJS (incluye BadRequestException, NotFoundException, etc.)
      if (exception instanceof HttpException) {
        return this.handleHttpException(exception, path);
      }
  
      // 2. Errores de Prisma
      if (this.isPrismaError(exception)) {
        return this.handlePrismaError(exception, path);
      }
  
      // 3. Errores no controlados → 500 genérico
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        path,
      };
    }
  
    private handleHttpException(exception: HttpException, path: string): ErrorResponseDto {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
  
      const errorResponse: ErrorResponseDto = {
        statusCode,
        message: '',
        timestamp: new Date().toISOString(),
        path,
      };
  
      // BadRequestException con errores de validación de class-validator
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const response = exceptionResponse as Record<string, unknown>;
  
        // class-validator retorna { message: string[] } o { message: string }
        if (Array.isArray(response.message)) {
          errorResponse.message = 'Validation failed';
          errorResponse.errors = this.mapValidationErrors(response.message);
        } else {
          errorResponse.message = (response.message as string) || exception.message;
        }
      } else {
        errorResponse.message = String(exceptionResponse);
      }
  
      return errorResponse;
    }
  
    private mapValidationErrors(messages: string[]): { field: string; message: string }[] {
      return messages.map((msg) => {
        // class-validator format: "property should not be empty" o "email must be an email"
        const parts = msg.split(' ');
        const field = parts[0] || 'unknown';
        return {
          field,
          message: msg,
        };
      });
    }
  
    private isPrismaError(exception: unknown): exception is { code: string; meta?: Record<string, unknown> } {
        if (typeof exception !== 'object' || exception === null) {
          return false;
        }
        const error = exception as { code?: unknown };
        return typeof error.code === 'string' && error.code.startsWith('P');
      }
  
    private handlePrismaError(
      exception: { code: string; meta?: Record<string, unknown> },
      path: string,
    ): ErrorResponseDto {
      const timestamp = new Date().toISOString();
  
      switch (exception.code) {
        // Unique constraint violation
        case 'P2002': {
          const target = exception.meta?.target;
          const fields = Array.isArray(target) ? target.join(', ') : String(target || 'unknown');
          return {
            statusCode: HttpStatus.CONFLICT,
            message: `A record with this ${fields} already exists`,
            timestamp,
            path,
          };
        }
  
        // Record not found
        case 'P2025':
          return {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Record not found',
            timestamp,
            path,
          };
  
        // Default Prisma error
        default:
          return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            timestamp,
            path,
          };
      }
    }
  }