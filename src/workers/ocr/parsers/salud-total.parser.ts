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
        /No\.\s*(?:Solicitud|Orden)[^:]{0,200}:\s*(\S+)/i,
      ),
      fechaHoraEmision: this.extractDate(
        rawText,
        /Fecha\s*(?:y\s*Hora)?[^:]{0,200}:\s*(.+?)(?:\n|$)/i,
      ),
      fechaVencimiento: this.extractDate(
        rawText,
        /(?:Fecha\s*)?Vencimiento[^:]{0,200}:\s*(.+?)(?:\n|$)/i,
      ),
      epsNombre: this.extractEpsNombre(rawText),
      epsCodigo:
        this.extractField(rawText, /C[oó]digo[^:]{0,200}:\s*(EPS\d+)/i) ?? '',
      pacienteNombre: this.extractField(
        rawText,
        /Nombre[^:]{0,200}:\s*([A-ZÁÉÍÓÚÑ\s]+?)(?:\s*"|\s*Fecha|\n)/i,
      ),
      pacienteDocumentoTipo: this.extractField(
        rawText,
        /Tipo\s*Documento[^:]{0,200}:\s*(.+?)(?:\s+Documento:|\n)/i,
      ),
      pacienteDocumentoNumero: this.extractField(
        rawText,
        /(?:Tipo\s*Documento[^:]{0,200}:[^:]{0,200})?Documento[^:]{0,200}:\s*(\d+)/i,
      ),
      prestadorNombre: this.extractPrestador(
        rawText,
        /(?:INFORMACION DEL PRESTADOR|PRESTADOR)\s*\n?\s*Nombre[^:]{0,200}:\s*(.+?)(?:\s+Nit|\n)/i,
      ),
      prestadorNit: this.extractField(rawText, /Nit[^:]{0,200}:\s*(\d+)/i),
      prestadorCodigo: this.extractField(
        rawText,
        /(?:Nit[^:]{0,200}:\s*\d+\s+)?C[oó]digo[^:]{0,200}:\s*(\d+)/i,
      ),
      prestadorDireccion: this.extractField(
        rawText,
        /Direcci[oó]n[^:]{0,200}:\s*(.+?)(?:\s+Tel[eé]fono|\n)/i,
      ),
      prestadorTelefono: this.extractField(
        rawText,
        /Tel[eé]fono[^:]{0,200}:\s*(\d+)/i,
      ),
      regimen: this.extractField(
        rawText,
        /R[eé]gimen[^:]{0,200}:\s*(.+?)(?:\n|$)/i,
      ),
      diagnosticoCIE10: this.extractDiagnostico(rawText),
      ubicacionPaciente: this.extractField(
        rawText,
        /Ubicaci[oó]n\s*(?:del\s*)?Paciente[^:]{0,200}:\s*(.+?)(?:\n|$)/i,
      ),
      origenServicio: this.extractField(
        rawText,
        /Origen\s*(?:del\s*)?[Ss]ervicio[^:]{0,200}:\s*(.+?)(?:\n|$)/i,
      ),
      servicios: this.extractServicios(rawText),
      tipoRecaudo: this.extractField(
        rawText,
        /Tipo\s*(?:de\s*)?Recaudo[^:]{0,200}:\s*(.+?)(?:\s+Valor|\n|$)/i,
      ),
      copago: this.extractNumber(
        rawText,
        /(?:Valor|Copago)[^:]{0,200}:\s*(\d[\d.,]*)/i,
      ),
      porcentaje: this.extractNumber(
        rawText,
        /Porcentaje[^:]{0,200}:\s*(\d+)/i,
      ),
      valorMaximo: this.extractNumber(
        rawText,
        /(?:Valor\s*)?M[aá]ximo[^:]{0,200}:\s*(\d[\d.,]*)/i,
      ),
      semanasCotizadas: this.extractNumber(
        rawText,
        /Semanas\s*Cotizadas[^:]{0,200}:\s*(\d+)/i,
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
    const match = text.match(/Nombre[^:]{0,200}:\s*(Salud Total[^\n]*)/i);
    return match?.[1]?.trim() ?? 'Salud Total EPS';
  }

  private extractPrestador(text: string, regex: RegExp): string {
    const match = text.match(regex);
    return match?.[1]?.trim() ?? '';
  }

  private extractDiagnostico(text: string): string {
    // Buscar patrón CIE-10: letra + números con punto opcional
    const match = text.match(
      /Diagn[oó]stico[^:]{0,200}:\s*(?:.*?)([A-Z]\d{2}\.?\d*)/i,
    );
    return match?.[1] ?? '';
  }

  private extractServicios(text: string): ServicioDireccionado[] {
    const servicios: ServicioDireccionado[] = [];

    // Patrón: código numérico largo + cantidad + descripción
    // Ejemplo: "8614010000 1 INFILTRACION INTRALESIONAL..."
    // Ejemplo: "1306 30 (treinta) MEDICAMENTOS - LOSARTAN..."
    const regex =
      /(\d{4,10})\s+(\d+)\s+(?:\([^)]+\)\s+)?(.+?)(?=\n\d{4,10}\s|\nTipo\s|$)/gi;
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
      const cupsRegex = /(\d{10})\s+(\d+)\s+(.+?)(?:\n|$)/gi;
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
      /(\d{1,2})\s+(\w{3})\s+(\d{4})(?:\s+(\d{1,2})[:\s](\d{2}))?/i,
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
