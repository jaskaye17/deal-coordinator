import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  type S3ClientConfig,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { FileStorageProvider } from './file-storage.interface';

const DEFAULT_FOLDERS = [
  '01_Intake',
  '02_Listing_Docs',
  '03_Disclosures',
  '04_Marketing',
  '05_Offers',
  '06_Contract',
  '07_Title_Lender',
  '08_Closing',
  '09_Audit_Log',
];

@Injectable()
export class S3StorageProvider implements FileStorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? 'deal-coordinator-files';

    const config: S3ClientConfig = {
      region: process.env.S3_REGION ?? 'us-east-1',
    };

    if (process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY) {
      config.credentials = {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      };
    }

    if (process.env.S3_ENDPOINT) {
      config.endpoint = process.env.S3_ENDPOINT;
      config.forcePathStyle = true;
    }

    this.client = new S3Client(config);
  }

  async initializeDealFolders(workspaceId: string, dealId: string): Promise<string[]> {
    const created: string[] = [];
    for (const folder of DEFAULT_FOLDERS) {
      const key = `${workspaceId}/${dealId}/${folder}/.keep`;
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: '',
          ContentType: 'application/octet-stream',
        }),
      );
      created.push(`${workspaceId}/${dealId}/${folder}`);
    }
    return created;
  }

  async storeFile(
    workspaceId: string,
    dealId: string,
    folder: string,
    filename: string,
    content: Buffer | string,
  ): Promise<string> {
    const key = `${workspaceId}/${dealId}/${folder}/${filename}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: typeof content === 'string' ? Buffer.from(content) : content,
        ContentType: this.inferContentType(filename),
      }),
    );
    return key;
  }

  async uploadFile(key: string, content: Buffer | string, contentType?: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: typeof content === 'string' ? Buffer.from(content) : content,
        ContentType: contentType ?? this.inferContentType(key),
      }),
    );
    return key;
  }

  async getFileUrl(_workspaceId: string, filePath: string): Promise<string> {
    return this.getSignedUrl(filePath);
  }

  async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async listFiles(
    workspaceId: string,
    dealId: string,
  ): Promise<{ path: string; name: string; folder: string }[]> {
    const prefix = `${workspaceId}/${dealId}/`;
    const results: { path: string; name: string; folder: string }[] = [];

    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const obj of response.Contents ?? []) {
        const objectKey = obj.Key;
        if (!objectKey || objectKey.endsWith('.keep')) continue;
        const relativePath = objectKey.slice(prefix.length);
        const parts = relativePath.split('/');
        const name = parts[parts.length - 1] ?? '';
        const folder = parts.slice(0, -1).join('/');
        results.push({ path: objectKey, name, folder });
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return results;
  }

  async listFilesByPrefix(prefix: string): Promise<{ key: string }[]> {
    const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`;
    const results: { key: string }[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: normalized,
          ContinuationToken: continuationToken,
        }),
      );

      for (const obj of response.Contents ?? []) {
        const objectKey = obj.Key;
        if (!objectKey || objectKey.endsWith('.keep')) continue;
        results.push({ key: objectKey });
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return results;
  }

  async createFolder(key: string): Promise<void> {
    const folderKey = key.endsWith('/') ? `${key}.keep` : `${key}/.keep`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: folderKey,
        Body: '',
        ContentType: 'application/octet-stream',
      }),
    );
  }

  private inferContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      csv: 'text/csv',
    };
    return types[ext ?? ''] ?? 'application/octet-stream';
  }
}
