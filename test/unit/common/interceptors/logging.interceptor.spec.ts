import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let loggerSpy: jest.SpyInstance;

  const createMockContext = (
    method = 'GET',
    url = '/test',
    statusCode = 200,
  ): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => ({ method, url }),
        getResponse: () => ({ statusCode }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    mockExecutionContext = createMockContext();
    mockCallHandler = { handle: jest.fn().mockReturnValue(of('response')) };
    loggerSpy = jest.spyOn(interceptor['logger'], 'log').mockImplementation();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should call next.handle()', (done) => {
    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      complete: () => {
        expect((mockCallHandler.handle as jest.Mock).mock.calls.length).toBe(1);
        done();
      },
    });
  });

  it('should log method, url, status code and duration', (done) => {
    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      complete: () => {
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringMatching(/GET \/test 200 - \d+ms/),
        );
        done();
      },
    });
  });

  it('should log POST requests correctly', (done) => {
    const postContext = createMockContext('POST', '/api/users', 201);

    interceptor.intercept(postContext, mockCallHandler).subscribe({
      complete: () => {
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringMatching(/POST \/api\/users 201 - \d+ms/),
        );
        done();
      },
    });
  });

  it('should return the original response data', (done) => {
    const responseData = { id: 1, name: 'Test' };
    mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .subscribe((result) => {
        expect(result).toEqual(responseData);
        done();
      });
  });
});
