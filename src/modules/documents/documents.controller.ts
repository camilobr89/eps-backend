import {
    Controller,
    Post,
    Get,
    Param,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseUUIDPipe,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { DocumentsService } from './documents.service';
  import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
  import { CurrentUser } from '../../common/decorators/current-user.decorator';
  import { FileValidationPipe } from '../pipes/file-validation.pipe';
  
  @Controller()
  @UseGuards(JwtAuthGuard)
  export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) {}
  
    @Post('authorizations/:authorizationId/upload')
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
    upload(
      @CurrentUser() user: { id: string },
      @Param('authorizationId', ParseUUIDPipe) authorizationId: string,
      @UploadedFile(FileValidationPipe) file: Express.Multer.File,
    ) {
      return this.documentsService.upload(user.id, authorizationId, file);
    }
  
    @Get('documents/:id/download')
    getDownloadUrl(
      @Param('id', ParseUUIDPipe) id: string,
      @CurrentUser() user: { id: string },
    ) {
      return this.documentsService.getDownloadUrl(id, user.id);
    }
  
    @Get('documents/:id/ocr-status')
    getOcrStatus(
      @Param('id', ParseUUIDPipe) id: string,
      @CurrentUser() user: { id: string },
    ) {
      return this.documentsService.getOcrStatus(id, user.id);
    }
  }