import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OcrProcessor } from './ocr.processor';
import { TesseractService } from './services/tesseract.service';
import { EPSParserRegistry } from './parsers/parser.registry';
import { SaludTotalParser } from './parsers/salud-total.parser';
import { GenericParser } from './parsers/generic.parser';

@Module({
  imports: [BullModule.registerQueue({ name: 'ocr-jobs' })],
  providers: [OcrProcessor, TesseractService, EPSParserRegistry],
})
export class OcrModule implements OnModuleInit {
  private readonly logger = new Logger(OcrModule.name);

  constructor(private readonly parserRegistry: EPSParserRegistry) {}

  onModuleInit() {
    this.logger.log('OcrModule initializing, registering parsers...');
    this.parserRegistry.register(new SaludTotalParser());
    this.parserRegistry.register(new GenericParser());
    this.logger.log('OcrModule initialization complete');
  }
}
