import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { LLMResponse } from './llm-provider.interface';

export async function openaiComplete(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
): Promise<LLMResponse> {
  const client = new OpenAI({ apiKey });
  const messages: ChatCompletionMessageParam[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.2,
  });

  const choice = response.choices[0];
  return {
    content: choice?.message?.content ?? '',
    tokensUsed: response.usage?.total_tokens,
  };
}

export async function openaiCompleteJson<T>(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
): Promise<T> {
  const client = new OpenAI({ apiKey });
  const messages: ChatCompletionMessageParam[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  try {
    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
}
