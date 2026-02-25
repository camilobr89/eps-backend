import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { MinioModule } from './modules/minio/minio.module';
import { OcrModule } from './workers/ocr/ocr.module';

@Module({
  imports: [
    PrismaModule,
    MinioModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    OcrModule,
  ],
})
export class WorkerAppModule {}
