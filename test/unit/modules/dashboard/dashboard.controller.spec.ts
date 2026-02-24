import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from '@/modules/dashboard/dashboard.controller';
import { DashboardService } from '@/modules/dashboard/dashboard.service';

const mockService = {
  getSummary: jest.fn(),
  getTimeline: jest.fn(),
};

const user = { id: 'user-uuid-1' };

const mockSummary = {
  urgent: { count: 1, items: [{ id: 'auth-1' }] },
  expiringSoon: { count: 0, items: [] },
  pendingToSchedule: { count: 2, items: [{ id: 'auth-2' }, { id: 'auth-3' }] },
  upcomingAppointments: { count: 1, items: [{ id: 'appt-1' }] },
  familyMembers: [{ id: 'member-1', name: 'Test', pendingCount: 2 }],
};

const mockTimeline = [
  {
    type: 'appointment',
    date: new Date(),
    description: 'Cita',
    entityId: 'appt-1',
    familyMemberName: 'Test',
  },
  {
    type: 'expiration',
    date: new Date(),
    description: 'Vence',
    entityId: 'auth-1',
    familyMemberName: 'Test',
  },
];

describe('DashboardController', () => {
  let controller: DashboardController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: mockService }],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSummary', () => {
    it('should call service.getSummary with userId', async () => {
      mockService.getSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSummary(user);

      expect(mockService.getSummary).toHaveBeenCalledWith(user.id);
      expect(result.urgent.count).toBe(1);
      expect(result.pendingToSchedule.count).toBe(2);
      expect(result.familyMembers).toHaveLength(1);
    });
  });

  describe('getTimeline', () => {
    it('should call service.getTimeline with userId', async () => {
      mockService.getTimeline.mockResolvedValue(mockTimeline);

      const result = await controller.getTimeline(user);

      expect(mockService.getTimeline).toHaveBeenCalledWith(user.id);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('appointment');
      expect(result[1].type).toBe('expiration');
    });
  });
});
