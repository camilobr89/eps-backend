import { RedisService } from '@/common/redis/redis.service';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(function (this: Record<string, any>) {
    this.on = jest.fn().mockReturnThis();
    this.quit = jest.fn().mockResolvedValue('OK');
  });
});

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RedisService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register connect and error event listeners', () => {
    expect(service.on).toHaveBeenCalledWith('connect', expect.any(Function));

    expect(service.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  describe('onModuleDestroy', () => {
    it('should call quit to disconnect from Redis', async () => {
      await service.onModuleDestroy();

      expect(service.quit).toHaveBeenCalledTimes(1);
    });
  });
});
