import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './worker-app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('OCR-Worker');

  const app = await NestFactory.createApplicationContext(WorkerAppModule);

  logger.log('OCR Worker is running and listening for jobs...');

  process.on('SIGTERM', () => {
    logger.log('SIGTERM received. Shutting down...');
    void app.close().then(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    logger.log('SIGINT received. Shutting down...');
    void app.close().then(() => process.exit(0));
  });
}

void bootstrap();
