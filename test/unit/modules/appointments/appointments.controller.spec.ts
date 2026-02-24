import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsController } from '@/modules/appointments/appointments.controller';
import { AppointmentsService } from '@/modules/appointments/appointments.service';

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findUpcoming: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const user = { id: 'user-uuid-1' };
const appointmentId = 'appt-uuid-1';

const mockAppointment = {
  id: appointmentId,
  familyMemberId: 'member-uuid-1',
  appointmentDate: new Date('2026-03-15T10:00:00.000Z'),
  status: 'scheduled',
};

describe('AppointmentsController', () => {
  let controller: AppointmentsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentsController],
      providers: [{ provide: AppointmentsService, useValue: mockService }],
    }).compile();

    controller = module.get<AppointmentsController>(AppointmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with userId and dto', async () => {
      const dto = {
        familyMemberId: 'member-uuid-1',
        appointmentDate: '2026-03-15T10:00:00.000Z',
      };
      mockService.create.mockResolvedValue(mockAppointment);

      const result = await controller.create(user, dto as any);

      expect(mockService.create).toHaveBeenCalledWith(user.id, dto);
      expect(result).toEqual(mockAppointment);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with userId and filters', async () => {
      const filters = { status: 'scheduled' };
      mockService.findAll.mockResolvedValue([mockAppointment]);

      const result = await controller.findAll(user, filters as any);

      expect(mockService.findAll).toHaveBeenCalledWith(user.id, filters);
      expect(result).toHaveLength(1);
    });
  });

  describe('findUpcoming', () => {
    it('should call service.findUpcoming with userId', async () => {
      mockService.findUpcoming.mockResolvedValue([mockAppointment]);

      const result = await controller.findUpcoming(user);

      expect(mockService.findUpcoming).toHaveBeenCalledWith(user.id);
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and userId', async () => {
      mockService.findOne.mockResolvedValue(mockAppointment);

      const result = await controller.findOne(appointmentId, user);

      expect(mockService.findOne).toHaveBeenCalledWith(appointmentId, user.id);
      expect(result.id).toBe(appointmentId);
    });
  });

  describe('update', () => {
    it('should call service.update with id, userId and dto', async () => {
      const dto = { status: 'confirmed', notes: 'Confirmed' };
      mockService.update.mockResolvedValue({ ...mockAppointment, ...dto });

      const result = await controller.update(appointmentId, user, dto as any);

      expect(mockService.update).toHaveBeenCalledWith(
        appointmentId,
        user.id,
        dto,
      );
      expect(result.status).toBe('confirmed');
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and userId', async () => {
      mockService.remove.mockResolvedValue({
        message: 'Appointment deleted successfully',
      });

      const result = await controller.remove(appointmentId, user);

      expect(mockService.remove).toHaveBeenCalledWith(appointmentId, user.id);
      expect(result.message).toBe('Appointment deleted successfully');
    });
  });
});
