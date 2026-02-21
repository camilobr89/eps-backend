import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EpsProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.epsProvider.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const eps = await this.prisma.epsProvider.findUnique({
      where: { id },
    });

    if (!eps) {
      throw new NotFoundException('EPS provider not found');
    }

    return eps;
  }
}