import { GenericParser } from '@/workers/ocr/parsers/generic.parser';

describe('GenericParser', () => {
  let parser: GenericParser;

  beforeEach(() => {
    parser = new GenericParser();
  });

  it('should have correct epsIdentifier', () => {
    expect(parser.epsIdentifier).toBe('generic');
  });

  describe('canParse', () => {
    it('should always return true', () => {
      expect(parser.canParse('any text')).toBe(true);
      expect(parser.canParse('')).toBe(true);
    });
  });

  describe('parse', () => {
    it('should detect tipo documento from text', () => {
      expect(parser.parse('orden de direccionamiento').tipoDocumento).toBe(
        'orden_direccionamiento',
      );
      expect(parser.parse('formula medica').tipoDocumento).toBe(
        'formula_medica',
      );
      expect(parser.parse('laboratorio clínico').tipoDocumento).toBe(
        'orden_laboratorio',
      );
      expect(parser.parse('autorización de servicio').tipoDocumento).toBe(
        'autorizacion',
      );
    });

    it('should extract CIE-10 codes', () => {
      const result = parser.parse('Diagnóstico principal: M54.5 - Lumbago');
      expect(result.diagnosticoCIE10).toBe('M54.5');
    });

    it('should extract CIE-10 without decimal', () => {
      const result = parser.parse('Código CIE: J45 Asma');
      expect(result.diagnosticoCIE10).toBe('J45');
    });

    it('should extract document number', () => {
      const result = parser.parse('Documento: 35488011\nNombre: ELVIA');
      expect(result.pacienteDocumentoNumero).toBe('35488011');
    });

    it('should extract colombian date format', () => {
      const result = parser.parse('Fecha: 24 Feb 2026\nOtro texto');
      expect(result.fechaHoraEmision).toBeInstanceOf(Date);
      if (result.fechaHoraEmision) {
        expect(result.fechaHoraEmision.getFullYear()).toBe(2026);
        expect(result.fechaHoraEmision.getMonth()).toBe(1); // Feb = 1
        expect(result.fechaHoraEmision.getDate()).toBe(24);
      }
    });

    it('should extract slash date format', () => {
      const result = parser.parse('Fecha: 15/03/2026\nTexto');
      expect(result.fechaHoraEmision).toBeInstanceOf(Date);
      if (result.fechaHoraEmision) {
        expect(result.fechaHoraEmision.getFullYear()).toBe(2026);
        expect(result.fechaHoraEmision.getMonth()).toBe(2); // Mar = 2
      }
    });

    it('should extract date near vencimiento keyword', () => {
      const result = parser.parse('Fecha Vencimiento: 24 May 2026');
      expect(result.fechaVencimiento).toBeInstanceOf(Date);
      if (result.fechaVencimiento) {
        expect(result.fechaVencimiento.getMonth()).toBe(4); // May = 4
      }
    });

    it('should return empty fields for unrecognizable text', () => {
      const result = parser.parse('random gibberish text');
      expect(result.pacienteDocumentoNumero).toBe('');
      expect(result.diagnosticoCIE10).toBe('');
    });
  });

  describe('confidence', () => {
    it('should return high confidence with many fields', () => {
      const result = {
        epsNombre: 'Nueva EPS',
        pacienteNombre: 'JUAN PEREZ',
        pacienteDocumentoNumero: '12345678',
        diagnosticoCIE10: 'M54.5',
        fechaVencimiento: new Date(),
        servicios: [{ codigo: '1234567890', cantidad: 1, nombre: 'Consulta' }],
      };

      const conf = parser.confidence(result);
      expect(conf).toBe(1);
    });

    it('should return 0 when no fields are filled', () => {
      const conf = parser.confidence({});
      expect(conf).toBe(0);
    });
  });
});
