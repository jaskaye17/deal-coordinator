import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DealsService } from '../deals/deals.service';
import {
  formatBrokerageWorkspaceReply,
  formatMissingWorkspaceNameReply,
} from '../messaging/brokerage-workspace-question.util';
import { LLMService } from '../llm/llm.service';
import { AssistantToolsService } from './assistant-tools.service';
import type { AssistantBackendFacts, IntentDetectionResult } from './conversational-ai.types';
import { ConversationalIntentService } from './conversational-intent.service';
import { ConversationContextService } from './conversation-context.service';
import { ConversationQueryService } from './conversation-query.service';
import { GuidanceEngineService } from './guidance-engine.service';
import type { PlaybookDealSnapshot } from './listing-playbooks';

export type ChatOrchestratorResult = {
  responseText: string;
  dealId?: string;
  intent: IntentDetectionResult;
  backendFacts: AssistantBackendFacts;
};

@Injectable()
export class ChatOrchestratorService {
  private readonly logger = new Logger(ChatOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly dealsService: DealsService,
    private readonly llmService: LLMService,
    private readonly intentService: ConversationalIntentService,
    private readonly queries: ConversationQueryService,
    private readonly tools: AssistantToolsService,
    private readonly guidanceEngine: GuidanceEngineService,
    private readonly contextService: ConversationContextService,
  ) {}

  async run(params: {
    workspaceId: string;
    message: string;
    dealId?: string;
    senderId: string;
    senderName: string;
    requestId: string;
    /** Force deterministic text (tests / no API key) */
    forceDeterministicFormat?: boolean;
  }): Promise<ChatOrchestratorResult> {
    const {
      workspaceId,
      message,
      senderId,
      requestId,
      forceDeterministicFormat,
    } = params;
    let dealId = params.dealId;

    const intent = this.intentService.detect(message, { dealId });

    if (intent.intent === 'workspace_brokerage_info') {
      const responseText = await this.buildBrokerageWorkspaceAnswer(
        workspaceId,
        senderId,
      );
      const backendFacts: AssistantBackendFacts = {
        intent: 'workspace_brokerage_info',
        confidence: intent.confidence,
        entities: intent.entities,
        payload: { groundedFromDb: true, brokerageAnswer: responseText },
        guidance: {
          suggestion: responseText,
          missingItems: [],
          nextSteps: [],
        },
      };
      return {
        responseText,
        dealId,
        intent,
        backendFacts,
      };
    }

    const structuredContext = await this.contextService.build({
      workspaceId,
      dealId,
    });

    let payload: Record<string, unknown> = {};
    let playbookDeal: PlaybookDealSnapshot | null = null;

    try {
      switch (intent.intent) {
        case 'query_active_deals': {
          payload = await this.tools.get_active_deals(workspaceId);
          break;
        }

        case 'query_deal_status': {
          const resolved = await this.resolveDealId(workspaceId, dealId, intent, message);
          if (!resolved) {
            payload = {
              error: 'deal_not_found',
              hint: 'Specify a deal (open a deal first or mention a property address).',
            };
          } else {
            dealId = resolved;
            const status = await this.tools.get_deal_status(workspaceId, resolved);
            const missing = await this.tools.get_missing_items(workspaceId, resolved);
            payload = {
              ...(status ?? {}),
              ...missing,
            };
            const d = await this.prisma.deal.findFirst({
              where: { id: resolved, workspaceId },
              include: {
                fields: { where: { fieldName: 'year_built' }, take: 1 },
              },
            });
            if (d) {
              const yb = d.fields[0]?.fieldValue;
              const n = yb ? parseInt(yb, 10) : NaN;
              playbookDeal = {
                dealType: d.dealType,
                stage: d.stage,
                yearBuilt: Number.isFinite(n) ? n : null,
              };
            }
          }
          break;
        }

        case 'send_documents': {
          const resolved = await this.resolveDealId(workspaceId, dealId, intent, message);
          if (resolved) {
            dealId = resolved;
            const missing = await this.tools.get_missing_items(workspaceId, resolved);
            const status = await this.tools.get_deal_status(workspaceId, resolved);
            payload = { ...missing, dealStatus: status };
            const d = await this.prisma.deal.findFirst({
              where: { id: resolved, workspaceId },
              include: {
                fields: { where: { fieldName: 'year_built' }, take: 1 },
              },
            });
            if (d) {
              const yb = d.fields[0]?.fieldValue;
              const n = yb ? parseInt(yb, 10) : NaN;
              playbookDeal = {
                dealType: d.dealType,
                stage: d.stage,
                yearBuilt: Number.isFinite(n) ? n : null,
              };
            }
          } else {
            payload = {
              error: 'deal_not_found',
              hint: 'Open a deal or name a property to see what is needed before sending documents.',
            };
          }
          break;
        }

        case 'create_deal_listing': {
          const addr =
            intent.entities.addressSnippet?.trim() ||
            this.fallbackAddressFromMessage(message);
          const deal = await this.dealsService.create(
            workspaceId,
            {
              dealType: 'listing',
              address: addr,
              propertyAddress: addr,
            },
            senderId,
            requestId,
          );
          dealId = deal.id;

          const requiredFields = ['address', 'seller_name', 'list_price', 'contact_email'];
          for (const fieldName of requiredFields) {
            await this.prisma.unresolvedItem.create({
              data: {
                dealId: deal.id,
                workspaceId,
                type: 'missing_info',
                fieldName,
                question: `Please provide the ${fieldName.replace(/_/g, ' ')} for this deal.`,
                status: 'open',
              },
            });
            await this.auditService.create({
              workspaceId,
              dealId: deal.id,
              action: 'unresolved_item_created',
              objectType: 'UnresolvedItem',
              objectId: deal.id,
              actorType: 'system',
              actorId: 'assistant',
              metadata: { fieldName, source: 'conversational_ai' },
              requestId,
            });
          }

          payload = {
            dealCreated: true,
            dealId: deal.id,
            displayName: deal.displayName,
            stage: deal.stage,
            address: addr,
          };
          playbookDeal = {
            dealType: 'listing',
            stage: deal.stage,
            yearBuilt: null,
          };
          break;
        }

        default: {
          const broker = await this.queries.getBrokerInfo(workspaceId);
          const deadlines = await this.queries.getUpcomingDeadlines(workspaceId, 14);
          payload = {
            note: 'Intent not recognized against built-in patterns.',
            broker,
            upcoming: deadlines,
            structuredContext,
          };
        }
      }
    } catch (err) {
      this.logger.warn(`Orchestrator query failed: ${err}`);
      payload = { error: String(err) };
    }

    const guidance = this.guidanceEngine.build({
      intent,
      queryPayload: payload,
      dealSnapshot: playbookDeal,
    });

    const backendFacts: AssistantBackendFacts = {
      intent: intent.intent,
      confidence: intent.confidence,
      entities: intent.entities,
      payload,
      guidance,
    };

    const responseText = forceDeterministicFormat
      ? this.formatDeterministic(backendFacts)
      : await this.llmService.formatConversationalResponse(
          message,
          backendFacts,
          { userId: senderId },
        );

    return {
      responseText,
      dealId,
      intent,
      backendFacts,
    };
  }

  private async buildBrokerageWorkspaceAnswer(
    workspaceId: string,
    userId: string,
  ): Promise<string> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });
    const workspaceName = workspace?.name?.trim() ?? '';
    const profileCompany = await this.loadAgentProfileCompany(workspaceId, userId);

    if (workspaceName) {
      let reply = formatBrokerageWorkspaceReply(workspaceName);
      if (
        profileCompany &&
        profileCompany.toLowerCase() !== workspaceName.toLowerCase()
      ) {
        reply += ` Your profile also lists company: ${profileCompany}.`;
      }
      return reply;
    }
    if (profileCompany) {
      return `This workspace doesn't have a display name set yet—that's what Deal Coordinator uses when you ask for "brokerage" by name. Your Settings profile lists company as ${profileCompany}.`;
    }
    return formatMissingWorkspaceNameReply();
  }

  private async loadAgentProfileCompany(
    workspaceId: string,
    userId: string,
  ): Promise<string | null> {
    if (!userId?.trim()) return null;
    const entry = await this.prisma.memoryEntry.findFirst({
      where: {
        workspaceId,
        scope: 'workspace',
        category: 'agent_profile',
        createdBy: userId,
      },
      select: { content: true },
    });
    if (!entry?.content || typeof entry.content !== 'string') return null;
    try {
      const p = JSON.parse(entry.content) as Record<string, unknown>;
      const c = p.company;
      if (typeof c === 'string' && c.trim()) return c.trim();
    } catch {
      return null;
    }
    return null;
  }

  private fallbackAddressFromMessage(message: string): string | undefined {
    const m = message.match(/\b(\d{2,5}\s+[a-z0-9\s,.-]{4,})\b/i);
    return m?.[1]?.trim();
  }

  private async resolveDealId(
    workspaceId: string,
    dealId: string | undefined,
    intent: IntentDetectionResult,
    message: string,
  ): Promise<string | undefined> {
    if (dealId) return dealId;
    const snippet =
      intent.entities.addressSnippet?.trim() ||
      this.fallbackAddressFromMessage(message);
    if (!snippet) return undefined;
    const found = await this.queries.getDealByAddress(workspaceId, snippet);
    return found?.id;
  }

  /** When no LLM / tests: still return readable grounded text. */
  formatDeterministic(facts: AssistantBackendFacts): string {
    const lines: string[] = [];
    lines.push(`Intent: ${facts.intent} (confidence ${facts.confidence.toFixed(2)})`);
    if (facts.guidance?.suggestion) lines.push(facts.guidance.suggestion);
    if (facts.guidance?.nextSteps?.length) {
      lines.push('Next steps:');
      for (const s of facts.guidance.nextSteps) lines.push(`- ${s}`);
    }
    if (facts.guidance?.missingItems?.length) {
      lines.push('Checklist / open items:');
      for (const m of facts.guidance.missingItems) lines.push(`- ${m}`);
    }
    const p = facts.payload;
    if (p.dealCreated && typeof p.displayName === 'string') {
      lines.push(`Created deal: ${p.displayName} (${p.dealId}).`);
    }
    if (Array.isArray((p as { deals?: unknown[] }).deals)) {
      const deals = (p as { deals: { displayName?: string; title?: string; stage: string }[] }).deals;
      for (const d of deals.slice(0, 10)) {
        const lab = d.displayName ?? d.title ?? 'Deal';
        lines.push(`- ${lab} [${d.stage}]`);
      }
    }
    if ((p as { error?: string }).error === 'deal_not_found') {
      lines.push('No matching deal found for that request.');
    }
    return lines.join('\n');
  }
}
