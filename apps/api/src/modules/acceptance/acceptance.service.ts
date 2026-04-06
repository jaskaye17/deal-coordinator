import { Inject, Injectable } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import type { ReviewTasksService } from '../review-tasks/review-tasks.service';
import type {
  FileStorageProvider} from '../file-storage/file-storage.interface';
import {
  FILE_STORAGE_PROVIDER,
} from '../file-storage/file-storage.interface';
import { AppError } from '@deal-coordinator/shared';
import type { DealStage, DealType } from '@deal-coordinator/shared';
import { validateTransition } from '@deal-coordinator/workflow';

const ACCEPTANCE_TEMPLATE_TYPES = ['purchase_agreement', 'acceptance_letter'] as const;

@Injectable()
export class AcceptanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly reviewTasksService: ReviewTasksService,
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly storageProvider: FileStorageProvider,
  ) {}

  async prepareAcceptancePackage(
    workspaceId: string,
    offerId: string,
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, workspaceId },
      include: {
        deal: { include: { fields: true, parties: true } },
        files: true,
      },
    });

    if (!offer) {
      throw new AppError('NOT_FOUND', 404, 'Offer not found');
    }

    if (offer.status !== 'selected') {
      throw new AppError('VALIDATION_ERROR', 422, 'Offer must be in "selected" status to prepare acceptance');
    }

    const templates = await this.prisma.template.findMany({
      where: {
        documentType: { in: [...ACCEPTANCE_TEMPLATE_TYPES] },
        status: 'active',
        OR: [
          { isSystemTemplate: true, workspaceId: null },
          { workspaceId },
        ],
      },
      orderBy: [{ isSystemTemplate: 'desc' }, { name: 'asc' }],
    });

    const seenTypes = new Set<string>();
    const effectiveTemplates = templates.filter((t) => {
      if (seenTypes.has(t.documentType)) return false;
      seenTypes.add(t.documentType);
      return true;
    });

    const fieldMap: Record<string, string | null> = {};
    for (const f of offer.deal.fields) {
      fieldMap[f.fieldName] = f.fieldValue;
    }

    const offerContext: Record<string, string | number | null> = {
      buyerName: offer.buyerName,
      buyerEntityName: offer.buyerEntityName,
      offerPrice: offer.offerPrice ? Number(offer.offerPrice) : null,
      earnestMoney: offer.earnestMoney ? Number(offer.earnestMoney) : null,
      financingType: offer.financingType,
      optionPeriodDays: offer.optionPeriodDays,
      closeDate: offer.closeDate?.toISOString().split('T')[0] ?? null,
    };

    const missingRequired: string[] = [];
    if (!offerContext.buyerName) missingRequired.push('buyerName');
    if (!offerContext.offerPrice) missingRequired.push('offerPrice');
    if (!offerContext.closeDate) missingRequired.push('closeDate');
    if (!fieldMap.seller_name) missingRequired.push('seller_name');
    if (!fieldMap.property_address) missingRequired.push('property_address');

    const documents: any[] = [];

    for (const template of effectiveTemplates) {
      let document = await this.prisma.document.findFirst({
        where: { dealId: offer.dealId, workspaceId, documentType: template.documentType },
      });

      const status = missingRequired.length > 0 ? 'missing_info' : 'draft';

      const generationContext: Record<string, any> = {
        dealFields: fieldMap,
        offerFields: offerContext,
        parties: offer.deal.parties.map((p: any) => ({ name: p.name, role: p.role, email: p.email })),
        templateMapping: template.fieldMappingJson,
      };

      const fileContent = this.buildAcceptanceContent(template.name, offer, fieldMap);

      if (!document) {
        document = await this.prisma.document.create({
          data: {
            dealId: offer.dealId,
            workspaceId,
            templateId: template.id,
            documentType: template.documentType,
            name: `${template.name} – ${offer.buyerName ?? 'Offer'}`,
            status,
            currentVersionNumber: 0,
            requiresReview: true,
            metadata: { offerId, generationContext } as any,
          },
        });
      }

      const newVersion = document.currentVersionNumber + 1;
      const filename = `${template.documentType}_offer_${offerId.slice(0, 8)}_v${newVersion}.txt`;

      const fileUrl = await this.storageProvider.storeFile(
        workspaceId,
        offer.dealId,
        '06_Contract',
        filename,
        fileContent,
      );

      await this.prisma.documentVersion.create({
        data: {
          documentId: document.id,
          workspaceId,
          versionNumber: newVersion,
          fileUrl,
          generatedFromFieldsJson: generationContext,
          createdByActorType: 'system',
          createdByActorId: actorId,
        },
      });

      document = await this.prisma.document.update({
        where: { id: document.id },
        data: {
          currentVersionNumber: newVersion,
          latestFileUrl: fileUrl,
          status,
        },
      });

      documents.push(document);
    }

    await this.auditService.create({
      workspaceId,
      dealId: offer.dealId,
      action: 'acceptance_package_prepared',
      objectType: 'Offer',
      objectId: offerId,
      actorType: 'user',
      actorId,
      after: { documentIds: documents.map((d) => d.id), missingRequired },
      requestId,
    });

    const documentIds = documents.map((d) => d.id);
    const seller = offer.deal.parties.find((p) => p.role === 'seller');
    const recipients = [
      { name: offer.buyerName ?? 'Buyer', email: 'buyer@example.com', role: 'buyer' },
    ];
    if (seller) {
      recipients.push({ name: seller.name, email: seller.email ?? 'seller@example.com', role: 'seller' });
    }

    const reviewTask = await this.reviewTasksService.create(
      workspaceId,
      {
        dealId: offer.dealId,
        actionType: 'send_acceptance_packet',
        objectType: 'Offer',
        objectId: offerId,
        payloadJson: { recipients, documentIds, offerId, missingRequired },
      },
      actorId,
      requestId,
    );

    await this.auditService.create({
      workspaceId,
      dealId: offer.dealId,
      action: 'acceptance_review_task_created',
      objectType: 'ReviewTask',
      objectId: reviewTask.id,
      actorType: 'system',
      actorId,
      after: reviewTask,
      requestId,
    });

    await this.tryTransitionDeal(workspaceId, offer.dealId, 'contract_drafting', actorId, requestId);

    return {
      offer,
      documents,
      reviewTask,
      missingRequired,
    };
  }

  async listAcceptanceDocuments(workspaceId: string, dealId: string): Promise<any> {
    return this.prisma.document.findMany({
      where: {
        workspaceId,
        dealId,
        documentType: { in: [...ACCEPTANCE_TEMPLATE_TYPES] },
      },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        template: {
          select: {
            id: true,
            name: true,
            documentType: true,
            fieldMappingJson: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markOfferAccepted(
    workspaceId: string,
    offerId: string,
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, workspaceId, status: 'selected' },
    });

    if (!offer) return;

    await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: 'accepted' },
    });

    await this.auditService.create({
      workspaceId,
      dealId: offer.dealId,
      action: 'offer_selected',
      objectType: 'Offer',
      objectId: offerId,
      actorType: 'system',
      actorId,
      before: { status: 'selected' },
      after: { status: 'accepted' },
      requestId,
    });
  }

  private buildAcceptanceContent(
    templateName: string,
    offer: any,
    fields: Record<string, string | null>,
  ): string {
    const lines: string[] = [
      `=== DOCUMENT: ${templateName} ===`,
      `Generated: ${new Date().toISOString()}`,
      `Deal: ${offer.dealId}`,
      `Offer: ${offer.id}`,
      '',
      '--- Buyer Information ---',
      `Buyer: ${offer.buyerName ?? '(not provided)'}`,
      `Entity: ${offer.buyerEntityName ?? '(none)'}`,
      `Agent: ${offer.buyerAgent ?? '(not provided)'}`,
      '',
      '--- Offer Terms ---',
      `Price: ${offer.offerPrice ? `$${Number(offer.offerPrice).toLocaleString()}` : '(not provided)'}`,
      `Earnest Money: ${offer.earnestMoney ? `$${Number(offer.earnestMoney).toLocaleString()}` : '(not provided)'}`,
      `Financing: ${offer.financingType ?? '(not provided)'}`,
      `Option Period: ${offer.optionPeriodDays != null ? `${offer.optionPeriodDays} days` : '(not provided)'}`,
      `Close Date: ${offer.closeDate ? offer.closeDate.toISOString().split('T')[0] : '(not provided)'}`,
      '',
      '--- Property ---',
      `Address: ${fields.property_address ?? fields.address ?? '(not provided)'}`,
      `Seller: ${fields.seller_name ?? '(not provided)'}`,
      '',
      '--- Deal Fields ---',
    ];

    for (const [key, value] of Object.entries(fields)) {
      lines.push(`${key}: ${value ?? '(empty)'}`);
    }

    lines.push('');
    lines.push('[STUB: Real PDF form filling would populate template fields here]');
    lines.push('');
    return lines.join('\n');
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
      action: 'stage_transitioned',
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
