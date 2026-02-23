import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationsController } from '@/modules/authorizations/authorizations.controller';
import { AuthorizationsService } from '@/modules/authorizations/authorizations.service';

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const user = { id: 'user-uuid-1' };
const authId = 'auth-uuid-1';

const mockAuthorization = {
  id: authId,
  familyMemberId: 'member-uuid-1',
  documentType: 'orden_medica',
  status: 'pending',
  services: [],
};

describe('AuthorizationsController', () => {
  let controller: AuthorizationsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthorizationsController],
      providers: [
        { provide: AuthorizationsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<AuthorizationsController>(AuthorizationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with userId and dto', async () => {
      const dto = {
        familyMemberId: 'member-uuid-1',
        documentType: 'orden_medica',
      };
      mockService.create.mockResolvedValue(mockAuthorization);

      const result = await controller.create(user, dto as any);

      expect(mockService.create).toHaveBeenCalledWith(user.id, dto);
      expect(result).toEqual(mockAuthorization);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with userId and filters', async () => {
      const filters = { status: 'pending' };
      mockService.findAll.mockResolvedValue([mockAuthorization]);

      const result = await controller.findAll(user, filters as any);

      expect(mockService.findAll).toHaveBeenCalledWith(user.id, filters);
      expect(result).toHaveLength(1);
    });

    it('should pass empty filters', async () => {
      mockService.findAll.mockResolvedValue([]);

      await controller.findAll(user, {} as any);

      expect(mockService.findAll).toHaveBeenCalledWith(user.id, {});
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and userId', async () => {
      mockService.findOne.mockResolvedValue(mockAuthorization);

      const result = await controller.findOne(authId, user);

      expect(mockService.findOne).toHaveBeenCalledWith(authId, user.id);
      expect(result.id).toBe(authId);
    });
  });

  describe('update', () => {
    it('should call service.update with id, userId and dto', async () => {
      const dto = { notes: 'Updated' };
      mockService.update.mockResolvedValue({ ...mockAuthorization, ...dto });

      const result = await controller.update(authId, user, dto as any);

      expect(mockService.update).toHaveBeenCalledWith(authId, user.id, dto);
      expect(result.notes).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and userId', async () => {
      mockService.remove.mockResolvedValue({ message: 'Authorization deleted successfully' });

      const result = await controller.remove(authId, user);

      expect(mockService.remove).toHaveBeenCalledWith(authId, user.id);
      expect(result.message).toBe('Authorization deleted successfully');
    });
  });
});