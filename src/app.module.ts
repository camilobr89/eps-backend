import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { EpsProvidersModule } from './modules/eps-providers/eps-providers.module';
import { FamilyMembersModule } from './modules/family-members/family-members.module';
import { AuthorizationsModule } from './modules/authorizations/authorizations.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { MinioModule } from './modules/minio/minio.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    MinioModule,
    HealthModule,
    AuthModule,
    EpsProvidersModule,
    FamilyMembersModule,
    AuthorizationsModule,
    AppointmentsModule,
    DashboardModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
