import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { LLMProvider, LLMResponse } from '../llm-provider.interface';

@Injectable()
export class OpenAIProvider implements LLMProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private client: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        this.client = new OpenAI({ apiKey });
      } catch {
        this.logger.warn('OpenAI SDK not available');
      }
    }
  }

  async complete(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    if (!this.client) {
      this.logger.warn('OpenAI not configured, returning stub response');
      return { content: '[LLM stub] ' + prompt.slice(0, 100), tokensUsed: 0 };
    }

    const messages: ChatCompletionMessageParam[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const response = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages,
      temperature: 0.2,
    });

    const choice = response.choices[0];
    return {
      content: choice?.message?.content ?? '',
      tokensUsed: response.usage?.total_tokens,
    };
  }

  async completeJson<T>(prompt: string, systemPrompt?: string): Promise<T> {
    if (!this.client) {
      this.logger.warn('OpenAI not configured for JSON, returning empty object');
      return {} as T;
    }

    const messagesJson: ChatCompletionMessageParam[] = [];
    if (systemPrompt) messagesJson.push({ role: 'system', content: systemPrompt });
    messagesJson.push({ role: 'user', content: prompt });

    const response = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: messagesJson,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    return JSON.parse(content) as T;
  }
}
