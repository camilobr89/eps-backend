import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { DocumentsService } from '@/modules/documents/documents.service';
import { PrismaService } from '@/prisma/prisma.service';
import { MinioService } from '@/modules/minio/minio.service';

const mockPrisma = {
  document: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  authorization: {
    findUnique: jest.fn(),
  },
};

const mockMinio = {
  uploadFile: jest.fn(),
  getSignedUrl: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
};

const userId = 'user-uuid-1';
const authorizationId = 'auth-uuid-1';
const documentId = 'doc-uuid-1';

const mockAuthorization = {
  id: authorizationId,
  familyMember: { userId },
};

const mockDocument = {
  id: documentId,
  authorizationId,
  fileName: 'test.pdf',
  fileUrl: 'user/auth/uuid.pdf',
  fileType: 'application/pdf',
  fileSizeBytes: 1024,
  ocrStatus: 'pending',
  ocrErrorMessage: null,
  authorization: {
    familyMember: { userId },
  },
};

const mockFile = {
  originalname: 'test.pdf',
  mimetype: 'application/pdf',
  size: 1024,
  buffer: Buffer.from('fake-pdf'),
} as Express.Multer.File;

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
        { provide: getQueueToken('ocr-jobs'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should upload file, create document and enqueue OCR job', async () => {
      mockPrisma.authorization.findUnique.mockResolvedValue(mockAuthorization);
      mockMinio.uploadFile.mockResolvedValue(undefined);
      mockPrisma.document.create.mockResolvedValue(mockDocument);
      mockQueue.add.mockResolvedValue({});

      const result = await service.upload(userId, authorizationId, mockFile);

      expect(mockPrisma.authorization.findUnique).toHaveBeenCalledWith({
        where: { id: authorizationId },
        include: { familyMember: { select: { userId: true } } },
      });
      expect(mockMinio.uploadFile).toHaveBeenCalled();
      expect(mockPrisma.document.create).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith('process-ocr', {
        documentId: mockDocument.id,
        fileKey: expect.any(String),
        authorizationId,
      });
      expect(result).toEqual(mockDocument);
    });

    it('should throw NotFoundException if authorization does not belong to user', async () => {
      mockPrisma.authorization.findUnique.mockResolvedValue({
        ...mockAuthorization,
        familyMember: { userId: 'other-user' },
      });

      await expect(service.upload(userId, authorizationId, mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if authorization does not exist', async () => {
      mockPrisma.authorization.findUnique.mockResolvedValue(null);

      await expect(service.upload(userId, authorizationId, mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDownloadUrl', () => {
    it('should return signed URL for document', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockMinio.getSignedUrl.mockResolvedValue('https://minio/signed-url');

      const result = await service.getDownloadUrl(documentId, userId);

      expect(result).toEqual({ url: 'https://minio/signed-url' });
      expect(mockMinio.getSignedUrl).toHaveBeenCalledWith(mockDocument.fileUrl, 3600);
    });

    it('should throw NotFoundException if document does not exist', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);

      await expect(service.getDownloadUrl(documentId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if document belongs to another user', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        ...mockDocument,
        authorization: { familyMember: { userId: 'other-user' } },
      });

      await expect(service.getDownloadUrl(documentId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getOcrStatus', () => {
    it('should return OCR status', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);

      const result = await service.getOcrStatus(documentId, userId);

      expect(result).toEqual({
        status: 'pending',
        errorMessage: undefined,
      });
    });

    it('should return error message when OCR failed', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        ...mockDocument,
        ocrStatus: 'failed',
        ocrErrorMessage: 'OCR engine error',
      });

      const result = await service.getOcrStatus(documentId, userId);

      expect(result).toEqual({
        status: 'failed',
        errorMessage: 'OCR engine error',
      });
    });

    it('should throw NotFoundException if document not found', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);

      await expect(service.getOcrStatus(documentId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});