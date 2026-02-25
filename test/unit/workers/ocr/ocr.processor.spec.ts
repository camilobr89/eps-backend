import { Test, TestingModule } from '@nestjs/testing';
import { OcrProcessor } from '@/workers/ocr/ocr.processor';
import { PrismaService } from '@/prisma/prisma.service';
import { MinioService } from '@/modules/minio/minio.service';
import { TesseractService } from '@/workers/ocr/services/tesseract.service';
import { Job } from 'bullmq';

const mockPrisma = {
  document: {
    update: jest.fn(),
  },
  authorization: {
    update: jest.fn(),
  },
};

const mockMinio = {
  getFileBuffer: jest.fn(),
};

const mockTesseract = {
  extractText: jest.fn(),
};

const documentId = 'doc-uuid-1';
const authorizationId = 'auth-uuid-1';
const fileKey = 'user/auth/file.pdf';

const createMockJob = (data: Record<string, string>): Job => ({
  data,
  id: 'job-1',
}) as unknown as Job;

describe('OcrProcessor', () => {
  let processor: OcrProcessor;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
        { provide: TesseractService, useValue: mockTesseract },
      ],
    }).compile();

    processor = module.get<OcrProcessor>(OcrProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should process OCR job successfully', async () => {
      const fileBuffer = Buffer.from('fake-file-content');
      const extractedText = 'Salud Total EPS - Orden de direccionamiento';

      mockMinio.getFileBuffer.mockResolvedValue(fileBuffer);
      mockTesseract.extractText.mockResolvedValue(extractedText);
      mockPrisma.document.update.mockResolvedValue({});
      mockPrisma.authorization.update.mockResolvedValue({});

      const job = createMockJob({ documentId, fileKey, authorizationId });

      await processor.process(job);

      // 1. Status → processing
      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: documentId },
        data: { ocrStatus: 'processing', ocrErrorMessage: null },
      });

      // 2. Download from MinIO
      expect(mockMinio.getFileBuffer).toHaveBeenCalledWith(fileKey);

      // 3. Extract text
      expect(mockTesseract.extractText).toHaveBeenCalledWith(fileBuffer);

      // 4. Save raw text to authorization
      expect(mockPrisma.authorization.update).toHaveBeenCalledWith({
        where: { id: authorizationId },
        data: { ocrRawText: extractedText },
      });

      // 5. Status → completed
      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: documentId },
        data: { ocrStatus: 'completed', ocrErrorMessage: null },
      });
    });

    it('should set status to failed when MinIO download fails', async () => {
      mockPrisma.document.update.mockResolvedValue({});
      mockMinio.getFileBuffer.mockRejectedValue(new Error('MinIO connection refused'));

      const job = createMockJob({ documentId, fileKey, authorizationId });

      await processor.process(job);

      expect(mockPrisma.document.update).toHaveBeenLastCalledWith({
        where: { id: documentId },
        data: { ocrStatus: 'failed', ocrErrorMessage: 'MinIO connection refused' },
      });
    });

    it('should set status to failed when OCR extraction fails', async () => {
      mockPrisma.document.update.mockResolvedValue({});
      mockMinio.getFileBuffer.mockResolvedValue(Buffer.from('content'));
      mockTesseract.extractText.mockRejectedValue(new Error('OCR engine error'));

      const job = createMockJob({ documentId, fileKey, authorizationId });

      await processor.process(job);

      expect(mockPrisma.document.update).toHaveBeenLastCalledWith({
        where: { id: documentId },
        data: { ocrStatus: 'failed', ocrErrorMessage: 'OCR engine error' },
      });
    });

    it('should set status to failed when saving to DB fails', async () => {
      mockPrisma.document.update.mockResolvedValueOnce({}); // processing
      mockMinio.getFileBuffer.mockResolvedValue(Buffer.from('content'));
      mockTesseract.extractText.mockResolvedValue('extracted text');
      mockPrisma.authorization.update.mockRejectedValue(new Error('DB write error'));
      mockPrisma.document.update.mockResolvedValue({}); // failed

      const job = createMockJob({ documentId, fileKey, authorizationId });

      await processor.process(job);

      expect(mockPrisma.document.update).toHaveBeenLastCalledWith({
        where: { id: documentId },
        data: { ocrStatus: 'failed', ocrErrorMessage: 'DB write error' },
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockPrisma.document.update.mockResolvedValue({});
      mockMinio.getFileBuffer.mockRejectedValue('string error');

      const job = createMockJob({ documentId, fileKey, authorizationId });

      await processor.process(job);

      expect(mockPrisma.document.update).toHaveBeenLastCalledWith({
        where: { id: documentId },
        data: { ocrStatus: 'failed', ocrErrorMessage: 'string error' },
      });
    });
  });
});