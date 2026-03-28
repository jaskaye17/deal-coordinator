import { describe, it, expect } from 'vitest';
import { KeyDatesService } from '../src/modules/key-dates/key-dates.service';

describe('KeyDatesService.extractKeyDates', () => {
  const service = new KeyDatesService(null as any, null as any, null as any);

  it('extracts closing date from offer', () => {
    const dates = service.extractKeyDates(
      { closeDate: new Date('2026-06-15'), optionPeriodDays: null, earnestMoney: null, financingType: null },
      {},
    );

    const closing = dates.find((d) => d.eventType === 'closing_date');
    expect(closing).toBeDefined();
    expect(closing!.date).toBe('2026-06-15');
    expect(closing!.source).toBe('offer');
  });

  it('falls back to deal field closing_date when offer has none', () => {
    const dates = service.extractKeyDates(undefined, { closing_date: '2026-07-01' });

    const closing = dates.find((d) => d.eventType === 'closing_date');
    expect(closing).toBeDefined();
    expect(closing!.date).toBe('2026-07-01');
    expect(closing!.source).toBe('deal_field');
  });

  it('calculates option deadline from optionPeriodDays', () => {
    const dates = service.extractKeyDates(
      {
        optionPeriodDays: 10,
        createdAt: new Date('2026-04-01'),
        receivedAt: new Date('2026-04-01'),
        closeDate: null,
        earnestMoney: null,
        financingType: null,
      },
      {},
    );

    const option = dates.find((d) => d.eventType === 'option_deadline');
    expect(option).toBeDefined();
    expect(option!.title).toContain('10 days');
    expect(option!.source).toBe('offer');
  });

  it('calculates earnest money deadline', () => {
    const dates = service.extractKeyDates(
      {
        earnestMoney: 5000,
        createdAt: new Date('2026-04-01'),
        receivedAt: new Date('2026-04-01'),
        optionPeriodDays: null,
        closeDate: null,
        financingType: null,
      },
      {},
    );

    const em = dates.find((d) => d.eventType === 'earnest_money_deadline');
    expect(em).toBeDefined();
    expect(em!.source).toBe('calculated');
  });

  it('generates financing and appraisal deadlines for non-cash offers', () => {
    const dates = service.extractKeyDates(
      {
        financingType: 'conventional',
        createdAt: new Date('2026-04-01'),
        receivedAt: new Date('2026-04-01'),
        earnestMoney: null,
        optionPeriodDays: null,
        closeDate: null,
      },
      {},
    );

    expect(dates.find((d) => d.eventType === 'financing_deadline')).toBeDefined();
    expect(dates.find((d) => d.eventType === 'appraisal_deadline')).toBeDefined();
  });

  it('skips financing/appraisal deadlines for cash offers', () => {
    const dates = service.extractKeyDates(
      {
        financingType: 'cash',
        createdAt: new Date('2026-04-01'),
        receivedAt: new Date('2026-04-01'),
        earnestMoney: null,
        optionPeriodDays: null,
        closeDate: null,
      },
      {},
    );

    expect(dates.find((d) => d.eventType === 'financing_deadline')).toBeUndefined();
    expect(dates.find((d) => d.eventType === 'appraisal_deadline')).toBeUndefined();
  });

  it('returns empty array when no offer and no deal fields', () => {
    const dates = service.extractKeyDates(undefined, {});
    expect(dates).toEqual([]);
  });
});
