import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { FilterAppointmentDto } from './dto/filter-appointment.dto';
import { Prisma } from '.prisma/client';

const APPOINTMENT_INCLUDES = {
  familyMember: { select: { id: true, fullName: true } },
  authorization: {
    select: {
      id: true,
      documentType: true,
      status: true,
      diagnosisDescription: true,
    },
  },
  authorizationService: {
    select: { id: true, serviceCode: true, serviceName: true },
  },
} satisfies Prisma.AppointmentInclude;

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAppointmentDto) {
    await this.verifyFamilyMemberOwnership(dto.familyMemberId, userId);

    // Si se vincula a una autorización, verificar pertenencia
    if (dto.authorizationId) {
      await this.verifyAuthorizationOwnership(dto.authorizationId, userId);
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        familyMemberId: dto.familyMemberId,
        authorizationId: dto.authorizationId,
        authorizationServiceId: dto.authorizationServiceId,
        appointmentDate: new Date(dto.appointmentDate),
        location: dto.location,
        doctorName: dto.doctorName,
        specialty: dto.specialty,
        notes: dto.notes,
      },
      include: APPOINTMENT_INCLUDES,
    });

    // Cambiar status de la autorización a scheduled
    if (dto.authorizationId) {
      await this.updateAuthorizationStatus(dto.authorizationId, 'scheduled');
    }

    return appointment;
  }

  async findAll(userId: string, filters: FilterAppointmentDto) {
    const memberIds = await this.getUserFamilyMemberIds(userId);

    if (memberIds.length === 0) return [];

    if (filters.familyMemberId && !memberIds.includes(filters.familyMemberId)) {
      return [];
    }

    const where = this.buildWhereClause(memberIds, filters);

    return this.prisma.appointment.findMany({
      where,
      include: APPOINTMENT_INCLUDES,
      orderBy: { appointmentDate: 'desc' },
    });
  }

  async findUpcoming(userId: string) {
    const memberIds = await this.getUserFamilyMemberIds(userId);

    if (memberIds.length === 0) return [];

    return this.prisma.appointment.findMany({
      where: {
        familyMemberId: { in: memberIds },
        appointmentDate: { gte: new Date() },
        status: { in: ['scheduled', 'confirmed'] },
      },
      include: APPOINTMENT_INCLUDES,
      orderBy: { appointmentDate: 'asc' },
      take: 10,
    });
  }

  async findOne(id: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        ...APPOINTMENT_INCLUDES,
        familyMember: { select: { id: true, fullName: true, userId: true } },
      },
    });

    if (!appointment || appointment.familyMember.userId !== userId) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async update(id: string, userId: string, dto: UpdateAppointmentDto) {
    await this.findOne(id, userId);

    if (dto.familyMemberId) {
      await this.verifyFamilyMemberOwnership(dto.familyMemberId, userId);
    }

    if (dto.authorizationId) {
      await this.verifyAuthorizationOwnership(dto.authorizationId, userId);
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        familyMemberId: dto.familyMemberId,
        authorizationId: dto.authorizationId,
        authorizationServiceId: dto.authorizationServiceId,
        appointmentDate: dto.appointmentDate
          ? new Date(dto.appointmentDate)
          : undefined,
        location: dto.location,
        doctorName: dto.doctorName,
        specialty: dto.specialty,
        notes: dto.notes,
        status: dto.status,
      },
      include: APPOINTMENT_INCLUDES,
    });
  }

  async remove(id: string, userId: string) {
    const appointment = await this.findOne(id, userId);

    // Si estaba vinculada a una autorización, revertir status a pending
    if (appointment.authorizationId) {
      await this.updateAuthorizationStatus(
        appointment.authorizationId,
        'pending',
      );
    }

    await this.prisma.appointment.delete({ where: { id } });

    return { message: 'Appointment deleted successfully' };
  }

  // --- Métodos privados reutilizables ---

  private async verifyFamilyMemberOwnership(
    familyMemberId: string,
    userId: string,
  ) {
    const member = await this.prisma.familyMember.findFirst({
      where: { id: familyMemberId, userId },
    });

    if (!member) {
      throw new NotFoundException('Family member not found');
    }
  }

  private async verifyAuthorizationOwnership(
    authorizationId: string,
    userId: string,
  ) {
    const authorization = await this.prisma.authorization.findUnique({
      where: { id: authorizationId },
      include: { familyMember: { select: { userId: true } } },
    });

    if (!authorization || authorization.familyMember.userId !== userId) {
      throw new NotFoundException('Authorization not found');
    }
  }

  private async updateAuthorizationStatus(
    authorizationId: string,
    status: 'pending' | 'scheduled',
  ) {
    await this.prisma.authorization.update({
      where: { id: authorizationId },
      data: { status },
    });
  }

  private async getUserFamilyMemberIds(userId: string): Promise<string[]> {
    const members = await this.prisma.familyMember.findMany({
      where: { userId },
      select: { id: true },
    });

    return members.map((m) => m.id);
  }

  private buildWhereClause(
    memberIds: string[],
    filters: FilterAppointmentDto,
  ): Prisma.AppointmentWhereInput {
    const where: Prisma.AppointmentWhereInput = {
      familyMemberId: {
        in: filters.familyMemberId ? [filters.familyMemberId] : memberIds,
      },
    };

    if (filters.status) where.status = filters.status;

    if (filters.dateFrom || filters.dateTo) {
      where.appointmentDate = {};
      if (filters.dateFrom) {
        (where.appointmentDate as Prisma.DateTimeFilter).gte = new Date(
          filters.dateFrom,
        );
      }
      if (filters.dateTo) {
        (where.appointmentDate as Prisma.DateTimeFilter).lte = new Date(
          filters.dateTo,
        );
      }
    }

    return where;
  }
}
