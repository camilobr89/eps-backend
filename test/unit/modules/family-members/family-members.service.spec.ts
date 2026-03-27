import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FamilyMembersService } from '@/modules/family-members/family-members.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  createMockPrismaService,
  createMockFamilyMember,
} from '../../../utils/mock-factories';
import {
  clearAllMocks,
  createServiceTestSetup,
} from '../../../utils/test-helpers';
import {
  buildFamilyMemberCreateDto,
  TEST_CONSTANTS,
} from '../../../utils/test-data-builders';

const mockPrismaService = createMockPrismaService();

const { USER_ID, MEMBER_ID, EPS_PROVIDER_ID } = TEST_CONSTANTS;
const userId = USER_ID;

const mockEpsProvider = {
  id: EPS_PROVIDER_ID,
  name: 'EPS Sura',
  code: 'EPS001',
};

const mockMember = createMockFamilyMember({
  id: MEMBER_ID,
  userId: USER_ID,
  epsProvider: mockEpsProvider,
});

const createDto = buildFamilyMemberCreateDto({
  epsProviderId: EPS_PROVIDER_ID,
});

describe('FamilyMembersService', () => {
  let service: FamilyMembersService;

  beforeEach(async () => {
    const setup = await createServiceTestSetup(FamilyMembersService, [
      { provide: PrismaService, useValue: mockPrismaService },
    ]);
    service = setup.service;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a family member with correct data', async () => {
      mockPrismaService.familyMember.create.mockResolvedValue(mockMember);

      const result = await service.create(userId, createDto);

      expect(mockPrismaService.familyMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            fullName: 'John Doe',
            relationship: 'Hijo',
            birthDate: new Date('1990-01-15'),
          }),
          include: {
            epsProvider: { select: { id: true, name: true, code: true } },
          },
        }),
      );
      expect(result).toEqual(mockMember);
    });

    it('should handle undefined birthDate', async () => {
      const dtoNoBirth = { ...createDto, birthDate: undefined };
      mockPrismaService.familyMember.create.mockResolvedValue(mockMember);

      await service.create(userId, dtoNoBirth);

      expect(mockPrismaService.familyMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ birthDate: undefined }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all family members for a user ordered by name', async () => {
      const members = [mockMember];
      mockPrismaService.familyMember.findMany.mockResolvedValue(members);

      const result = await service.findAll(userId);

      expect(mockPrismaService.familyMember.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          epsProvider: { select: { id: true, name: true, code: true } },
        },
        orderBy: { fullName: 'asc' },
      });
      expect(result).toEqual(members);
    });

    it('should return empty array when no members found', async () => {
      mockPrismaService.familyMember.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a family member by id and userId', async () => {
      mockPrismaService.familyMember.findFirst.mockResolvedValue(mockMember);

      const result = await service.findOne('member-uuid-1', userId);

      expect(mockPrismaService.familyMember.findFirst).toHaveBeenCalledWith({
        where: { id: 'member-uuid-1', userId },
        include: {
          epsProvider: { select: { id: true, name: true, code: true } },
        },
      });
      expect(result).toEqual(mockMember);
    });

    it('should throw NotFoundException when member does not exist', async () => {
      mockPrismaService.familyMember.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id', userId)).rejects.toThrow(
        new NotFoundException('Family member not found'),
      );
    });
  });

  describe('update', () => {
    const updateDto = { fullName: 'Jane Doe', city: 'Bogotá' };

    it('should verify ownership and update the member', async () => {
      mockPrismaService.familyMember.findFirst.mockResolvedValue(mockMember);
      const updatedMember = { ...mockMember, ...updateDto };
      mockPrismaService.familyMember.update.mockResolvedValue(updatedMember);

      const result = await service.update('member-uuid-1', userId, updateDto);

      expect(mockPrismaService.familyMember.findFirst).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.familyMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'member-uuid-1' },
          data: expect.objectContaining({
            fullName: 'Jane Doe',
            city: 'Bogotá',
          }),
          include: {
            epsProvider: { select: { id: true, name: true, code: true } },
          },
        }),
      );
      expect(result).toEqual(updatedMember);
    });

    it('should throw NotFoundException if member does not belong to user', async () => {
      mockPrismaService.familyMember.findFirst.mockResolvedValue(null);

      await expect(
        service.update('member-uuid-1', userId, updateDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.familyMember.update).not.toHaveBeenCalled();
    });

    it('should convert birthDate string to Date on update', async () => {
      mockPrismaService.familyMember.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.familyMember.update.mockResolvedValue(mockMember);

      await service.update('member-uuid-1', userId, {
        birthDate: '2000-06-15',
      });

      expect(mockPrismaService.familyMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            birthDate: new Date('2000-06-15'),
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should verify ownership and delete the member', async () => {
      mockPrismaService.familyMember.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.familyMember.delete.mockResolvedValue(mockMember);

      const result = await service.remove('member-uuid-1', userId);

      expect(mockPrismaService.familyMember.findFirst).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.familyMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-uuid-1' },
      });
      expect(result).toEqual({ message: 'Family member deleted successfully' });
    });

    it('should throw NotFoundException if member does not belong to user', async () => {
      mockPrismaService.familyMember.findFirst.mockResolvedValue(null);

      await expect(service.remove('member-uuid-1', userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.familyMember.delete).not.toHaveBeenCalled();
    });
  });
});
