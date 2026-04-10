import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../modules/minio/minio.service';
import { TesseractService } from './services/tesseract.service';
import { EPSParserRegistry } from './parsers/parser.registry';
import { OrdenDireccionamiento } from '../../common/interfaces/orden-direccionamiento.interface';

export interface OcrJobPayload {
  documentId: string;
  fileKey: string;
  authorizationId: string;
}

@Processor('ocr-jobs')
export class OcrProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly tesseract: TesseractService,
    private readonly parserRegistry: EPSParserRegistry,
  ) {
    super();
  }

  async process(job: Job<OcrJobPayload>): Promise<void> {
    const { documentId, fileKey, authorizationId } = job.data;

    this.logger.log(`Processing OCR job for document ${documentId}`);

    try {
      // 1. Status → processing
      await this.updateDocumentStatus(documentId, 'processing');

      // 2. Descargar de MinIO
      this.logger.log(`Downloading file: ${fileKey}`);
      const fileBuffer = await this.minio.getFileBuffer(fileKey);

      // 3. Extraer texto
      const rawText = await this.tesseract.extractText(fileBuffer);

      // 4. Guardar texto crudo
      await this.prisma.authorization.update({
        where: { id: authorizationId },
        data: { ocrRawText: rawText },
      });

      // 5. Ejecutar parser
      let parserUsed = 'none';
      let confidence = 0;

      try {
        this.logger.log(
          `Running parser for authorization ${authorizationId} (${rawText.length} chars)`,
        );
        const parseResult = this.parserRegistry.parseDocument(rawText);
        parserUsed = parseResult.parserUsed;
        confidence = parseResult.confidence;

        this.logger.log(
          `Parser '${parserUsed}' completed with confidence ${confidence} for authorization ${authorizationId}`,
        );

        // 6. Guardar datos estructurados en la autorización
        await this.saveStructuredData(
          authorizationId,
          parseResult.data,
          confidence,
          parserUsed,
        );

        this.logger.log(
          `Structured data saved for authorization ${authorizationId}`,
        );
      } catch (parseError) {
        // Si el parser falla, no marcamos como failed
        const msg =
          parseError instanceof Error ? parseError.message : String(parseError);
        const stack =
          parseError instanceof Error ? parseError.stack : undefined;
        this.logger.error(
          `Parser/persist failed for authorization ${authorizationId}: ${msg}`,
          stack,
        );
      }

      // 7. Status → completed (siempre, incluso si el parser falló)
      await this.updateDocumentStatus(documentId, 'completed');

      this.logger.log(`OCR completed for document ${documentId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `OCR failed for document ${documentId}: ${errorMessage}`,
      );

      await this.updateDocumentStatus(documentId, 'failed', errorMessage);
    }
  }

  private async saveStructuredData(
    authorizationId: string,
    data: Partial<OrdenDireccionamiento>,
    confidence: number,
    parserUsed: string,
  ) {
    // Mapeo: campo del parser → campo de Prisma + límite
    const fieldMap: Array<[keyof OrdenDireccionamiento, string, number?]> = [
      ['tipoDocumento', 'documentType', 50],
      ['numeroSolicitud', 'requestNumber', 50],
      ['fechaHoraEmision', 'issuingDate'],
      ['fechaVencimiento', 'expirationDate'],
      ['diagnosticoCIE10', 'diagnosisCode', 20],
      ['ubicacionPaciente', 'patientLocation', 50],
      ['origenServicio', 'serviceOrigin', 50],
      ['prestadorNombre', 'providerName', 200],
      ['prestadorNit', 'providerNit', 20],
      ['prestadorCodigo', 'providerCode', 20],
      ['prestadorDireccion', 'providerAddress', 300],
      ['prestadorTelefono', 'providerPhone', 30],
      ['tipoRecaudo', 'paymentType', 30],
    ];

    const updateData: Record<string, unknown> = {
      ocrConfidence: confidence,
      ocrParserUsed: parserUsed,
    };

    for (const [parserField, prismaField, maxLen] of fieldMap) {
      const value = data[parserField];
      if (!value) continue;

      if (typeof value === 'string' && maxLen) {
        updateData[prismaField] = value.substring(0, maxLen);
      } else {
        updateData[prismaField] = value;
      }
    }

    if (data.copago && data.copago > 0) updateData.copayValue = data.copago;
    if (data.semanasCotizadas && data.semanasCotizadas > 0)
      updateData.weeksContributed = data.semanasCotizadas;

    await this.prisma.authorization.update({
      where: { id: authorizationId },
      data: updateData,
    });

    if (data.servicios && data.servicios.length > 0) {
      for (const servicio of data.servicios) {
        await this.prisma.authorizationService.create({
          data: {
            authorizationId,
            serviceCode: servicio.codigo.substring(0, 20),
            quantity: servicio.cantidad,
            serviceName: servicio.nombre.substring(0, 200),
            serviceType: 'ocr_extracted',
          },
        });
      }

      this.logger.log(`Saved ${data.servicios.length} services from parser`);
    }
  }

  private async updateDocumentStatus(
    documentId: string,
    status: 'processing' | 'completed' | 'failed',
    errorMessage?: string,
  ) {
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        ocrStatus: status,
        ocrErrorMessage: errorMessage ?? null,
      },
    });
  }
}
