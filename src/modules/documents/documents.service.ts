import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../modules/minio/minio.service';
import { randomUUID } from 'crypto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    @InjectQueue('ocr-jobs') private readonly ocrQueue: Queue,
  ) {}

  async upload(
    userId: string,
    authorizationId: string,
    file: Express.Multer.File,
  ) {
    await this.verifyAuthorizationOwnership(authorizationId, userId);

    const ext = this.getFileExtension(file.originalname);
    const fileKey = `${userId}/${authorizationId}/${randomUUID()}.${ext}`;

    await this.minio.uploadFile(fileKey, file.buffer, file.mimetype);

    const document = await this.prisma.document.create({
      data: {
        authorizationId,
        fileName: file.originalname,
        fileUrl: fileKey,
        fileType: file.mimetype,
        fileSizeBytes: file.size,
        ocrStatus: 'pending',
      },
    });

    // Encolar job de OCR
    await this.ocrQueue.add('process-ocr', {
      documentId: document.id,
      fileKey,
      authorizationId,
    });

    return document;
  }

  async getDownloadUrl(id: string, userId: string) {
    const document = await this.findOneWithOwnership(id, userId);
    const url = await this.minio.getSignedUrl(document.fileUrl, 3600);
    return { url };
  }

  async getOcrStatus(id: string, userId: string) {
    const document = await this.findOneWithOwnership(id, userId);
    return {
      status: document.ocrStatus,
      errorMessage: document.ocrErrorMessage ?? undefined,
    };
  }

  // --- Métodos privados ---

  private async findOneWithOwnership(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        authorization: {
          include: {
            familyMember: { select: { userId: true } },
          },
        },
      },
    });

    if (!document || document.authorization.familyMember.userId !== userId) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  private async verifyAuthorizationOwnership(
    authorizationId: string,
    userId: string,
  ) {
    const authorization = await this.prisma.authorization.findUnique({
      where: { id: authorizationId },
      include: { familyMember: { select: { userId: true } } },
    });

    if (!authorization || authorization.familyMember.userId !== userId) {
      throw new NotFoundException('Authorization not found');
    }
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : 'bin';
  }
}
