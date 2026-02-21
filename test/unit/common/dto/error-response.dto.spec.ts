import { ErrorDetail, ErrorResponseDto } from '@/common/dto/error-response.dto';

describe('ErrorResponseDto', () => {
  it('should create an instance with required properties', () => {
    const dto = new ErrorResponseDto();
    dto.statusCode = 400;
    dto.message = 'Bad Request';
    dto.timestamp = new Date().toISOString();
    dto.path = '/api/test';

    expect(dto.statusCode).toBe(400);
    expect(dto.message).toBe('Bad Request');
    expect(dto.timestamp).toBeDefined();
    expect(dto.path).toBe('/api/test');
  });

  it('should allow optional errors property', () => {
    const dto = new ErrorResponseDto();
    dto.statusCode = 400;
    dto.message = 'Validation failed';
    dto.timestamp = new Date().toISOString();
    dto.path = '/api/test';
    dto.errors = [{ field: 'email', message: 'email must be valid' }];

    expect(dto.errors).toHaveLength(1);
    expect(dto.errors[0].field).toBe('email');
  });

  it('should work without errors property', () => {
    const dto = new ErrorResponseDto();
    dto.statusCode = 404;
    dto.message = 'Not Found';
    dto.timestamp = new Date().toISOString();
    dto.path = '/api/test';

    expect(dto.errors).toBeUndefined();
  });
});

describe('ErrorDetail', () => {
  it('should create an instance with field and message', () => {
    const detail = new ErrorDetail();
    detail.field = 'username';
    detail.message = 'username should not be empty';

    expect(detail.field).toBe('username');
    expect(detail.message).toBe('username should not be empty');
  });
});
