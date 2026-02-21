import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';

@Injectable()
export class FamilyMembersService {
  private readonly includeEpsProvider = {
    epsProvider: {
      select: { id: true, name: true, code: true },
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFamilyMemberDto) {
    return this.prisma.familyMember.create({
      data: {
        ...this.mapDtoToData(dto),
        userId,
        fullName: dto.fullName,
        relationship: dto.relationship,
      },
      include: this.includeEpsProvider,
    });
  }

  async findAll(userId: string) {
    return this.prisma.familyMember.findMany({
      where: { userId },
      include: this.includeEpsProvider,
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: { id, userId },
      include: this.includeEpsProvider,
    });

    if (!member) {
      throw new NotFoundException('Family member not found');
    }

    return member;
  }

  async update(id: string, userId: string, dto: UpdateFamilyMemberDto) {
    await this.findOne(id, userId);

    return this.prisma.familyMember.update({
      where: { id },
      data: this.mapDtoToData(dto),
      include: this.includeEpsProvider,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    await this.prisma.familyMember.delete({
      where: { id },
    });

    return { message: 'Family member deleted successfully' };
  }

  private mapDtoToData(dto: CreateFamilyMemberDto | UpdateFamilyMemberDto) {
    return {
      epsProviderId: dto.epsProviderId,
      fullName: dto.fullName,
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      address: dto.address,
      phone: dto.phone,
      cellphone: dto.cellphone,
      email: dto.email,
      department: dto.department,
      city: dto.city,
      regime: dto.regime,
      relationship: dto.relationship,
    };
  }
}