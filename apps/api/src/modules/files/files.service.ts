import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import type {
  FileStorageProvider} from '../file-storage/file-storage.interface';
import {
  FILE_STORAGE_PROVIDER,
} from '../file-storage/file-storage.interface';
import {
  DEAL_FILES_ROOT_PATH,
  DEFAULT_DEAL_FOLDER_LEAVES,
  DEFAULT_DEAL_FOLDER_MARKER_PATH,
  dealFilesSidebarLabel,
  parseFolderTemplateRoots,
  folderPathForRoutingKind,
  inferFileRoutingKind,
  sortDealTemplateChildFolders,
  sortWorkspaceRootFolders,
  type FileRoutingKind,
  type FolderTemplateNode,
} from '@deal-coordinator/shared';
import { readBytesFromStorageKey } from '../../common/storage-read.util';

function dealStorageBase(workspaceId: string, dealId: string): string {
  return `${workspaceId}/deals/${dealId}`;
}

const ROUTING_KINDS: FileRoutingKind[] = [
  'listing_agreement',
  'disclosure',
  'contract',
  'signed',
  'offer',
  'communication',
  'closing',
  'general',
];

function parseRoutingKind(raw: unknown): FileRoutingKind | undefined {
  if (typeof raw !== 'string') return undefined;
  return ROUTING_KINDS.includes(raw as FileRoutingKind) ? (raw as FileRoutingKind) : undefined;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly storage: FileStorageProvider,
  ) {}

  async listFolders(
    workspaceId: string,
    params: { dealId?: string; parentId?: string; scope?: string },
  ): Promise<any[]> {
    const where: any = { workspaceId };
    if (params.dealId) where.dealId = params.dealId;
    if (params.parentId) where.parentId = params.parentId;
    else if (!params.parentId) where.parentId = null;
    if (params.scope) where.scope = params.scope;

    const rows = await this.prisma.folder.findMany({
      where,
      include: { _count: { select: { files: true, children: true } } },
    });
    if (params.parentId) {
      return sortDealTemplateChildFolders(rows);
    }
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }

  async createFolder(
    workspaceId: string,
    data: { name: string; dealId?: string; parentId?: string; scope?: string },
    actorId: string,
    requestId: string,
  ): Promise<any> {
    let parentPath = '';
    let dealId = data.dealId;
    if (data.parentId) {
      const parent = await this.prisma.folder.findUnique({ where: { id: data.parentId } });
      if (!parent) throw new NotFoundException('Parent folder not found');
      if (parent.workspaceId !== workspaceId) {
        throw new NotFoundException('Parent folder not found');
      }
      parentPath = parent.path;
      if (dealId === undefined && parent.dealId != null) {
        dealId = parent.dealId;
      }
    }

    const folderPath = parentPath ? `${parentPath}/${data.name}` : data.name;
    const scope = data.scope ?? (dealId ? 'deal' : 'workspace');

    const storageKey = dealId
      ? `${dealStorageBase(workspaceId, dealId)}/${folderPath}`
      : `${workspaceId}/_files/${folderPath}`;

    await this.storage.createFolder(storageKey);

    const folder = await this.prisma.folder.create({
      data: {
        workspaceId,
        dealId,
        parentId: data.parentId,
        name: data.name,
        path: folderPath,
        scope,
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'document_created',
      objectType: 'Folder',
      objectId: folder.id,
      actorType: 'user',
      actorId,
      after: folder,
      requestId,
    });

    return folder;
  }

  /**
   * Reparents legacy deal folders that lived at parentId=null (listing, …) under the deal `root` umbrella.
   * Creates the umbrella when missing. If `root` already exists (new seed), still reparents any stragglers.
   */
  private async migrateLegacyDealFolders(workspaceId: string, dealId: string): Promise<void> {
    const LEGACY_TOP_LEVEL = ['listing', 'disclosures', 'contracts', 'general'] as const;
    const legacyRows = await this.prisma.folder.findMany({
      where: {
        workspaceId,
        dealId,
        parentId: null,
        path: { in: [...LEGACY_TOP_LEVEL] },
      },
    });
    if (legacyRows.length === 0) return;

    let umbrella = await this.prisma.folder.findFirst({
      where: { workspaceId, dealId, path: DEAL_FILES_ROOT_PATH },
      select: { id: true },
    });

    if (!umbrella) {
      const deal = await this.prisma.deal.findUnique({
        where: { id: dealId },
        select: { displayName: true, title: true, propertyAddress: true },
      });
      if (!deal) return;

      const label =
        deal.displayName?.trim() ||
        deal.title?.trim() ||
        deal.propertyAddress?.trim() ||
        'Deal';

      const umbrellaKey = `${dealStorageBase(workspaceId, dealId)}/${DEAL_FILES_ROOT_PATH}`;
      await this.storage.createFolder(umbrellaKey);

      const created = await this.prisma.folder.create({
        data: {
          workspaceId,
          dealId,
          parentId: null,
          name: label,
          path: DEAL_FILES_ROOT_PATH,
          scope: 'deal',
        },
      });
      umbrella = { id: created.id };
    }

    const base = dealStorageBase(workspaceId, dealId);
    for (const row of legacyRows) {
      const newPath = `${DEAL_FILES_ROOT_PATH}/${row.name}`;
      await this.prisma.folder.update({
        where: { id: row.id },
        data: { parentId: umbrella.id, path: newPath },
      });

      const oldPrefix = `${base}/${row.path}/`;
      const files = await this.prisma.fileAsset.findMany({
        where: { workspaceId, folderId: row.id },
        select: { id: true, fileKey: true },
      });
      for (const asset of files) {
        if (!asset.fileKey.startsWith(oldPrefix)) continue;
        const suffix = asset.fileKey.slice(oldPrefix.length);
        const newKey = `${base}/${newPath}/${suffix}`;
        await this.prisma.fileAsset.update({
          where: { id: asset.id },
          data: { fileKey: newKey },
        });
      }
    }
  }

  /**
   * Creates the per-deal umbrella folder (`root`) and default leaves from FolderTemplate (or built-in default).
   * Idempotent when `root` already exists for the deal.
   */
  async ensureDefaultDealFolders(
    workspaceId: string,
    dealId: string,
    actorId: string,
    requestId: string,
    workflowKey = 'default',
  ): Promise<void> {
    await this.migrateLegacyDealFolders(workspaceId, dealId);

    const exists = await this.prisma.folder.findFirst({
      where: { workspaceId, dealId, path: DEFAULT_DEAL_FOLDER_MARKER_PATH },
    });
    if (exists) return;

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      select: { displayName: true, title: true, propertyAddress: true },
    });
    if (!deal) return;

    const label =
      deal.displayName?.trim() ||
      deal.title?.trim() ||
      deal.propertyAddress?.trim() ||
      'Deal';

    const template = await this.prisma.folderTemplate.findUnique({
      where: { workflowKey },
    });
    const leaves: FolderTemplateNode[] = template
      ? parseFolderTemplateRoots(template.structureJson)
      : DEFAULT_DEAL_FOLDER_LEAVES;
    if (!leaves.length) return;

    const umbrellaKey = `${dealStorageBase(workspaceId, dealId)}/${DEAL_FILES_ROOT_PATH}`;
    await this.storage.createFolder(umbrellaKey);
    const umbrella = await this.prisma.folder.create({
      data: {
        workspaceId,
        dealId,
        parentId: null,
        name: label,
        path: DEAL_FILES_ROOT_PATH,
        scope: 'deal',
      },
    });

    const walk = async (
      nodes: FolderTemplateNode[],
      parentId: string,
      parentPath: string,
    ): Promise<void> => {
      for (const node of nodes) {
        const path = `${parentPath}/${node.name}`;
        const storageKey = `${dealStorageBase(workspaceId, dealId)}/${path}`;
        await this.storage.createFolder(storageKey);
        const folder = await this.prisma.folder.create({
          data: {
            workspaceId,
            dealId,
            parentId,
            name: node.name,
            path,
            scope: 'deal',
          },
        });
        if (node.children?.length) {
          await walk(node.children, folder.id, path);
        }
      }
    };

    await walk(leaves, umbrella.id, DEAL_FILES_ROOT_PATH);

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'deal_folders_seeded',
      objectType: 'Deal',
      objectId: dealId,
      actorType: 'user',
      actorId,
      metadata: { workflowKey },
      requestId,
    });
  }

  async listFiles(
    workspaceId: string,
    params: { dealId?: string; folderId?: string; scope?: string },
  ): Promise<any[]> {
    const where: any = { workspaceId };
    if (params.dealId) where.dealId = params.dealId;
    if (params.folderId) where.folderId = params.folderId;
    if (params.scope) where.scope = params.scope;

    return this.prisma.fileAsset.findMany({
      where,
      include: { folder: { select: { id: true, name: true, path: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listFilesInFolder(workspaceId: string, folderId: string): Promise<any[]> {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, workspaceId },
    });
    if (!folder) throw new NotFoundException('Folder not found');

    return this.prisma.fileAsset.findMany({
      where: { workspaceId, folderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadFile(
    workspaceId: string,
    data: {
      fileName: string;
      content: Buffer;
      mimeType?: string;
      dealId?: string;
      folderId?: string;
      scope?: string;
      /** When set, overrides filename-based routing for deal uploads. */
      routingKind?: FileRoutingKind;
    },
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const explicit = parseRoutingKind(data.routingKind);
    const inferred: FileRoutingKind | undefined = data.dealId
      ? explicit ?? inferFileRoutingKind(data.fileName, data.mimeType)
      : undefined;

    let folderId = data.folderId;
    let folderPath = '';

    if (data.dealId) {
      if (folderId) {
        const folder = await this.prisma.folder.findFirst({
          where: { id: folderId, workspaceId, dealId: data.dealId },
        });
        if (!folder) throw new BadRequestException('Folder not found for this deal');
        folderPath = folder.path;
      } else if (inferred) {
        const rel = folderPathForRoutingKind(inferred);
        let folder = await this.prisma.folder.findFirst({
          where: { workspaceId, dealId: data.dealId, path: rel },
        });
        if (!folder) {
          folder = await this.prisma.folder.findFirst({
            where: {
              workspaceId,
              dealId: data.dealId,
              path: folderPathForRoutingKind('general'),
            },
          });
        }
        if (folder) {
          folderId = folder.id;
          folderPath = folder.path;
        }
      }
    } else if (folderId) {
      const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
      if (folder) folderPath = folder.path;
    }

    const scope = data.scope ?? (data.dealId ? 'deal' : 'workspace');
    const keyBase = data.dealId
      ? dealStorageBase(workspaceId, data.dealId)
      : `${workspaceId}/_files`;
    const fileKey = folderPath
      ? `${keyBase}/${folderPath}/${data.fileName}`
      : `${keyBase}/${data.fileName}`;

    await this.storage.uploadFile(fileKey, data.content, data.mimeType);

    const asset = await this.prisma.fileAsset.create({
      data: {
        workspaceId,
        dealId: data.dealId,
        folderId,
        fileName: data.fileName,
        assetType: inferred ?? undefined,
        fileKey,
        mimeType: data.mimeType,
        fileSize: data.content.length,
        scope,
        uploadedBy: actorId,
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId: data.dealId,
      action: 'document_created',
      objectType: 'FileAsset',
      objectId: asset.id,
      actorType: 'user',
      actorId,
      after: {
        fileName: asset.fileName,
        fileKey: asset.fileKey,
        fileSize: asset.fileSize,
        assetType: asset.assetType,
      },
      requestId,
    });

    return asset;
  }

  async getFileUrl(fileId: string): Promise<string> {
    const asset = await this.prisma.fileAsset.findUnique({ where: { id: fileId } });
    if (!asset) throw new NotFoundException('File not found');
    return this.storage.getSignedUrl(asset.fileKey);
  }

  async getFileAssetMeta(
    workspaceId: string,
    fileId: string,
  ): Promise<{
    id: string;
    fileName: string;
    mimeType: string | null;
    fileSize: number | null;
  }> {
    const asset = await this.prisma.fileAsset.findFirst({
      where: { id: fileId, workspaceId },
      select: { id: true, fileName: true, mimeType: true, fileSize: true },
    });
    if (!asset) throw new NotFoundException('File not found');
    return asset;
  }

  async getFileAssetBuffer(
    workspaceId: string,
    fileId: string,
  ): Promise<{ buffer: Buffer; mimeType: string | null; fileName: string }> {
    const asset = await this.prisma.fileAsset.findFirst({
      where: { id: fileId, workspaceId },
    });
    if (!asset) throw new NotFoundException('File not found');
    const buffer = await readBytesFromStorageKey(this.storage, asset.fileKey);
    if (!buffer?.length) throw new NotFoundException('File content not found');
    return {
      buffer,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
    };
  }

  async deleteFile(
    workspaceId: string,
    fileId: string,
    actorId: string,
    requestId: string,
  ): Promise<void> {
    const asset = await this.prisma.fileAsset.findFirst({
      where: { id: fileId, workspaceId },
    });
    if (!asset) throw new NotFoundException('File not found');

    await this.storage.deleteFile(asset.fileKey);

    await this.prisma.fileAsset.delete({ where: { id: fileId } });

    await this.auditService.create({
      workspaceId,
      dealId: asset.dealId ?? undefined,
      action: 'document_created',
      objectType: 'FileAsset',
      objectId: fileId,
      actorType: 'user',
      actorId,
      before: { fileName: asset.fileName, fileKey: asset.fileKey },
      requestId,
    });
  }

  async deleteFolder(
    workspaceId: string,
    folderId: string,
    actorId: string,
    requestId: string,
  ): Promise<void> {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, workspaceId },
      include: { _count: { select: { files: true, children: true } } },
    });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder._count.files > 0 || folder._count.children > 0) {
      throw new BadRequestException('Folder must be empty before deletion');
    }

    await this.prisma.folder.delete({ where: { id: folderId } });

    await this.auditService.create({
      workspaceId,
      dealId: folder.dealId ?? undefined,
      action: 'document_created',
      objectType: 'Folder',
      objectId: folderId,
      actorType: 'user',
      actorId,
      before: { name: folder.name, path: folder.path },
      requestId,
    });
  }

  /**
   * Structured Files navigation: workspace roots (ordered) + deals (each with `root` folder + deal label).
   * Shape is defined in `@deal-coordinator/shared` (`files-navigation.ts`).
   */
  async getFolderTree(workspaceId: string): Promise<{
    workspace: any[];
    deals: Array<{ dealId: string; label: string; rootFolder: any }>;
  }> {
    const dealsInWs = await this.prisma.deal.findMany({
      where: { workspaceId },
      select: {
        id: true,
        displayName: true,
        title: true,
        propertyAddress: true,
        address: true,
        createdAt: true,
      },
    });
    for (const d of dealsInWs) {
      await this.migrateLegacyDealFolders(workspaceId, d.id);
    }

    const rootFolders = await this.prisma.folder.findMany({
      where: {
        workspaceId,
        parentId: null,
        OR: [{ dealId: null }, { dealId: { not: null }, path: DEAL_FILES_ROOT_PATH }],
      },
      include: { _count: { select: { files: true, children: true } } },
    });

    const workspace = sortWorkspaceRootFolders(rootFolders.filter((f) => f.dealId === null));

    const dealRootByDealId = new Map(
      rootFolders
        .filter((f) => f.dealId != null && f.path === DEAL_FILES_ROOT_PATH)
        .map((f) => [f.dealId as string, f]),
    );

    const deals = dealsInWs
      .map((deal) => {
        const rootFolder = dealRootByDealId.get(deal.id);
        if (!rootFolder) return null;
        return {
          dealId: deal.id,
          label: dealFilesSidebarLabel(deal),
          rootFolder,
        };
      })
      .filter((x): x is { dealId: string; label: string; rootFolder: (typeof rootFolders)[0] } => x != null);

    deals.sort((a, b) => {
      const cmp = a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
      if (cmp !== 0) return cmp;
      return a.dealId.localeCompare(b.dealId);
    });

    return { workspace, deals };
  }

  /** Deal detail: umbrella row at parentId null with one level of children (template folders). */
  async getDealFolderTreeForDeal(workspaceId: string, dealId: string): Promise<any[]> {
    await this.migrateLegacyDealFolders(workspaceId, dealId);
    const trees = await this.prisma.folder.findMany({
      where: { workspaceId, dealId, parentId: null, path: DEAL_FILES_ROOT_PATH },
      include: {
        children: {
          include: { _count: { select: { files: true, children: true } } },
        },
        _count: { select: { files: true, children: true } },
      },
      orderBy: { name: 'asc' },
    });
    return trees.map((t) => ({
      ...t,
      children: t.children?.length ? sortDealTemplateChildFolders(t.children) : [],
    }));
  }

  async getFolderContents(
    workspaceId: string,
    folderId: string,
    opts: { filePage?: number; filePageSize?: number },
  ): Promise<{
    folder: any;
    breadcrumb: any[];
    childFolders: any[];
    files: any[];
    filePagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, workspaceId },
    });
    if (!folder) throw new NotFoundException('Folder not found');

    const breadcrumb: any[] = [];
    let cur: any = folder;
    for (;;) {
      breadcrumb.unshift({
        id: cur.id,
        name: cur.name,
        path: cur.path,
        dealId: cur.dealId,
        parentId: cur.parentId,
        scope: cur.scope,
      });
      if (!cur.parentId) break;
      const parent = await this.prisma.folder.findFirst({
        where: { id: cur.parentId, workspaceId },
      });
      if (!parent) break;
      cur = parent;
    }

    const page = Math.max(1, opts.filePage ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.filePageSize ?? 25));
    const skip = (page - 1) * pageSize;

    const [rawChildFolders, files, totalFiles] = await Promise.all([
      this.prisma.folder.findMany({
        where: { workspaceId, parentId: folderId },
        include: { _count: { select: { files: true, children: true } } },
      }),
      this.prisma.fileAsset.findMany({
        where: { workspaceId, folderId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.fileAsset.count({ where: { workspaceId, folderId } }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalFiles / pageSize));
    const childFolders = sortDealTemplateChildFolders(rawChildFolders);

    return {
      folder,
      breadcrumb,
      childFolders,
      files,
      filePagination: { page, pageSize, total: totalFiles, totalPages },
    };
  }
}
