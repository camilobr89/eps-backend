import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { HealthController } from '../../../../src/modules/health/health.controller';
import { HealthService } from '../../../../src/modules/health/health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockHealthService = {
    check: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return 200 when status is "ok"', async () => {
      const healthResult = {
        status: 'ok',
        database: 'connected',
        redis: 'connected',
        timestamp: new Date().toISOString(),
      };
      mockHealthService.check.mockResolvedValue(healthResult);
      const res = mockResponse();

      await controller.check(res);

      expect(mockHealthService.check).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(healthResult);
    });

    it('should return 503 when status is "degraded"', async () => {
      const healthResult = {
        status: 'degraded',
        database: 'disconnected',
        redis: 'connected',
        timestamp: new Date().toISOString(),
      };
      mockHealthService.check.mockResolvedValue(healthResult);
      const res = mockResponse();

      await controller.check(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(res.json).toHaveBeenCalledWith(healthResult);
    });

    it('should return 503 when all services are down', async () => {
      const healthResult = {
        status: 'degraded',
        database: 'disconnected',
        redis: 'disconnected',
        timestamp: new Date().toISOString(),
      };
      mockHealthService.check.mockResolvedValue(healthResult);
      const res = mockResponse();

      await controller.check(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(res.json).toHaveBeenCalledWith(healthResult);
    });

    it('should call healthService.check exactly once per request', async () => {
      mockHealthService.check.mockResolvedValue({
        status: 'ok',
        database: 'connected',
        redis: 'connected',
        timestamp: new Date().toISOString(),
      });
      const res = mockResponse();

      await controller.check(res);

      expect(mockHealthService.check).toHaveBeenCalledTimes(1);
    });
  });
});
