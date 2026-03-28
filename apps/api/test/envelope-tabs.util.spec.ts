import { describe, it, expect } from 'vitest';
import {
  pdfRectToDocuSignPosition,
  recipientIdForSignerRole,
} from '../src/modules/signatures/envelope-tabs.util';

describe('envelope-tabs.util', () => {
  describe('pdfRectToDocuSignPosition', () => {
    it('converts bottom-left PDF rect to DocuSign top-left y', () => {
      const pageHeight = 792;
      const rect = { x: 72, y: 100, width: 200, height: 20 };
      const pos = pdfRectToDocuSignPosition(pageHeight, rect);
      expect(pos.x).toBe(72);
      expect(pos.y).toBe(792 - 100 - 20);
      expect(pos.width).toBe(200);
      expect(pos.height).toBe(20);
    });
  });

  describe('recipientIdForSignerRole', () => {
    const recipients = [
      { name: 'A', email: 'a@x.com', role: 'seller' },
      { name: 'B', email: 'b@x.com', role: 'buyer' },
    ];

    it('returns 1-based DocuSign recipient id when role matches', () => {
      expect(recipientIdForSignerRole(recipients, 'buyer')).toBe('2');
      expect(recipientIdForSignerRole(recipients, 'SELLER')).toBe('1');
    });

    it('returns null when role missing or unmatched', () => {
      expect(recipientIdForSignerRole(recipients, null)).toBeNull();
      expect(recipientIdForSignerRole(recipients, 'agent')).toBeNull();
    });
  });
});
