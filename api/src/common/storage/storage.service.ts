import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.validation';

export interface UploadableFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export interface StoredObject {
  key: string;
  url: string;
}

/**
 * S3-compatible object storage — works unmodified against AWS S3, Supabase
 * Storage, Cloudflare R2, or (in dev) a local MinIO instance, since they all
 * speak the same S3 API. See docs/18-technical-architecture.md §1 and
 * prompts/stage-02-.../01-backend-prompt.md §1.
 */
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrlBase: string;

  constructor(configService: ConfigService<EnvConfig, true>) {
    this.bucket = configService.get('STORAGE_BUCKET', { infer: true });
    this.publicUrlBase = configService
      .get('STORAGE_PUBLIC_URL_BASE', { infer: true })
      .replace(/\/$/, '');

    this.client = new S3Client({
      endpoint: configService.get('STORAGE_ENDPOINT', { infer: true }),
      region: configService.get('STORAGE_REGION', { infer: true }),
      forcePathStyle: configService.get('STORAGE_FORCE_PATH_STYLE', {
        infer: true,
      }),
      credentials: {
        accessKeyId: configService.get('STORAGE_ACCESS_KEY_ID', {
          infer: true,
        }),
        secretAccessKey: configService.get('STORAGE_SECRET_ACCESS_KEY', {
          infer: true,
        }),
      },
    });
  }

  /** `folder` groups objects for readability (e.g. "school-logos", "student-photos"). */
  async upload(file: UploadableFile, folder: string): Promise<StoredObject> {
    const extension = file.originalName.includes('.')
      ? file.originalName.split('.').pop()
      : undefined;
    const key = `${folder}/${randomUUID()}${extension ? `.${extension}` : ''}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimeType,
      }),
    );

    return { key, url: `${this.publicUrlBase}/${key}` };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
