import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';

const AUTH_SESSION_TTL_MS = 30 * 60 * 1000;

interface MockResponse {
  cookie: jest.Mock;
  clearCookie: jest.Mock;
}

const createMockResponse = (): MockResponse => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
});

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    logoutByRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register and return the result', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };
      const expectedUser = {
        id: 'uuid-1',
        email: 'test@example.com',
        fullName: 'Test User',
        isActive: true,
        createdAt: new Date(),
      };
      mockAuthService.register.mockResolvedValue(expectedUser);

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedUser);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('should return accessToken and set refresh cookie', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      const res = createMockResponse();

      const result = await controller.login(loginDto, res as any);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual({ accessToken: 'access-token' });
    });

    it('should set refreshToken as httpOnly cookie with session TTL', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      const res = createMockResponse();

      await controller.login(loginDto, res as any);

      const cookieOptions = res.cookie.mock.calls[0][2] as Record<
        string,
        unknown
      >;
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          maxAge: AUTH_SESSION_TTL_MS,
          path: '/api/auth',
        }),
      );
      expect(cookieOptions).not.toHaveProperty('expires');
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh with token from cookie', async () => {
      const req = { cookies: { refreshToken: 'valid-refresh-token' } };
      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
      });

      const result = await controller.refresh(req as any);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(
        'valid-refresh-token',
      );
      expect(result).toEqual({ accessToken: 'new-access-token' });
    });

    it('should return 401 message when no refresh token in cookies', async () => {
      const req = { cookies: {} };

      const result = await controller.refresh(req as any);

      expect(result).toEqual({
        statusCode: 401,
        message: 'No refresh token provided',
      });
      expect(mockAuthService.refresh).not.toHaveBeenCalled();
    });

    it('should handle missing cookies object', async () => {
      const req = { cookies: undefined };

      const result = await controller.refresh(req as any);

      expect(result).toEqual({
        statusCode: 401,
        message: 'No refresh token provided',
      });
    });
  });

  describe('logout', () => {
    it('should call authService.logoutByRefreshToken with cookie token and clear cookie', async () => {
      const req = { cookies: { refreshToken: 'valid-refresh-token' } };
      const res = createMockResponse();

      const result = await controller.logout(req as any, res as any);

      expect(mockAuthService.logoutByRefreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should still clear cookie even when no refresh token is present', async () => {
      const req = { cookies: {} };
      const res = createMockResponse();

      await controller.logout(req as any, res as any);

      expect(mockAuthService.logoutByRefreshToken).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.anything(),
      );
    });

    it('should clear refreshToken cookie with correct options', async () => {
      const req = { cookies: { refreshToken: 'valid-refresh-token' } };
      const res = createMockResponse();

      await controller.logout(req as any, res as any);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/api/auth',
        }),
      );
    });
  });
});
