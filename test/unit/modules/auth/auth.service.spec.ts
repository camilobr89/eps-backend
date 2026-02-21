import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from '@/modules/auth/auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

jest.mock('bcrypt');

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockRedisService = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    };

    it('should register a new user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const createdUser = {
        id: 'uuid-1',
        email: 'test@example.com',
        fullName: 'Test User',
        isActive: true,
        createdAt: new Date(),
      };
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.register(registerDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed-password',
          fullName: 'Test User',
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(createdUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: 'test@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    const mockUser = {
      id: 'uuid-1',
      email: 'test@example.com',
      fullName: 'Test User',
      passwordHash: 'hashed-password',
      isActive: true,
    };

    it('should login successfully and return tokens', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 'uuid-1', email: 'test@example.com' },
        { expiresIn: '15m' },
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 'uuid-1', email: 'test@example.com' },
        { expiresIn: '7d' },
      );
    });

    it('should store refresh token hash in Redis with 7-day TTL', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      await service.login(loginDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('refresh-token', 10);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'refresh:uuid-1',
        'hashed-refresh',
        'EX',
        7 * 24 * 60 * 60,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('User is inactive'),
      );
    });
  });

  describe('refresh', () => {
    it('should return a new access token with a valid refresh token', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'uuid-1',
        email: 'test@example.com',
      });
      mockRedisService.get.mockResolvedValue('stored-hash');
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refresh('valid-refresh-token');

      expect(result).toEqual({ accessToken: 'new-access-token' });
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockRedisService.get).toHaveBeenCalledWith('refresh:uuid-1');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 'uuid-1', email: 'test@example.com' },
        { expiresIn: '15m' },
      );
    });

    it('should throw UnauthorizedException if refresh token is invalid (verify fails)', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.refresh('bad-token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException if refresh token has been revoked', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'uuid-1',
        email: 'test@example.com',
      });
      mockRedisService.get.mockResolvedValue(null);

      await expect(service.refresh('revoked-token')).rejects.toThrow(
        new UnauthorizedException('Refresh token has been revoked'),
      );
    });

    it('should throw UnauthorizedException if refresh token hash does not match', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'uuid-1',
        email: 'test@example.com',
      });
      mockRedisService.get.mockResolvedValue('stored-hash');
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh('tampered-token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });
  });

  describe('logout', () => {
    it('should delete refresh token from Redis', async () => {
      await service.logout('uuid-1');

      expect(mockRedisService.del).toHaveBeenCalledWith('refresh:uuid-1');
    });
  });
});
