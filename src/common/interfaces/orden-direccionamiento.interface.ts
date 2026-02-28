export interface ServicioDireccionado {
  codigo: string;
  cantidad: number;
  nombre: string;
}

export interface OrdenDireccionamiento {
  // Identificación del documento
  tipoDocumento:
    | 'orden_direccionamiento'
    | 'autorizacion'
    | 'formula_medica'
    | 'orden_laboratorio';
  numeroSolicitud: string;
  fechaHoraEmision: Date | null;
  fechaVencimiento: Date | null;

  // EPS / Entidad responsable
  epsNombre: string;
  epsCodigo: string;

  // Paciente
  pacienteNombre: string;
  pacienteDocumentoTipo: string;
  pacienteDocumentoNumero: string;

  // Prestador / IPS
  prestadorNombre: string;
  prestadorNit: string;
  prestadorCodigo: string;
  prestadorDireccion: string;
  prestadorTelefono: string;

  // Información de la transacción
  regimen: string;
  diagnosticoCIE10: string;
  ubicacionPaciente: string;
  origenServicio: string;

  // Servicios direccionados
  servicios: ServicioDireccionado[];

  // Pagos compartidos
  tipoRecaudo: string;
  copago: number;
  porcentaje: number;
  valorMaximo: number;
  semanasCotizadas: number;
}
