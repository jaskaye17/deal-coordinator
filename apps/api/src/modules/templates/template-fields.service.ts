import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { TemplateFieldDetectionService } from './template-field-detection.service';
import { readBytesFromStorageKey } from '../../common/storage-read.util';
import {
  FILE_STORAGE_PROVIDER,
  type FileStorageProvider,
} from '../file-storage/file-storage.interface';
import { Inject } from '@nestjs/common';

export type TemplateFieldRect = { x: number; y: number; width: number; height: number };

export type TemplateFieldInput = {
  name: string;
  type: string;
  pageIndex: number;
  rect: TemplateFieldRect;
  defaultValue?: string | null;
  signerRole?: string | null;
  dataSourceKey?: string | null;
  sortOrder?: number;
};

@Injectable()
export class TemplateFieldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly detection: TemplateFieldDetectionService,
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly storage: FileStorageProvider,
  ) {}

  async assertVersionAccess(
    workspaceId: string,
    templateId: string,
    versionId: string,
  ) {
    const version = await this.prisma.templateVersion.findFirst({
      where: { id: versionId, templateId },
      include: {
        template: true,
      },
    });
    if (!version) throw new NotFoundException('Template version not found');
    const t = version.template;
    const allowed =
      (t.workspaceId === null && t.isSystemTemplate) || t.workspaceId === workspaceId;
    if (!allowed) throw new NotFoundException('Template version not found');
    return version;
  }

  async listFields(
    workspaceId: string,
    templateId: string,
    versionId: string,
  ) {
    await this.assertVersionAccess(workspaceId, templateId, versionId);
    return this.prisma.templateField.findMany({
      where: { templateVersionId: versionId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async replaceFields(
    workspaceId: string,
    templateId: string,
    versionId: string,
    fields: TemplateFieldInput[],
  ) {
    await this.assertVersionAccess(workspaceId, templateId, versionId);
    for (const f of fields) {
      if (!f.name?.trim()) throw new BadRequestException('Each field needs a name');
      if (!['text', 'checkbox', 'signature'].includes(f.type)) {
        throw new BadRequestException(`Invalid field type: ${f.type}`);
      }
      if (!f.rect || typeof f.rect.x !== 'number') {
        throw new BadRequestException('Each field needs a rect { x, y, width, height }');
      }
    }
    await this.prisma.templateField.deleteMany({ where: { templateVersionId: versionId } });
    if (!fields.length) return [];
    await this.prisma.templateField.createMany({
      data: fields.map((f, i) => ({
        templateVersionId: versionId,
        name: f.name.trim(),
        type: f.type,
        pageIndex: f.pageIndex,
        rect: f.rect as object,
        defaultValue: f.defaultValue ?? null,
        signerRole: f.signerRole ?? null,
        dataSourceKey: f.dataSourceKey ?? null,
        sortOrder: f.sortOrder ?? i,
      })),
    });
    return this.listFields(workspaceId, templateId, versionId);
  }

  async detectFields(workspaceId: string, templateId: string, versionId: string) {
    const v = await this.assertVersionAccess(workspaceId, templateId, versionId);
    const buf = await readBytesFromStorageKey(this.storage, v.storageKey);
    if (!buf?.length) {
      throw new BadRequestException('Could not read template PDF from storage');
    }
    return this.detection.persistForVersion(versionId, buf);
  }

  async addField(
    workspaceId: string,
    templateId: string,
    versionId: string,
    body: TemplateFieldInput,
  ) {
    await this.assertVersionAccess(workspaceId, templateId, versionId);
    const max = await this.prisma.templateField.aggregate({
      where: { templateVersionId: versionId },
      _max: { sortOrder: true },
    });
    const sortOrder = (max._max.sortOrder ?? -1) + 1;
    return this.prisma.templateField.create({
      data: {
        templateVersionId: versionId,
        name: body.name.trim(),
        type: body.type,
        pageIndex: body.pageIndex,
        rect: body.rect as object,
        defaultValue: body.defaultValue ?? null,
        signerRole: body.signerRole ?? null,
        dataSourceKey: body.dataSourceKey ?? null,
        sortOrder,
      },
    });
  }

  async updateField(
    workspaceId: string,
    templateId: string,
    versionId: string,
    fieldId: string,
    patch: Partial<TemplateFieldInput>,
  ) {
    await this.assertVersionAccess(workspaceId, templateId, versionId);
    const existing = await this.prisma.templateField.findFirst({
      where: { id: fieldId, templateVersionId: versionId },
    });
    if (!existing) throw new NotFoundException('Field not found');
    return this.prisma.templateField.update({
      where: { id: fieldId },
      data: {
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.type !== undefined ? { type: patch.type } : {}),
        ...(patch.pageIndex !== undefined ? { pageIndex: patch.pageIndex } : {}),
        ...(patch.rect !== undefined ? { rect: patch.rect as object } : {}),
        ...(patch.defaultValue !== undefined ? { defaultValue: patch.defaultValue } : {}),
        ...(patch.signerRole !== undefined ? { signerRole: patch.signerRole } : {}),
        ...(patch.dataSourceKey !== undefined ? { dataSourceKey: patch.dataSourceKey } : {}),
        ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
      },
    });
  }

  async deleteField(
    workspaceId: string,
    templateId: string,
    versionId: string,
    fieldId: string,
  ) {
    await this.assertVersionAccess(workspaceId, templateId, versionId);
    const existing = await this.prisma.templateField.findFirst({
      where: { id: fieldId, templateVersionId: versionId },
    });
    if (!existing) throw new NotFoundException('Field not found');
    await this.prisma.templateField.delete({ where: { id: fieldId } });
    return { success: true };
  }
}
