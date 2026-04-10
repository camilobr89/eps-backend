import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { AUTH_SESSION_TTL_SECONDS } from './auth.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
  ) {}

  private getAccessTokenTtlSeconds(expiresAt?: number): number {
    if (!expiresAt) {
      return AUTH_SESSION_TTL_SECONDS;
    }

    const now = Math.floor(Date.now() / 1000);
    return Math.max(expiresAt - now, 1);
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(dto: LoginDto) {
    // Buscar usuario
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: AUTH_SESSION_TTL_SECONDS,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: AUTH_SESSION_TTL_SECONDS,
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.redis.set(
      `refresh:${user.id}`,
      refreshTokenHash,
      'EX',
      AUTH_SESSION_TTL_SECONDS,
    );

    this.logger.log(`User ${user.email} logged in`);

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; email: string; exp: number };
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedHash = await this.redis.get(`refresh:${payload.sub}`);
    if (!storedHash) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const isValid = await bcrypt.compare(refreshToken, storedHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessTokenTtlSeconds = this.getAccessTokenTtlSeconds(payload.exp);
    const accessToken = this.jwtService.sign(
      { sub: payload.sub, email: payload.email },
      { expiresIn: accessTokenTtlSeconds },
    );

    return { accessToken };
  }

  async logout(userId: string) {
    await this.redis.del(`refresh:${userId}`);
    this.logger.log(`User ${userId} logged out`);
  }

  async logoutByRefreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string }>(refreshToken);
      await this.redis.del(`refresh:${payload.sub}`);
      this.logger.log(`User ${payload.sub} logged out via refresh token`);
    } catch {
      // Token invalid or expired — nothing to revoke
    }
  }

  async updatePreferences(userId: string, dto: UpdateUserPreferencesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: dto.phone,
        emailNotifications: dto.emailNotifications,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        emailNotifications: true,
      },
    });
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        emailNotifications: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
