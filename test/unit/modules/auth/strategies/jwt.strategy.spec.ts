import { UnauthorizedException } from '@nestjs/common';
import {
  JwtStrategy,
  JwtPayload,
} from '@/modules/auth/strategies/jwt.strategy';
import { PrismaService } from '@/prisma/prisma.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    strategy = new JwtStrategy(mockPrismaService as unknown as PrismaService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const payload: JwtPayload = { sub: 'uuid-1', email: 'test@example.com' };

    it('should return user data when user exists and is active', async () => {
      const mockUser = {
        id: 'uuid-1',
        email: 'test@example.com',
        fullName: 'Test User',
        isActive: true,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        select: { id: true, email: true, fullName: true, isActive: true },
      });
      expect(result).toEqual({
        id: 'uuid-1',
        email: 'test@example.com',
        fullName: 'Test User',
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        fullName: 'Test User',
        isActive: false,
      });

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('User not found or inactive'),
      );
    });
  });
});
