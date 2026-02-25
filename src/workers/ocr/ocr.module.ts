import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OcrProcessor } from './ocr.processor';
import { TesseractService } from './services/tesseract.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'ocr-jobs' })],
  providers: [OcrProcessor, TesseractService],
})
export class OcrModule {}
