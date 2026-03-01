import { EPSParserRegistry } from '@/workers/ocr/parsers/parser.registry';
import { IEPSParser } from '@/workers/ocr/parsers/parser.interface';

const createMockParser = (
  identifier: string,
  canParseResult: boolean,
): IEPSParser => ({
  epsIdentifier: identifier,
  canParse: jest.fn().mockReturnValue(canParseResult),
  parse: jest.fn().mockReturnValue({
    epsNombre: `Mock ${identifier}`,
    diagnosticoCIE10: 'M54.5',
  }),
  confidence: jest.fn().mockReturnValue(0.8),
});

describe('EPSParserRegistry', () => {
  let registry: EPSParserRegistry;

  beforeEach(() => {
    registry = new EPSParserRegistry();
  });

  it('should be defined', () => {
    expect(registry).toBeDefined();
  });

  describe('register', () => {
    it('should register specific parser', () => {
      const parser = createMockParser('salud_total', true);
      registry.register(parser);

      const result = registry.parseDocument('Salud Total text');
      expect(result.parserUsed).toBe('salud_total');
    });

    it('should register generic parser separately', () => {
      const generic = createMockParser('generic', true);
      registry.register(generic);

      const result = registry.parseDocument('any text');
      expect(result.parserUsed).toBe('generic');
    });
  });

  describe('parseDocument', () => {
    it('should use specific parser when canParse returns true', () => {
      const saludTotal = createMockParser('salud_total', true);
      const generic = createMockParser('generic', true);

      registry.register(saludTotal);
      registry.register(generic);

      const result = registry.parseDocument('Salud Total EPS');

      expect(saludTotal.canParse).toHaveBeenCalledWith('Salud Total EPS');
      expect(saludTotal.parse).toHaveBeenCalledWith('Salud Total EPS');
      expect(result.parserUsed).toBe('salud_total');
      expect(result.confidence).toBe(0.8);
    });

    it('should fallback to generic when no specific parser matches', () => {
      const saludTotal = createMockParser('salud_total', false);
      const generic = createMockParser('generic', true);

      registry.register(saludTotal);
      registry.register(generic);

      const result = registry.parseDocument('Unknown EPS text');

      expect(saludTotal.canParse).toHaveBeenCalled();
      expect(saludTotal.parse).not.toHaveBeenCalled();
      expect(generic.parse).toHaveBeenCalledWith('Unknown EPS text');
      expect(result.parserUsed).toBe('generic');
    });

    it('should return empty result when no parsers registered', () => {
      const result = registry.parseDocument('any text');

      expect(result.data).toEqual({});
      expect(result.confidence).toBe(0);
      expect(result.parserUsed).toBe('none');
    });

    it('should try parsers in registration order', () => {
      const parser1 = createMockParser('eps_1', false);
      const parser2 = createMockParser('eps_2', true);
      const parser3 = createMockParser('eps_3', true);

      registry.register(parser1);
      registry.register(parser2);
      registry.register(parser3);

      const result = registry.parseDocument('some text');

      expect(parser1.canParse).toHaveBeenCalled();
      expect(parser2.canParse).toHaveBeenCalled();
      expect(parser3.canParse).not.toHaveBeenCalled();
      expect(result.parserUsed).toBe('eps_2');
    });
  });
});