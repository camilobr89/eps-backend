import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuthorizationDto } from './dto/create-authorization.dto';
import { UpdateAuthorizationDto } from './dto/update-authorization.dto';
import { FilterAuthorizationDto } from './dto/filter-authorization.dto';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';
import { Prisma } from '.prisma/client';

// Includes reutilizables para queries
const AUTHORIZATION_INCLUDES = {
  services: true,
  familyMember: { select: { id: true, fullName: true } },
  epsProvider: { select: { id: true, name: true, code: true } },
} satisfies Prisma.AuthorizationInclude;

const OWNERSHIP_INCLUDES = {
  ...AUTHORIZATION_INCLUDES,
  familyMember: { select: { id: true, fullName: true, userId: true } },
} satisfies Prisma.AuthorizationInclude;

@Injectable()
export class AuthorizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAuthorizationDto) {
    await this.verifyFamilyMemberOwnership(dto.familyMemberId, userId);

    const { services, familyMemberId, ...fields } = dto;

    return this.prisma.authorization.create({
      data: {
        ...this.mapDtoToData(fields),
        familyMemberId,
        documentType: dto.documentType,
        services: this.buildServicesCreate(services),
      },
      include: AUTHORIZATION_INCLUDES,
    });
  }

  async findAll(userId: string, filters: FilterAuthorizationDto) {
    const memberIds = await this.getUserFamilyMemberIds(userId);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    if (memberIds.length === 0) {
      return createPaginatedResponse([], 0, page, limit);
    }

    if (filters.familyMemberId && !memberIds.includes(filters.familyMemberId)) {
      return createPaginatedResponse([], 0, page, limit);
    }

    const where = this.buildWhereClause(memberIds, filters);

    const [authorizations, total] = await Promise.all([
      this.prisma.authorization.findMany({
        where,
        include: AUTHORIZATION_INCLUDES,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.authorization.count({ where }),
    ]);

    const data = this.applyAutoExpiration(authorizations);
    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, userId: string) {
    const authorization = await this.prisma.authorization.findUnique({
      where: { id },
      include: OWNERSHIP_INCLUDES,
    });

    if (!authorization || authorization.familyMember.userId !== userId) {
      throw new NotFoundException('Authorization not found');
    }

    const [result] = this.applyAutoExpiration([authorization]);
    return result;
  }

  async update(id: string, userId: string, dto: UpdateAuthorizationDto) {
    await this.findOne(id, userId);

    if (dto.familyMemberId) {
      await this.verifyFamilyMemberOwnership(dto.familyMemberId, userId);
    }

    const { services, ...fields } = dto;

    return this.prisma.authorization.update({
      where: { id },
      data: {
        ...this.mapDtoToData(fields),
        services: services
          ? { deleteMany: {}, create: this.mapServices(services) }
          : undefined,
      },
      include: AUTHORIZATION_INCLUDES,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    await this.prisma.authorization.delete({ where: { id } });

    return { message: 'Authorization deleted successfully' };
  }

  // --- Métodos privados reutilizables ---

  private mapDtoToData(dto: Partial<CreateAuthorizationDto>) {
    return {
      epsProviderId: dto.epsProviderId,
      documentType: dto.documentType,
      requestNumber: dto.requestNumber,
      issuingDate: dto.issuingDate ? new Date(dto.issuingDate) : undefined,
      expirationDate: dto.expirationDate
        ? new Date(dto.expirationDate)
        : undefined,
      diagnosisCode: dto.diagnosisCode,
      diagnosisDescription: dto.diagnosisDescription,
      patientLocation: dto.patientLocation,
      serviceOrigin: dto.serviceOrigin,
      providerName: dto.providerName,
      providerNit: dto.providerNit,
      providerCode: dto.providerCode,
      providerAddress: dto.providerAddress,
      providerPhone: dto.providerPhone,
      providerDepartment: dto.providerDepartment,
      providerCity: dto.providerCity,
      paymentType: dto.paymentType,
      copayValue: dto.copayValue,
      copayPercentage: dto.copayPercentage,
      maxValue: dto.maxValue,
      weeksContributed: dto.weeksContributed,
      priority: dto.priority,
      notes: dto.notes,
    };
  }

  private mapServices(
    services: {
      serviceCode: string;
      quantity?: number;
      serviceName: string;
      serviceType?: string;
    }[],
  ) {
    return services.map((s) => ({
      serviceCode: s.serviceCode,
      quantity: s.quantity ?? 1,
      serviceName: s.serviceName,
      serviceType: s.serviceType,
    }));
  }

  private buildServicesCreate(services?: CreateAuthorizationDto['services']) {
    if (!services?.length) return undefined;
    return { create: this.mapServices(services) };
  }

  private buildWhereClause(
    memberIds: string[],
    filters: FilterAuthorizationDto,
  ): Prisma.AuthorizationWhereInput {
    const where: Prisma.AuthorizationWhereInput = {
      familyMemberId: {
        in: filters.familyMemberId ? [filters.familyMemberId] : memberIds,
      },
    };

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.expiringBefore)
      where.expirationDate = { lte: new Date(filters.expiringBefore) };

    return where;
  }

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

  private async getUserFamilyMemberIds(userId: string): Promise<string[]> {
    const members = await this.prisma.familyMember.findMany({
      where: { userId },
      select: { id: true },
    });

    return members.map((m) => m.id);
  }

  private applyAutoExpiration<
    T extends { expirationDate: Date | null; status: string },
  >(authorizations: T[]): T[] {
    const now = new Date();

    return authorizations.map((auth) => {
      if (
        auth.expirationDate &&
        auth.expirationDate < now &&
        (auth.status === 'pending' || auth.status === 'scheduled')
      ) {
        if ('id' in auth) {
          void this.prisma.authorization.update({
            where: { id: (auth as unknown as { id: string }).id },
            data: { status: 'expired' },
          });
        }

        return { ...auth, status: 'expired' as T['status'] };
      }
      return auth;
    });
  }
}
