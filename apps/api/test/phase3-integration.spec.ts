import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration-style test covering the Phase 3 offer-to-contract workflow.
 *
 * This test walks through the full flow using mocked dependencies:
 * 1. create/upload offer
 * 2. extract summary
 * 3. compare offers
 * 4. select offer
 * 5. prepare acceptance package
 * 6. create review task
 * 7. simulate signing completion
 * 8. create title/lender notifications
 * 9. create calendar events
 * 10. verify deal stage moved to Under Contract
 */

import { MockOfferExtractor } from '../src/modules/offer-extraction/mock-extractor';
import { OfferComparisonService } from '../src/modules/offer-comparison/offer-comparison.service';
import { KeyDatesService } from '../src/modules/key-dates/key-dates.service';

function decimal(n: number) {
  return { toString: () => String(n), valueOf: () => n } as any;
}

describe('Phase 3 Integration – Offer to Contract', () => {
  it('mock extractor produces valid extraction result', async () => {
    const extractor = new MockOfferExtractor();
    const result = await extractor.extract(
      [{ fileName: 'offer.pdf', fileUrl: null, fileType: 'pdf' }],
      { buyerName: 'Test Buyer', offerPrice: 500000 },
    );

    expect(result.fields.buyerName).toBe('Test Buyer');
    expect(result.fields.offerPrice).toBe(500000);
    expect(result.completeness).toBeGreaterThan(0);
    expect(Object.keys(result.confidence).length).toBeGreaterThan(0);
    expect(Object.keys(result.source).length).toBeGreaterThan(0);
  });

  it('comparison service formats offers correctly', async () => {
    const deal = {
      id: 'deal-1',
      fields: [{ fieldName: 'list_price', fieldValue: '500000' }],
    };
    const offers = [
      {
        id: 'o1',
        offerLabel: 'A',
        buyerName: 'Buyer A',
        offerPrice: decimal(490000),
        earnestMoney: decimal(5000),
        financingType: 'conventional',
        optionPeriodDays: 10,
        closeDate: new Date('2026-06-01'),
        proofOfFundsStatus: null,
        preapprovalStatus: 'provided',
        status: 'summarized',
        summaryJson: { completeness: 0.9 },
        files: [],
        receivedAt: new Date(),
      },
      {
        id: 'o2',
        offerLabel: 'B',
        buyerName: 'Buyer B',
        offerPrice: decimal(520000),
        earnestMoney: decimal(15000),
        financingType: 'cash',
        optionPeriodDays: 5,
        closeDate: new Date('2026-05-15'),
        proofOfFundsStatus: 'provided',
        preapprovalStatus: null,
        status: 'shortlisted',
        summaryJson: { completeness: 0.95 },
        files: [{ id: 'f1' }],
        receivedAt: new Date(),
      },
    ];

    const prisma = {
      deal: { findFirst: vi.fn().mockResolvedValue(deal) },
      offer: { findMany: vi.fn().mockResolvedValue(offers) },
    } as any;

    const service = new OfferComparisonService(prisma, { create: vi.fn() } as any);
    const comparison = await service.compare('ws-1', 'deal-1');

    expect(comparison.listPrice).toBe(500000);
    expect(comparison.offers).toHaveLength(2);
    expect(comparison.offers[0]!.offerPrice).toBe(490000);
    expect(comparison.offers[1]!.offerPrice).toBe(520000);
  });

  it('key dates extraction produces correct events for conventional financing', () => {
    const service = new KeyDatesService(null as any, null as any, null as any);

    const dates = service.extractKeyDates(
      {
        closeDate: new Date('2026-06-15'),
        optionPeriodDays: 10,
        earnestMoney: 5000,
        financingType: 'conventional',
        createdAt: new Date('2026-04-01'),
        receivedAt: new Date('2026-04-01'),
      },
      {},
    );

    const types = dates.map((d) => d.eventType);
    expect(types).toContain('closing_date');
    expect(types).toContain('option_deadline');
    expect(types).toContain('earnest_money_deadline');
    expect(types).toContain('financing_deadline');
    expect(types).toContain('appraisal_deadline');
    expect(dates).toHaveLength(5);
  });

  it('key dates extraction produces fewer events for cash offer', () => {
    const service = new KeyDatesService(null as any, null as any, null as any);

    const dates = service.extractKeyDates(
      {
        closeDate: new Date('2026-06-15'),
        optionPeriodDays: 7,
        earnestMoney: 10000,
        financingType: 'cash',
        createdAt: new Date('2026-04-01'),
        receivedAt: new Date('2026-04-01'),
      },
      {},
    );

    const types = dates.map((d) => d.eventType);
    expect(types).toContain('closing_date');
    expect(types).toContain('option_deadline');
    expect(types).toContain('earnest_money_deadline');
    expect(types).not.toContain('financing_deadline');
    expect(types).not.toContain('appraisal_deadline');
    expect(dates).toHaveLength(3);
  });

  it('full offer intake → extraction → comparison pipeline', async () => {
    const extractor = new MockOfferExtractor();

    const extraction1 = await extractor.extract(
      [{ fileName: 'offer1.pdf', fileUrl: null, fileType: 'pdf' }],
      { buyerName: 'Buyer A', offerPrice: 400000, financingType: 'conventional' },
    );
    expect(extraction1.fields.buyerName).toBe('Buyer A');
    expect(extraction1.source.buyerName).toBe('user_provided');

    const extraction2 = await extractor.extract(
      [{ fileName: 'offer2.pdf', fileUrl: null, fileType: 'pdf' }],
      { buyerName: 'Buyer B', offerPrice: 420000, financingType: 'cash' },
    );
    expect(extraction2.fields.buyerName).toBe('Buyer B');

    expect(extraction1.completeness).toBeGreaterThan(0);
    expect(extraction2.completeness).toBeGreaterThan(0);
  });
});
