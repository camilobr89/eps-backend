import { Injectable, Logger } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import { IOCRService } from './ocr.interface';

@Injectable()
export class TesseractService implements IOCRService {
  private readonly logger = new Logger(TesseractService.name);

  async extractText(buffer: Buffer): Promise<string> {
    this.logger.log('Starting text extraction...');

    const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50;

    if (isPdf) {
      return this.extractFromPdf(buffer);
    }

    return this.extractFromImage(buffer);
  }

  private async extractFromPdf(buffer: Buffer): Promise<string> {
    this.logger.log('PDF detected, attempting direct text extraction...');

    const { extractText } = await import('unpdf');
    const { text, totalPages } = await extractText(new Uint8Array(buffer));

    this.logger.log(`Extracted text from ${totalPages} pages`);

    const fullText = text.join('\n');

    if (fullText.trim().length > 50) {
      this.logger.log(
        `Direct PDF extraction successful. Extracted ${fullText.length} characters`,
      );
      return fullText;
    }

    this.logger.log('PDF has little text, falling back to OCR...');
    return this.ocrPdfViaImages(buffer);
  }

  private async ocrPdfViaImages(buffer: Buffer): Promise<string> {
    const pdfToImg = await import('pdf-to-img');
    const convert = pdfToImg.default?.pdf ?? pdfToImg.pdf;
    const pages: Buffer[] = [];

    for await (const page of await convert(buffer)) {
      pages.push(Buffer.from(page));
    }

    this.logger.log(`Converted ${pages.length} pages to images`);

    const texts: string[] = [];
    const worker = await createWorker('spa');

    try {
      for (let i = 0; i < pages.length; i++) {
        this.logger.log(`OCR page ${i + 1}/${pages.length}...`);
        const { data } = await worker.recognize(pages[i]);
        texts.push(data.text);
      }
    } finally {
      await worker.terminate();
    }

    const fullText = texts.join('\n--- PAGE BREAK ---\n');
    this.logger.log(
      `OCR completed. Extracted ${fullText.length} characters from ${pages.length} pages`,
    );

    return fullText;
  }

  private async extractFromImage(buffer: Buffer): Promise<string> {
    const worker = await createWorker('spa');

    try {
      const { data } = await worker.recognize(buffer);
      this.logger.log(
        `OCR completed. Extracted ${data.text.length} characters`,
      );
      return data.text;
    } finally {
      await worker.terminate();
    }
  }
}
