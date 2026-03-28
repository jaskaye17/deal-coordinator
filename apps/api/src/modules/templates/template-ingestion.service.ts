import { Injectable, Logger, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FILE_STORAGE_PROVIDER,
  type FileStorageProvider,
} from '../file-storage/file-storage.interface';
import { z } from 'zod';
import { Prisma } from '@deal-coordinator/db';

const GLOBAL_TEMPLATE_STORAGE_PREFIX = 'global-templates';

const SidecarSchema = z.object({
  name: z.string(),
  key: z.string().min(1),
  version: z.number().int().positive(),
  documentType: z.string().min(1),
  workflows: z.array(z.string()).default([]),
  jurisdiction: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isRequiredByDefault: z.boolean().optional().default(false),
  description: z.string().optional(),
  notes: z.string().optional(),
  fieldMappingJson: z.record(z.unknown()).optional().nullable(),
});

export type TemplateIngestSummary = {
  filesScanned: number;
  templatesUpserted: number;
  versionsCreated: number;
  versionsSkippedSameHash: number;
  workflowLinksSynced: number;
  errors: { relativePath: string; message: string }[];
};

export type IngestGlobalOptions = {
  rootDir?: string;
  dryRun?: boolean;
};

function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function slugifySegment(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Resolve repo global templates folder (env override, then common cwd layouts). */
export function resolveGlobalTemplatesRoot(explicit?: string): string {
  if (explicit) return path.resolve(explicit);
  if (process.env.GLOBAL_TEMPLATES_DIR) {
    return path.resolve(process.env.GLOBAL_TEMPLATES_DIR);
  }
  const cwd = process.cwd();
  const fromApiPackage = path.join(cwd, 'templates', 'global');
  const fromMonorepoRoot = path.join(cwd, 'apps', 'api', 'templates', 'global');
  if (existsSync(fromApiPackage)) return path.resolve(fromApiPackage);
  if (existsSync(fromMonorepoRoot)) return path.resolve(fromMonorepoRoot);
  return path.resolve(fromApiPackage);
}

function parseVersionFromBasename(base: string): { stem: string; version: number } | null {
  const m = /^(.+?)__v(\d+)$/i.exec(base);
  if (!m?.[1] || !m[2]) return null;
  return { stem: m[1], version: parseInt(m[2], 10) };
}

function inferMetadataFromPdfBasename(
  base: string,
): z.infer<typeof SidecarSchema> {
  const noExt = base.replace(/\.pdf$/i, '');
  const parsed = parseVersionFromBasename(noExt);
  if (parsed) {
    const key = slugifySegment(parsed.stem) + '-v' + parsed.version;
    return {
      name: parsed.stem.replace(/_/g, ' '),
      key,
      version: parsed.version,
      documentType: 'generic',
      workflows: [],
      tags: [],
      isRequiredByDefault: false,
      description: undefined,
      notes: undefined,
      fieldMappingJson: undefined,
    };
  }
  return {
    name: noExt.replace(/_/g, ' '),
    key: slugifySegment(noExt) || 'template',
    version: 1,
    documentType: 'generic',
    workflows: [],
    tags: [],
    isRequiredByDefault: false,
  };
}

@Injectable()
export class TemplateIngestionService {
  private readonly logger = new Logger(TemplateIngestionService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly storage: FileStorageProvider,
  ) {}

  async ingestGlobalTemplates(
    options: IngestGlobalOptions = {},
  ): Promise<TemplateIngestSummary> {
    const root = path.resolve(resolveGlobalTemplatesRoot(options.rootDir));
    const summary: TemplateIngestSummary = {
      filesScanned: 0,
      templatesUpserted: 0,
      versionsCreated: 0,
      versionsSkippedSameHash: 0,
      workflowLinksSynced: 0,
      errors: [],
    };

    let pdfPaths: string[];
    try {
      pdfPaths = await this.collectPdfFiles(root);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      summary.errors.push({ relativePath: root, message: `Cannot read templates root: ${message}` });
      return summary;
    }

    summary.filesScanned = pdfPaths.length;

    for (const absPdf of pdfPaths) {
      const rel = path.relative(root, absPdf);
      try {
        const buf = await fs.readFile(absPdf);
        const fileHash = sha256Hex(buf);
        const base = path.basename(absPdf);

        let meta: z.infer<typeof SidecarSchema>;
        const sidecarPath = absPdf.replace(/\.pdf$/i, '.json');
        let hasSidecar = false;
        try {
          await fs.access(sidecarPath);
          hasSidecar = true;
        } catch {
          hasSidecar = false;
        }
        if (hasSidecar) {
          const raw = await fs.readFile(sidecarPath, 'utf8');
          const parsed = JSON.parse(raw) as unknown;
          meta = SidecarSchema.parse(parsed);
        } else {
          meta = inferMetadataFromPdfBasename(base);
        }

        meta.key = slugifySegment(meta.key);
        if (!meta.key) {
          throw new Error('Template key/slug is empty after normalization');
        }

        for (const wf of meta.workflows) {
          const key = wf.trim();
          if (!key) continue;
          if (options.dryRun) continue;
          await this.prisma.workflowDefinition.upsert({
            where: { key },
            create: {
              key,
              label: this.humanizeKey(key),
              sortOrder: 100,
            },
            update: {},
          });
        }

        if (options.dryRun) {
          this.logger.log(`[dry-run] would ingest ${rel} → ${meta.key} v${meta.version}`);
          continue;
        }

        const template = await this.prisma.template.upsert({
          where: { slug: meta.key },
          create: {
            workspaceId: null,
            name: meta.name,
            slug: meta.key,
            description: meta.description ?? null,
            isSystemTemplate: true,
            status: 'active',
            documentType: meta.documentType,
            tags: meta.tags,
            jurisdiction: meta.jurisdiction ?? null,
            notes: meta.notes ?? null,
            isRequiredByDefault: meta.isRequiredByDefault,
            ...(meta.fieldMappingJson === undefined
              ? {}
              : meta.fieldMappingJson === null
                ? { fieldMappingJson: Prisma.JsonNull }
                : {
                    fieldMappingJson:
                      meta.fieldMappingJson as Prisma.InputJsonValue,
                  }),
          },
          update: {
            name: meta.name,
            description: meta.description ?? null,
            documentType: meta.documentType,
            tags: meta.tags,
            jurisdiction: meta.jurisdiction ?? null,
            notes: meta.notes ?? null,
            isRequiredByDefault: meta.isRequiredByDefault,
            ...(meta.fieldMappingJson === undefined
              ? {}
              : meta.fieldMappingJson === null
                ? { fieldMappingJson: Prisma.JsonNull }
                : {
                    fieldMappingJson:
                      meta.fieldMappingJson as Prisma.InputJsonValue,
                  }),
          },
        });
        summary.templatesUpserted += 1;

        const existingByHash = await this.prisma.templateVersion.findUnique({
          where: {
            templateId_fileHash: { templateId: template.id, fileHash },
          },
        });

        if (existingByHash) {
          summary.versionsSkippedSameHash += 1;
          summary.workflowLinksSynced += await this.syncWorkflows(
            template.id,
            meta.workflows,
          );
          continue;
        }

        let versionNumber = meta.version;
        const atSlot = await this.prisma.templateVersion.findUnique({
          where: {
            templateId_versionNumber: {
              templateId: template.id,
              versionNumber: meta.version,
            },
          },
        });
        if (atSlot && atSlot.fileHash !== fileHash) {
          const maxRow = await this.prisma.templateVersion.aggregate({
            where: { templateId: template.id },
            _max: { versionNumber: true },
          });
          versionNumber = (maxRow._max.versionNumber ?? 0) + 1;
        }

        const storageKey = `${GLOBAL_TEMPLATE_STORAGE_PREFIX}/${meta.key}/v${versionNumber}/${base}`;
        await this.storage.uploadFile(storageKey, buf, 'application/pdf');

        let fileUrl: string | null = null;
        try {
          fileUrl = await this.storage.getSignedUrl(storageKey);
        } catch {
          fileUrl = null;
        }

        await this.prisma.templateVersion.create({
          data: {
            templateId: template.id,
            versionNumber,
            sourceFileName: base,
            storageKey,
            fileUrl,
            fileHash,
            fileType: 'pdf',
          },
        });
        summary.versionsCreated += 1;

        summary.workflowLinksSynced += await this.syncWorkflows(
          template.id,
          meta.workflows,
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        summary.errors.push({ relativePath: rel, message });
        this.logger.warn(`Ingest failed for ${rel}: ${message}`);
      }
    }

    return summary;
  }

  private humanizeKey(key: string): string {
    return key
      .split(/[-_]/g)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private async syncWorkflows(
    templateId: string,
    workflowKeys: string[],
  ): Promise<number> {
    const keys = [...new Set(workflowKeys.map((k) => k.trim()).filter(Boolean))];
    await this.prisma.templateWorkflow.deleteMany({ where: { templateId } });
    if (keys.length === 0) return 0;
    await this.prisma.templateWorkflow.createMany({
      data: keys.map((workflowKey) => ({ templateId, workflowKey })),
    });
    return keys.length;
  }

  private async collectPdfFiles(dir: string): Promise<string[]> {
    const out: string[] = [];
    const walk = async (d: string) => {
      let entries;
      try {
        entries = await fs.readdir(d, { withFileTypes: true });
      } catch {
        return;
      }
      for (const ent of entries) {
        const full = path.join(d, ent.name);
        if (ent.isDirectory()) await walk(full);
        else if (ent.isFile() && /\.pdf$/i.test(ent.name)) out.push(full);
      }
    };
    await walk(dir);
    return out.sort();
  }
}
