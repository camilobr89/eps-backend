import { TesseractService } from '@/workers/ocr/services/tesseract.service';

const mockRecognize = jest.fn();
const mockTerminate = jest.fn();
const mockExtractText = jest.fn();

jest.mock('tesseract.js', () => ({
  createWorker: jest.fn().mockImplementation(() =>
    Promise.resolve({
      recognize: (...args: unknown[]) => mockRecognize(...args),
      terminate: (...args: unknown[]) => mockTerminate(...args),
    }),
  ),
}));

jest.mock('unpdf', () => ({
  extractText: (...args: unknown[]) => mockExtractText(...args),
}));

describe('TesseractService', () => {
  let service: TesseractService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TesseractService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractText - images', () => {
    it('should extract text from a JPEG image', async () => {
      // JPEG magic bytes: FF D8
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0x00, 0x00]);
      mockRecognize.mockResolvedValue({
        data: { text: 'Extracted from image' },
      });

      const result = await service.extractText(jpegBuffer);

      expect(result).toBe('Extracted from image');
      expect(mockRecognize).toHaveBeenCalledWith(jpegBuffer);
      expect(mockTerminate).toHaveBeenCalled();
    });

    it('should extract text from a PNG image', async () => {
      // PNG magic bytes: 89 50 (not %P so not PDF)
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      mockRecognize.mockResolvedValue({ data: { text: 'PNG text' } });

      const result = await service.extractText(pngBuffer);

      expect(result).toBe('PNG text');
    });

    it('should terminate worker even if recognize fails', async () => {
      const imgBuffer = Buffer.from([0xff, 0xd8, 0x00]);
      mockRecognize.mockRejectedValue(new Error('Recognition failed'));

      await expect(service.extractText(imgBuffer)).rejects.toThrow(
        'Recognition failed',
      );
      expect(mockTerminate).toHaveBeenCalled();
    });
  });

  describe('extractText - PDF', () => {
    it('should use unpdf for digital PDF with sufficient text', async () => {
      // PDF magic bytes: %P (0x25 0x50)
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      const longText = 'A'.repeat(100);

      mockExtractText.mockResolvedValue({
        text: [longText],
        totalPages: 1,
      });

      const result = await service.extractText(pdfBuffer);

      expect(result).toBe(longText);
      expect(mockExtractText).toHaveBeenCalled();
      expect(mockRecognize).not.toHaveBeenCalled();
    });

    it('should join multiple pages with newline', async () => {
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      const page1 = 'A'.repeat(60);
      const page2 = 'B'.repeat(60);

      mockExtractText.mockResolvedValue({
        text: [page1, page2],
        totalPages: 2,
      });

      const result = await service.extractText(pdfBuffer);

      expect(result).toBe(`${page1}\n${page2}`);
    });
  });
});
