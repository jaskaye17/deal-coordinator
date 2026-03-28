import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OFFER_EXTRACTOR } from './extractor.interface';
import type { OfferExtractor, ExtractionResult } from './extractor.interface';

@Injectable()
export class OfferExtractionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(OFFER_EXTRACTOR)
    private readonly extractor: OfferExtractor,
  ) {}

  async extractAndUpdate(
    workspaceId: string,
    offerId: string,
    actorId: string,
    requestId: string,
  ): Promise<ExtractionResult> {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, workspaceId },
      include: { files: true },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    const existingData: Record<string, unknown> = {};
    if (offer.buyerName) existingData.buyerName = offer.buyerName;
    if (offer.offerPrice) existingData.offerPrice = Number(offer.offerPrice);
    if (offer.earnestMoney) existingData.earnestMoney = Number(offer.earnestMoney);
    if (offer.financingType) existingData.financingType = offer.financingType;
    if (offer.optionPeriodDays != null) existingData.optionPeriodDays = offer.optionPeriodDays;
    if (offer.closeDate) existingData.closeDate = offer.closeDate.toISOString().split('T')[0];

    const files = offer.files.map((f) => ({
      fileName: f.fileName,
      fileUrl: f.fileUrl,
      fileType: f.fileType,
    }));

    const result = await this.extractor.extract(files, existingData);

    const updateData: Record<string, unknown> = {
      extractedFieldsJson: result.fields,
      extractionConfidenceJson: result.confidence,
      summaryJson: {
        fields: result.fields,
        completeness: result.completeness,
        source: result.source,
        extractedAt: new Date().toISOString(),
      },
    };

    if (result.fields.buyerName && !offer.buyerName) {
      updateData.buyerName = result.fields.buyerName;
    }
    if (result.fields.buyerEntityName && !offer.buyerEntityName) {
      updateData.buyerEntityName = result.fields.buyerEntityName;
    }
    if (result.fields.offerPrice != null && !offer.offerPrice) {
      updateData.offerPrice = result.fields.offerPrice;
    }
    if (result.fields.earnestMoney != null && !offer.earnestMoney) {
      updateData.earnestMoney = result.fields.earnestMoney;
    }
    if (result.fields.financingType && !offer.financingType) {
      updateData.financingType = result.fields.financingType;
    }
    if (result.fields.optionPeriodDays != null && offer.optionPeriodDays == null) {
      updateData.optionPeriodDays = result.fields.optionPeriodDays;
    }
    if (result.fields.closeDate && !offer.closeDate) {
      updateData.closeDate = new Date(result.fields.closeDate);
    }
    if (result.fields.proofOfFundsPresent != null) {
      updateData.proofOfFundsStatus = result.fields.proofOfFundsPresent ? 'provided' : 'not_provided';
    }
    if (result.fields.preapprovalPresent != null) {
      updateData.preapprovalStatus = result.fields.preapprovalPresent ? 'provided' : 'not_provided';
    }

    const newStatus = result.completeness >= 0.7 ? 'summarized' : 'incomplete';
    updateData.status = newStatus;

    await this.prisma.offer.update({
      where: { id: offerId },
      data: updateData as any,
    });

    await this.auditService.create({
      workspaceId,
      dealId: offer.dealId,
      action: 'offer_summarized',
      objectType: 'Offer',
      objectId: offerId,
      actorType: 'system',
      actorId,
      after: { status: newStatus, completeness: result.completeness },
      metadata: { source: result.source, confidence: result.confidence },
      requestId,
    });

    return result;
  }
}
