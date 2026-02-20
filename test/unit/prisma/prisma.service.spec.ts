import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  return {
    ...actual,
    PrismaClient: class MockPrismaClient {
      constructor() {}
      $connect = jest.fn().mockResolvedValue(undefined);
      $disconnect = jest.fn().mockResolvedValue(undefined);
    },
  };
});

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should call $connect', async () => {
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();
      await service.onModuleInit();
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('should call $disconnect', async () => {
      const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue();
      await service.onModuleDestroy();
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });
  });
});
