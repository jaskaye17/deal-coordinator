import { Injectable, Inject, Logger } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { FAKE_LLM_PROVIDER } from './llm-provider.interface';
import type { LLMProvider, LLMResponse } from './llm-provider.interface';
import { openaiComplete, openaiCompleteJson } from './openai-runtime';
import { OPENAI_USER_CONNECTION_PROVIDER } from '../user-ai/openai-provider.constant';

export type LlmCallOptions = {
  forceFake?: boolean;
  userId?: string;
  /** If true, OpenAI errors return a visible message instead of the fake provider (simulator LLM ON). */
  denySilentFakeFallback?: boolean;
};

function normalizeParseResult(raw: unknown): {
  intent: string;
  fields: Record<string, { value: string; confidence: number }>;
  question?: string;
  suggestedResponse?: string;
  referencedDealId?: string;
} {
  const base = {
    intent: 'unknown',
    fields: {} as Record<string, { value: string; confidence: number }>,
    question: undefined as string | undefined,
    suggestedResponse: undefined as string | undefined,
    referencedDealId: undefined as string | undefined,
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  if (typeof o.intent === 'string') base.intent = o.intent;
  if (typeof o.question === 'string') base.question = o.question;
  if (typeof o.suggestedResponse === 'string') base.suggestedResponse = o.suggestedResponse;
  if (typeof o.referencedDealId === 'string') {
    const t = o.referencedDealId.trim();
    if (t) base.referencedDealId = t;
  }
  const fr = o.fields;
  if (fr && typeof fr === 'object' && !Array.isArray(fr)) {
    for (const [k, v] of Object.entries(fr)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const vo = v as Record<string, unknown>;
        base.fields[k] = {
          value: vo.value == null ? '' : String(vo.value),
          confidence:
            typeof vo.confidence === 'number' && !Number.isNaN(vo.confidence)
              ? vo.confidence
              : 0.5,
        };
      }
    }
  }
  return base;
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FAKE_LLM_PROVIDER) private readonly fake: LLMProvider,
  ) {}

  /**
   * Resolves API key: per-user (UserConnection) first, then OPENAI_API_KEY env fallback.
   */
  async resolveOpenAIToken(
    userId?: string,
  ): Promise<{ apiKey: string; model: string } | null> {
    if (userId) {
      const conn = await this.prisma.userConnection.findUnique({
        where: {
          userId_provider: { userId, provider: OPENAI_USER_CONNECTION_PROVIDER },
        },
      });
      if (conn?.accessToken?.trim()) {
        const meta = (conn.metadata as { model?: string } | null) ?? {};
        return {
          apiKey: conn.accessToken.trim(),
          model: meta.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        };
      }
    }
    const env = process.env.OPENAI_API_KEY?.trim();
    if (env) {
      return { apiKey: env, model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini' };
    }
    return null;
  }

  async parseMessage(
    message: string,
    context: {
      workspaceId?: string;
      /** Display name (brokerage / office label in the app) */
      workspaceName?: string;
      workspaceSlug?: string;
      dealId?: string;
      dealType?: string;
      stage?: string;
      scenario?: string;
      intakePracticeHint?: string;
      conversationThreadDealId?: string;
      workspaceDealsForInference?: Array<{
        id: string;
        title: string;
        stage: string;
        dealType: string;
        address: string | null;
      }>;
    },
    opts?: LlmCallOptions,
  ): Promise<{
    intent: string;
    fields: Record<string, { value: string; confidence: number }>;
    question?: string;
    suggestedResponse?: string;
    referencedDealId?: string;
  }> {
    const hasDealList =
      Array.isArray(context.workspaceDealsForInference) &&
      context.workspaceDealsForInference.length > 0;
    const dealInferenceBlock = hasDealList
      ? ` Also return referencedDealId: either null, or the exact "id" of ONE deal from workspaceDealsForInference when the message clearly continues work on that specific deal (by address, client name, or unambiguous reference). If the user is greeting, vague, or clearly starting a new transaction, use null. Never invent an id—all ids must come from workspaceDealsForInference for this workspace only.`
      : '';
    const scopeBlock =
      typeof context.workspaceId === 'string' && context.workspaceId.trim()
        ? `WORKSPACE SCOPE: workspaceId is ${context.workspaceId.trim()}. All deal data in context belongs ONLY to this workspace—never assume or reference other workspaces. referencedDealId must be null or an id from workspaceDealsForInference (this workspace). `
        : '';
    const toneBlock = `If you set suggestedResponse, write like a person texting: brief, warm, natural. Simple greetings deserve a casual line (e.g. "Hey! How's it going?") when appropriate; avoid corporate or robotic phrasing. `;
    const workspaceHint = context.workspaceName?.trim()
      ? ` If the user asks for brokerage, workspace, firm, or company name, set suggestedResponse using workspaceName from context only—never invent a name.`
      : '';
    const systemPrompt = `${scopeBlock}You are a real estate transaction assistant. Parse the incoming message and extract structured information.
Return JSON with: intent (create_deal, provide_info, ask_question, unknown), fields (key-value pairs with confidence), question (if asking), suggestedResponse, referencedDealId (string or null). ${toneBlock}${dealInferenceBlock}${workspaceHint}
Context: ${JSON.stringify(context)}`;

    if (opts?.forceFake) {
      const raw = await this.fake.completeJson<unknown>(message, systemPrompt);
      return normalizeParseResult(raw);
    }

    const tok = await this.resolveOpenAIToken(opts?.userId);
    if (!tok) {
      if (opts?.denySilentFakeFallback) {
        return normalizeParseResult({
          intent: 'unknown',
          suggestedResponse:
            'OpenAI is not configured (no API key). Add your key under Integrations → OpenAI, or turn on LLM MOCK.',
        });
      }
      return normalizeParseResult({});
    }

    try {
      const raw = await openaiCompleteJson<unknown>(
        tok.apiKey,
        tok.model,
        message,
        systemPrompt,
      );
      return normalizeParseResult(raw);
    } catch (err) {
      this.logger.warn(`OpenAI parseMessage failed: ${err}`);
      if (opts?.denySilentFakeFallback) {
        const msg = err instanceof Error ? err.message : String(err);
        return normalizeParseResult({
          intent: 'unknown',
          suggestedResponse: `Couldn’t parse that with OpenAI—try again. (${msg})`,
        });
      }
      return normalizeParseResult({});
    }
  }

  async generateFollowupQuestion(context: {
    dealType: string;
    stage: string;
    missingFields: string[];
    recentMessages: string[];
  }): Promise<LLMResponse> {
    const prompt = `Generate a natural follow-up question to collect missing information.
Deal type: ${context.dealType}
Stage: ${context.stage}
Missing fields: ${context.missingFields.join(', ')}
Recent messages: ${context.recentMessages.slice(-3).join('\n')}

Respond with a single, clear question.`;

    return this.completeWithEnvOrFake(
      prompt,
      'You are a helpful real estate transaction coordinator.',
    );
  }

  async generateDealStatus(deal: {
    title: string;
    stage: string;
    dealType: string;
    openItems: number;
    offerCount: number;
  }): Promise<LLMResponse> {
    const prompt = `Summarize the current status of this real estate deal:
Title: ${deal.title}
Type: ${deal.dealType}
Stage: ${deal.stage}
Open items: ${deal.openItems}
Offers: ${deal.offerCount}

Provide a brief, professional status update.`;

    return this.completeWithEnvOrFake(
      prompt,
      'You are a real estate transaction coordinator providing status updates.',
    );
  }

  async summarizeOffer(offer: Record<string, unknown>): Promise<LLMResponse> {
    const prompt = `Summarize this real estate offer in 2-3 sentences:
${JSON.stringify(offer, null, 2)}

Focus on price, terms, and any notable conditions.`;

    return this.completeWithEnvOrFake(
      prompt,
      'You are a helpful real estate analyst summarizing offers objectively.',
    );
  }

  private async completeWithEnvOrFake(
    prompt: string,
    systemPrompt?: string,
  ): Promise<LLMResponse> {
    const tok = await this.resolveOpenAIToken(undefined);
    if (!tok) {
      return this.fake.complete(prompt, systemPrompt);
    }
    try {
      return await openaiComplete(tok.apiKey, tok.model, prompt, systemPrompt);
    } catch (err) {
      this.logger.warn(`OpenAI complete failed: ${err}`);
      return this.fake.complete(prompt, systemPrompt);
    }
  }

  /**
   * LLM formats user-visible copy only. All factual content must already be in `facts`.
   */
  async formatConversationalResponse(
    userMessage: string,
    facts: Record<string, unknown>,
    opts?: LlmCallOptions,
  ): Promise<string> {
    const system = `You are a formatting-only assistant inside a real estate transaction workspace.

STRICT RULES:
- Use ONLY the JSON under BACKEND_FACTS. Do not invent deals, people, dates, dollar amounts, or legal conclusions.
- Write 1–4 short paragraphs or tight bullets the user can scan quickly.
- If BACKEND_FACTS.payload or guidance indicates an error, say what to do next in plain language.
- If a checklist or deal list is present, include it clearly.`;

    const prompt = `User said:\n"""\n${userMessage}\n"""\n\nBACKEND_FACTS:\n${JSON.stringify(facts, null, 2)}`;

    if (opts?.forceFake) {
      const r = await this.fake.complete(prompt, system);
      return r.content.trim();
    }

    const tok = await this.resolveOpenAIToken(opts?.userId);
    if (!tok) {
      return this.formatConversationalFallback(facts);
    }

    try {
      const r = await openaiComplete(tok.apiKey, tok.model, prompt, system);
      return r.content.trim();
    } catch (err) {
      this.logger.warn(`formatConversationalResponse failed: ${err}`);
      return this.formatConversationalFallback(facts);
    }
  }

  private formatConversationalFallback(facts: Record<string, unknown>): string {
    const g = facts.guidance as
      | { suggestion?: string; nextSteps?: string[]; missingItems?: string[] }
      | undefined;
    const lines: string[] = [];
    if (g?.suggestion) lines.push(g.suggestion);
    if (g?.nextSteps?.length) {
      lines.push('Next steps:');
      for (const s of g.nextSteps) lines.push(`• ${s}`);
    }
    if (g?.missingItems?.length) {
      lines.push('Items to address:');
      for (const m of g.missingItems) lines.push(`• ${m}`);
    }
    const p = facts.payload as Record<string, unknown> | undefined;
    if (p?.dealCreated && typeof p.displayName === 'string') {
      lines.push(`Created: ${p.displayName} (${p.dealId}).`);
    }
    if (Array.isArray(p?.deals)) {
      lines.push('Active deals:');
      for (const d of (p.deals as { displayName?: string; title?: string; stage: string }[]).slice(
        0,
        12,
      )) {
        const lab = d.displayName ?? d.title ?? 'Deal';
        lines.push(`• ${lab} — ${d.stage}`);
      }
    }
    return lines.join('\n').trim() || 'Here is the latest from your workspace.';
  }

  async complete(
    prompt: string,
    systemPrompt?: string,
    opts?: LlmCallOptions,
  ): Promise<LLMResponse> {
    if (opts?.forceFake) {
      return this.fake.complete(prompt, systemPrompt);
    }

    const tok = await this.resolveOpenAIToken(opts?.userId);
    if (!tok) {
      if (opts?.denySilentFakeFallback) {
        return {
          content:
            'OpenAI could not be reached (no API key). Add your key under Integrations → OpenAI or use LLM MOCK.',
          tokensUsed: 0,
        };
      }
      return this.fake.complete(prompt, systemPrompt);
    }

    try {
      return await openaiComplete(tok.apiKey, tok.model, prompt, systemPrompt);
    } catch (err) {
      this.logger.warn(`OpenAI complete failed: ${err}`);
      if (opts?.denySilentFakeFallback) {
        return {
          content: `OpenAI request failed—try again in a moment. (${err instanceof Error ? err.message : String(err)})`,
          tokensUsed: 0,
        };
      }
      return this.fake.complete(prompt, systemPrompt);
    }
  }
}
