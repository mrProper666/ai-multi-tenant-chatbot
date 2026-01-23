import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

/**
 * S3-compatible storage abstraction
 */
export interface FileStorage {
  /**
   * Upload a file to S3
   * Returns the S3 key
   */
  uploadFile(tenantId: string, documentId: string, filename: string, buffer: Buffer): Promise<string>;

  /**
   * Download a file from S3
   */
  getFile(tenantId: string, documentId: string): Promise<Buffer>;

  /**
   * Delete a file from S3
   */
  deleteFile(tenantId: string, documentId: string): Promise<void>;
}

export class S3FileStorage implements FileStorage {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME || '';
    
    if (!this.bucketName) {
      throw new Error('S3_BUCKET_NAME environment variable is not set');
    }

    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: true, // For S3-compatible services like MinIO
    });
  }

  async uploadFile(tenantId: string, documentId: string, filename: string, buffer: Buffer): Promise<string> {
    const s3Key = `tenants/${tenantId}/documents/${documentId}.pdf`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: 'application/pdf',
      })
    );

    return s3Key;
  }

  async getFile(tenantId: string, documentId: string): Promise<Buffer> {
    const s3Key = `tenants/${tenantId}/documents/${documentId}.pdf`;

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      })
    );

    if (!response.Body) {
      throw new Error(`File not found: ${s3Key}`);
    }

    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  async deleteFile(tenantId: string, documentId: string): Promise<void> {
    const s3Key = `tenants/${tenantId}/documents/${documentId}.pdf`;

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      })
    );
  }
}
