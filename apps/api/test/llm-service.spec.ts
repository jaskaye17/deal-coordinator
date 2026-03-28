import { describe, it, expect, vi } from 'vitest';
import { LLMService } from '../src/modules/llm/llm.service';
import { FakeLLMProvider } from '../src/modules/llm/providers/fake-llm.provider';
import type { PrismaService } from '../src/prisma/prisma.service';

describe('LLMService', () => {
  const fakeProvider = new FakeLLMProvider();
  const prisma = {
    userConnection: { findUnique: vi.fn().mockResolvedValue(null) },
  } as unknown as PrismaService;
  const service = new LLMService(prisma, fakeProvider);

  const ctx = {
    dealId: 'deal-1',
    dealType: 'listing',
    stage: 'new_intake',
  };

  describe('parseMessage', () => {
    it('returns structured result with forceFake', async () => {
      const result = await service.parseMessage('hi', ctx, { forceFake: true });
      expect(result.intent).toBe('provide_info');
      expect(result.fields).toEqual({});
      expect(result.suggestedResponse).toMatch(/Hey|going/i);
    });

    it('normalizes safely when no OpenAI key (no crash on empty API shape)', async () => {
      const result = await service.parseMessage('hi', ctx);
      expect(result.intent).toBe('unknown');
      expect(result.fields).toEqual({});
    });
  });

  describe('generateDealStatus', () => {
    it('returns a status summary', async () => {
      const result = await service.generateDealStatus({
        title: '123 Main St',
        stage: 'active',
        dealType: 'listing',
        openItems: 2,
        offerCount: 3,
      });

      expect(result.content).toContain('progressing');
    });
  });

  describe('summarizeOffer', () => {
    it('returns a summary', async () => {
      const result = await service.summarizeOffer({
        offerPrice: 500000,
        buyerName: 'John Doe',
        financingType: 'conventional',
      });

      expect(result.content).toContain('residential');
    });
  });

  describe('generateFollowupQuestion', () => {
    it('returns a follow-up question', async () => {
      const result = await service.generateFollowupQuestion({
        dealType: 'listing',
        stage: 'active',
        missingFields: ['seller_phone', 'closing_date'],
        recentMessages: ['We need to finalize the listing'],
      });

      expect(result.content).toBeTruthy();
    });
  });
});

describe('FakeLLMProvider', () => {
  const provider = new FakeLLMProvider();

  it('returns status-related response for status prompts', async () => {
    const result = await provider.complete('What is the status of this deal?');
    expect(result.content).toContain('progressing');
  });

  it('returns summary response for summarize prompts', async () => {
    const result = await provider.complete('Please summarize this offer');
    expect(result.content).toContain('residential');
  });

  it('returns generic response for other prompts', async () => {
    const result = await provider.complete('Hello there');
    expect(result.content).toBe('Message received and processed.');
  });

  it('completeJson returns parse-related object', async () => {
    const result = await provider.completeJson<any>('parse this input');
    expect(result.intent).toBe('provide_info');
  });

  it('completeJson returns empty object for non-parse prompts', async () => {
    const result = await provider.completeJson<any>('do something else', 'unrelated system instruction');
    expect(result).toEqual({});
  });
});
