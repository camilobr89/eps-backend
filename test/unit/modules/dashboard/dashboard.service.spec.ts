import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '@/modules/dashboard/dashboard.service';
import { PrismaService } from '@/prisma/prisma.service';

const memberId = 'member-uuid-1';
const userId = 'user-uuid-1';

const mockPrisma = {
  familyMember: {
    findMany: jest.fn(),
  },
  authorization: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  appointment: {
    findMany: jest.fn(),
  },
};

const mockMember = {
  id: memberId,
  fullName: 'Test Member',
  epsProvider: { name: 'Salud Total' },
};

const mockUrgentAuth = {
  id: 'auth-urgent-1',
  familyMemberId: memberId,
  priority: 'urgente',
  status: 'pending',
  familyMember: { id: memberId, fullName: 'Test Member' },
  services: [{ serviceName: 'Consulta urgente' }],
};

const mockExpiringAuth = {
  id: 'auth-expiring-1',
  familyMemberId: memberId,
  status: 'pending',
  expirationDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 días
  familyMember: { id: memberId, fullName: 'Test Member' },
  services: [{ serviceName: 'Examen' }],
};

const mockPendingAuth = {
  id: 'auth-pending-1',
  familyMemberId: memberId,
  status: 'pending',
  familyMember: { id: memberId, fullName: 'Test Member' },
  services: [{ serviceName: 'Espirometría' }],
};

const mockAppointment = {
  id: 'appt-1',
  familyMemberId: memberId,
  appointmentDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 días
  status: 'scheduled',
  specialty: 'Neumología',
  doctorName: 'Dr. Mejía',
  location: 'Hospital',
  familyMember: { id: memberId, fullName: 'Test Member' },
  authorization: null,
};

const mockTimelineAuth = {
  id: 'auth-timeline-1',
  familyMemberId: memberId,
  status: 'pending',
  expirationDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  documentType: 'orden_medica',
  diagnosisDescription: 'Asma alérgica',
  familyMember: { fullName: 'Test Member' },
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSummary', () => {
    it('should return empty summary when user has no family members', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([]);

      const result = await service.getSummary(userId);

      expect(result.urgent.count).toBe(0);
      expect(result.expiringSoon.count).toBe(0);
      expect(result.pendingToSchedule.count).toBe(0);
      expect(result.upcomingAppointments.count).toBe(0);
      expect(result.familyMembers).toEqual([]);
    });

    it('should return complete summary with all sections', async () => {
      // getUserFamilyMemberIds
      mockPrisma.familyMember.findMany
        .mockResolvedValueOnce([{ id: memberId }]) // getUserFamilyMemberIds
        .mockResolvedValueOnce([mockMember]); // getFamilyMembersSummary

      mockPrisma.authorization.findMany
        .mockResolvedValueOnce([mockUrgentAuth]) // urgent
        .mockResolvedValueOnce([mockExpiringAuth]) // expiringSoon
        .mockResolvedValueOnce([mockPendingAuth]); // pendingToSchedule

      mockPrisma.appointment.findMany
        .mockResolvedValueOnce([mockAppointment]) // upcomingAppointments
        .mockResolvedValueOnce([
          {
            familyMemberId: memberId,
            appointmentDate: mockAppointment.appointmentDate,
          },
        ]); // next appointments

      mockPrisma.authorization.groupBy.mockResolvedValue([
        { familyMemberId: memberId, _count: 2 },
      ]);

      const result = await service.getSummary(userId);

      expect(result.urgent.count).toBe(1);
      expect(result.urgent.items).toHaveLength(1);
      expect(result.expiringSoon.count).toBe(1);
      expect(result.pendingToSchedule.count).toBe(1);
      expect(result.upcomingAppointments.count).toBe(1);
      expect(result.familyMembers).toHaveLength(1);
    });

    it('should return correct family member summary with pending count and next appointment', async () => {
      mockPrisma.familyMember.findMany
        .mockResolvedValueOnce([{ id: memberId }])
        .mockResolvedValueOnce([mockMember]);

      mockPrisma.authorization.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockPrisma.appointment.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { familyMemberId: memberId, appointmentDate: new Date('2026-04-01') },
        ]);

      mockPrisma.authorization.groupBy.mockResolvedValue([
        { familyMemberId: memberId, _count: 3 },
      ]);

      const result = await service.getSummary(userId);

      expect(result.familyMembers[0]).toEqual({
        id: memberId,
        name: 'Test Member',
        epsName: 'Salud Total',
        pendingCount: 3,
        nextAppointment: new Date('2026-04-01').toISOString(),
      });
    });

    it('should return null epsName and zero pendingCount when no data', async () => {
      const memberNoEps = { ...mockMember, epsProvider: null };

      mockPrisma.familyMember.findMany
        .mockResolvedValueOnce([{ id: memberId }])
        .mockResolvedValueOnce([memberNoEps]);

      mockPrisma.authorization.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockPrisma.appointment.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockPrisma.authorization.groupBy.mockResolvedValue([]);

      const result = await service.getSummary(userId);

      expect(result.familyMembers[0].epsName).toBeNull();
      expect(result.familyMembers[0].pendingCount).toBe(0);
      expect(result.familyMembers[0].nextAppointment).toBeNull();
    });
  });

  describe('getTimeline', () => {
    it('should return empty array when user has no family members', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([]);

      const result = await service.getTimeline(userId);

      expect(result).toEqual([]);
    });

    it('should return mixed events sorted by date', async () => {
      const appointmentDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const expirationDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);

      mockPrisma.appointment.findMany.mockResolvedValue([
        { ...mockAppointment, appointmentDate },
      ]);

      mockPrisma.authorization.findMany.mockResolvedValue([
        { ...mockTimelineAuth, expirationDate },
      ]);

      const result = await service.getTimeline(userId);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('appointment');
      expect(result[0].date).toEqual(appointmentDate);
      expect(result[1].type).toBe('expiration');
      expect(result[1].date).toEqual(expirationDate);
    });

    it('should sort expiration before appointment when expiration date is earlier', async () => {
      const earlyExpiration = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const laterAppointment = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);

      mockPrisma.appointment.findMany.mockResolvedValue([
        { ...mockAppointment, appointmentDate: laterAppointment },
      ]);

      mockPrisma.authorization.findMany.mockResolvedValue([
        { ...mockTimelineAuth, expirationDate: earlyExpiration },
      ]);

      const result = await service.getTimeline(userId);

      expect(result[0].type).toBe('expiration');
      expect(result[1].type).toBe('appointment');
    });

    it('should build appointment description from specialty, doctorName and location', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      mockPrisma.authorization.findMany.mockResolvedValue([]);

      const result = await service.getTimeline(userId);

      expect(result[0].description).toBe('Neumología - Dr. Mejía - Hospital');
      expect(result[0].familyMemberName).toBe('Test Member');
      expect(result[0].entityId).toBe(mockAppointment.id);
    });

    it('should use diagnosisDescription for expiration event description', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.authorization.findMany.mockResolvedValue([mockTimelineAuth]);

      const result = await service.getTimeline(userId);

      expect(result[0].description).toBe('Asma alérgica');
    });

    it('should fallback to documentType when no diagnosisDescription', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.authorization.findMany.mockResolvedValue([
        { ...mockTimelineAuth, diagnosisDescription: null },
      ]);

      const result = await service.getTimeline(userId);

      expect(result[0].description).toBe('orden_medica');
    });

    it('should fallback to default text when no description fields', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.authorization.findMany.mockResolvedValue([
        { ...mockTimelineAuth, diagnosisDescription: null, documentType: null },
      ]);

      const result = await service.getTimeline(userId);

      expect(result[0].description).toBe('Autorización por vencer');
    });

    it('should fallback appointment description when no details', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.appointment.findMany.mockResolvedValue([
        {
          ...mockAppointment,
          specialty: null,
          doctorName: null,
          location: null,
        },
      ]);
      mockPrisma.authorization.findMany.mockResolvedValue([]);

      const result = await service.getTimeline(userId);

      expect(result[0].description).toBe('Cita médica');
    });
  });
});
