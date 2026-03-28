import { Injectable } from '@nestjs/common';
import type { AiParser, ParsedIntent } from './ai-parser.interface';

@Injectable()
export class FakeAiParser implements AiParser {
  async parseMessage(
    message: string,
    _context?: { dealId?: string },
  ): Promise<ParsedIntent> {
    const lower = message.toLowerCase();

    if (lower.includes('new listing') || lower.includes('start listing')) {
      const addressMatch = message.match(
        /(?:at|for|address[:\s]+)\s*(.+?)(?:\.|$)/i,
      );
      const fields: Record<string, { value: string; confidence: number }> = {};
      if (addressMatch?.[1]) {
        fields.address = { value: addressMatch[1].trim(), confidence: 0.7 };
      }
      return {
        intent: 'create_deal',
        dealType: 'listing',
        fields,
      };
    }

    if (lower.includes('?')) {
      return {
        intent: 'ask_question',
        question: message,
      };
    }

    const fields: Record<string, { value: string; confidence: number }> = {};
    const emailMatch = message.match(
      /[\w.-]+@[\w.-]+\.\w+/,
    );
    if (emailMatch) {
      fields.contact_email = { value: emailMatch[0], confidence: 0.9 };
    }
    const phoneMatch = message.match(
      /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    );
    if (phoneMatch) {
      fields.contact_phone = { value: phoneMatch[0], confidence: 0.8 };
    }
    const priceMatch = message.match(
      /\$[\d,]+(?:\.\d{2})?/,
    );
    if (priceMatch) {
      fields.price = {
        value: priceMatch[0].replace(/[$,]/g, ''),
        confidence: 0.75,
      };
    }

    if (Object.keys(fields).length === 0) {
      fields.note = { value: message, confidence: 0.5 };
    }

    return {
      intent: 'provide_info',
      fields,
    };
  }
}
