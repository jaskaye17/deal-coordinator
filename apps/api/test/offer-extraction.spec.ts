import { describe, it, expect } from 'vitest';
import { MockOfferExtractor } from '../src/modules/offer-extraction/mock-extractor';

describe('MockOfferExtractor', () => {
  const extractor = new MockOfferExtractor();

  it('fills in all fields when no existing data provided', async () => {
    const result = await extractor.extract([
      { fileName: 'offer.pdf', fileUrl: '/files/offer.pdf', fileType: 'pdf' },
    ]);

    expect(result.fields.buyerName).toBeDefined();
    expect(result.fields.offerPrice).toBeDefined();
    expect(result.fields.earnestMoney).toBeDefined();
    expect(result.fields.financingType).toBeDefined();
    expect(result.fields.optionPeriodDays).toBeDefined();
    expect(result.fields.closeDate).toBeDefined();
    expect(result.completeness).toBeGreaterThan(0);
    expect(result.completeness).toBeLessThanOrEqual(1);
  });

  it('preserves user-provided data and sets confidence to 1.0', async () => {
    const result = await extractor.extract(
      [{ fileName: 'contract.pdf', fileUrl: null, fileType: 'pdf' }],
      { buyerName: 'Jane Smith', offerPrice: 500000 },
    );

    expect(result.fields.buyerName).toBe('Jane Smith');
    expect(result.fields.offerPrice).toBe(500000);
    expect(result.confidence.buyerName).toBe(1.0);
    expect(result.confidence.offerPrice).toBe(1.0);
    expect(result.source.buyerName).toBe('user_provided');
    expect(result.source.offerPrice).toBe('user_provided');
  });

  it('detects proof of funds from filename heuristic', async () => {
    const result = await extractor.extract([
      { fileName: 'Proof_of_Funds.pdf', fileUrl: null, fileType: 'pdf' },
    ]);

    expect(result.fields.proofOfFundsPresent).toBe(true);
    expect(result.source.proofOfFundsPresent).toBe('filename_heuristic');
  });

  it('detects preapproval from filename heuristic', async () => {
    const result = await extractor.extract([
      { fileName: 'buyer_pre-approval_letter.pdf', fileUrl: null, fileType: 'pdf' },
    ]);

    expect(result.fields.preapprovalPresent).toBe(true);
    expect(result.source.preapprovalPresent).toBe('filename_heuristic');
  });

  it('returns low completeness when no files or data', async () => {
    const result = await extractor.extract([]);
    expect(result.completeness).toBeGreaterThan(0);
    expect(result.fields.proofOfFundsPresent).toBe(false);
    expect(result.fields.preapprovalPresent).toBe(false);
  });

  it('reports mock_extraction source for inferred fields', async () => {
    const result = await extractor.extract([]);
    expect(result.source.buyerName).toBe('mock_extraction');
    expect(result.source.offerPrice).toBe('mock_extraction');
    expect(result.confidence.buyerName).toBeLessThan(1.0);
  });
});
