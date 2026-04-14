import { Injectable, Logger } from '@nestjs/common';
import { OrdenDireccionamiento } from '../../../common/interfaces/orden-direccionamiento.interface';
import { IEPSParser } from './parser.interface';

export interface ParseResult {
  data: Partial<OrdenDireccionamiento>;
  confidence: number;
  parserUsed: string;
}

@Injectable()
export class EPSParserRegistry {
  private readonly logger = new Logger(EPSParserRegistry.name);
  private readonly parsers: IEPSParser[] = [];
  private genericParser: IEPSParser | null = null;

  register(parser: IEPSParser): void {
    if (parser.epsIdentifier === 'generic') {
      this.genericParser = parser;
    } else {
      this.parsers.push(parser);
    }

    this.logger.log(`Registered parser: ${parser.epsIdentifier}`);
  }

  parseDocument(rawText: string): ParseResult {
    this.logger.log(
      `parseDocument called with ${rawText.length} chars, sample: ${rawText.substring(0, 100).replace(/\n/g, ' ')}`,
    );
    // Intentar parsers específicos
    const specificParser = this.parsers.find((p) => p.canParse(rawText));

    if (specificParser) {
      this.logger.log(`Using parser: ${specificParser.epsIdentifier}`);
      const data = specificParser.parse(rawText);
      const confidence = specificParser.confidence(data);

      return {
        data,
        confidence,
        parserUsed: specificParser.epsIdentifier,
      };
    }

    // Fallback al parser genérico
    if (this.genericParser) {
      this.logger.log('No specific parser found, using generic parser');
      const data = this.genericParser.parse(rawText);
      const confidence = this.genericParser.confidence(data);

      return {
        data,
        confidence,
        parserUsed: 'generic',
      };
    }

    this.logger.warn('No parsers available');
    return { data: {}, confidence: 0, parserUsed: 'none' };
  }
}
