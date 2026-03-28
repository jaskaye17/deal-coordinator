import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilesService } from '../src/modules/files/files.service';

const mockPrisma = {
  folder: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  fileAsset: {
    create: vi.fn(),
  },
  folderTemplate: {
    findUnique: vi.fn(),
  },
};

const mockAudit = { create: vi.fn().mockResolvedValue(undefined) };

const mockStorage = {
  uploadFile: vi.fn().mockResolvedValue(undefined),
  getSignedUrl: vi.fn(),
  deleteFile: vi.fn(),
  createFolder: vi.fn().mockResolvedValue(undefined),
};

describe('FilesService upload routing', () => {
  let service: FilesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FilesService(mockPrisma as any, mockAudit as any, mockStorage as any);
  });

  it('places deal uploads in inferred folder by filename', async () => {
    const listingFolder = { id: 'fld-list', path: 'root/listing' };
    mockPrisma.folder.findFirst.mockResolvedValue(listingFolder);
    mockPrisma.fileAsset.create.mockResolvedValue({
      id: 'f1',
      fileName: 'Listing Agreement.pdf',
      fileKey: 'ws/deals/deal-1/root/listing/Listing Agreement.pdf',
    });

    await service.uploadFile(
      'ws',
      {
        fileName: 'Listing Agreement.pdf',
        content: Buffer.from('x'),
        dealId: 'deal-1',
      },
      'user-1',
      'req-1',
    );

    expect(mockPrisma.folder.findFirst).toHaveBeenCalledWith({
      where: { workspaceId: 'ws', dealId: 'deal-1', path: 'root/listing' },
    });
    expect(mockPrisma.fileAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          folderId: 'fld-list',
          assetType: 'listing_agreement',
        }),
      }),
    );
    expect(mockStorage.uploadFile).toHaveBeenCalledWith(
      'ws/deals/deal-1/root/listing/Listing Agreement.pdf',
      expect.any(Buffer),
      undefined,
    );
  });
});
