import { describe, it, expect, vi } from 'vitest';
import { OfferComparisonService } from '../src/modules/offer-comparison/offer-comparison.service';

function decimal(n: number) {
  return { toString: () => String(n), valueOf: () => n } as any;
}

function createMockPrisma(dealData: any, offersData: any[]) {
  return {
    deal: {
      findFirst: vi.fn().mockResolvedValue(dealData),
    },
    offer: {
      findMany: vi.fn().mockResolvedValue(offersData),
    },
    offerComparisonSnapshot: {
      create: vi.fn().mockResolvedValue({ id: 'snapshot-1' }),
    },
  } as any;
}

function createMockAudit() {
  return { create: vi.fn().mockResolvedValue({}) } as any;
}

describe('OfferComparisonService', () => {
  it('generates a comparison with all offer fields', async () => {
    const deal = {
      id: 'deal-1',
      fields: [{ fieldName: 'list_price', fieldValue: '500000' }],
    };

    const offers = [
      {
        id: 'offer-1',
        offerLabel: 'Offer A',
        buyerName: 'Alice',
        offerPrice: decimal(490000),
        earnestMoney: decimal(5000),
        financingType: 'conventional',
        optionPeriodDays: 10,
        closeDate: new Date('2026-06-01'),
        proofOfFundsStatus: 'not_provided',
        preapprovalStatus: 'provided',
        status: 'summarized',
        summaryJson: { completeness: 0.85 },
        files: [{ id: 'f1' }],
        receivedAt: new Date(),
      },
      {
        id: 'offer-2',
        offerLabel: 'Offer B',
        buyerName: 'Bob',
        offerPrice: decimal(510000),
        earnestMoney: decimal(10000),
        financingType: 'cash',
        optionPeriodDays: 7,
        closeDate: new Date('2026-05-15'),
        proofOfFundsStatus: 'provided',
        preapprovalStatus: null,
        status: 'shortlisted',
        summaryJson: { completeness: 0.95 },
        files: [{ id: 'f2' }, { id: 'f3' }],
        receivedAt: new Date(),
      },
    ];

    const prisma = createMockPrisma(deal, offers);
    const audit = createMockAudit();
    const service = new OfferComparisonService(prisma, audit);

    const result = await service.compare('ws-1', 'deal-1');

    expect(result.dealId).toBe('deal-1');
    expect(result.listPrice).toBe(500000);
    expect(result.offers).toHaveLength(2);

    const offerA = result.offers.find((o) => o.offerId === 'offer-1')!;
    expect(offerA.buyerName).toBe('Alice');
    expect(offerA.offerPrice).toBe(490000);
    expect(offerA.earnestMoney).toBe(5000);
    expect(offerA.financingType).toBe('conventional');
    expect(offerA.fileCount).toBe(1);
    expect(offerA.completeness).toBe(0.85);

    const offerB = result.offers.find((o) => o.offerId === 'offer-2')!;
    expect(offerB.offerPrice).toBe(510000);
    expect(offerB.fileCount).toBe(2);
  });

  it('handles deal with no list_price field', async () => {
    const deal = { id: 'deal-2', fields: [] };
    const prisma = createMockPrisma(deal, []);
    const audit = createMockAudit();
    const service = new OfferComparisonService(prisma, audit);

    const result = await service.compare('ws-1', 'deal-2');

    expect(result.listPrice).toBeNull();
    expect(result.offers).toHaveLength(0);
  });

  it('throws when deal not found', async () => {
    const prisma = createMockPrisma(null, []);
    const audit = createMockAudit();
    const service = new OfferComparisonService(prisma, audit);

    await expect(service.compare('ws-1', 'bad-id')).rejects.toThrow('Deal not found');
  });
});
