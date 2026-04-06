import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FileValidationPipe } from '../pipes/file-validation.pipe';
import { UploadAndCreateDto } from './dto/upload-and-create.dto';

@Controller()
@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('documents/upload')
  @ApiOperation({
    summary: 'Upload a document and auto-create a draft authorization via OCR',
    description:
      'Upload a PDF or image for a family member. A draft authorization is created immediately and OCR will populate its fields automatically. No pre-existing authorization is needed.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'familyMemberId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF, JPG or PNG file up to 10MB',
        },
        familyMemberId: {
          type: 'string',
          format: 'uuid',
          description: 'UUID of the family member this document belongs to',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Draft authorization created and OCR queued',
    schema: {
      example: {
        authorization: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          familyMemberId: '123e4567-e89b-12d3-a456-426614174002',
          documentType: 'pendiente_ocr',
          status: 'pending',
          manuallyReviewed: false,
        },
        document: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          fileName: 'autorizacion.pdf',
          ocrStatus: 'pending',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Family member not found' })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  uploadAndCreate(
    @CurrentUser() user: { id: string },
    @Body() dto: UploadAndCreateDto,
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
  ) {
    return this.documentsService.uploadAndCreate(
      user.id,
      dto.familyMemberId,
      file,
    );
  }

  @Post('authorizations/:authorizationId/upload')
  @ApiOperation({
    summary: 'Upload a document (PDF, JPG, PNG) for an authorization',
    description:
      'Upload a document file up to 10MB. The file will be stored and OCR processing will start.',
  })
  @ApiParam({
    name: 'authorizationId',
    description: 'UUID of the authorization',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF, JPG or PNG file up to 10MB',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        fileName: 'document.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        authorizationId: '123e4567-e89b-12d3-a456-426614174001',
        ocrStatus: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Authorization not found' })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  upload(
    @CurrentUser() user: { id: string },
    @Param('authorizationId', ParseUUIDPipe) authorizationId: string,
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
  ) {
    return this.documentsService.upload(user.id, authorizationId, file);
  }

  @Get('documents/:id/download')
  @ApiOperation({
    summary: 'Get a temporary download URL for a document',
    description:
      'Returns a signed URL to download the document file. The URL expires after a short time.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the document',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Download URL generated successfully',
    schema: {
      example: {
        url: 'https://minio.example.com/bucket/documents/123e4567-e89b-12d3-a456-426614174000.pdf?X-Amz-Algorithm=...',
        expiresAt: '2024-01-01T01:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  getDownloadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.documentsService.getDownloadUrl(id, user.id);
  }

  @Get('documents/:id/ocr-status')
  @ApiOperation({
    summary: 'Get OCR processing status for a document',
    description:
      'Returns the current status of OCR processing (pending, processing, completed, failed).',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the document',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'OCR status retrieved successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ocrStatus: 'completed',
        ocrText: 'Texto extraído del documento...',
        ocrCompletedAt: '2024-01-01T00:05:00.000Z',
        ocrError: null,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  getOcrStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.documentsService.getOcrStatus(id, user.id);
  }
}
