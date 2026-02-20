import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '@/modules/health/health.service';
import { PrismaService } from '@/prisma/prisma.service';

const mockPing = jest.fn().mockResolvedValue('PONG');

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: mockPing,
  }));
});

describe('HealthService', () => {
  let service: HealthService;

  const mockPrismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPing.mockResolvedValue('PONG');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
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
      mockPrismaService.$queryRaw.mockRejectedValueOnce(
        new Error('Connection refused'),
      );

      const result = await service.check();

      expect(result.status).toBe('degraded');
      expect(result.database).toBe('disconnected');
      expect(result.redis).toBe('connected');
    });

    it('should return "degraded" when redis is disconnected', async () => {
      mockPing.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await service.check();

      expect(result.status).toBe('degraded');
      expect(result.database).toBe('connected');
      expect(result.redis).toBe('disconnected');
    });

    it('should return "degraded" when both services are disconnected', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('DB down'));
      mockPing.mockRejectedValueOnce(new Error('Redis down'));

      const result = await service.check();

      expect(result.status).toBe('degraded');
      expect(result.database).toBe('disconnected');
      expect(result.redis).toBe('disconnected');
    });

    it('should return "disconnected" for redis when ping returns unexpected value', async () => {
      mockPing.mockResolvedValueOnce('UNEXPECTED');

      const result = await service.check();

      expect(result.status).toBe('degraded');
      expect(result.redis).toBe('disconnected');
    });
  });
});
