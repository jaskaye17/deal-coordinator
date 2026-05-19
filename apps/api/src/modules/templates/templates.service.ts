import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FILE_STORAGE_PROVIDER,
  type FileStorageProvider,
} from '../file-storage/file-storage.interface';
import { Prisma } from '@deal-coordinator/db';
import { TemplateFieldDetectionService } from './template-field-detection.service';
import { readBytesFromStorageKey } from '../../common/storage-read.util';

function slugifyKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function safeStorageFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
  return base.toLowerCase().endsWith('.pdf') ? base : `${base || 'upload'}.pdf`;
}

export type ListTemplatesParams = {
  page: number;
  pageSize: number;
  q?: string;
  documentType?: string;
  workflowKey?: string;
  scope?: 'all' | 'system' | 'workspace';
  status?: string;
};

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly storage: FileStorageProvider,
    private readonly templateFieldDetection: TemplateFieldDetectionService,
  ) {}

  async listPaginated(workspaceId: string, params: ListTemplatesParams) {
    const {
      page,
      pageSize,
      q,
      documentType,
      workflowKey,
      scope = 'all',
      status,
    } = params;
    const skip = (page - 1) * pageSize;

    let scopeWhere: Prisma.TemplateWhereInput;
    if (scope === 'system') {
      scopeWhere = { workspaceId: null, isSystemTemplate: true };
    } else if (scope === 'workspace') {
      scopeWhere = { workspaceId };
    } else {
      scopeWhere = {
        OR: [
          { workspaceId: null, isSystemTemplate: true },
          { workspaceId },
        ],
      };
    }

    const qTrim = q?.trim();
    const searchWhere: Prisma.TemplateWhereInput = qTrim
      ? { name: { contains: qTrim, mode: 'insensitive' } }
      : {};

    const docTypeWhere: Prisma.TemplateWhereInput = documentType?.trim()
      ? { documentType: documentType.trim() }
      : {};

    const statusWhere: Prisma.TemplateWhereInput = status?.trim()
      ? { status: status.trim() }
      : {};

    const workflowWhere: Prisma.TemplateWhereInput = workflowKey?.trim()
      ? {
          workflows: {
            some: { workflowKey: workflowKey.trim() },
          },
        }
      : {};

    const where: Prisma.TemplateWhereInput = {
      AND: [scopeWhere, searchWhere, docTypeWhere, statusWhere, workflowWhere],
    };

    const [total, rows] = await Promise.all([
      this.prisma.template.count({ where }),
      this.prisma.template.findMany({
        where,
        include: {
          workflows: { include: { workflow: true } },
          versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        },
        orderBy: [{ isSystemTemplate: 'desc' }, { name: 'asc' }],
        skip,
        take: pageSize,
      }),
    ]);

    const items = await Promise.all(rows.map((t) => this.decorateListRow(t)));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items,
      meta: { page, pageSize, total, totalPages },
    };
  }

  async getById(workspaceId: string, id: string) {
    const t = await this.prisma.template.findFirst({
      where: {
        id,
        OR: [
          { workspaceId: null, isSystemTemplate: true },
          { workspaceId },
        ],
      },
      include: {
        workflows: { include: { workflow: true } },
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });
    if (!t) throw new NotFoundException('Template not found');
    return this.decorateDetail(t);
  }

  async getLatestPdfBuffer(
    workspaceId: string,
    templateId: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const t = await this.prisma.template.findFirst({
      where: {
        id: templateId,
        OR: [
          { workspaceId: null, isSystemTemplate: true },
          { workspaceId },
        ],
      },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });
    if (!t) throw new NotFoundException('Template not found');
    const latest = t.versions[0];
    if (!latest) throw new NotFoundException('Template has no PDF version');
    const buffer = await readBytesFromStorageKey(this.storage, latest.storageKey);
    if (!buffer?.length) throw new NotFoundException('PDF could not be loaded');
    return { buffer, fileName: latest.sourceFileName };
  }

  async listVersions(workspaceId: string, templateId: string) {
    await this.assertTemplateAccess(workspaceId, templateId);
    const versions = await this.prisma.templateVersion.findMany({
      where: { templateId },
      orderBy: { versionNumber: 'desc' },
    });
    return Promise.all(
      versions.map(async (v) => ({
        ...v,
        downloadUrl: await this.signedUrlOrNull(v.storageKey),
      })),
    );
  }

  async createFromUpload(
    workspaceId: string,
    opts: {
      file: { buffer: Buffer; originalname: string; mimetype: string };
      name: string;
      slug: string;
      documentType: string;
      description?: string;
      workflows: string[];
      isGlobal: boolean;
      role: string;
      fieldMappingJson?: Record<string, unknown> | null;
      jurisdiction?: string;
    },
  ) {
    if (opts.isGlobal && opts.role !== 'admin') {
      throw new ForbiddenException('Only admins can add global templates');
    }

    const buf = opts.file.buffer;
    if (!buf?.length || !buf.subarray(0, Math.min(5, buf.length)).toString().startsWith('%PDF')) {
      throw new BadRequestException('File must be a PDF');
    }

    const slug = slugifyKey(opts.slug);
    if (!slug) throw new BadRequestException('Invalid slug');

    const exists = await this.prisma.template.findUnique({ where: { slug } });
    if (exists) throw new BadRequestException('Slug already in use');

    const fileHash = createHash('sha256').update(buf).digest('hex');
    const sourceName = safeStorageFileName(opts.file.originalname);
    const isGlobal = opts.isGlobal;
    const wsId = isGlobal ? null : workspaceId;

    const t = await this.prisma.template.create({
      data: {
        workspaceId: wsId,
        name: opts.name.trim(),
        slug,
        documentType: opts.documentType.trim(),
        description: opts.description?.trim() ?? null,
        isSystemTemplate: isGlobal,
        status: 'active',
        tags: [],
        notes: null,
        isRequiredByDefault: false,
        jurisdiction: opts.jurisdiction?.trim() ?? null,
        ...(opts.fieldMappingJson === undefined
          ? {}
          : opts.fieldMappingJson === null
            ? { fieldMappingJson: Prisma.JsonNull }
            : {
                fieldMappingJson:
                  opts.fieldMappingJson as Prisma.InputJsonValue,
              }),
      },
    });

    const storageKey = isGlobal
      ? `global-templates/${slug}/v1/${sourceName}`
      : `workspace-templates/${workspaceId}/${slug}/v1/${sourceName}`;

    await this.storage.uploadFile(storageKey, buf, 'application/pdf');
    const fileUrl = await this.signedUrlOrNull(storageKey);

    const versionRow = await this.prisma.templateVersion.create({
      data: {
        templateId: t.id,
        versionNumber: 1,
        sourceFileName: sourceName,
        storageKey,
        fileUrl,
        fileHash,
        fileType: 'pdf',
      },
    });

    await this.syncWorkflowLinks(t.id, opts.workflows);

    try {
      await this.templateFieldDetection.persistForVersion(versionRow.id, buf);
    } catch (e) {
      this.logger.warn(`Template field auto-detect failed: ${e}`);
    }

    return this.getById(workspaceId, t.id);
  }

  async duplicateTemplate(
    workspaceId: string,
    sourceTemplateId: string,
    body: { name: string; slug: string },
    _role: string,
  ) {
    await this.assertTemplateAccess(workspaceId, sourceTemplateId);
    const source = await this.prisma.template.findFirst({
      where: { id: sourceTemplateId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        workflows: true,
      },
    });
    if (!source) throw new NotFoundException('Template not found');
    const latest = source.versions[0];
    if (!latest) throw new BadRequestException('Template has no PDF version to duplicate');

    const slug = slugifyKey(body.slug);
    if (!slug) throw new BadRequestException('Invalid slug');
    const exists = await this.prisma.template.findUnique({ where: { slug } });
    if (exists) throw new BadRequestException('Slug already in use');

    const buf = await readBytesFromStorageKey(this.storage, latest.storageKey);
    if (!buf?.length) throw new BadRequestException('Could not read source PDF from storage');

    const fileHash = createHash('sha256').update(buf).digest('hex');

    const t = await this.prisma.template.create({
      data: {
        workspaceId,
        name: body.name.trim(),
        slug,
        documentType: source.documentType,
        description: source.description,
        isSystemTemplate: false,
        parentTemplateId: sourceTemplateId,
        status: 'active',
        tags: (source.tags ?? []) as Prisma.InputJsonValue,
        notes: source.notes,
        isRequiredByDefault: false,
        jurisdiction: source.jurisdiction,
        fieldMappingJson:
          source.fieldMappingJson === null
            ? Prisma.JsonNull
            : (source.fieldMappingJson as Prisma.InputJsonValue),
      },
    });

    const storageKey = `workspace-templates/${workspaceId}/${slug}/v1/${latest.sourceFileName}`;
    await this.storage.uploadFile(storageKey, buf, 'application/pdf');
    const fileUrl = await this.signedUrlOrNull(storageKey);

    const ver = await this.prisma.templateVersion.create({
      data: {
        templateId: t.id,
        versionNumber: 1,
        sourceFileName: latest.sourceFileName,
        storageKey,
        fileUrl,
        fileHash,
        fileType: 'pdf',
      },
    });

    await this.syncWorkflowLinks(
      t.id,
      source.workflows.map((w) => w.workflowKey),
    );

    const prevFields = await this.prisma.templateField.findMany({
      where: { templateVersionId: latest.id },
      orderBy: { sortOrder: 'asc' },
    });
    if (prevFields.length) {
      await this.prisma.templateField.createMany({
        data: prevFields.map((f) => ({
          templateVersionId: ver.id,
          name: f.name,
          type: f.type,
          pageIndex: f.pageIndex,
          rect: f.rect as Prisma.InputJsonValue,
          defaultValue: f.defaultValue,
          signerRole: f.signerRole,
          dataSourceKey: f.dataSourceKey,
          sortOrder: f.sortOrder,
        })),
      });
    } else {
      try {
        await this.templateFieldDetection.persistForVersion(ver.id, buf);
      } catch (e) {
        this.logger.warn(`Duplicate template field detect failed: ${e}`);
      }
    }

    return this.getById(workspaceId, t.id);
  }

  async createWorkspaceTemplate(
    workspaceId: string,
    body: {
      name: string;
      slug: string;
      documentType: string;
      description?: string;
      workflows?: string[];
      parentTemplateId?: string;
      notes?: string;
      tags?: string[];
      fieldMappingJson?: Record<string, unknown> | null;
    },
  ) {
    const slug = slugifyKey(body.slug);
    if (!slug) throw new BadRequestException('Invalid slug');

    const exists = await this.prisma.template.findUnique({ where: { slug } });
    if (exists) throw new BadRequestException('Slug already in use');

    const parentTemplateId: string | null = body.parentTemplateId ?? null;
    if (parentTemplateId) {
      const parent = await this.prisma.template.findFirst({
        where: {
          id: parentTemplateId,
          OR: [{ isSystemTemplate: true, workspaceId: null }, { workspaceId }],
        },
      });
      if (!parent) throw new BadRequestException('Invalid parent template');
    }

    const t = await this.prisma.template.create({
      data: {
        workspaceId,
        name: body.name,
        slug,
        documentType: body.documentType,
        description: body.description ?? null,
        isSystemTemplate: false,
        parentTemplateId,
        status: 'active',
        tags: body.tags ?? [],
        notes: body.notes ?? null,
        isRequiredByDefault: false,
        ...(body.fieldMappingJson === undefined
          ? {}
          : body.fieldMappingJson === null
            ? { fieldMappingJson: Prisma.JsonNull }
            : {
                fieldMappingJson:
                  body.fieldMappingJson as Prisma.InputJsonValue,
              }),
      },
    });

    await this.syncWorkflowLinks(t.id, body.workflows ?? []);

    return this.getById(workspaceId, t.id);
  }

  async updateWorkspaceTemplate(
    workspaceId: string,
    id: string,
    body: {
      name?: string;
      description?: string | null;
      status?: string;
      notes?: string | null;
      tags?: string[];
      fieldMappingJson?: Record<string, unknown> | null;
    },
  ) {
    const t = await this.prisma.template.findFirst({
      where: { id, workspaceId },
    });
    if (!t) throw new NotFoundException('Template not found');
    if (t.isSystemTemplate) {
      throw new BadRequestException(
        'System templates cannot be edited in place; create a workspace copy instead.',
      );
    }

    const data: Prisma.TemplateUpdateInput = {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
    };
    if (body.fieldMappingJson !== undefined) {
      data.fieldMappingJson =
        body.fieldMappingJson === null
          ? Prisma.JsonNull
          : (body.fieldMappingJson as Prisma.InputJsonValue);
    }

    return this.prisma.template.update({
      where: { id },
      data,
    });
  }

  private async syncWorkflowLinks(
    templateId: string,
    workflowKeys: string[],
  ): Promise<void> {
    const keys = [...new Set(workflowKeys.map((k) => k.trim()).filter(Boolean))];
    for (const key of keys) {
      await this.prisma.workflowDefinition.upsert({
        where: { key },
        create: { key, label: key, sortOrder: 100 },
        update: {},
      });
    }
    if (keys.length) {
      await this.prisma.templateWorkflow.createMany({
        data: keys.map((workflowKey) => ({
          templateId,
          workflowKey,
        })),
      });
    }
  }

  private async assertTemplateAccess(
    workspaceId: string,
    templateId: string,
  ): Promise<void> {
    const ok = await this.prisma.template.findFirst({
      where: {
        id: templateId,
        OR: [{ workspaceId: null, isSystemTemplate: true }, { workspaceId }],
      },
    });
    if (!ok) throw new NotFoundException('Template not found');
  }

  private async signedUrlOrNull(key: string): Promise<string | null> {
    try {
      return await this.storage.getSignedUrl(key);
    } catch {
      return null;
    }
  }

  private async decorateListRow(t: {
    workflows: { workflow: { key: string; label: string } }[];
    versions: { storageKey: string; versionNumber: number; id: string }[];
    [k: string]: unknown;
  }) {
    const latest = t.versions[0];
    const { versions, ...rest } = t;
    void versions;
    return {
      ...rest,
      workflows: t.workflows.map((w) => w.workflow),
      latestVersion: latest
        ? {
            id: latest.id,
            versionNumber: latest.versionNumber,
            downloadUrl: await this.signedUrlOrNull(latest.storageKey),
          }
        : null,
    };
  }

  private async decorateDetail(t: {
    workflows: { workflow: { key: string; label: string; description: string | null } }[];
    versions: {
      id: string;
      versionNumber: number;
      sourceFileName: string;
      storageKey: string;
      fileHash: string;
      fileType: string;
      createdAt: Date;
    }[];
    [k: string]: unknown;
  }) {
    const versionsOut = await Promise.all(
      t.versions.map(async (v) => ({
        ...v,
        downloadUrl: await this.signedUrlOrNull(v.storageKey),
        fields: await this.prisma.templateField.findMany({
          where: { templateVersionId: v.id },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
      })),
    );
    const { versions, workflows, ...rest } = t;
    void versions;
    return {
      ...rest,
      workflows: workflows.map((w) => w.workflow),
      versions: versionsOut,
    };
  }
}
