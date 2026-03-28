import { describe, it, expect } from 'vitest';
import { createDealSchema, chatIngestSchema, createExceptionSchema } from '../validation/deal.schema';

describe('Validation Schemas', () => {
  describe('createDealSchema', () => {
    it('should accept valid deal', () => {
      const result = createDealSchema.safeParse({
        dealType: 'listing',
        address: '123 Main St',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid deal type', () => {
      const result = createDealSchema.safeParse({
        dealType: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should allow optional fields', () => {
      const result = createDealSchema.safeParse({
        dealType: 'buyer_rep',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('chatIngestSchema', () => {
    it('should accept valid chat message', () => {
      const result = chatIngestSchema.safeParse({
        message: 'Start new listing at 123 Main St',
        senderId: 'user-1',
        senderName: 'Agent Smith',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing message', () => {
      const result = chatIngestSchema.safeParse({
        senderId: 'user-1',
        senderName: 'Agent Smith',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createExceptionSchema', () => {
    it('should accept valid exception', () => {
      const result = createExceptionSchema.safeParse({
        dealId: 'deal-1',
        title: 'Missing docs',
        description: 'Seller docs not received',
        severity: 'high',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid severity', () => {
      const result = createExceptionSchema.safeParse({
        dealId: 'deal-1',
        title: 'Test',
        description: 'Test',
        severity: 'extreme',
      });
      expect(result.success).toBe(false);
    });
  });
});
