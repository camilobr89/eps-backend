import {
  OrdenDireccionamiento,
  ServicioDireccionado,
} from '../../../common/interfaces/orden-direccionamiento.interface';
import { IEPSParser } from './parser.interface';

export class GenericParser implements IEPSParser {
  epsIdentifier = 'generic';

  canParse(rawText: string): boolean {
    return rawText.length >= 0;
  }

  parse(rawText: string): Partial<OrdenDireccionamiento> {
    return {
      tipoDocumento: this.detectTipoDocumento(rawText),
      numeroSolicitud: this.extractLongNumber(
        rawText,
        /(?:solicitud|orden|n[úu]mero)\s*:\s*(\d{8,})/i,
      ),
      fechaHoraEmision: this.extractAnyDate(rawText),
      fechaVencimiento: this.extractDateNear(rawText, /vencimiento/i),
      epsNombre: this.extractEpsNombre(rawText),
      epsCodigo: this.extractField(
        rawText,
        /C[oó]digo\s*:\s*(EPS\d+|\d{3,6})/i,
      ),
      pacienteNombre: this.extractPatientName(rawText),
      pacienteDocumentoTipo: this.extractField(
        rawText,
        /Tipo\s*(?:de\s*)?Documento\s*:\s*([^\n]{1,50})/i,
      ),
      pacienteDocumentoNumero: this.extractDocumentNumber(rawText),
      prestadorNombre: this.extractField(
        rawText,
        /(?:prestador|ips)\s*nombre\s*:\s*([^\n]{1,100})/i,
      ),
      prestadorNit: this.extractField(rawText, /Nit\s*:\s*(\d{6,})/i),
      prestadorCodigo: '',
      prestadorDireccion: '',
      prestadorTelefono: '',
      regimen: this.extractField(rawText, /R[eé]gimen\s*:\s*([^\n]{1,100})/i),
      diagnosticoCIE10: this.extractCIE10(rawText),
      ubicacionPaciente: this.extractField(
        rawText,
        /ubicaci[oó]n\s*:\s*([^\n]{1,50})/i,
      ),
      origenServicio: this.extractField(rawText, /origen\s*:\s*([^\n]{1,50})/i),
      servicios: this.extractServicios(rawText),
      tipoRecaudo: this.extractField(
        rawText,
        /(?:recaudo|copago|cuota)\s*:\s*([^\n]{1,50})/i,
      ),
      copago: this.extractMoney(
        rawText,
        /(?:valor|copago|cuota)\s*:\s*\$?(\d[\d.,]{0,20})/i,
      ),
      porcentaje: 0,
      valorMaximo: 0,
      semanasCotizadas: 0,
    };
  }

  confidence(result: Partial<OrdenDireccionamiento>): number {
    const fields = [
      result.epsNombre,
      result.pacienteNombre,
      result.pacienteDocumentoNumero,
      result.diagnosticoCIE10,
      result.fechaVencimiento,
      result.servicios?.length ? result.servicios : null,
    ];

    const filled = fields.filter(
      (f) => f !== null && f !== undefined && f !== '',
    ).length;
    return Math.round((filled / fields.length) * 100) / 100;
  }

  // --- Métodos privados ---

  private detectTipoDocumento(
    text: string,
  ): OrdenDireccionamiento['tipoDocumento'] {
    const lower = text.toLowerCase();
    if (lower.includes('direccionamiento')) return 'orden_direccionamiento';
    if (lower.includes('formula') || lower.includes('fórmula'))
      return 'formula_medica';
    if (lower.includes('laboratorio')) return 'orden_laboratorio';
    return 'autorizacion';
  }

  private extractPatientName(text: string): string {
    // Buscar nombres en mayúsculas (patrón común en documentos colombianos)
    const match = text.match(
      /(?:Nombre|Paciente)[^:]{0,200}:\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,})/i,
    );
    return match?.[1]?.trim() ?? '';
  }

  private extractEpsNombre(text: string): string {
    const match = text.match(/(?:entidad|eps|nombre)\s*:\s*([^\n]{1,100})/i);
    if (!match?.[1]) return '';
    const raw = match[1];
    const codigoIdx = raw.search(/C[oó]digo/i);
    return codigoIdx > 0 ? raw.substring(0, codigoIdx).trim() : raw.trim();
  }

  private extractDocumentNumber(text: string): string {
    // Buscar número de documento cerca de "Documento:" o "CC" o "TI"
    const match = text.match(
      /(?:Documento|CC|C\.C\.|TI)[^:]{0,200}:\s*(\d{5,12})/i,
    );
    return match?.[1] ?? '';
  }

  private extractCIE10(text: string): string {
    // Patrón CIE-10: letra mayúscula + 2-3 dígitos + punto opcional + dígitos
    const match = text.match(/[A-Z]\d{2}\.?\d{0,2}/);
    return match?.[0] ?? '';
  }

  private extractServicios(text: string): ServicioDireccionado[] {
    const servicios: ServicioDireccionado[] = [];

    // Código CUPS: 10 dígitos
    const cupsRegex = /(\d{10})\s+(\d+)\s+(.+?)(?:\n|$)/gi;
    let match: RegExpExecArray | null;
    while ((match = cupsRegex.exec(text)) !== null) {
      servicios.push({
        codigo: match[1],
        cantidad: parseInt(match[2], 10),
        nombre: match[3].trim().substring(0, 200),
      });
    }

    return servicios;
  }

  private extractAnyDate(text: string): Date | null {
    // Buscar primera fecha en formato colombiano
    const match = text.match(
      /(\d{1,2})\s+(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)\s+(\d{4})/i,
    );
    if (match) {
      return this.parseDate(match[1], match[2], match[3]);
    }

    const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      return new Date(
        parseInt(slashMatch[3]),
        parseInt(slashMatch[2]) - 1,
        parseInt(slashMatch[1]),
      );
    }

    return null;
  }

  private extractDateNear(text: string, keyword: RegExp): Date | null {
    const keywordMatch = text.match(keyword);
    if (!keywordMatch?.index) return null;

    const nearText = text.substring(
      keywordMatch.index,
      keywordMatch.index + 100,
    );
    const dateMatch = nearText.match(
      /(\d{1,2})\s+(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)\s+(\d{4})/i,
    );
    if (dateMatch) {
      return this.parseDate(dateMatch[1], dateMatch[2], dateMatch[3]);
    }

    const slashMatch = nearText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      return new Date(
        parseInt(slashMatch[3]),
        parseInt(slashMatch[2]) - 1,
        parseInt(slashMatch[1]),
      );
    }

    return null;
  }

  private parseDate(day: string, monthStr: string, year: string): Date {
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
    const month = months[monthStr.toLowerCase().substring(0, 3)] ?? 0;
    return new Date(parseInt(year), month, parseInt(day));
  }

  private extractField(text: string, regex: RegExp): string {
    const match = text.match(regex);
    return match?.[1]?.trim() ?? '';
  }

  private extractLongNumber(text: string, regex: RegExp): string {
    const match = text.match(regex);
    return match?.[1] ?? '';
  }

  private extractMoney(text: string, regex: RegExp): number {
    const match = text.match(regex);
    if (!match?.[1]) return 0;
    return parseFloat(match[1].replace(/[.,]/g, '')) || 0;
  }
}
