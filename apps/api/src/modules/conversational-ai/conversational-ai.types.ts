/** Intents detected before any LLM call (deterministic / heuristic). */
export type ConversationIntentId =
  | 'create_deal_listing'
  | 'query_active_deals'
  | 'query_deal_status'
  | 'send_documents'
  | 'workspace_brokerage_info'
  | 'unknown';

export type ConversationEntities = {
  /** Free-text address or property snippet from the user message */
  addressSnippet?: string;
  /** When user asks about “next” / pipeline */
  statusAspect?: 'summary' | 'next_steps' | 'missing';
};

export type IntentDetectionResult = {
  intent: ConversationIntentId;
  confidence: number;
  entities: ConversationEntities;
};

/** Structured facts the backend computed; LLM may only format this. */
export type AssistantBackendFacts = {
  intent: ConversationIntentId;
  confidence: number;
  entities: ConversationEntities;
  /** Result of query / guidance layer */
  payload: Record<string, unknown>;
  guidance?: {
    suggestion: string;
    missingItems: string[];
    nextSteps: string[];
  };
};

export type ConversationToolName =
  | 'get_active_deals'
  | 'get_deal_status'
  | 'get_missing_items';
