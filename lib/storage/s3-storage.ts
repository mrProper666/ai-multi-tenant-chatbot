import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

/**
 * S3-compatible storage abstraction
 * Supports AWS S3, Cloudflare R2, MinIO, and other S3-compatible services
 */
export interface FileStorage {
  /**
   * Upload a file to storage
   * Returns the storage key
   */
  uploadFile(tenantId: string, documentId: string, filename: string, buffer: Buffer): Promise<string>;

  /**
   * Download a file from storage
   */
  getFile(tenantId: string, documentId: string): Promise<Buffer>;

  /**
   * Delete a file from storage
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

    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || '';

    if (!endpoint) {
      throw new Error('S3_ENDPOINT environment variable is not set');
    }

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY environment variables are required');
    }

    // For Cloudflare R2, region can be "auto" or any value (R2 doesn't enforce regions)
    // For other S3-compatible services, use the provided region or default to us-east-1
    const region = process.env.S3_REGION || 'auto';

    this.client = new S3Client({
      endpoint: endpoint,
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
      forcePathStyle: true, // Required for Cloudflare R2 and other S3-compatible services
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
