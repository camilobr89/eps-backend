export interface IOCRService {
  extractText(buffer: Buffer): Promise<string>;
}

export const OCR_SERVICE = Symbol('OCR_SERVICE');
