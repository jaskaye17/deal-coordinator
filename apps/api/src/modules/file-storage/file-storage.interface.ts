export interface FileStorageProvider {
  initializeDealFolders(workspaceId: string, dealId: string): Promise<string[]>;

  storeFile(
    workspaceId: string,
    dealId: string,
    folder: string,
    filename: string,
    content: Buffer | string,
  ): Promise<string>;

  uploadFile(
    key: string,
    content: Buffer | string,
    contentType?: string,
  ): Promise<string>;

  getFileUrl(workspaceId: string, path: string): Promise<string>;

  getSignedUrl(key: string): Promise<string>;

  deleteFile(key: string): Promise<void>;

  listFiles(
    workspaceId: string,
    dealId: string,
  ): Promise<{ path: string; name: string; folder: string }[]>;

  /** List object keys under a prefix (e.g. global template uploads). Keys are relative to provider root. */
  listFilesByPrefix(prefix: string): Promise<{ key: string }[]>;

  createFolder(key: string): Promise<void>;
}

export const FILE_STORAGE_PROVIDER = 'FILE_STORAGE_PROVIDER';
