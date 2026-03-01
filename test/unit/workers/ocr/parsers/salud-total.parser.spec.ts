import { SaludTotalParser } from '@/workers/ocr/parsers/salud-total.parser';

describe('SaludTotalParser', () => {
  let parser: SaludTotalParser;

  beforeEach(() => {
    parser = new SaludTotalParser();
  });

  it('should have correct epsIdentifier', () => {
    expect(parser.epsIdentifier).toBe('salud_total');
  });

  describe('canParse', () => {
    it('should return true when text contains "Salud Total"', () => {
      expect(parser.canParse('Nombre: Salud Total EPS - Virrey Solis')).toBe(true);
    });

    it('should return true when text contains "SaludTotal"', () => {
      expect(parser.canParse('SaludTotal\nMEDICAMENTOS')).toBe(true);
    });

    it('should return true when text contains "Virrey Sol"', () => {
      expect(parser.canParse('IPS Virrey Solis Bogota')).toBe(true);
    });

    it('should return false for unrelated text', () => {
      expect(parser.canParse('Nueva EPS - Orden de servicio')).toBe(false);
    });
  });

  describe('parse', () => {
    const sampleText = `DIRECCIONAMIENTO MEDICAMENTOS POR UTILIZAR EN LA IPS Pagina 1
No. Orden de Direccionamiento: Direccionado sin utilizar Fecha y Hora: 24 Feb 2026 10:17
ENTIDAD RESPONSABLE DEL PAGO
Nombre: Salud Total EPS - Virrey Solis Código: EPS002
INFORMACION DEL PRESTADOR
Nombre: AUDIFARMA BOGOTA Nit: 816001182 Código: 5659
Dirección: AUDIFARMÁ S.A Teléfono: 5874700
Departamento: (11) BOGOTA Municipio: (001) Bogota
DATOS DEL PACIENTE
Tipo Documento: Cedula de Ciudadania Documento: 35488011
Nombre: ELVIA MARIA SALINAS TENORIO Fecha de Nacimiento: 22 Jul 1955
Dirección: CR 14L 92C 58 SUR Teléfono: 0
DATOS DE LA TRANSACCION
Tipo: Llamar a solicitar Direccionamiento (DP) Régimen: Contributivo - CAPITADO
Motivo: CN Fecha Vencimiento: 24 May 2026
Diagnóstico: E78.5
Ubicación del Paciente: Consulta Externa No. Solicitud: 02242026025853
Origen del servicio: Enfermedad general
Tipo de Recaudo: Sin Cobro Valor: 0
Semanas Cotizadas: 53`;

    it('should detect tipo documento as orden_direccionamiento', () => {
      const result = parser.parse(sampleText);
      expect(result.tipoDocumento).toBe('orden_direccionamiento');
    });

    it('should extract EPS nombre', () => {
      const result = parser.parse(sampleText);
      expect(result.epsNombre).toContain('Salud Total');
    });

    it('should extract EPS codigo', () => {
      const result = parser.parse(sampleText);
      expect(result.epsCodigo).toBe('EPS002');
    });

    it('should extract diagnostico CIE10', () => {
      const result = parser.parse(sampleText);
      expect(result.diagnosticoCIE10).toBe('E78.5');
    });

    it('should extract paciente documento numero', () => {
      const result = parser.parse(sampleText);
      expect(result.pacienteDocumentoNumero).toBe('35488011');
    });

    it('should extract prestador NIT', () => {
      const result = parser.parse(sampleText);
      expect(result.prestadorNit).toBe('816001182');
    });

    it('should extract semanas cotizadas', () => {
      const result = parser.parse(sampleText);
      expect(result.semanasCotizadas).toBe(53);
    });

    it('should extract fecha vencimiento', () => {
      const result = parser.parse(sampleText);
      expect(result.fechaVencimiento).toBeInstanceOf(Date);
      if (result.fechaVencimiento) {
        expect(result.fechaVencimiento.getFullYear()).toBe(2026);
        expect(result.fechaVencimiento.getMonth()).toBe(4); // May = 4
      }
    });

    it('should extract tipo recaudo', () => {
      const result = parser.parse(sampleText);
      expect(result.tipoRecaudo).toBe('Sin Cobro');
    });
  });

  describe('confidence', () => {
    it('should return high confidence when most fields are filled', () => {
      const result = {
        numeroSolicitud: '02242026025853',
        epsNombre: 'Salud Total EPS',
        pacienteNombre: 'ELVIA MARIA SALINAS',
        pacienteDocumentoNumero: '35488011',
        prestadorNombre: 'AUDIFARMA',
        diagnosticoCIE10: 'E78.5',
        fechaVencimiento: new Date(),
        regimen: 'Contributivo',
        servicios: [{ codigo: '1306', cantidad: 30, nombre: 'LOSARTAN' }],
        ubicacionPaciente: 'Consulta Externa',
      };

      const conf = parser.confidence(result);
      expect(conf).toBe(1);
    });

    it('should return low confidence when few fields are filled', () => {
      const result = {
        epsNombre: 'Salud Total',
      };

      const conf = parser.confidence(result);
      expect(conf).toBeLessThan(0.5);
    });

    it('should return 0 when no fields are filled', () => {
      const conf = parser.confidence({});
      expect(conf).toBe(0);
    });
  });
});