import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    });
  }

  async check() {
    const database = await this.checkDatabase();
    const redis = await this.checkRedis();

    const status =
      database === 'connected' && redis === 'connected' ? 'ok' : 'degraded';

    return {
      status,
      database,
      redis,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<string> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'connected';
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return 'disconnected';
    }
  }

  private async checkRedis(): Promise<string> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG' ? 'connected' : 'disconnected';
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return 'disconnected';
    }
  }
}
