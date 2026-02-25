import {
    Injectable,
    OnModuleInit,
    Logger,
  } from '@nestjs/common';
  import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
    CreateBucketCommand,
  } from '@aws-sdk/client-s3';
  import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
  
  const BUCKET_NAME = 'eps-documents';
  
  @Injectable()
  export class MinioService implements OnModuleInit {
    private readonly logger = new Logger(MinioService.name);
    private readonly client: S3Client;
  
    constructor() {
      const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
      const port = process.env.MINIO_PORT || '9000';
  
      this.client = new S3Client({
        endpoint: `http://${endpoint}:${port}`,
        region: 'us-east-1',
        credentials: {
          accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
          secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
        },
        forcePathStyle: true,
      });
    }
  
    async onModuleInit() {
      await this.ensureBucketExists();
    }
  
    async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<void> {
      await this.client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
  
      this.logger.log(`File uploaded: ${key}`);
    }
  
    async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
  
      return getSignedUrl(this.client, command, { expiresIn });
    }
  
    async deleteFile(key: string): Promise<void> {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        }),
      );
  
      this.logger.log(`File deleted: ${key}`);
    }
  
    async getFileBuffer(key: string): Promise<Buffer> {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        }),
      );
  
      const stream = response.Body as NodeJS.ReadableStream;
      const chunks: Buffer[] = [];
  
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk as Uint8Array));
      }
  
      return Buffer.concat(chunks);
    }
  
    private async ensureBucketExists(): Promise<void> {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
        this.logger.log(`Bucket '${BUCKET_NAME}' already exists`);
      } catch {
        this.logger.log(`Creating bucket '${BUCKET_NAME}'...`);
        await this.client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
        this.logger.log(`Bucket '${BUCKET_NAME}' created`);
      }
    }
  }
  