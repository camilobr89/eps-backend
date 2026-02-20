import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../../../../src/modules/health/health.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
  }));
});

describe('HealthService', () => {
  let service: HealthService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('check', () => {
    it('should return "ok" when both database and redis are connected', async () => {
      const result = await service.check();

      expect(result.status).toBe('ok');
      expect(result.database).toBe('connected');
      expect(result.redis).toBe('connected');
      expect(result.timestamp).toBeDefined();
    });

    it('should return a valid ISO timestamp', async () => {
      const result = await service.check();
      const date = new Date(result.timestamp);
      expect(date.toISOString()).toBe(result.timestamp);
    });

    it('should return "degraded" when database is disconnected', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await service.check();

      expect(result.status).toBe('degraded');
      expect(result.database).toBe('disconnected');
      expect(result.redis).toBe('connected');
    });

    it('should return "degraded" when redis is disconnected', async () => {
      const Redis = require('ioredis');
      const redisInstance = Redis.mock.results[Redis.mock.results.length - 1].value;
      redisInstance.ping.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await service.check();

      expect(result.status).toBe('degraded');
      expect(result.database).toBe('connected');
      expect(result.redis).toBe('disconnected');
    });

    it('should return "degraded" when both services are disconnected', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('DB down'));
      const Redis = require('ioredis');
      const redisInstance = Redis.mock.results[Redis.mock.results.length - 1].value;
      redisInstance.ping.mockRejectedValueOnce(new Error('Redis down'));

      const result = await service.check();

      expect(result.status).toBe('degraded');
      expect(result.database).toBe('disconnected');
      expect(result.redis).toBe('disconnected');
    });

    it('should return "disconnected" for redis when ping returns unexpected value', async () => {
      const Redis = require('ioredis');
      const redisInstance = Redis.mock.results[Redis.mock.results.length - 1].value;
      redisInstance.ping.mockResolvedValueOnce('UNEXPECTED');

      const result = await service.check();

      expect(result.status).toBe('degraded');
      expect(result.redis).toBe('disconnected');
    });
  });
});
