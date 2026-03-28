import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilesService } from '../src/modules/files/files.service';

const mockPrisma = {
  folder: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  fileAsset: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
};

const mockAudit = {
  create: vi.fn().mockResolvedValue(undefined),
};

const mockStorage = {
  uploadFile: vi.fn().mockResolvedValue('ws-1/files/test.pdf'),
  getSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com/test.pdf'),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  createFolder: vi.fn().mockResolvedValue(undefined),
};

function createService() {
  return new FilesService(mockPrisma as any, mockAudit as any, mockStorage as any);
}

describe('FilesService', () => {
  let service: FilesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createService();
  });

  describe('createFolder', () => {
    it('creates a root folder', async () => {
      mockPrisma.folder.create.mockResolvedValue({
        id: 'folder-1',
        name: 'Documents',
        path: 'Documents',
        scope: 'workspace',
      });

      const result = await service.createFolder(
        'ws-1',
        { name: 'Documents', scope: 'workspace' },
        'user-1',
        'req-1',
      );

      expect(mockStorage.createFolder).toHaveBeenCalledWith('ws-1/_files/Documents');
      expect(mockPrisma.folder.create).toHaveBeenCalled();
      expect(mockAudit.create).toHaveBeenCalled();
      expect(result.name).toBe('Documents');
    });

    it('creates a nested folder with parent path', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({
        id: 'parent-1',
        path: 'Documents',
      });
      mockPrisma.folder.create.mockResolvedValue({
        id: 'folder-2',
        name: 'Contracts',
        path: 'Documents/Contracts',
        scope: 'deal',
      });

      await service.createFolder(
        'ws-1',
        { name: 'Contracts', parentId: 'parent-1', dealId: 'deal-1' },
        'user-1',
        'req-2',
      );

      expect(mockStorage.createFolder).toHaveBeenCalledWith(
        'ws-1/deals/deal-1/Documents/Contracts',
      );
    });
  });

  describe('uploadFile', () => {
    it('uploads a file and creates asset record', async () => {
      mockPrisma.fileAsset.create.mockResolvedValue({
        id: 'file-1',
        fileName: 'contract.pdf',
        fileKey: 'ws-1/_files/contract.pdf',
        fileSize: 1024,
      });

      const result = await service.uploadFile(
        'ws-1',
        {
          fileName: 'contract.pdf',
          content: Buffer.from('pdf content'),
          mimeType: 'application/pdf',
        },
        'user-1',
        'req-3',
      );

      expect(mockStorage.uploadFile).toHaveBeenCalled();
      expect(mockPrisma.fileAsset.create).toHaveBeenCalled();
      expect(result.fileName).toBe('contract.pdf');
    });
  });

  describe('getFileUrl', () => {
    it('returns signed URL for existing file', async () => {
      mockPrisma.fileAsset.findUnique.mockResolvedValue({
        id: 'file-1',
        fileKey: 'ws-1/files/test.pdf',
      });

      const url = await service.getFileUrl('file-1');
      expect(url).toContain('signed-url');
      expect(mockStorage.getSignedUrl).toHaveBeenCalledWith('ws-1/files/test.pdf');
    });

    it('throws for non-existent file', async () => {
      mockPrisma.fileAsset.findUnique.mockResolvedValue(null);
      await expect(service.getFileUrl('nonexistent')).rejects.toThrow('File not found');
    });
  });

  describe('deleteFile', () => {
    it('deletes file from storage and database', async () => {
      mockPrisma.fileAsset.findFirst.mockResolvedValue({
        id: 'file-1',
        fileKey: 'ws-1/files/test.pdf',
        fileName: 'test.pdf',
        dealId: null,
      });

      await service.deleteFile('ws-1', 'file-1', 'user-1', 'req-4');

      expect(mockStorage.deleteFile).toHaveBeenCalledWith('ws-1/files/test.pdf');
      expect(mockPrisma.fileAsset.delete).toHaveBeenCalledWith({ where: { id: 'file-1' } });
    });
  });

  describe('deleteFolder', () => {
    it('prevents deletion of non-empty folders', async () => {
      mockPrisma.folder.findFirst.mockResolvedValue({
        id: 'folder-1',
        _count: { files: 2, children: 0 },
      });

      await expect(
        service.deleteFolder('ws-1', 'folder-1', 'user-1', 'req-5'),
      ).rejects.toThrow('Folder must be empty');
    });

    it('deletes empty folder', async () => {
      mockPrisma.folder.findFirst.mockResolvedValue({
        id: 'folder-1',
        name: 'Empty',
        path: 'Empty',
        dealId: null,
        _count: { files: 0, children: 0 },
      });

      await service.deleteFolder('ws-1', 'folder-1', 'user-1', 'req-6');

      expect(mockPrisma.folder.delete).toHaveBeenCalledWith({ where: { id: 'folder-1' } });
    });
  });
});
