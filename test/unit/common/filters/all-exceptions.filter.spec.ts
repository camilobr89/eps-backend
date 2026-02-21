import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockResponse: Record<string, jest.Mock>;
  let mockRequest: { method: string; url: string };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = { status: mockStatus };
    mockRequest = { method: 'GET', url: '/test-path' };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HttpException handling', () => {
    it('should handle a simple HttpException with string message', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Not Found',
          path: '/test-path',
        }),
      );
    });

    it('should handle HttpException with object response and string message', () => {
      const exception = new HttpException(
        { message: 'Resource not found', statusCode: 404 },
        HttpStatus.NOT_FOUND,
      );

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
          path: '/test-path',
        }),
      );
    });

    it('should handle BadRequestException with validation errors (array of messages)', () => {
      const exception = new HttpException(
        {
          message: ['email must be an email', 'name should not be empty'],
          error: 'Bad Request',
          statusCode: 400,
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          errors: [
            { field: 'email', message: 'email must be an email' },
            { field: 'name', message: 'name should not be empty' },
          ],
          path: '/test-path',
        }),
      );
    });

    it('should include timestamp in ISO format', () => {
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      const calls = mockJson.mock.calls as Array<Array<{ timestamp: string }>>;
      const responseBody = calls[0]?.[0];
      const date = new Date(responseBody.timestamp);
      expect(date.toISOString()).toBe(responseBody.timestamp);
    });
  });

  describe('Prisma error handling', () => {
    it('should handle P2002 unique constraint violation with target fields', () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
      };

      filter.catch(prismaError, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          message: 'A record with this email already exists',
          path: '/test-path',
        }),
      );
    });

    it('should handle P2002 with multiple target fields', () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['firstName', 'lastName'] },
      };

      filter.catch(prismaError, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'A record with this firstName, lastName already exists',
        }),
      );
    });

    it('should handle P2002 with non-array target', () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: 'email' },
      };

      filter.catch(prismaError, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'A record with this unknown already exists',
        }),
      );
    });

    it('should handle P2025 record not found', () => {
      const prismaError = { code: 'P2025' };

      filter.catch(prismaError, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          path: '/test-path',
        }),
      );
    });

    it('should handle unknown Prisma error codes as 500', () => {
      const prismaError = { code: 'P9999' };

      filter.catch(prismaError, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        }),
      );
    });
  });

  describe('Unknown error handling', () => {
    it('should handle unknown errors as 500 Internal Server Error', () => {
      const exception = new Error('Something unexpected');

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          path: '/test-path',
        }),
      );
    });

    it('should handle string exceptions as 500', () => {
      filter.catch('random string error', mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        }),
      );
    });

    it('should handle null exception as 500', () => {
      filter.catch(null, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('Logging behavior', () => {
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerErrorSpy = jest
        .spyOn(filter['logger'], 'error')
        .mockImplementation();
    });

    it('should log 500 errors with stack trace', () => {
      const exception = new Error('Unexpected crash');

      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('GET /test-path - 500'),
        expect.stringContaining('Unexpected crash'),
      );
    });

    it('should log 500 errors for string exceptions', () => {
      filter.catch('some string error', mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('500'),
        'some string error',
      );
    });

    it('should not log for client errors (4xx)', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });
  });
});
