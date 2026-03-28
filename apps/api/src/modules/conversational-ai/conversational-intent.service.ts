import { Injectable } from '@nestjs/common';
import { isBrokerageOrWorkspaceNameQuestion } from '../messaging/brokerage-workspace-question.util';
import type {
  ConversationEntities,
  ConversationIntentId,
  IntentDetectionResult,
} from './conversational-ai.types';

@Injectable()
export class ConversationalIntentService {
  /**
   * Deterministic intent + entities (no LLM). Tune patterns as product evolves.
   */
  detect(message: string, context?: { dealId?: string }): IntentDetectionResult {
    const raw = message.trim();
    const lower = raw.toLowerCase();

    const entities: ConversationEntities = {};

    if (isBrokerageOrWorkspaceNameQuestion(raw)) {
      return {
        intent: 'workspace_brokerage_info',
        confidence: 0.96,
        entities,
      };
    }

    if (this.looksLikeSendDocuments(lower)) {
      return { intent: 'send_documents', confidence: 0.88, entities };
    }

    if (this.looksLikeActiveDealsQuery(lower)) {
      return { intent: 'query_active_deals', confidence: 0.9, entities };
    }

    if (this.looksLikeCreateListing(lower)) {
      const addressSnippet = this.extractListingAddressSnippet(raw);
      if (addressSnippet) entities.addressSnippet = addressSnippet;
      return {
        intent: 'create_deal_listing',
        confidence: entities.addressSnippet ? 0.92 : 0.78,
        entities,
      };
    }

    if (this.looksLikeDealStatus(lower)) {
      if (this.looksLikeNextSteps(lower)) {
        entities.statusAspect = 'next_steps';
      } else if (this.looksLikeMissing(lower)) {
        entities.statusAspect = 'missing';
      } else {
        entities.statusAspect = 'summary';
      }
      const addr = this.extractAddressFromGeneralMessage(raw);
      if (addr) entities.addressSnippet = addr;
      return {
        intent: 'query_deal_status',
        confidence: context?.dealId ? 0.9 : entities.addressSnippet ? 0.82 : 0.72,
        entities,
      };
    }

    return { intent: 'unknown', confidence: 0.35, entities };
  }

  private looksLikeSendDocuments(lower: string): boolean {
    return (
      /\bsend\b.*\b(document|documents|paperwork|forms)\b/.test(lower) ||
      /\b(docusign|envelope|signature)\b/.test(lower) ||
      /\bemail\b.*\b(document|documents|packet)\b/.test(lower)
    );
  }

  private looksLikeActiveDealsQuery(lower: string): boolean {
    return (
      /\bactive deals?\b/.test(lower) ||
      /\bwhat deals?\b/.test(lower) ||
      /\bwhich deals?\b/.test(lower) ||
      /\b(my|our) listings?\b/.test(lower) ||
      /\blist (of )?deals\b/.test(lower) ||
      (/\bhow many\b/.test(lower) && /\bdeal/.test(lower))
    );
  }

  private looksLikeCreateListing(lower: string): boolean {
    return (
      /\bstart (a )?listing\b/.test(lower) ||
      /\bnew listing\b/.test(lower) ||
      /\bcreate (a )?listing\b/.test(lower) ||
      /\bopen (a )?listing\b/.test(lower) ||
      /\bbegin (a )?listing\b/.test(lower)
    );
  }

  private looksLikeDealStatus(lower: string): boolean {
    if (/\bdeal status\b/.test(lower)) return true;
    if (/\bstatus of\b/.test(lower)) return true;
    if (/\bwhere (are we|is this)\b/.test(lower)) return true;
    if (/\bwhat'?s (the )?status\b/.test(lower)) return true;
    if (this.looksLikeNextSteps(lower)) return true;
    if (this.looksLikeMissing(lower) && /\bdeal\b/.test(lower)) return true;
    return false;
  }

  private looksLikeNextSteps(lower: string): boolean {
    return (
      /\bwhat'?s next\b/.test(lower) ||
      /\bnext steps?\b/.test(lower) ||
      /\bwhat (do i|should we) do next\b/.test(lower)
    );
  }

  private looksLikeMissing(lower: string): boolean {
    return (
      /\bwhat'?s missing\b/.test(lower) ||
      /\bmissing (items|info|information)\b/.test(lower) ||
      /\bwhat (are we |)missing\b/.test(lower)
    );
  }

  /** After “start listing …” */
  private extractListingAddressSnippet(message: string): string | undefined {
    const m = message.match(
      /(?:start|new|create|open|begin)\s+(?:a\s+)?listing\s+(.+)/i,
    );
    if (m?.[1]) return m[1].replace(/[.?!]+$/, '').trim() || undefined;
    const at = message.match(/\bat\s+(.+)/i);
    if (at?.[1]) return at[1].replace(/[.?!]+$/, '').trim() || undefined;
    return undefined;
  }

  /** “status of 1403 oak” / “what’s next for 123 main” */
  private extractAddressFromGeneralMessage(message: string): string | undefined {
    const m = message.match(
      /\b(?:for|at|on)\s+(\d{2,5}\s+[\w\s]+?)(?:\?|$|\.)/i,
    );
    if (m?.[1]) return m[1].trim();
    const leadNum = message.match(/\b(\d{2,5}\s+[a-z0-9\s,.-]{4,})\b/i);
    if (leadNum?.[1]) return leadNum[1].trim();
    return undefined;
  }
}
