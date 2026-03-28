export interface LLMResponse {
  content: string;
  structured?: Record<string, unknown>;
  tokensUsed?: number;
}

export interface LLMProvider {
  complete(prompt: string, systemPrompt?: string): Promise<LLMResponse>;
  completeJson<T>(prompt: string, systemPrompt?: string): Promise<T>;
}

export const LLM_PROVIDER = 'LLM_PROVIDER';

/** Always FakeLLMProvider — used when debug simulate requests mock mode. */
export const FAKE_LLM_PROVIDER = 'FAKE_LLM_PROVIDER';
