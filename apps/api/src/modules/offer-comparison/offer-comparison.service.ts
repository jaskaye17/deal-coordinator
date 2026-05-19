import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '@deal-coordinator/shared';

export interface OfferComparisonRow {
  offerId: string;
  offerLabel: string | null;
  buyerName: string | null;
  offerPrice: number | null;
  earnestMoney: number | null;
  financingType: string | null;
  optionPeriodDays: number | null;
  closeDate: string | null;
  proofOfFundsStatus: string | null;
  preapprovalStatus: string | null;
  status: string;
  completeness: number;
  fileCount: number;
}

export interface OfferComparison {
  dealId: string;
  listPrice: number | null;
  offers: OfferComparisonRow[];
  generatedAt: string;
}

@Injectable()
export class OfferComparisonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async compare(
    workspaceId: string,
    dealId: string,
  ): Promise<OfferComparison> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: { fields: true },
    });

    if (!deal) {
      throw new AppError('NOT_FOUND', 404, 'Deal not found');
    }

    const offers = await this.prisma.offer.findMany({
      where: { dealId, workspaceId, status: { notIn: ['rejected', 'superseded'] } },
      include: { files: true },
      orderBy: { receivedAt: 'desc' },
    });

    const listPriceField = deal.fields.find((f) => f.fieldName === 'list_price');
    const listPrice = listPriceField?.fieldValue ? parseFloat(listPriceField.fieldValue) : null;

    const rows: OfferComparisonRow[] = offers.map((o) => {
      const summary = o.summaryJson as { completeness?: number } | null;
      return {
        offerId: o.id,
        offerLabel: o.offerLabel,
        buyerName: o.buyerName,
        offerPrice: o.offerPrice ? Number(o.offerPrice) : null,
        earnestMoney: o.earnestMoney ? Number(o.earnestMoney) : null,
        financingType: o.financingType,
        optionPeriodDays: o.optionPeriodDays,
        closeDate: o.closeDate?.toISOString().split('T')[0] ?? null,
        proofOfFundsStatus: o.proofOfFundsStatus,
        preapprovalStatus: o.preapprovalStatus,
        status: o.status,
        completeness: summary?.completeness ?? 0,
        fileCount: o.files.length,
      };
    });

    return {
      dealId,
      listPrice,
      offers: rows,
      generatedAt: new Date().toISOString(),
    };
  }

  async saveSnapshot(
    workspaceId: string,
    dealId: string,
    comparison: OfferComparison,
  ): Promise<any> {
    return this.prisma.offerComparisonSnapshot.create({
      data: {
        workspaceId,
        dealId,
        snapshotJson: comparison as any,
      },
    });
  }
}
