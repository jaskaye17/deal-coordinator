import { Injectable } from '@nestjs/common';
import type { IntentDetectionResult } from './conversational-ai.types';
import {
  playbookItemsForDeal,
  type PlaybookDealSnapshot,
} from './listing-playbooks';

export type GuidanceResult = {
  suggestion: string;
  missingItems: string[];
  nextSteps: string[];
};

@Injectable()
export class GuidanceEngineService {
  /**
   * Merge intent, DB query payloads, and playbook rules into actionable guidance.
   */
  build(input: {
    intent: IntentDetectionResult;
    /** e.g. getDealStatus result, getActiveDeals, getMissingItems */
    queryPayload: Record<string, unknown>;
    dealSnapshot?: PlaybookDealSnapshot | null;
  }): GuidanceResult {
    const { intent, queryPayload, dealSnapshot } = input;
    const missingItems: string[] = [];
    const nextSteps: string[] = [];
    let suggestion = '';

    if (queryPayload.error === 'deal_not_found') {
      return {
        suggestion:
          'I need a deal to answer that. Open a deal in the app, or mention a property address (e.g. “what’s next for 1403 Oak”).',
        missingItems: [],
        nextSteps: ['Select a deal', 'Include a street address in your message'],
      };
    }

    switch (intent.intent) {
      case 'query_active_deals': {
        const deals = (queryPayload.deals as unknown[]) ?? [];
        suggestion =
          deals.length === 0
            ? 'There are no active (non-closed) deals in this workspace.'
            : `There ${deals.length === 1 ? 'is' : 'are'} ${deals.length} active deal${deals.length === 1 ? '' : 's'}.`;
        break;
      }

      case 'query_deal_status': {
        const status = queryPayload as {
          transitions?: { label: string; to: string }[];
          counts?: { unresolvedItems: number; exceptions: number };
          deal?: { stage: string; displayName?: string | null; title?: string | null };
        };
        const label =
          status.deal?.displayName ?? status.deal?.title ?? 'This deal';
        if (intent.entities.statusAspect === 'next_steps') {
          const t = status.transitions ?? [];
          nextSteps.push(...t.map((x) => x.label));
          suggestion =
            t.length > 0
              ? `${label} is in stage "${status.deal?.stage}". Workflow allows: ${t.map((x) => x.label).join('; ')}.`
              : `${label} is in "${status.deal?.stage}" with no further transitions in the model.`;
        } else if (intent.entities.statusAspect === 'missing') {
          const open = status.counts?.unresolvedItems ?? 0;
          suggestion =
            open === 0
              ? `${label}: no open missing-info items.`
              : `${label}: ${open} open missing-info item(s) — see missingItems.`;
        } else {
          suggestion = `${label}: stage ${status.deal?.stage}. See structured payload for counts and fields.`;
        }
        break;
      }

      case 'send_documents': {
        suggestion =
          'Documents are sent through review tasks and signature envelopes. Open the deal’s Documents tab, complete required items, then use the review / e-sign flow when enabled.';
        nextSteps.push('Complete checklist items in the playbook');
        nextSteps.push('Generate or upload required PDFs');
        nextSteps.push('Submit for review and send for signature');
        break;
      }

      case 'create_deal_listing': {
        suggestion =
          'A new listing deal will be created with the address you provided. Required intake fields may still be missing.';
        break;
      }

      case 'workspace_brokerage_info': {
        const ans = (queryPayload as { brokerageAnswer?: string }).brokerageAnswer;
        suggestion =
          typeof ans === 'string' && ans.trim()
            ? ans.trim()
            : 'Workspace brokerage name is stored in Deal Coordinator settings.';
        break;
      }

      default:
        suggestion = 'I could not match a specific workflow intent from that message.';
    }

    const includePlaybookChecklist =
      dealSnapshot &&
      dealSnapshot.dealType === 'listing' &&
      (intent.intent === 'send_documents' ||
        (intent.intent === 'query_deal_status' &&
          intent.entities.statusAspect === 'missing'));

    if (includePlaybookChecklist && dealSnapshot) {
      const items = playbookItemsForDeal(dealSnapshot);
      for (const it of items) {
        if (it.required) {
          missingItems.push(`[Compliance] ${it.label}`);
        } else if (it.applies?.(dealSnapshot)) {
          missingItems.push(`[Compliance — conditional] ${it.label}`);
        }
      }
      if (intent.intent === 'send_documents' && items.length) {
        suggestion += ` Typical documents include: ${items.map((i) => i.label).join(', ')}.`;
      }
    }

    const unresolved = (
      queryPayload as { unresolvedItems?: { question: string }[] }
    ).unresolvedItems;
    if (Array.isArray(unresolved)) {
      for (const u of unresolved) {
        missingItems.push(u.question);
      }
    }

    return { suggestion, missingItems, nextSteps };
  }
}
