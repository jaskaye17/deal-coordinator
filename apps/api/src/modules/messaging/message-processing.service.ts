import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LLMService } from '../llm/llm.service';
import { MessagingService} from './messaging.service';
import { SANDBOX_DEAL_TITLE_PREFIX } from './messaging.service';
import type { InboundMessage } from './messaging-provider.interface';
import {
  formatBrokerageWorkspaceReply,
  formatMissingWorkspaceNameReply,
  isBrokerageOrWorkspaceNameQuestion,
  looksLikeBrokerageNameQuestionLoose,
} from './brokerage-workspace-question.util';

const OPENAI_KEY_REQUIRED_RESPONSE =
  'OpenAI is not configured for your account. Add your API key under Integrations → OpenAI, or turn on LLM MOCK to test without a key.';

@Injectable()
export class MessageProcessingService {
  private readonly logger = new Logger(MessageProcessingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly llmService: LLMService,
    private readonly messagingService: MessagingService,
  ) {}

  /**
   * Full inbound message loop:
   * 1. Store communication
   * 2. Identify deal
   * 3. Call LLM parseMessage
   * 4. Update structured data
   * 5. Create unresolved items if needed
   * 6. Generate response via LLM
   * 7. Optionally send response via MessagingService
   */
  private async loadAgentProfileCompany(
    workspaceId: string,
    userId?: string,
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

  private async composeBrokerageWorkspaceAnswer(
    workspaceId: string,
    workspaceName: string,
    userId?: string,
  ): Promise<string> {
    const profileCompany = await this.loadAgentProfileCompany(workspaceId, userId);
    if (workspaceName) {
      let brokerageResponse = formatBrokerageWorkspaceReply(workspaceName);
      if (
        profileCompany &&
        profileCompany.toLowerCase() !== workspaceName.toLowerCase()
      ) {
        brokerageResponse += ` Your profile also lists company: ${profileCompany}.`;
      }
      return brokerageResponse;
    }
    if (profileCompany) {
      return `This workspace doesn't have a display name set yet—that's what Deal Coordinator uses when you ask for "brokerage" by name. Your Settings profile lists company as ${profileCompany}.`;
    }
    return formatMissingWorkspaceNameReply();
  }

  private async persistBrokerageReplyAndReturn(
    workspaceId: string,
    dealIdForComm: string,
    communicationId: string,
    response: string,
    channel: string,
    requestId: string,
  ): Promise<{
    processed: true;
    dealId: string;
    intent: string;
    fieldsExtracted: string[];
    response: string;
  }> {
    await this.prisma.communication.create({
      data: {
        workspaceId,
        dealId: dealIdForComm,
        direction: 'outbound',
        type: 'system',
        senderName: 'AI Assistant',
        content: response,
        metadata: {
          channel,
          aiGenerated: true,
          intent: 'workspace_brokerage_info',
          inReplyTo: communicationId,
          groundedFromDb: true,
        },
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId: dealIdForComm,
      action: 'message_received',
      objectType: 'Communication',
      objectId: communicationId,
      actorType: 'system',
      actorId: 'message-processor',
      after: {
        intent: 'workspace_brokerage_info',
        fieldsExtracted: [],
        responseGenerated: true,
        groundedBrokerageReply: true,
      },
      requestId,
    });

    return {
      processed: true,
      dealId: dealIdForComm,
      intent: 'workspace_brokerage_info',
      fieldsExtracted: [],
      response,
    };
  }

  async processInbound(
    message: InboundMessage,
    workspaceId: string,
    requestId: string,
    options?: { userId?: string },
  ): Promise<any> {
    const { communication, dealId } = await this.messagingService.handleInbound(
      message,
      workspaceId,
      requestId,
      options,
    );

    if (!dealId || !communication) {
      this.logger.warn('No deal matched for inbound message, skipping LLM processing');
      return { processed: false, reason: 'no_deal_match' };
    }

    const inboundText =
      typeof message.body === 'string' ? message.body : String(message.body ?? '');

    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: { fields: true },
    });

    if (!deal) {
      return { processed: false, reason: 'deal_not_found' };
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, slug: true },
    });
    const workspaceName = workspace?.name?.trim() ?? '';
    const brokerageQuestion = isBrokerageOrWorkspaceNameQuestion(inboundText);

    const meta = message.metadata as { simulated?: boolean; useLLM?: boolean } | undefined;
    const forceFake = meta?.simulated === true && meta?.useLLM === false;
    const wantsRealLlm = meta?.simulated === true && meta?.useLLM === true;

    /** DB-only; must run before the OpenAI key gate so LLM ON without a key still works. */
    if (brokerageQuestion) {
      const brokerageResponse = await this.composeBrokerageWorkspaceAnswer(
        workspaceId,
        workspaceName,
        options?.userId,
      );
      return this.persistBrokerageReplyAndReturn(
        workspaceId,
        dealId,
        communication.id,
        brokerageResponse,
        message.channel,
        requestId,
      );
    }

    if (wantsRealLlm) {
      const tokenInfo = await this.llmService.resolveOpenAIToken(options?.userId);
      if (!tokenInfo) {
        await this.prisma.communication.create({
          data: {
            workspaceId,
            dealId,
            direction: 'outbound',
            type: 'system',
            senderName: 'AI Assistant',
            content: OPENAI_KEY_REQUIRED_RESPONSE,
            metadata: {
              channel: message.channel,
              aiGenerated: true,
              intent: 'configuration_required',
              inReplyTo: communication.id,
              warningCode: 'OPENAI_KEY_REQUIRED',
            },
          },
        });

        await this.auditService.create({
          workspaceId,
          dealId,
          action: 'message_received',
          objectType: 'Communication',
          objectId: communication.id,
          actorType: 'system',
          actorId: 'message-processor',
          after: {
            intent: 'unknown',
            fieldsExtracted: [],
            responseGenerated: true,
            warningCode: 'OPENAI_KEY_REQUIRED',
          },
          requestId,
        });

        return {
          processed: true,
          dealId,
          intent: 'unknown',
          fieldsExtracted: [],
          response: OPENAI_KEY_REQUIRED_RESPONSE,
          warningCode: 'OPENAI_KEY_REQUIRED',
        };
      }
    }

    const llmOpts = {
      forceFake,
      userId: options?.userId,
      denySilentFakeFallback: wantsRealLlm,
    };

    const workspaceDealsForLlm =
      meta?.simulated === true
        ? (
            await this.prisma.deal.findMany({
              where: { workspaceId },
              select: { id: true, title: true, stage: true, address: true, dealType: true },
              orderBy: { updatedAt: 'desc' },
              take: 40,
            })
          ).map((d) => ({
            id: d.id,
            title: d.title?.trim() || 'Untitled',
            stage: d.stage,
            dealType: d.dealType,
            address: d.address ?? null,
          }))
        : [];

    let parsed: {
      intent: string;
      fields: Record<string, { value: string; confidence: number }>;
      question?: string;
      suggestedResponse?: string;
      referencedDealId?: string;
    };

    try {
      const parseContext: {
        workspaceId: string;
        workspaceName?: string;
        workspaceSlug?: string;
        dealId: string;
        dealType: string;
        stage: string;
        scenario?: string;
        intakePracticeHint?: string;
        conversationThreadDealId?: string;
        workspaceDealsForInference?: typeof workspaceDealsForLlm;
      } = {
        workspaceId,
        ...(workspaceName ? { workspaceName } : {}),
        ...(workspace?.slug ? { workspaceSlug: workspace.slug } : {}),
        dealId,
        dealType: deal.dealType,
        stage: deal.stage,
        conversationThreadDealId: dealId,
        workspaceDealsForInference: workspaceDealsForLlm,
      };
      const t = deal.title ?? '';
      if (t.startsWith(SANDBOX_DEAL_TITLE_PREFIX)) {
        parseContext.scenario = 'phone_simulator_intake';
        parseContext.intakePracticeHint =
          'Natural chat in this workspace only: the user may be greeting, starting a new deal, or referring to an existing deal from workspaceDealsForInference (same workspace). Infer intent; extract property, client, and timeline details when present.';
      }
      parsed = await this.llmService.parseMessage(inboundText, parseContext, llmOpts);
    } catch (err) {
      this.logger.error(`LLM parse failed: ${err}`);
      parsed = { intent: 'unknown', fields: {} };
    }

    let effectiveDealId = dealId;
    let effectiveDeal = deal;
    let inferredDealId: string | undefined;

    const refRaw = parsed.referencedDealId?.trim() ?? '';
    const uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      refRaw,
    );
    if (meta?.simulated === true && uuidOk && refRaw !== dealId) {
      const refDeal = await this.prisma.deal.findFirst({
        where: { id: refRaw, workspaceId },
        include: { fields: true },
      });
      if (refDeal) {
        const moved = await this.prisma.communication.updateMany({
          where: { id: communication.id, workspaceId },
          data: { dealId: refRaw },
        });
        if (moved.count === 1) {
          effectiveDealId = refRaw;
          effectiveDeal = refDeal;
          inferredDealId = refRaw;
        }
      }
    }

    const fields = parsed.fields && typeof parsed.fields === 'object' ? parsed.fields : {};

    if (Object.keys(fields).length > 0) {
      for (const [fieldName, fieldData] of Object.entries(fields)) {
        await this.prisma.dealField.upsert({
          where: {
            dealId_fieldName: { dealId: effectiveDealId, fieldName },
          },
          create: {
            dealId: effectiveDealId,
            workspaceId,
            fieldName,
            fieldValue: String(fieldData.value),
            source: 'ai_parse',
            confidence: fieldData.confidence,
            needsConfirmation: fieldData.confidence < 0.85,
          },
          update: {
            fieldValue: String(fieldData.value),
            source: 'ai_parse',
            confidence: fieldData.confidence,
            needsConfirmation: fieldData.confidence < 0.85,
          },
        });
      }

      const fieldNames = Object.keys(fields);
      await this.prisma.unresolvedItem.updateMany({
        where: {
          dealId: effectiveDealId,
          workspaceId,
          status: 'open',
          fieldName: { in: fieldNames },
        },
        data: { status: 'resolved', resolvedAt: new Date() },
      });
    }

    if (parsed.intent === 'ask_question' && parsed.question) {
      await this.prisma.unresolvedItem.create({
        data: {
          dealId: effectiveDealId,
          workspaceId,
          type: 'missing_info',
          question: parsed.question,
          status: 'open',
        },
      });
    }

    const workspaceLabel =
      workspaceName.length > 0
        ? ` Workspace display name (brokerage / office in the app): "${workspaceName}". If they ask what brokerage, workspace, firm, or company they're in, answer using ONLY this exact name—do not invent.`
        : '';

    const completeSystem =
      meta?.simulated === true
        ? `You are texting as a friendly teammate helping with real estate. Stay STRICTLY within workspace ${workspaceId} only—the deal list below (if any) is the complete set of files you may reference for this workspace; never invent or assume deals from other workspaces or tenants.${workspaceLabel}${workspaceDealsForLlm.length > 0 ? ` Deals in this workspace: ${JSON.stringify(workspaceDealsForLlm)}.` : ''} Write like a real person: short texts, contractions, warm and natural. Simple greetings ("hi", "hey") deserve a casual reply such as "Hey! How's it going?" before you move toward business. Avoid stiff corporate tone and avoid saying you are an AI. For money, contracts, or legal topics, stay clear and careful.`
        : workspaceDealsForLlm.length > 0
          ? `You are a helpful real estate transaction coordinator. WORKSPACE SCOPE: workspaceId ${workspaceId}; every deal below belongs only to this workspace—never cross workspaces.${workspaceLabel} Keep replies brief. Deals the user might mean: ${JSON.stringify(workspaceDealsForLlm)}. Infer whether they are continuing an existing deal or starting fresh; respond naturally without asking them to pick from a list.`
          : `You are a helpful real estate transaction coordinator. WORKSPACE SCOPE: only workspace ${workspaceId}.${workspaceLabel} Keep responses brief and professional.`;

    let responseText: string | undefined =
      parsed.suggestedResponse?.trim() || undefined;

    /** Parse suggestedResponse often hallucinates here; prefer DB for brokerage name asks. */
    if (
      isBrokerageOrWorkspaceNameQuestion(inboundText) ||
      looksLikeBrokerageNameQuestionLoose(inboundText)
    ) {
      responseText = await this.composeBrokerageWorkspaceAnswer(
        workspaceId,
        workspaceName,
        options?.userId,
      );
    }

    if (!responseText) {
      try {
        const userLine =
          meta?.simulated === true
            ? `They just texted:\n"${inboundText}"\n\nReply as a short human text (this workspace only).`
            : `Respond to this message in the context of a real estate transaction:\n"${inboundText}"`;
        const llmResponse = await this.llmService.complete(userLine, completeSystem, llmOpts);
        responseText = llmResponse.content;
      } catch {
        responseText = 'Thank you for your message. Our team will review and respond shortly.';
      }
    }

    if (responseText) {
      await this.prisma.communication.create({
        data: {
          workspaceId,
          dealId: effectiveDealId,
          direction: 'outbound',
          type: 'system',
          senderName: 'AI Assistant',
          content: responseText,
          metadata: {
            channel: message.channel,
            aiGenerated: true,
            intent: parsed.intent,
            inReplyTo: communication.id,
            ...(inferredDealId ? { inferredDealId } : {}),
          },
        },
      });
    }

    await this.auditService.create({
      workspaceId,
      dealId: effectiveDealId,
      action: 'message_received',
      objectType: 'Communication',
      objectId: communication.id,
      actorType: 'system',
      actorId: 'message-processor',
      after: {
        intent: parsed.intent,
        fieldsExtracted: Object.keys(fields),
        responseGenerated: Boolean(responseText),
        ...(inferredDealId ? { inferredDealId } : {}),
      },
      requestId,
    });

    return {
      processed: true,
      dealId: effectiveDealId,
      intent: parsed.intent,
      fieldsExtracted: Object.keys(fields),
      response: responseText,
      ...(inferredDealId ? { inferredDealId } : {}),
    };
  }
}
