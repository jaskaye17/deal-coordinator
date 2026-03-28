import { describe, it, expect } from 'vitest';
import { generateDealName, DEAL_SLUG_MAX_LENGTH } from './deal-naming';

describe('generateDealName', () => {
  it('formats display name with em dash', () => {
    const r = generateDealName({
      primaryContactName: 'John Smith',
      propertyAddress: '1403 Green Forest',
    });
    expect(r.displayName).toBe('John Smith — 1403 Green Forest');
    expect(r.slug).toBe('john-smith-1403-green-forest');
  });

  it('lowercases slug and strips punctuation', () => {
    const r = generateDealName({
      primaryContactName: "O'Brien, Jr.",
      propertyAddress: '123 Main St., #4B!',
    });
    expect(r.slug).toMatch(/^obrien-jr-123-main-st-4b$/);
  });

  it('replaces spaces with hyphens', () => {
    const r = generateDealName({
      primaryContactName: 'Jane  Doe',
      propertyAddress: 'One   Two',
    });
    expect(r.slug).toBe('jane-doe-one-two');
  });

  it('truncates slug length', () => {
    const long = 'a'.repeat(200);
    const r = generateDealName({
      primaryContactName: long,
      propertyAddress: long,
    });
    expect(r.slug.length).toBeLessThanOrEqual(DEAL_SLUG_MAX_LENGTH);
  });
});
