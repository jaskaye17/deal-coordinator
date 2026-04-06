import { Inject, Injectable } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import type { OfferExtractionService } from '../offer-extraction/offer-extraction.service';
import type {
  FileStorageProvider} from '../file-storage/file-storage.interface';
import {
  FILE_STORAGE_PROVIDER,
} from '../file-storage/file-storage.interface';
import {
  AppError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@deal-coordinator/shared';
import type { DealStage, DealType } from '@deal-coordinator/shared';
import { validateTransition } from '@deal-coordinator/workflow';

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly extractionService: OfferExtractionService,
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly storageProvider: FileStorageProvider,
  ) {}

  async list(
    workspaceId: string,
    dealId: string,
    page?: number,
    pageSize?: number,
  ): Promise<any> {
    const currentPage = page ?? 1;
    const take = Math.min(pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = (currentPage - 1) * take;
    const where = { workspaceId, dealId };

    const [items, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        include: { files: true },
        orderBy: { receivedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.offer.count({ where }),
    ]);

    return { items, meta: { page: currentPage, pageSize: take, total } };
  }

  async findById(workspaceId: string, offerId: string): Promise<any> {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, workspaceId },
      include: { files: true, deal: { select: { id: true, title: true, address: true, stage: true } } },
    });

    if (!offer) {
      throw new AppError('NOT_FOUND', 404, 'Offer not found');
    }

    return offer;
  }

  async create(
    workspaceId: string,
    dealId: string,
    data: {
      offerLabel?: string;
      buyerName?: string;
      buyerEntityName?: string;
      buyerAgent?: string;
      offerPrice?: number;
      earnestMoney?: number;
      financingType?: string;
      optionPeriodDays?: number;
      closeDate?: string;
      terms?: string;
      notes?: string;
    },
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
    });

    if (!deal) {
      throw new AppError('NOT_FOUND', 404, 'Deal not found');
    }

    const offer = await this.prisma.offer.create({
      data: {
        workspaceId,
        dealId,
        offerLabel: data.offerLabel,
        buyerName: data.buyerName,
        buyerEntityName: data.buyerEntityName,
        buyerAgent: data.buyerAgent,
        offerPrice: data.offerPrice,
        earnestMoney: data.earnestMoney,
        financingType: data.financingType,
        optionPeriodDays: data.optionPeriodDays,
        closeDate: data.closeDate ? new Date(data.closeDate) : undefined,
        terms: data.terms,
        notes: data.notes,
        receivedAt: new Date(),
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'offer_received',
      objectType: 'Offer',
      objectId: offer.id,
      actorType: 'user',
      actorId,
      after: offer,
      requestId,
    });

    await this.tryTransitionDeal(workspaceId, dealId, 'offers_received', actorId, requestId);

    return offer;
  }

  async update(
    workspaceId: string,
    offerId: string,
    data: Record<string, unknown>,
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const existing = await this.findById(workspaceId, offerId);
    const updateData: Record<string, unknown> = {};

    const allowedFields = [
      'offerLabel', 'buyerName', 'buyerEntityName', 'buyerAgent',
      'offerPrice', 'earnestMoney', 'financingType', 'optionPeriodDays',
      'closeDate', 'terms', 'notes', 'proofOfFundsStatus', 'preapprovalStatus',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (field === 'closeDate' && data[field]) {
          updateData[field] = new Date(data[field] as string);
        } else {
          updateData[field] = data[field];
        }
      }
    }

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: updateData as any,
      include: { files: true },
    });

    await this.auditService.create({
      workspaceId,
      dealId: existing.dealId,
      action: 'offer_created',
      objectType: 'Offer',
      objectId: offerId,
      actorType: 'user',
      actorId,
      before: existing,
      after: updated,
      requestId,
    });

    return updated;
  }

  async shortlist(workspaceId: string, offerId: string, actorId: string, requestId: string): Promise<any> {
    const offer = await this.findById(workspaceId, offerId);

    if (!['received', 'summarized', 'incomplete'].includes(offer.status)) {
      throw new AppError('VALIDATION_ERROR', 422, `Cannot shortlist offer in status ${offer.status}`);
    }

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: 'shortlisted' },
    });

    await this.auditService.create({
      workspaceId,
      dealId: offer.dealId,
      action: 'offer_shortlisted',
      objectType: 'Offer',
      objectId: offerId,
      actorType: 'user',
      actorId,
      before: { status: offer.status },
      after: { status: 'shortlisted' },
      requestId,
    });

    return updated;
  }

  async select(workspaceId: string, offerId: string, actorId: string, requestId: string): Promise<any> {
    const offer = await this.findById(workspaceId, offerId);

    if (!['received', 'summarized', 'incomplete', 'shortlisted'].includes(offer.status)) {
      throw new AppError('VALIDATION_ERROR', 422, `Cannot select offer in status ${offer.status}`);
    }

    await this.prisma.offer.updateMany({
      where: {
        dealId: offer.dealId,
        workspaceId,
        id: { not: offerId },
        status: { notIn: ['rejected', 'superseded', 'accepted'] },
      },
      data: { status: 'superseded' },
    });

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: 'selected' },
    });

    await this.auditService.create({
      workspaceId,
      dealId: offer.dealId,
      action: 'offer_selected',
      objectType: 'Offer',
      objectId: offerId,
      actorType: 'user',
      actorId,
      before: { status: offer.status },
      after: { status: 'selected' },
      requestId,
    });

    await this.tryTransitionDeal(workspaceId, offer.dealId, 'offer_selected', actorId, requestId);

    const missingFields: string[] = [];
    if (!offer.buyerName) missingFields.push('buyerName');
    if (!offer.offerPrice) missingFields.push('offerPrice');
    if (!offer.closeDate) missingFields.push('closeDate');

    if (missingFields.length > 0) {
      await this.prisma.unresolvedItem.create({
        data: {
          workspaceId,
          dealId: offer.dealId,
          type: 'missing_info',
          question: `Selected offer is missing: ${missingFields.join(', ')}`,
          fieldName: missingFields[0]!,
          status: 'open',
        },
      });
    }

    return updated;
  }

  async reject(workspaceId: string, offerId: string, actorId: string, requestId: string, notes?: string): Promise<any> {
    const offer = await this.findById(workspaceId, offerId);

    if (['accepted', 'rejected'].includes(offer.status)) {
      throw new AppError('VALIDATION_ERROR', 422, `Cannot reject offer in status ${offer.status}`);
    }

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: 'rejected', notes: notes ?? offer.notes },
    });

    await this.auditService.create({
      workspaceId,
      dealId: offer.dealId,
      action: 'offer_rejected',
      objectType: 'Offer',
      objectId: offerId,
      actorType: 'user',
      actorId,
      before: { status: offer.status },
      after: { status: 'rejected' },
      metadata: { notes },
      requestId,
    });

    return updated;
  }

  async addFile(
    workspaceId: string,
    offerId: string,
    fileData: { fileName: string; fileType?: string; versionLabel?: string; content: string },
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const offer = await this.findById(workspaceId, offerId);

    const fileUrl = await this.storageProvider.storeFile(
      workspaceId,
      offer.dealId,
      '05_Offers',
      fileData.fileName,
      fileData.content,
    );

    const offerFile = await this.prisma.offerFile.create({
      data: {
        offerId,
        workspaceId,
        fileName: fileData.fileName,
        fileUrl,
        fileType: fileData.fileType ?? null,
        versionLabel: fileData.versionLabel ?? null,
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId: offer.dealId,
      action: 'offer_file_uploaded',
      objectType: 'OfferFile',
      objectId: offerFile.id,
      actorType: 'user',
      actorId,
      after: offerFile,
      requestId,
    });

    return offerFile;
  }

  async listFiles(workspaceId: string, offerId: string): Promise<any> {
    await this.findById(workspaceId, offerId);
    return this.prisma.offerFile.findMany({
      where: { offerId, workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async triggerExtraction(workspaceId: string, offerId: string, actorId: string, requestId: string): Promise<any> {
    return this.extractionService.extractAndUpdate(workspaceId, offerId, actorId, requestId);
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
