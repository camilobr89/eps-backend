import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { EpsProvidersModule } from './modules/eps-providers/eps-providers.module';
import { FamilyMembersModule } from './modules/family-members/family-members.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    EpsProvidersModule,
    FamilyMembersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
