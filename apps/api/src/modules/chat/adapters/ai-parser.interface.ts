export interface ParsedIntent {
  intent:
    | 'create_deal'
    | 'update_deal'
    | 'provide_info'
    | 'ask_question'
    | 'unknown';
  dealType?: string;
  fields?: Record<string, { value: string; confidence: number }>;
  question?: string;
}

export interface AiParser {
  parseMessage(
    message: string,
    context?: { dealId?: string },
  ): Promise<ParsedIntent>;
}

export const AI_PARSER = Symbol('AI_PARSER');
