import { Test, TestingModule } from '@nestjs/testing';
import { FamilyMembersController } from '@/modules/family-members/family-members.controller';
import { FamilyMembersService } from '@/modules/family-members/family-members.service';

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const user = { id: 'user-uuid-1' };

const mockMember = {
  id: 'member-uuid-1',
  userId: user.id,
  fullName: 'John Doe',
  relationship: 'Hijo',
  epsProvider: { id: 'eps-1', name: 'EPS Sura', code: 'EPS001' },
};

describe('FamilyMembersController', () => {
  let controller: FamilyMembersController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FamilyMembersController],
      providers: [
        { provide: FamilyMembersService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<FamilyMembersController>(FamilyMembersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with user id and dto', async () => {
      const dto = { fullName: 'John Doe', relationship: 'Hijo' };
      mockService.create.mockResolvedValue(mockMember);

      const result = await controller.create(user, dto as any);

      expect(mockService.create).toHaveBeenCalledWith(user.id, dto);
      expect(result).toEqual(mockMember);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with user id', async () => {
      mockService.findAll.mockResolvedValue([mockMember]);

      const result = await controller.findAll(user);

      expect(mockService.findAll).toHaveBeenCalledWith(user.id);
      expect(result).toEqual([mockMember]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with member id and user id', async () => {
      mockService.findOne.mockResolvedValue(mockMember);

      const result = await controller.findOne('member-uuid-1', user);

      expect(mockService.findOne).toHaveBeenCalledWith('member-uuid-1', user.id);
      expect(result).toEqual(mockMember);
    });
  });

  describe('update', () => {
    it('should call service.update with id, user id, and dto', async () => {
      const dto = { fullName: 'Jane Doe' };
      const updated = { ...mockMember, fullName: 'Jane Doe' };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update('member-uuid-1', user, dto as any);

      expect(mockService.update).toHaveBeenCalledWith(
        'member-uuid-1',
        user.id,
        dto,
      );
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and user id', async () => {
      mockService.remove.mockResolvedValue({
        message: 'Family member deleted successfully',
      });

      const result = await controller.remove('member-uuid-1', user);

      expect(mockService.remove).toHaveBeenCalledWith('member-uuid-1', user.id);
      expect(result).toEqual({
        message: 'Family member deleted successfully',
      });
    });
  });
});
