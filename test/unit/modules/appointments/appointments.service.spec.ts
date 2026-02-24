import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AppointmentsService } from '@/modules/appointments/appointments.service';
import { PrismaService } from '@/prisma/prisma.service';

const mockPrisma = {
  appointment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  authorization: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  familyMember: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
};

const userId = 'user-uuid-1';
const memberId = 'member-uuid-1';
const appointmentId = 'appt-uuid-1';
const authorizationId = 'auth-uuid-1';

const mockMember = { id: memberId, userId, fullName: 'Test Member' };

const mockAppointment = {
  id: appointmentId,
  familyMemberId: memberId,
  authorizationId: null,
  authorizationServiceId: null,
  appointmentDate: new Date('2026-03-15T10:00:00.000Z'),
  location: 'Hospital San Ignacio',
  doctorName: 'Dr. Mejía',
  specialty: 'Neumología',
  status: 'scheduled',
  notes: null,
  familyMember: { id: memberId, fullName: 'Test Member', userId },
  authorization: null,
  authorizationService: null,
};

const mockAppointmentWithAuth = {
  ...mockAppointment,
  authorizationId,
  authorization: { id: authorizationId, documentType: 'orden_medica', status: 'scheduled', diagnosisDescription: 'Asma' },
};

const createDto = {
  familyMemberId: memberId,
  appointmentDate: '2026-03-15T10:00:00.000Z',
  location: 'Hospital San Ignacio',
  doctorName: 'Dr. Mejía',
  specialty: 'Neumología',
};

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an appointment without authorization', async () => {
      mockPrisma.familyMember.findFirst.mockResolvedValue(mockMember);
      mockPrisma.appointment.create.mockResolvedValue(mockAppointment);

      const result = await service.create(userId, createDto);

      expect(mockPrisma.familyMember.findFirst).toHaveBeenCalledWith({
        where: { id: memberId, userId },
      });
      expect(mockPrisma.appointment.create).toHaveBeenCalled();
      expect(mockPrisma.authorization.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockAppointment);
    });

    it('should create appointment and update authorization status to scheduled', async () => {
      mockPrisma.familyMember.findFirst.mockResolvedValue(mockMember);
      mockPrisma.authorization.findUnique.mockResolvedValue({
        id: authorizationId,
        familyMember: { userId },
      });
      mockPrisma.appointment.create.mockResolvedValue(mockAppointmentWithAuth);
      mockPrisma.authorization.update.mockResolvedValue({});

      await service.create(userId, { ...createDto, authorizationId });

      expect(mockPrisma.authorization.update).toHaveBeenCalledWith({
        where: { id: authorizationId },
        data: { status: 'scheduled' },
      });
    });

    it('should throw NotFoundException if family member does not belong to user', async () => {
      mockPrisma.familyMember.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if authorization does not belong to user', async () => {
      mockPrisma.familyMember.findFirst.mockResolvedValue(mockMember);
      mockPrisma.authorization.findUnique.mockResolvedValue({
        id: authorizationId,
        familyMember: { userId: 'other-user' },
      });

      await expect(
        service.create(userId, { ...createDto, authorizationId }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return appointments for user family members', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.appointment.findMany.mockResolvedValue([mockAppointment]);

      const result = await service.findAll(userId, {});

      expect(result).toHaveLength(1);
    });

    it('should return empty array if user has no family members', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId, {});

      expect(result).toEqual([]);
      expect(mockPrisma.appointment.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array if filtering by unowned family member', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);

      const result = await service.findAll(userId, { familyMemberId: 'other-member' });

      expect(result).toEqual([]);
    });

    it('should apply status filter', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      await service.findAll(userId, { status: 'scheduled' as any });

      const whereArg = mockPrisma.appointment.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe('scheduled');
    });

    it('should apply dateFrom filter', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      await service.findAll(userId, { dateFrom: '2026-03-01' });

      const whereArg = mockPrisma.appointment.findMany.mock.calls[0][0].where;
      expect(whereArg.appointmentDate.gte).toEqual(new Date('2026-03-01'));
    });

    it('should apply dateTo filter', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      await service.findAll(userId, { dateTo: '2026-03-31' });

      const whereArg = mockPrisma.appointment.findMany.mock.calls[0][0].where;
      expect(whereArg.appointmentDate.lte).toEqual(new Date('2026-03-31'));
    });

    it('should apply both dateFrom and dateTo filters', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      await service.findAll(userId, { dateFrom: '2026-03-01', dateTo: '2026-03-31' });

      const whereArg = mockPrisma.appointment.findMany.mock.calls[0][0].where;
      expect(whereArg.appointmentDate.gte).toEqual(new Date('2026-03-01'));
      expect(whereArg.appointmentDate.lte).toEqual(new Date('2026-03-31'));
    });
  });

  describe('findUpcoming', () => {
    it('should return upcoming appointments ordered by date asc, limit 10', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([{ id: memberId }]);
      mockPrisma.appointment.findMany.mockResolvedValue([mockAppointment]);

      const result = await service.findUpcoming(userId);

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            familyMemberId: { in: [memberId] },
            status: { in: ['scheduled', 'confirmed'] },
          }),
          orderBy: { appointmentDate: 'asc' },
          take: 10,
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array if user has no family members', async () => {
      mockPrisma.familyMember.findMany.mockResolvedValue([]);

      const result = await service.findUpcoming(userId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return appointment if it belongs to user', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const result = await service.findOne(appointmentId, userId);

      expect(result.id).toBe(appointmentId);
    });

    it('should throw NotFoundException if appointment does not exist', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.findOne(appointmentId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if appointment belongs to another user', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        ...mockAppointment,
        familyMember: { ...mockAppointment.familyMember, userId: 'other-user' },
      });

      await expect(service.findOne(appointmentId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update appointment fields', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrisma.appointment.update.mockResolvedValue({
        ...mockAppointment,
        notes: 'Updated',
        status: 'confirmed',
      });

      const result = await service.update(appointmentId, userId, {
        notes: 'Updated',
        status: 'confirmed' as any,
      });

      expect(mockPrisma.appointment.update).toHaveBeenCalled();
      expect(result.notes).toBe('Updated');
      expect(result.status).toBe('confirmed');
    });

    it('should throw NotFoundException if appointment not found', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      await expect(
        service.update(appointmentId, userId, { notes: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should verify family member ownership when changing familyMemberId', async () => {
      const newMemberId = 'new-member-uuid';
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrisma.familyMember.findFirst.mockResolvedValue({ id: newMemberId, userId });
      mockPrisma.appointment.update.mockResolvedValue(mockAppointment);

      await service.update(appointmentId, userId, { familyMemberId: newMemberId });

      expect(mockPrisma.familyMember.findFirst).toHaveBeenCalledWith({
        where: { id: newMemberId, userId },
      });
    });

    it('should verify authorization ownership when changing authorizationId', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrisma.authorization.findUnique.mockResolvedValue({
        id: authorizationId,
        familyMember: { userId },
      });
      mockPrisma.appointment.update.mockResolvedValue(mockAppointment);

      await service.update(appointmentId, userId, { authorizationId });

      expect(mockPrisma.authorization.findUnique).toHaveBeenCalledWith({
        where: { id: authorizationId },
        include: { familyMember: { select: { userId: true } } },
      });
    });
  });

  describe('remove', () => {
    it('should delete appointment without authorization', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrisma.appointment.delete.mockResolvedValue(mockAppointment);

      const result = await service.remove(appointmentId, userId);

      expect(mockPrisma.appointment.delete).toHaveBeenCalledWith({
        where: { id: appointmentId },
      });
      expect(mockPrisma.authorization.update).not.toHaveBeenCalled();
      expect(result.message).toBe('Appointment deleted successfully');
    });

    it('should revert authorization status to pending when deleting linked appointment', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointmentWithAuth);
      mockPrisma.authorization.update.mockResolvedValue({});
      mockPrisma.appointment.delete.mockResolvedValue(mockAppointmentWithAuth);

      await service.remove(appointmentId, userId);

      expect(mockPrisma.authorization.update).toHaveBeenCalledWith({
        where: { id: authorizationId },
        data: { status: 'pending' },
      });
    });

    it('should throw NotFoundException if appointment not found', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.remove(appointmentId, userId)).rejects.toThrow(NotFoundException);
    });
  });
});