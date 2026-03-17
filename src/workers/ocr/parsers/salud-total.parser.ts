import {
  OrdenDireccionamiento,
  ServicioDireccionado,
} from '../../../common/interfaces/orden-direccionamiento.interface';
import { IEPSParser } from './parser.interface';

export class SaludTotalParser implements IEPSParser {
  epsIdentifier = 'salud_total';

  canParse(rawText: string): boolean {
    const text = rawText.toLowerCase();
    return (
      text.includes('salud total') ||
      text.includes('saludtotal') ||
      text.includes('virrey sol')
    );
  }

  parse(rawText: string): Partial<OrdenDireccionamiento> {
    return {
      tipoDocumento: this.extractTipoDocumento(rawText),
      numeroSolicitud: this.extractField(
        rawText,
        /No\.\s{0,20}(?:Solicitud|Orden)[^:]{0,200}:\s{0,20}(\S+)/i,
      ),
      fechaHoraEmision: this.extractDate(
        rawText,
        /Fecha\s{0,20}(?:y\s{0,20}Hora)?[^:]{0,200}:\s{0,20}([^\n]{1,200})(?:\n|$)/i,
      ),
      fechaVencimiento: this.extractDate(
        rawText,
        /(?:Fecha\s{0,20})?Vencimiento[^:]{0,200}:\s{0,20}([^\n]{1,200})(?:\n|$)/i,
      ),
      epsNombre: this.extractEpsNombre(rawText),
      epsCodigo:
        this.extractField(rawText, /C[oó]digo[^:]{0,200}:\s{0,20}(EPS\d+)/i) ??
        '',
      pacienteNombre: this.extractField(
        rawText,
        /Nombre[^:]{0,200}:\s{0,20}([A-ZÁÉÍÓÚÑ\s]{1,200})(?:\s{0,20}"|\s{0,20}Fecha|\n)/i,
      ),
      pacienteDocumentoTipo: this.extractField(
        rawText,
        /Tipo\s{0,20}Documento[^:]{0,200}:\s{0,20}([^\n]{1,200})(?:\s{1,20}Documento:|\n)/i,
      ),
      pacienteDocumentoNumero: this.extractField(
        rawText,
        /(?:Tipo\s{0,20}Documento[^:]{0,200}:[^:]{0,200})?Documento[^:]{0,200}:\s{0,20}(\d{1,20})/i,
      ),
      prestadorNombre: this.extractPrestador(
        rawText,
        /(?:INFORMACION DEL PRESTADOR|PRESTADOR)\s{0,20}\n?\s{0,20}Nombre[^:]{0,200}:\s{0,20}([^\n]{1,200})(?:\s{1,20}Nit|\n)/i,
      ),
      prestadorNit: this.extractField(
        rawText,
        /Nit[^:]{0,200}:\s{0,20}(\d{1,20})/i,
      ),
      prestadorCodigo: this.extractField(
        rawText,
        /(?:Nit[^:]{0,200}:\s{0,20}\d{1,20}\s{1,20})?C[oó]digo[^:]{0,200}:\s{0,20}(\d{1,20})/i,
      ),
      prestadorDireccion: this.extractField(
        rawText,
        /Direcci[oó]n[^:]{0,200}:\s{0,20}([^\n]{1,200})(?:\s{1,20}Tel[eé]fono|\n)/i,
      ),
      prestadorTelefono: this.extractField(
        rawText,
        /Tel[eé]fono[^:]{0,200}:\s{0,20}(\d{1,20})/i,
      ),
      regimen: this.extractField(
        rawText,
        /R[eé]gimen[^:]{0,200}:\s{0,20}([^\n]{1,200})(?:\n|$)/i,
      ),
      diagnosticoCIE10: this.extractDiagnostico(rawText),
      ubicacionPaciente: this.extractField(
        rawText,
        /Ubicaci[oó]n\s{0,20}(?:del\s{0,20})?Paciente[^:]{0,200}:\s{0,20}([^\n]{1,200})(?:\n|$)/i,
      ),
      origenServicio: this.extractField(
        rawText,
        /Origen\s{0,20}(?:del\s{0,20})?[Ss]ervicio[^:]{0,200}:\s{0,20}([^\n]{1,200})(?:\n|$)/i,
      ),
      servicios: this.extractServicios(rawText),
      tipoRecaudo: this.extractField(
        rawText,
        /Tipo\s{0,20}(?:de\s{0,20})?Recaudo[^:]{0,200}:\s{0,20}([^\n]{1,200}?)(?:\s{1,20}Valor|\n|$)/i,
      ),
      copago: this.extractNumber(
        rawText,
        /(?:Valor|Copago)[^:]{0,200}:\s{0,20}(\d[\d.,]{0,50})/i,
      ),
      porcentaje: this.extractNumber(
        rawText,
        /Porcentaje[^:]{0,200}:\s{0,20}(\d{1,20})/i,
      ),
      valorMaximo: this.extractNumber(
        rawText,
        /(?:Valor\s{0,20})?M[aá]ximo[^:]{0,200}:\s{0,20}(\d[\d.,]{0,50})/i,
      ),
      semanasCotizadas: this.extractNumber(
        rawText,
        /Semanas\s{0,20}Cotizadas[^:]{0,200}:\s{0,20}(\d{1,20})/i,
      ),
    };
  }

  confidence(result: Partial<OrdenDireccionamiento>): number {
    const fields = [
      result.numeroSolicitud,
      result.epsNombre,
      result.pacienteNombre,
      result.pacienteDocumentoNumero,
      result.prestadorNombre,
      result.diagnosticoCIE10,
      result.fechaVencimiento,
      result.regimen,
      result.servicios?.length ? result.servicios : null,
      result.ubicacionPaciente,
    ];

    const filled = fields.filter(
      (f) => f !== null && f !== undefined && f !== '',
    ).length;
    return Math.round((filled / fields.length) * 100) / 100;
  }

  // --- Métodos privados ---

  private extractTipoDocumento(
    text: string,
  ): OrdenDireccionamiento['tipoDocumento'] {
    const lower = text.toLowerCase();
    if (lower.includes('direccionamiento')) return 'orden_direccionamiento';
    if (lower.includes('formula') || lower.includes('fórmula'))
      return 'formula_medica';
    if (lower.includes('laboratorio')) return 'orden_laboratorio';
    return 'autorizacion';
  }

  private extractEpsNombre(text: string): string {
    const match = text.match(
      /Nombre[^:]{0,200}:\s{0,20}(Salud Total[^\n]{0,200})/i,
    );
    return match?.[1]?.trim() ?? 'Salud Total EPS';
  }

  private extractPrestador(text: string, regex: RegExp): string {
    const match = text.match(regex);
    return match?.[1]?.trim() ?? '';
  }

  private extractDiagnostico(text: string): string {
    // Buscar patrón CIE-10: letra + números con punto opcional
    const match = text.match(
      /Diagn[oó]stico[^:]{0,200}:\s{0,20}(?:[^\n]{0,200})([A-Z]\d{2}\.?\d{0,5})/i,
    );
    return match?.[1] ?? '';
  }

  private extractServicios(text: string): ServicioDireccionado[] {
    const servicios: ServicioDireccionado[] = [];

    // Patrón: código numérico largo + cantidad + descripción
    // Ejemplo: "8614010000 1 INFILTRACION INTRALESIONAL..."
    // Ejemplo: "1306 30 (treinta) MEDICAMENTOS - LOSARTAN..."
    const regex =
      /(\d{4,10})\s{1,20}(\d+)\s{1,20}(?:\([^)]{1,200}\)\s{1,20})?([^\n]{1,200})(?=\n\d{4,10}\s{1,20}|\nTipo\s{1,20}|$)/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      servicios.push({
        codigo: match[1],
        cantidad: parseInt(match[2], 10),
        nombre: match[3].trim().substring(0, 200),
      });
    }

    // Alternativa: buscar código CUPS (10 dígitos)
    if (servicios.length === 0) {
      const cupsRegex = /(\d{10})\s{1,20}(\d+)\s{1,20}([^\n]{1,200})(?:\n|$)/gi;
      while ((match = cupsRegex.exec(text)) !== null) {
        servicios.push({
          codigo: match[1],
          cantidad: parseInt(match[2], 10),
          nombre: match[3].trim().substring(0, 200),
        });
      }
    }

    return servicios;
  }

  private extractField(text: string, regex: RegExp): string {
    const match = text.match(regex);
    return match?.[1]?.trim() ?? '';
  }

  private extractDate(text: string, regex: RegExp): Date | null {
    const match = text.match(regex);
    if (!match?.[1]) return null;

    const dateStr = match[1].trim();
    return this.parseColombianDate(dateStr);
  }

  private parseColombianDate(dateStr: string): Date | null {
    const months: Record<string, number> = {
      ene: 0,
      feb: 1,
      mar: 2,
      abr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      ago: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dic: 11,
    };

    // Formato: "24 Feb 2026 10:17" o "24 Feb 2026"
    const match = dateStr.match(
      /(\d{1,2})\s{1,20}(\w{3})\s{1,20}(\d{4})(?:\s{1,20}(\d{1,2})[:\s](\d{2}))?/i,
    );
    if (match) {
      const month = months[match[2].toLowerCase().substring(0, 3)];
      if (month !== undefined) {
        return new Date(
          parseInt(match[3]),
          month,
          parseInt(match[1]),
          parseInt(match[4] ?? '0'),
          parseInt(match[5] ?? '0'),
        );
      }
    }

    // Formato: DD/MM/YYYY
    const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      return new Date(
        parseInt(slashMatch[3]),
        parseInt(slashMatch[2]) - 1,
        parseInt(slashMatch[1]),
      );
    }

    return null;
  }

  private extractNumber(text: string, regex: RegExp): number {
    const match = text.match(regex);
    if (!match?.[1]) return 0;
    return parseFloat(match[1].replace(/,/g, '')) || 0;
  }
}
