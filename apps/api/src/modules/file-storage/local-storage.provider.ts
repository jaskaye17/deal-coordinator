import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
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
export class LocalStorageProvider implements FileStorageProvider {
  private readonly basePath: string;

  constructor() {
    this.basePath = process.env.STORAGE_LOCAL_PATH || './tmp/storage';
  }

  async initializeDealFolders(
    workspaceId: string,
    dealId: string,
  ): Promise<string[]> {
    const createdPaths: string[] = [];

    for (const folder of DEFAULT_FOLDERS) {
      const folderPath = path.join(
        this.basePath,
        workspaceId,
        dealId,
        folder,
      );
      await fs.mkdir(folderPath, { recursive: true });
      createdPaths.push(
        path.join(workspaceId, dealId, folder),
      );
    }

    return createdPaths;
  }

  async storeFile(
    workspaceId: string,
    dealId: string,
    folder: string,
    filename: string,
    content: Buffer | string,
  ): Promise<string> {
    const dirPath = path.join(this.basePath, workspaceId, dealId, folder);
    await fs.mkdir(dirPath, { recursive: true });

    const filePath = path.join(dirPath, filename);
    await fs.writeFile(filePath, content);

    return path.join(workspaceId, dealId, folder, filename);
  }

  async getFileUrl(workspaceId: string, filePath: string): Promise<string> {
    return filePath;
  }

  async listFiles(
    workspaceId: string,
    dealId: string,
  ): Promise<{ path: string; name: string; folder: string }[]> {
    const dealDir = path.join(this.basePath, workspaceId, dealId);
    const results: { path: string; name: string; folder: string }[] = [];

    try {
      await fs.access(dealDir);
    } catch {
      return results;
    }

    await this.walkDirectory(dealDir, workspaceId, dealId, results);
    return results;
  }

  async uploadFile(key: string, content: Buffer | string, _contentType?: string): Promise<string> {
    const filePath = path.join(this.basePath, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return key;
  }

  async getSignedUrl(_key: string): Promise<string> {
    return path.join(this.basePath, _key);
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key);
    try {
      await fs.unlink(filePath);
    } catch {
      // File may not exist
    }
  }

  async createFolder(key: string): Promise<void> {
    const folderPath = path.join(this.basePath, key);
    await fs.mkdir(folderPath, { recursive: true });
  }

  async listFilesByPrefix(prefix: string): Promise<{ key: string }[]> {
    const root = path.join(this.basePath, prefix);
    const results: { key: string }[] = [];
    try {
      await fs.access(root);
    } catch {
      return results;
    }
    await this.collectKeysUnder(root, this.basePath, results);
    return results;
  }

  private async collectKeysUnder(
    dir: string,
    base: string,
    out: { key: string }[],
  ): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.collectKeysUnder(full, base, out);
      } else if (entry.isFile()) {
        const rel = path.relative(base, full);
        out.push({ key: rel.split(path.sep).join('/') });
      }
    }
  }

  private async walkDirectory(
    dir: string,
    workspaceId: string,
    dealId: string,
    results: { path: string; name: string; folder: string }[],
  ): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.walkDirectory(fullPath, workspaceId, dealId, results);
      } else {
        const relativePath = path.relative(this.basePath, fullPath);
        const dealBase = path.join(workspaceId, dealId);
        const withinDeal = path.relative(
          path.join(this.basePath, dealBase),
          fullPath,
        );
        const folder = path.dirname(withinDeal);

        results.push({
          path: relativePath,
          name: entry.name,
          folder,
        });
      }
    }
  }
}
