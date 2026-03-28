import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reserveUniqueDealSlug } from '../src/modules/deals/deal-slug.util';

describe('reserveUniqueDealSlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns base slug when available', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const slug = await reserveUniqueDealSlug({ findFirst } as any, 'ws-1', 'jane-doe-123-main');
    expect(slug).toBe('jane-doe-123-main');
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it('appends numeric suffix when taken', async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({ id: 'existing' })
      .mockResolvedValueOnce(null);
    const slug = await reserveUniqueDealSlug({ findFirst } as any, 'ws-1', 'dup-name');
    expect(slug).toMatch(/^dup-name-2$/);
    expect(findFirst).toHaveBeenCalledTimes(2);
  });
});
