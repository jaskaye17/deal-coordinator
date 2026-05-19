import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '@deal-coordinator/shared';
import type { DealStage, DealType } from '@deal-coordinator/shared';
import { validateTransition } from '@deal-coordinator/workflow';
import { SIGNATURE_PROVIDER } from './signature-provider.interface';
import type {
  EnvelopeDocumentInput,
  EnvelopeTabInput,
  SignatureProvider,
} from './signature-provider.interface';
import type { FakeSignatureProvider } from './fake-signature.provider';
import { TasksService } from '../tasks/tasks.service';
import {
  FILE_STORAGE_PROVIDER,
  type FileStorageProvider,
} from '../file-storage/file-storage.interface';
import { readBytesFromStorageKey } from '../../common/storage-read.util';
import {
  resolveDealDataSource,
  type DealForDataSource,
} from '../../common/deal-data-source.util';
import {
  pdfRectToDocuSignPosition,
  recipientIdForSignerRole,
} from './envelope-tabs.util';

@Injectable()
export class SignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(SIGNATURE_PROVIDER)
    private readonly signatureProvider: SignatureProvider,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly storage: FileStorageProvider,
  ) {}

  async createEnvelope(
    workspaceId: string,
    dealId: string,
    reviewTaskId: string,
    recipients: Array<{ name: string; email: string; role: string }>,
    documentIds: string[],
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const envelope = await this.prisma.signatureEnvelope.create({
      data: {
        workspaceId,
        dealId,
        reviewTaskId,
        recipientsJson: recipients,
        documentIdsJson: documentIds,
        status: 'draft',
      },
    });

    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: { fields: true },
    });
    if (!deal) {
      throw new AppError('NOT_FOUND', 404, 'Deal not found');
    }

    const dealSource: DealForDataSource = {
      primaryContactName: deal.primaryContactName,
      propertyAddress: deal.propertyAddress,
      displayName: deal.displayName,
      title: deal.title,
      address: deal.address,
    };

    const { documents, tabs } = await this.buildEnvelopeDocumentsAndTabs(
      workspaceId,
      dealId,
      documentIds,
      recipients,
      dealSource,
      deal.fields,
    );

    const { providerEnvelopeId } = await this.signatureProvider.createEnvelope({
      envelopeId: envelope.id,
      recipients,
      documentIds,
      documents: documents.length ? documents : undefined,
      tabs: tabs.length ? tabs : undefined,
    });

    const updated = await this.prisma.signatureEnvelope.update({
      where: { id: envelope.id },
      data: { providerEnvelopeId },
    });

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'signature_envelope_created',
      objectType: 'SignatureEnvelope',
      objectId: envelope.id,
      actorType: 'user',
      actorId,
      after: updated,
      metadata: { recipients, documentIds, tabCount: tabs.length },
      requestId,
    });

    return updated;
  }

  private async buildEnvelopeDocumentsAndTabs(
    workspaceId: string,
    dealId: string,
    documentIds: string[],
    recipients: Array<{ name: string; email: string; role: string }>,
    dealSource: DealForDataSource,
    dealFields: { fieldName: string; fieldValue: string | null }[],
  ): Promise<{ documents: EnvelopeDocumentInput[]; tabs: EnvelopeTabInput[] }> {
    const rows = await this.prisma.document.findMany({
      where: { id: { in: documentIds }, workspaceId, dealId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
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
    const byId = new Map(rows.map((d) => [d.id, d]));

    const documents: EnvelopeDocumentInput[] = [];
    const tabs: EnvelopeTabInput[] = [];
    const { PDFDocument } = await import('pdf-lib');

    let ordinal = 0;
    for (const docId of documentIds) {
      const doc = byId.get(docId);
      if (!doc) {
        throw new AppError('NOT_FOUND', 404, `Document ${docId} not found`);
      }
      ordinal += 1;
      const dsDocId = String(ordinal);

      const key = doc.latestFileUrl ?? doc.versions[0]?.fileUrl;
      if (!key) {
        throw new AppError(
          'VALIDATION_ERROR',
          422,
          `Document "${doc.name}" has no file; generate or upload a PDF first`,
        );
      }

      const buf = await readBytesFromStorageKey(this.storage, key);
      if (!buf?.length) {
        throw new AppError(
          'VALIDATION_ERROR',
          422,
          `Could not read PDF for document "${doc.name}"`,
        );
      }

      const baseName = doc.name?.replace(/\.pdf$/i, '') || `document-${ordinal}`;
      documents.push({
        documentBase64: buf.toString('base64'),
        name: `${baseName}.pdf`,
        documentId: dsDocId,
      });

      let pdf;
      try {
        pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
      } catch {
        continue;
      }

      const pages = pdf.getPages();
      const templateFields = doc.template?.versions[0]?.fields ?? [];
      const fromGen = (doc.versions[0]?.generatedFromFieldsJson as Record<string, string>) ?? {};

      for (const tf of templateFields) {
        const recipientId = recipientIdForSignerRole(recipients, tf.signerRole);
        if (!recipientId) continue;

        const page = pages[tf.pageIndex] ?? pages[0];
        if (!page) continue;

        const rect = tf.rect as { x: number; y: number; width: number; height: number };
        const pageHeight = page.getHeight();
        const pos = pdfRectToDocuSignPosition(pageHeight, rect);
        const pageNumber = tf.pageIndex + 1;

        const value =
          resolveDealDataSource(dealSource, dealFields, tf.dataSourceKey) ||
          tf.defaultValue ||
          fromGen[tf.name] ||
          '';

        if (tf.type === 'signature') {
          tabs.push({
            documentId: dsDocId,
            pageNumber,
            xPosition: pos.x,
            yPosition: pos.y,
            tabType: 'signHere',
            recipientId,
            width: Math.max(pos.width, 40),
            height: Math.max(pos.height, 20),
          });
        } else if (tf.type === 'text') {
          tabs.push({
            documentId: dsDocId,
            pageNumber,
            xPosition: pos.x,
            yPosition: pos.y,
            tabType: 'text',
            recipientId,
            value: String(value),
            width: Math.max(pos.width, 80),
            height: Math.max(pos.height, 16),
          });
        } else if (tf.type === 'checkbox') {
          tabs.push({
            documentId: dsDocId,
            pageNumber,
            xPosition: pos.x,
            yPosition: pos.y,
            tabType: 'checkbox',
            recipientId,
            value: String(value),
            width: pos.width || 18,
            height: pos.height || 18,
          });
        }
      }
    }

    return { documents, tabs };
  }

  async sendEnvelope(
    workspaceId: string,
    envelopeId: string,
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const envelope = await this.prisma.signatureEnvelope.findFirst({
      where: { id: envelopeId, workspaceId },
    });

    if (!envelope) {
      throw new AppError('NOT_FOUND', 404, 'Signature envelope not found');
    }

    if (!envelope.providerEnvelopeId) {
      throw new AppError('VALIDATION_ERROR', 422, 'Envelope has no provider ID');
    }

    await this.signatureProvider.sendEnvelope(envelope.providerEnvelopeId);

    const updated = await this.prisma.signatureEnvelope.update({
      where: { id: envelopeId },
      data: { status: 'sent', sentAt: new Date() },
    });

    const documentIds = (envelope.documentIdsJson as string[]) ?? [];
    if (documentIds.length > 0) {
      await this.prisma.document.updateMany({
        where: { id: { in: documentIds }, workspaceId },
        data: { status: 'sent' },
      });
    }

    await this.tryTransitionDeal(workspaceId, envelope.dealId, 'sent_for_signature', actorId, requestId);

    await this.auditService.create({
      workspaceId,
      dealId: envelope.dealId,
      action: 'signature_envelope_sent',
      objectType: 'SignatureEnvelope',
      objectId: envelopeId,
      actorType: 'user',
      actorId,
      before: { status: envelope.status },
      after: { status: 'sent' },
      requestId,
    });

    return updated;
  }

  async syncEnvelopeStatus(
    workspaceId: string,
    envelopeId: string,
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const envelope = await this.prisma.signatureEnvelope.findFirst({
      where: { id: envelopeId, workspaceId },
    });

    if (!envelope) {
      throw new AppError('NOT_FOUND', 404, 'Signature envelope not found');
    }

    if (!envelope.providerEnvelopeId) {
      throw new AppError('VALIDATION_ERROR', 422, 'Envelope has no provider ID');
    }

    const providerStatus = await this.signatureProvider.getEnvelopeStatus(
      envelope.providerEnvelopeId,
    );

    const updateData: any = {
      status: providerStatus.status,
      recipientsJson: providerStatus.recipients,
    };

    if (providerStatus.status === 'completed') {
      updateData.completedAt = new Date();
    }

    const updated = await this.prisma.signatureEnvelope.update({
      where: { id: envelopeId },
      data: updateData,
    });

    if (providerStatus.status === 'completed') {
      const documentIds = (envelope.documentIdsJson as string[]) ?? [];
      if (documentIds.length > 0) {
        await this.prisma.document.updateMany({
          where: { id: { in: documentIds }, workspaceId },
          data: { status: 'signed' },
        });
      }

      await this.tryTransitionDeal(workspaceId, envelope.dealId, 'fully_signed', actorId, requestId);

      await this.tasksService.activateListingPrepChecklist(
        workspaceId,
        envelope.dealId,
        actorId,
        requestId,
      );
    } else if (providerStatus.status === 'partially_signed') {
      await this.tryTransitionDeal(workspaceId, envelope.dealId, 'partially_signed', actorId, requestId);
    }

    await this.auditService.create({
      workspaceId,
      dealId: envelope.dealId,
      action: 'signature_status_changed',
      objectType: 'SignatureEnvelope',
      objectId: envelopeId,
      actorType: 'user',
      actorId,
      before: { status: envelope.status },
      after: { status: providerStatus.status },
      metadata: { recipients: providerStatus.recipients },
      requestId,
    });

    return updated;
  }

  async simulateStatus(
    workspaceId: string,
    envelopeId: string,
    recipientEmail: string,
    actorId: string,
    requestId: string,
  ): Promise<any> {
    if (process.env.APP_ENV === 'production') {
      throw new AppError('FORBIDDEN', 403, 'Simulation not available in production');
    }

    const envelope = await this.prisma.signatureEnvelope.findFirst({
      where: { id: envelopeId, workspaceId },
    });

    if (!envelope) {
      throw new AppError('NOT_FOUND', 404, 'Signature envelope not found');
    }

    if (!envelope.providerEnvelopeId) {
      throw new AppError('VALIDATION_ERROR', 422, 'Envelope has no provider ID');
    }

    (this.signatureProvider as FakeSignatureProvider).simulateRecipientSigned(
      envelope.providerEnvelopeId,
      recipientEmail,
    );

    return this.syncEnvelopeStatus(workspaceId, envelopeId, actorId, requestId);
  }

  async findEnvelopeById(workspaceId: string, id: string): Promise<any> {
    const envelope = await this.prisma.signatureEnvelope.findFirst({
      where: { id, workspaceId },
      include: {
        deal: { select: { id: true, title: true, address: true, stage: true } },
        reviewTask: true,
      },
    });

    if (!envelope) {
      throw new AppError('NOT_FOUND', 404, 'Signature envelope not found');
    }

    return envelope;
  }

  private async tryTransitionDeal(
    workspaceId: string,
    dealId: string,
    targetStage: string,
    actorId: string,
    requestId: string,
  ): Promise<void> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
    });

    if (!deal) return;

    const result = validateTransition({
      dealType: deal.dealType as DealType,
      currentStage: deal.stage as DealStage,
      targetStage: targetStage as DealStage,
      actor: { role: 'system', userId: actorId },
    });

    if (!result.allowed) return;

    await this.prisma.deal.update({
      where: { id: dealId },
      data: { stage: targetStage },
    });

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'deal_stage_changed',
      objectType: 'Deal',
      objectId: dealId,
      actorType: 'system',
      actorId,
      before: { stage: deal.stage },
      after: { stage: targetStage },
      requestId,
    });
  }
}
