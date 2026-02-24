import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
    const memberIds = await this.getUserFamilyMemberIds(userId);

    if (memberIds.length === 0) {
      return this.emptySummary();
    }

    const [
      urgent,
      expiringSoon,
      pendingToSchedule,
      upcomingAppointments,
      familyMembers,
    ] = await Promise.all([
      this.getUrgentAuthorizations(memberIds),
      this.getExpiringSoon(memberIds),
      this.getPendingToSchedule(memberIds),
      this.getUpcomingAppointments(memberIds),
      this.getFamilyMembersSummary(userId, memberIds),
    ]);

    return {
      urgent: { count: urgent.length, items: urgent },
      expiringSoon: { count: expiringSoon.length, items: expiringSoon },
      pendingToSchedule: {
        count: pendingToSchedule.length,
        items: pendingToSchedule,
      },
      upcomingAppointments: {
        count: upcomingAppointments.length,
        items: upcomingAppointments,
      },
      familyMembers,
    };
  }

  async getTimeline(userId: string) {
    const memberIds = await this.getUserFamilyMemberIds(userId);

    if (memberIds.length === 0) return [];

    const fourWeeksFromNow = new Date();
    fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28);
    const now = new Date();

    const [appointments, expiringAuthorizations] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          familyMemberId: { in: memberIds },
          appointmentDate: { gte: now, lte: fourWeeksFromNow },
          status: { in: ['scheduled', 'confirmed'] },
        },
        include: {
          familyMember: { select: { fullName: true } },
        },
        orderBy: { appointmentDate: 'asc' },
      }),
      this.prisma.authorization.findMany({
        where: {
          familyMemberId: { in: memberIds },
          expirationDate: { gte: now, lte: fourWeeksFromNow },
          status: { in: ['pending', 'scheduled'] },
        },
        include: {
          familyMember: { select: { fullName: true } },
        },
        orderBy: { expirationDate: 'asc' },
      }),
    ]);

    const events = [
      ...appointments.map((appt) => ({
        type: 'appointment' as const,
        date: appt.appointmentDate,
        description:
          [appt.specialty, appt.doctorName, appt.location]
            .filter(Boolean)
            .join(' - ') || 'Cita médica',
        entityId: appt.id,
        familyMemberName: appt.familyMember.fullName,
      })),
      ...expiringAuthorizations.map((auth) => ({
        type: 'expiration' as const,
        date: auth.expirationDate!,
        description:
          auth.diagnosisDescription ||
          auth.documentType ||
          'Autorización por vencer',
        entityId: auth.id,
        familyMemberName: auth.familyMember.fullName,
      })),
    ];

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // --- Métodos privados ---

  private async getUserFamilyMemberIds(userId: string): Promise<string[]> {
    const members = await this.prisma.familyMember.findMany({
      where: { userId },
      select: { id: true },
    });

    return members.map((m) => m.id);
  }

  private async getUrgentAuthorizations(memberIds: string[]) {
    return this.prisma.authorization.findMany({
      where: {
        familyMemberId: { in: memberIds },
        priority: { in: ['urgente', 'alta'] },
        status: { in: ['pending', 'scheduled'] },
      },
      include: {
        familyMember: { select: { id: true, fullName: true } },
        services: { select: { serviceName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getExpiringSoon(memberIds: string[]) {
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);

    return this.prisma.authorization.findMany({
      where: {
        familyMemberId: { in: memberIds },
        expirationDate: { gte: new Date(), lte: fifteenDaysFromNow },
        status: { in: ['pending', 'scheduled'] },
      },
      include: {
        familyMember: { select: { id: true, fullName: true } },
        services: { select: { serviceName: true } },
      },
      orderBy: { expirationDate: 'asc' },
    });
  }

  private async getPendingToSchedule(memberIds: string[]) {
    return this.prisma.authorization.findMany({
      where: {
        familyMemberId: { in: memberIds },
        status: 'pending',
      },
      include: {
        familyMember: { select: { id: true, fullName: true } },
        services: { select: { serviceName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getUpcomingAppointments(memberIds: string[]) {
    return this.prisma.appointment.findMany({
      where: {
        familyMemberId: { in: memberIds },
        appointmentDate: { gte: new Date() },
        status: { in: ['scheduled', 'confirmed'] },
      },
      include: {
        familyMember: { select: { id: true, fullName: true } },
        authorization: { select: { id: true, diagnosisDescription: true } },
      },
      orderBy: { appointmentDate: 'asc' },
      take: 5,
    });
  }

  private async getFamilyMembersSummary(userId: string, memberIds: string[]) {
    const members = await this.prisma.familyMember.findMany({
      where: { userId },
      select: {
        id: true,
        fullName: true,
        epsProvider: { select: { name: true } },
      },
    });

    const [pendingCounts, nextAppointments] = await Promise.all([
      this.prisma.authorization.groupBy({
        by: ['familyMemberId'],
        where: {
          familyMemberId: { in: memberIds },
          status: 'pending',
        },
        _count: true,
      }),
      this.prisma.appointment.findMany({
        where: {
          familyMemberId: { in: memberIds },
          appointmentDate: { gte: new Date() },
          status: { in: ['scheduled', 'confirmed'] },
        },
        orderBy: { appointmentDate: 'asc' },
        distinct: ['familyMemberId'],
        select: { familyMemberId: true, appointmentDate: true },
      }),
    ]);

    const pendingMap = new Map(
      pendingCounts.map((p) => [p.familyMemberId, p._count]),
    );

    const appointmentMap = new Map(
      nextAppointments.map((a) => [a.familyMemberId, a.appointmentDate]),
    );

    return members.map((member) => ({
      id: member.id,
      name: member.fullName,
      epsName: member.epsProvider?.name ?? null,
      pendingCount: pendingMap.get(member.id) ?? 0,
      nextAppointment: appointmentMap.get(member.id)?.toISOString() ?? null,
    }));
  }

  private emptySummary() {
    return {
      urgent: { count: 0, items: [] },
      expiringSoon: { count: 0, items: [] },
      pendingToSchedule: { count: 0, items: [] },
      upcomingAppointments: { count: 0, items: [] },
      familyMembers: [],
    };
  }
}
