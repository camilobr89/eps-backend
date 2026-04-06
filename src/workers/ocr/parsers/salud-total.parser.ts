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
      numeroSolicitud: this.extractNumeroSolicitud(rawText),
      fechaHoraEmision: this.extractFechaEmision(rawText),
      fechaVencimiento: this.extractFechaVencimiento(rawText),
      epsNombre: this.extractEpsNombre(rawText),
      epsCodigo: this.extractEpsCodigo(rawText),
      pacienteNombre: this.extractField(
        rawText,
        /Nombre\s*:([A-ZÁÉÍÓÚÑ\s]{3,80})(?:Fecha\s+Nacimiento|\n)/i,
      ),
      pacienteDocumentoTipo: this.extractField(
        rawText,
        /Tipo\s+Documento\s*:\s*([^\n]+)/i,
      ),
      pacienteDocumentoNumero: this.extractField(
        rawText,
        /Documento\s*:\s*(\d{5,12})/i,
      ),
      prestadorNombre: this.extractPrestadorNombre(rawText),
      prestadorNit: this.extractPrestadorNit(rawText),
      prestadorCodigo: this.extractPrestadorCodigo(rawText),
      prestadorDireccion: this.extractPrestadorDireccion(rawText),
      prestadorTelefono: this.extractPrestadorTelefono(rawText),
      regimen: this.extractRegimen(rawText),
      diagnosticoCIE10: this.extractDiagnostico(rawText),
      ubicacionPaciente: this.extractUbicacion(rawText),
      origenServicio: this.extractOrigenServicio(rawText),
      servicios: this.extractServicios(rawText),
      tipoRecaudo: this.extractField(
        rawText,
        /Tipo\s+Recaudo\s*:\s*([^\n]+?)(?:\s{2,}|\n|$)/i,
      ),
      copago: this.extractCopago(rawText),
      porcentaje: this.extractPorcentaje(rawText),
      valorMaximo: this.extractValorMaximo(rawText),
      semanasCotizadas: this.extractNumber(
        rawText,
        /Semanas\s+Cotizadas\s*:\s*(\d+)/i,
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

  // --- Extractors for fields with scrambled two-column layout ---

  /**
   * "10062025057820No. Solicitud :" → value appears BEFORE the label.
   * Also handles normal "No. Solicitud : 10062025057820".
   */
  private extractNumeroSolicitud(text: string): string {
    return (
      // reversed: value before label
      this.extractField(text, /(\d{10,20})No\.\s*Solicitud\s*:/i) ||
      // normal: label then value
      this.extractField(text, /No\.\s*Solicitud\s*:\s*(\d[\d-]{5,30})/i)
    );
  }

  /**
   * "06 Oct 2025 09:32 AMFecha y Hora:" → datetime appears BEFORE "Fecha y Hora:".
   * Also handles "Fecha y Hora: 06 Oct 2025 09:32 AM".
   */
  private extractFechaEmision(text: string): Date | null {
    const dateStr =
      // reversed: datetime before label
      this.extractField(
        text,
        /(\d{1,2}\s+\w{3}\s+\d{4}\s+\d{1,2}:\d{2}\s*[AP]M)Fecha\s+y\s+Hora/i,
      ) ||
      // normal
      this.extractField(
        text,
        /Fecha\s+y\s+Hora\s*:\s*(\d{1,2}\s+\w{3}\s+\d{4}[^\n]*)/i,
      );

    return dateStr ? this.parseColombianDate(dateStr) : null;
  }

  /**
   * In scrambled layout the vencimiento date appears as a standalone line
   * between "Nombre :" (empty) and "Origen Servicio :".
   * Fallback: normal "Fecha Vencimiento : 01 Oct 2026".
   */
  private extractFechaVencimiento(text: string): Date | null {
    const dateStr =
      // contextual: lone date line between "Nombre :" and "Origen Servicio"
      this.extractField(
        text,
        /Nombre\s*:\s*\n(\d{1,2}\s+\w{3}\s+\d{4})\nOrigen\s+Servicio/i,
      ) ||
      // normal
      this.extractField(
        text,
        /Fecha\s+Vencimiento\s*:\s*(\d{1,2}\s+\w{3}\s+\d{4})/i,
      );

    return dateStr ? this.parseColombianDate(dateStr) : null;
  }

  /**
   * "AmbulatorioUbicación paciente :" → value before label.
   * Fallback: "Ubicación paciente : Ambulatorio".
   */
  private extractUbicacion(text: string): string {
    return (
      // reversed
      this.extractField(text, /(\w{1,50})Ubicaci[oó]n\s+paciente\s*:/i) ||
      // normal
      this.extractField(
        text,
        /Ubicaci[oó]n\s+(?:del\s+)?[Pp]aciente\s*:\s*([^\n]+)/i,
      )
    );
  }

  /**
   * "Enfermedad General" appears on its own line just before
   * "Fecha Vencimiento :...Regimen :" in scrambled layout.
   * Fallback: normal "Origen Servicio : Enfermedad General".
   */
  private extractOrigenServicio(text: string): string {
    return (
      // contextual: line before the merged Vencimiento+Regimen line
      this.extractField(
        text,
        /([^\n]+)\nFecha\s+Vencimiento\s*:[^\n]*Regimen\s*:/i,
      ) ||
      // normal
      this.extractField(
        text,
        /Origen\s+(?:del\s+)?[Ss]ervicio\s*:\s*([^\n]+)/i,
      )
    );
  }

  /**
   * In Salud Total's scrambled layout the provider name lands on the first
   * line after "INFORMACIÓN DE LA TRANSACCIÓN".
   * Fallback: normal prestador section.
   */
  private extractPrestadorNombre(text: string): string {
    return (
      // Salud Total specific: first line after transaction section header
      this.extractField(
        text,
        /INFORMACI[OÓ]N\s+DE\s+LA\s+TRANSACCI[OÓ]N\s*\n([^\n]+)/i,
      ) ||
      // normal prestador section
      this.extractField(
        text,
        /INFORMACI[OÓ]N\s+(?:DEL?\s+)?PRESTADOR[^\n]*\nNombre\s*:\s*([^\n]+)/i,
      )
    );
  }

  /**
   * "800149453Nit : 33719Código :" → NIT is the number BEFORE "Nit :".
   * Fallback: "Nit : 800149453".
   */
  private extractPrestadorNit(text: string): string {
    return (
      // reversed
      this.extractField(text, /(\d{6,12})Nit\s*:/i) ||
      // normal
      this.extractField(text, /Nit\s*:\s*(\d{6,12})/i)
    );
  }

  /**
   * "800149453Nit : 33719Código :" → código is the number BETWEEN "Nit :" and "Código :".
   * Fallback: normal "Código : 33719".
   */
  private extractPrestadorCodigo(text: string): string {
    return (
      // reversed: number between the two labels
      this.extractField(text, /Nit\s*:\s*(\d+)C[oó]digo\s*:/i) ||
      // normal
      this.extractField(text, /C[oó]digo\s*:\s*(\d{3,10})(?!\d)/i)
    );
  }

  /**
   * "6013725060 WhatsApp 324 100 064Telefono :CARRERA 19 C SUR 24 67Dirección :"
   * → dirección is between "Telefono :" and "Dirección :" (reversed layout).
   * Fallback: "Dirección : CARRERA 19...".
   */
  private extractPrestadorDireccion(text: string): string {
    return (
      // reversed: text between Telefono: and Dirección:
      this.extractField(
        text,
        /Telefono\s*:([A-Z][^\n]{5,150})Direcci[oó]n\s*:/i,
      ) ||
      // normal (patient address also matches, but prestador block comes later)
      this.extractField(
        text,
        /INFORMACI[OÓ]N\s+(?:DEL?\s+)?PRESTADOR[\s\S]{0,300}?Direcci[oó]n\s*:\s*([^\n]+)/i,
      )
    );
  }

  /**
   * "6013725060 WhatsApp 324 100 064Telefono :..." → phone is the number BEFORE WhatsApp.
   * Fallback: first 10-digit number after "Telefono :".
   */
  private extractPrestadorTelefono(text: string): string {
    return (
      // reversed: line starts with phone number followed by WhatsApp
      this.extractField(text, /^(\d{7,12})\s+WhatsApp/m) ||
      // normal: label then number (skip phone = 0 which is patient's empty phone)
      this.extractField(text, /Telefono\s*:\s*([1-9]\d{6,11})/i)
    );
  }

  /**
   * "Contributivo - POS - EventoRegimen :" → value before label.
   * Fallback: normal "Regimen : Contributivo...".
   */
  private extractRegimen(text: string): string {
    return (
      // reversed
      this.extractField(text, /([A-Z][^\n:]{5,80})Regimen\s*:/i) ||
      // normal
      this.extractField(text, /R[eé]gimen\s*:\s*([^\n]+)/i)
    );
  }

  /**
   * EPS code ("EPS002") appears as a standalone token.
   */
  private extractEpsCodigo(text: string): string {
    return (
      this.extractField(text, /\b(EPS\d{3,4})\b/i) ||
      this.extractField(text, /C[oó]digo\s*:\s*(EPS\d+)/i) ||
      ''
    );
  }

  /**
   * "Valor Maximo :Porcentaje :19200Valor :"
   * → copago value is the number between "Porcentaje :" and "Valor :".
   * Fallback: "Valor : 19200".
   */
  private extractCopago(text: string): number {
    // Handles both same-line and split-line layouts:
    //   "Porcentaje :19200Valor :"  (same line)
    //   "Porcentaje :\n19200Valor :" (value on next line)
    const reversed = this.extractField(
      text,
      /Porcentaje\s*:[\s]*(\d[\d.,]+)Valor\s*:/i,
    );
    if (reversed) return parseFloat(reversed.replace(/,/g, '')) || 0;

    const normal = this.extractField(
      text,
      /Valor\s*:\s*(\d[\d.,]{1,15})(?:\s|\n|$)/i,
    );
    return normal ? parseFloat(normal.replace(/,/g, '')) || 0 : 0;
  }

  /**
   * "Valor Maximo :Porcentaje :19200Valor :"
   * → porcentaje label is present but has no value here (empty), so return 0.
   * Some documents have "Porcentaje : 100" in normal layout.
   */
  private extractPorcentaje(text: string): number {
    // normal layout only — reversed layout has empty porcentaje
    return this.extractNumber(
      text,
      /Porcentaje\s*:\s*(\d[\d.,]*)(?:\s|\n|$)/i,
    );
  }

  /**
   * "Valor Maximo :Porcentaje :" → valor maximo is empty here.
   * Some documents have "Valor Maximo : 50000".
   */
  private extractValorMaximo(text: string): number {
    return this.extractNumber(
      text,
      /(?:Valor\s+)?M[aá]ximo\s*:\s*(\d[\d.,]{1,15})(?:\s|\n|$)/i,
    );
  }

  // --- Shared helpers ---

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
    const match = text.match(/Salud\s+Total\s+EPS[^\n]*/i);
    return match?.[0]?.trim() ?? 'Salud Total EPS';
  }

  private extractDiagnostico(text: string): string {
    // CIE-10: letter + 2 digits + optional dot + optional digits
    const match = text.match(/\b([A-Z]\d{2}\.?\d{0,4})\b/);
    return match?.[1] ?? '';
  }

  private extractServicios(text: string): ServicioDireccionado[] {
    const servicios: ServicioDireccionado[] = [];

    // Pattern: 8-10 digit code + space + quantity + space + description
    const regex =
      /(\d{8,10})\s+(\d{1,3})\s+(?:\([^)]{1,100}\)\s+)?([^\n]{5,200})(?=\n|$)/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // Skip lines that look like order numbers (33719-2555301849 style)
      if (match[0].includes('-')) continue;
      servicios.push({
        codigo: match[1],
        cantidad: parseInt(match[2], 10),
        nombre: match[3].trim().substring(0, 200),
      });
    }

    return servicios;
  }

  private extractField(text: string, regex: RegExp): string {
    const match = text.match(regex);
    return match?.[1]?.trim() ?? '';
  }

  private extractNumber(text: string, regex: RegExp): number {
    const match = text.match(regex);
    if (!match?.[1]) return 0;
    return parseFloat(match[1].replace(/,/g, '')) || 0;
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

    // "24 Feb 2026 10:17" or "24 Feb 2026" or "06 Oct 2025 09:32 AM"
    const match = dateStr.match(
      /(\d{1,2})\s+(\w{3})\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/i,
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

    // DD/MM/YYYY
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
}
