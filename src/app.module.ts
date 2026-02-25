import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { MinioModule } from './modules/minio/minio.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { EpsProvidersModule } from './modules/eps-providers/eps-providers.module';
import { FamilyMembersModule } from './modules/family-members/family-members.module';
import { AuthorizationsModule } from './modules/authorizations/authorizations.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DocumentsModule } from './modules/documents/documents.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    MinioModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    HealthModule,
    AuthModule,
    EpsProvidersModule,
    FamilyMembersModule,
    AuthorizationsModule,
    AppointmentsModule,
    DashboardModule,
    DocumentsModule,
  ],
})
export class AppModule {}
