import { Test, TestingModule } from '@nestjs/testing';
import { MinioService } from '@/modules/minio/minio.service';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as AWS_S3 from '@aws-sdk/client-s3';

// Mock AWS SDK modules
jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  const mockS3Client = jest.fn(() => ({
    send: mockSend,
  }));
  return {
    S3Client: mockS3Client,
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    HeadBucketCommand: jest.fn(),
    CreateBucketCommand: jest.fn(),
    __mockSend: mockSend,
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

// Cast mocks to get typed access
const mockSend = (AWS_S3 as any).__mockSend as jest.Mock;
const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<
  typeof getSignedUrl
>;
const MockS3Client = S3Client as jest.MockedClass<typeof S3Client>;
const MockPutObjectCommand = PutObjectCommand as jest.MockedClass<
  typeof PutObjectCommand
>;
const MockGetObjectCommand = GetObjectCommand as jest.MockedClass<
  typeof GetObjectCommand
>;
const MockDeleteObjectCommand = DeleteObjectCommand as jest.MockedClass<
  typeof DeleteObjectCommand
>;
const MockHeadBucketCommand = HeadBucketCommand as jest.MockedClass<
  typeof HeadBucketCommand
>;
const MockCreateBucketCommand = CreateBucketCommand as jest.MockedClass<
  typeof CreateBucketCommand
>;

describe('MinioService', () => {
  let service: MinioService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Set environment variables
    process.env.MINIO_ENDPOINT = 'localhost';
    process.env.MINIO_PORT = '9000';
    process.env.MINIO_ACCESS_KEY = 'test-key';
    process.env.MINIO_SECRET_KEY = 'test-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [MinioService],
    }).compile();

    service = module.get<MinioService>(MinioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.MINIO_ENDPOINT;
    delete process.env.MINIO_PORT;
    delete process.env.MINIO_ACCESS_KEY;
    delete process.env.MINIO_SECRET_KEY;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(MockS3Client).toHaveBeenCalledWith({
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
      },
      forcePathStyle: true,
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const key = 'test/file.txt';
      const buffer = Buffer.from('test content');
      const contentType = 'text/plain';

      mockSend.mockResolvedValue({});

      await service.uploadFile(key, buffer, contentType);

      expect(MockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'eps-documents',
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });
      expect(mockSend).toHaveBeenCalledWith(expect.any(MockPutObjectCommand));
    });

    it('should throw error when upload fails', async () => {
      const key = 'test/file.txt';
      const buffer = Buffer.from('test content');
      const contentType = 'text/plain';

      const error = new Error('Upload failed');
      mockSend.mockRejectedValue(error);

      await expect(
        service.uploadFile(key, buffer, contentType),
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('getSignedUrl', () => {
    it('should return signed URL', async () => {
      const key = 'test/file.txt';
      const expectedUrl = 'https://example.com/signed-url';
      const expiresIn = 3600;

      mockGetSignedUrl.mockResolvedValue(expectedUrl);

      const result = await service.getSignedUrl(key, expiresIn);

      expect(MockGetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'eps-documents',
        Key: key,
      });
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(MockGetObjectCommand),
        { expiresIn },
      );
      expect(result).toBe(expectedUrl);
    });

    it('should use default expiresIn when not provided', async () => {
      const key = 'test/file.txt';
      const expectedUrl = 'https://example.com/signed-url';

      mockGetSignedUrl.mockResolvedValue(expectedUrl);

      const result = await service.getSignedUrl(key);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(MockGetObjectCommand),
        { expiresIn: 3600 },
      );
      expect(result).toBe(expectedUrl);
    });

    it('should propagate getSignedUrl errors', async () => {
      const key = 'test/file.txt';
      const error = new Error('URL generation failed');

      mockGetSignedUrl.mockRejectedValue(error);

      await expect(service.getSignedUrl(key)).rejects.toThrow(
        'URL generation failed',
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const key = 'test/file.txt';

      mockSend.mockResolvedValue({});

      await service.deleteFile(key);

      expect(MockDeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'eps-documents',
        Key: key,
      });
      expect(mockSend).toHaveBeenCalledWith(
        expect.any(MockDeleteObjectCommand),
      );
    });

    it('should throw error when delete fails', async () => {
      const key = 'test/file.txt';
      const error = new Error('Delete failed');

      mockSend.mockRejectedValue(error);

      await expect(service.deleteFile(key)).rejects.toThrow('Delete failed');
    });
  });

  describe('getFileBuffer', () => {
    it('should return file buffer', async () => {
      const key = 'test/file.txt';
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          await Promise.resolve();
          yield Buffer.from('chunk1');
          yield Buffer.from('chunk2');
        },
      };
      const mockResponse = {
        Body: mockStream,
      };

      mockSend.mockResolvedValue(mockResponse);

      const result = await service.getFileBuffer(key);

      expect(MockGetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'eps-documents',
        Key: key,
      });
      expect(mockSend).toHaveBeenCalledWith(expect.any(MockGetObjectCommand));
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('chunk1chunk2');
    });

    it('should handle empty stream', async () => {
      const key = 'test/file.txt';
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          // No chunks
        },
      };
      const mockResponse = {
        Body: mockStream,
      };

      mockSend.mockResolvedValue(mockResponse);

      const result = await service.getFileBuffer(key);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should throw error when get object fails', async () => {
      const key = 'test/file.txt';
      const error = new Error('Get object failed');

      mockSend.mockRejectedValue(error);

      await expect(service.getFileBuffer(key)).rejects.toThrow(
        'Get object failed',
      );
    });
  });

  describe('ensureBucketExists', () => {
    it('should create bucket when it does not exist', async () => {
      // First call to HeadBucketCommand fails (bucket doesn't exist)
      mockSend.mockRejectedValueOnce(new Error('Bucket not found'));
      // Second call to CreateBucketCommand succeeds
      mockSend.mockResolvedValueOnce({});

      // We need to call the private method, but we can't directly.
      // Instead, we can test via onModuleInit which calls ensureBucketExists
      await (service as any).ensureBucketExists();

      expect(MockHeadBucketCommand).toHaveBeenCalledWith({
        Bucket: 'eps-documents',
      });
      expect(MockCreateBucketCommand).toHaveBeenCalledWith({
        Bucket: 'eps-documents',
      });
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should not create bucket when it already exists', async () => {
      mockSend.mockResolvedValueOnce({}); // HeadBucketCommand succeeds

      await (service as any).ensureBucketExists();

      expect(MockHeadBucketCommand).toHaveBeenCalledWith({
        Bucket: 'eps-documents',
      });
      expect(MockCreateBucketCommand).not.toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleInit', () => {
    it('should call ensureBucketExists', async () => {
      const ensureBucketExistsSpy = jest.spyOn(
        service as any,
        'ensureBucketExists',
      );
      ensureBucketExistsSpy.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(ensureBucketExistsSpy).toHaveBeenCalled();
    });
  });
});
