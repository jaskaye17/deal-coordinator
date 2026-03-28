import { describe, it, expect } from 'vitest';
import {
  folderPathForRoutingKind,
  inferFileRoutingKind,
  type FileRoutingKind,
} from './file-routing';

describe('folderPathForRoutingKind', () => {
  it('maps kinds to deal-relative paths', () => {
    const cases: [FileRoutingKind, string][] = [
      ['listing_agreement', 'root/listing'],
      ['disclosure', 'root/disclosures'],
      ['contract', 'root/contracts'],
      ['signed', 'root/contracts'],
      ['offer', 'root/contracts'],
      ['communication', 'root/general'],
      ['closing', 'root/general'],
      ['general', 'root/general'],
    ];
    for (const [kind, path] of cases) {
      expect(folderPathForRoutingKind(kind)).toBe(path);
    }
  });
});

describe('inferFileRoutingKind', () => {
  it('routes by filename hints', () => {
    expect(inferFileRoutingKind('Exclusive Right to Sell.pdf')).toBe('listing_agreement');
    expect(inferFileRoutingKind('Seller_Disclosure_2024.pdf')).toBe('disclosure');
    expect(inferFileRoutingKind('Purchase Agreement Final.pdf')).toBe('contract');
    expect(inferFileRoutingKind('Fully_Signed_Addendum.pdf')).toBe('signed');
    expect(inferFileRoutingKind('Johnson_Offer.pdf')).toBe('offer');
    expect(inferFileRoutingKind('random-notes.txt')).toBe('general');
  });
});
