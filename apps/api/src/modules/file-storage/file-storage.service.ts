import { Inject, Injectable } from '@nestjs/common';
import type {
  FileStorageProvider} from './file-storage.interface';
import {
  FILE_STORAGE_PROVIDER
} from './file-storage.interface';
import type { AuditService } from '../audit/audit.service';

@Injectable()
export class FileStorageService {
  constructor(
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly provider: FileStorageProvider,
    private readonly auditService: AuditService,
  ) {}

  async initializeDealFolders(
    workspaceId: string,
    dealId: string,
    actorId: string,
    requestId?: string,
  ): Promise<string[]> {
    const folders = await this.provider.initializeDealFolders(
      workspaceId,
      dealId,
    );

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'folders_initialized',
      objectType: 'deal_folders',
      objectId: dealId,
      actorType: 'user',
      actorId,
      after: { folders },
      requestId,
    });

    return folders;
  }

  async storeFile(
    workspaceId: string,
    dealId: string,
    folder: string,
    filename: string,
    content: Buffer | string,
    actorId: string,
    requestId?: string,
  ): Promise<string> {
    const filePath = await this.provider.storeFile(
      workspaceId,
      dealId,
      folder,
      filename,
      content,
    );

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'file_stored',
      objectType: 'file',
      objectId: filePath,
      actorType: 'user',
      actorId,
      after: { folder, filename, path: filePath },
      requestId,
    });

    return filePath;
  }

  async getFileUrl(workspaceId: string, filePath: string): Promise<string> {
    return this.provider.getFileUrl(workspaceId, filePath);
  }

  async listFiles(
    workspaceId: string,
    dealId: string,
  ): Promise<{ path: string; name: string; folder: string }[]> {
    return this.provider.listFiles(workspaceId, dealId);
  }
}
