import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { FormRulesService } from '../form-rules/form-rules.service';
import {
  FileStorageProvider,
  FILE_STORAGE_PROVIDER,
} from '../file-storage/file-storage.interface';
import {
  AppError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@deal-coordinator/shared';
import { readBytesFromStorageKey } from '../../common/storage-read.util';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly formRulesService: FormRulesService,
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly storageProvider: FileStorageProvider,
  ) {}

  async listByDeal(
    workspaceId: string,
    dealId: string,
    page?: number,
    pageSize?: number,
  ): Promise<{ items: any[]; meta: { page: number; pageSize: number; total: number } }> {
    const currentPage = page ?? 1;
    const take = Math.min(pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = (currentPage - 1) * take;

    const where = { workspaceId, dealId };

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' as const },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.document.count({ where }),
    ]);

    return { items, meta: { page: currentPage, pageSize: take, total } };
  }

  async generateForDeal(
    workspaceId: string,
    dealId: string,
    actorId: string,
    requestId: string,
  ) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: { fields: true },
    });

    if (!deal) {
      throw new AppError('NOT_FOUND', 404, 'Deal not found');
    }

    const fieldMap: Record<string, string | null> = {};
    for (const f of deal.fields) {
      fieldMap[f.fieldName] = f.fieldValue;
    }

    const requiredDocs = this.formRulesService.getRequiredDocuments(
      deal.dealType,
      fieldMap,
    );

    const results: any[] = [];

    for (const reqDoc of requiredDocs) {
      let document = await this.prisma.document.findFirst({
        where: { dealId, workspaceId, documentType: reqDoc.templateType },
      });

      if (!document) {
        document = await this.prisma.document.create({
          data: {
            dealId,
            workspaceId,
            documentType: reqDoc.templateType,
            name: reqDoc.name,
            status: 'draft',
            currentVersionNumber: 0,
          },
        });
      }

      const missingFields = this.formRulesService.getMissingFields(
        reqDoc.templateType,
        fieldMap,
      );

      const status = missingFields.length > 0 ? 'missing_info' : 'draft';

      const fileContent = this.buildDocumentContent(
        reqDoc.name,
        dealId,
        fieldMap,
      );

      const newVersionNumber = document.currentVersionNumber + 1;
      const filename = `${reqDoc.templateType}_v${newVersionNumber}.txt`;

      const fileUrl = await this.storageProvider.storeFile(
        workspaceId,
        dealId,
        '02_Listing_Docs',
        filename,
        fileContent,
      );

      await this.prisma.documentVersion.create({
        data: {
          documentId: document.id,
          workspaceId,
          versionNumber: newVersionNumber,
          fileUrl,
          generatedFromFieldsJson: fieldMap,
          createdByActorType: 'user',
          createdByActorId: actorId,
        },
      });

      document = await this.prisma.document.update({
        where: { id: document.id },
        data: {
          currentVersionNumber: newVersionNumber,
          latestFileUrl: fileUrl,
          status,
        },
      });

      await this.auditService.create({
        workspaceId,
        dealId,
        action: 'document_generated',
        objectType: 'Document',
        objectId: document.id,
        actorType: 'user',
        actorId,
        after: document,
        metadata: { missingFields, templateType: reqDoc.templateType },
        requestId,
      });

      results.push(document);
    }

    return results;
  }

  async regenerateDocument(
    workspaceId: string,
    documentId: string,
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId },
    });

    if (!document) {
      throw new AppError('NOT_FOUND', 404, 'Document not found');
    }

    const deal = await this.prisma.deal.findFirst({
      where: { id: document.dealId, workspaceId },
      include: { fields: true },
    });

    if (!deal) {
      throw new AppError('NOT_FOUND', 404, 'Deal not found');
    }

    const fieldMap: Record<string, string | null> = {};
    for (const f of deal.fields) {
      fieldMap[f.fieldName] = f.fieldValue;
    }

    const missingFields = this.formRulesService.getMissingFields(
      document.documentType,
      fieldMap,
    );

    const status = missingFields.length > 0 ? 'missing_info' : 'draft';

    const fileContent = this.buildDocumentContent(
      document.name,
      deal.id,
      fieldMap,
    );

    const newVersionNumber = document.currentVersionNumber + 1;
    const filename = `${document.documentType}_v${newVersionNumber}.txt`;

    const fileUrl = await this.storageProvider.storeFile(
      workspaceId,
      deal.id,
      '02_Listing_Docs',
      filename,
      fileContent,
    );

    await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        workspaceId,
        versionNumber: newVersionNumber,
        fileUrl,
        generatedFromFieldsJson: fieldMap,
        createdByActorType: 'user',
        createdByActorId: actorId,
      },
    });

    const updated = await this.prisma.document.update({
      where: { id: document.id },
      data: {
        currentVersionNumber: newVersionNumber,
        latestFileUrl: fileUrl,
        status,
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId: deal.id,
      action: 'document_regenerated',
      objectType: 'Document',
      objectId: document.id,
      actorType: 'user',
      actorId,
      before: document,
      after: updated,
      metadata: { missingFields },
      requestId,
    });

    return updated;
  }

  async getVersions(workspaceId: string, documentId: string): Promise<any[]> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId },
    });

    if (!document) {
      throw new AppError('NOT_FOUND', 404, 'Document not found');
    }

    return this.prisma.documentVersion.findMany({
      where: { documentId, workspaceId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async getViewerContext(
    workspaceId: string,
    dealId: string,
    documentId: string,
  ): Promise<{
    document: Record<string, unknown>;
    fields: unknown[];
    previewUrl: string | null;
    signature: Record<string, unknown> | null;
    auditLog: unknown[];
  }> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId, dealId },
      include: {
        template: {
          include: {
            versions: {
              orderBy: { versionNumber: 'desc' },
              take: 1,
              include: { fields: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
      },
    });

    if (!document) {
      throw new AppError('NOT_FOUND', 404, 'Document not found');
    }

    let previewUrl: string | null = null;
    if (document.latestFileUrl) {
      const signed = await this.storageProvider.getSignedUrl(document.latestFileUrl);
      previewUrl =
        signed.startsWith('http://') || signed.startsWith('https://')
          ? signed
          : `/api/deals/${dealId}/documents/${documentId}/pdf`;
    }

    const auditLog = await this.prisma.auditEvent.findMany({
      where: {
        workspaceId,
        dealId,
        objectType: 'Document',
        objectId: documentId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const envelopes = await this.prisma.signatureEnvelope.findMany({
      where: { workspaceId, dealId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const envelopeForDoc = envelopes.find((e) => {
      const ids = e.documentIdsJson as string[] | null;
      return Array.isArray(ids) && ids.includes(documentId);
    });

    return {
      document: {
        id: document.id,
        name: document.name,
        status: document.status,
        documentType: document.documentType,
        templateId: document.templateId,
        latestFileUrl: document.latestFileUrl,
        currentVersionNumber: document.currentVersionNumber,
        updatedAt: document.updatedAt,
        createdAt: document.createdAt,
      },
      fields: document.template?.versions[0]?.fields ?? [],
      previewUrl,
      signature: envelopeForDoc
        ? {
            envelopeId: envelopeForDoc.id,
            providerEnvelopeId: envelopeForDoc.providerEnvelopeId,
            status: envelopeForDoc.status,
            sentAt: envelopeForDoc.sentAt,
            completedAt: envelopeForDoc.completedAt,
          }
        : null,
      auditLog,
    };
  }

  async getDocumentPdfBuffer(
    workspaceId: string,
    dealId: string,
    documentId: string,
  ): Promise<Buffer> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId, dealId },
    });

    if (!document?.latestFileUrl) {
      throw new AppError('NOT_FOUND', 404, 'Document PDF not found');
    }

    const buf = await readBytesFromStorageKey(
      this.storageProvider,
      document.latestFileUrl,
    );
    if (!buf?.length) {
      throw new AppError('NOT_FOUND', 404, 'Document file could not be read');
    }

    return buf;
  }

  async updateStatus(
    workspaceId: string,
    documentId: string,
    newStatus: string,
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId },
    });

    if (!document) {
      throw new AppError('NOT_FOUND', 404, 'Document not found');
    }

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: { status: newStatus },
    });

    await this.auditService.create({
      workspaceId,
      dealId: document.dealId,
      action: 'document_status_changed',
      objectType: 'Document',
      objectId: documentId,
      actorType: 'user',
      actorId,
      before: { status: document.status },
      after: { status: newStatus },
      requestId,
    });

    return updated;
  }

  private buildDocumentContent(
    documentName: string,
    dealId: string,
    fields: Record<string, string | null>,
  ): string {
    const lines: string[] = [
      `=== DOCUMENT: ${documentName} ===`,
      `Generated: ${new Date().toISOString()}`,
      `Deal: ${dealId}`,
      '',
      '--- Fields ---',
    ];

    for (const [key, value] of Object.entries(fields)) {
      lines.push(`${key}: ${value ?? '(empty)'}`);
    }

    lines.push('');
    return lines.join('\n');
  }
}
