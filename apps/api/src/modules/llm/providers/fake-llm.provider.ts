import { Injectable } from '@nestjs/common';
import type { LLMProvider, LLMResponse } from '../llm-provider.interface';

@Injectable()
export class FakeLLMProvider implements LLMProvider {
  async complete(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    const sys = systemPrompt ?? '';
    if (sys.includes('formatting-only assistant') && sys.includes('BACKEND_FACTS')) {
      try {
        const m = prompt.match(/BACKEND_FACTS:\s*(\{[\s\S]*\})\s*$/);
        if (m?.[1]) {
          const facts = JSON.parse(m[1]) as {
            intent?: string;
            guidance?: { suggestion?: string; nextSteps?: string[]; missingItems?: string[] };
            payload?: Record<string, unknown>;
          };
          const parts: string[] = [];
          if (facts.guidance?.suggestion) parts.push(facts.guidance.suggestion);
          if (facts.payload?.dealCreated && typeof facts.payload.displayName === 'string') {
            parts.push(`Created deal ${facts.payload.displayName}.`);
          }
          if (Array.isArray(facts.payload?.deals)) {
            const deals = facts.payload.deals as { displayName?: string; title?: string; stage: string }[];
            parts.push(
              `${deals.length} active deal(s): ` +
                deals
                  .slice(0, 5)
                  .map((d) => d.displayName ?? d.title ?? d.stage)
                  .join('; '),
            );
          }
          if (facts.guidance?.nextSteps?.length) {
            parts.push(`Next: ${facts.guidance.nextSteps.join('; ')}`);
          }
          return {
            content: parts.join(' ') || 'Here is what we have on file.',
            tokensUsed: 0,
          };
        }
      } catch {
        /* fall through */
      }
    }
    if (sys.includes('friendly teammate') && sys.includes('workspace')) {
      if (/They just texted:\s*"\s*(hi|hey|hello)\b/i.test(prompt)) {
        return { content: "Hey! How's it going?", tokensUsed: 0 };
      }
      return {
        content: 'Sounds good — what are you working on?',
        tokensUsed: 0,
      };
    }
    if (prompt.toLowerCase().includes('status')) {
      return { content: 'Deal is progressing normally. All required documents have been collected.', tokensUsed: 0 };
    }
    if (prompt.toLowerCase().includes('summarize')) {
      return { content: 'This is a standard residential transaction with conventional financing.', tokensUsed: 0 };
    }
    return { content: 'Message received and processed.', tokensUsed: 0 };
  }

  async completeJson<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const sys = (systemPrompt ?? '').toLowerCase();
    // Matches LLMService.parseMessage system prompt — inbound message may not contain "parse"
    if (sys.includes('parse the incoming message')) {
      const t = prompt.trim().toLowerCase();
      if (/^(hi|hey|hello)\b/.test(t)) {
        return {
          intent: 'provide_info',
          fields: {},
          suggestedResponse: "Hey! How's it going?",
        } as T;
      }
      return {
        intent: 'provide_info',
        fields: {},
        suggestedResponse:
          'Thanks — we received your message and logged it for the transaction file (mock LLM, no API call).',
      } as T;
    }
    if (prompt.toLowerCase().includes('parse')) {
      return { intent: 'provide_info', fields: {}, confidence: 0.5 } as T;
    }
    return {} as T;
  }
}
