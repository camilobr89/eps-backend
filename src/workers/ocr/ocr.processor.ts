import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../modules/minio/minio.service';
import { TesseractService } from './services/tesseract.service';

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
  ) {
    super();
  }

  async process(job: Job<OcrJobPayload>): Promise<void> {
    const { documentId, fileKey, authorizationId } = job.data;

    this.logger.log(`Processing OCR job for document ${documentId}`);

    try {
      // 1. Actualizar status a processing
      await this.updateDocumentStatus(documentId, 'processing');

      // 2. Descargar archivo de MinIO
      this.logger.log(`Downloading file: ${fileKey}`);
      const fileBuffer = await this.minio.getFileBuffer(fileKey);

      // 3. Ejecutar OCR con Tesseract
      const rawText = await this.tesseract.extractText(fileBuffer);

      // 4. Guardar texto crudo en la autorización
      await this.prisma.authorization.update({
        where: { id: authorizationId },
        data: { ocrRawText: rawText },
      });

      // 5. Actualizar status a completed
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
