import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import type { ChatOrchestratorService } from '../conversational-ai/chat-orchestrator.service';

interface IngestParams {
  message: string;
  senderId: string;
  senderName: string;
  channelId?: string;
  dealId?: string;
  workspaceId: string;
  requestId: string;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly chatOrchestrator: ChatOrchestratorService,
  ) {}

  async ingest(params: IngestParams) {
    const {
      message,
      senderId,
      senderName,
      channelId,
      dealId,
      workspaceId,
      requestId,
    } = params;

    const outcome = await this.chatOrchestrator.run({
      workspaceId,
      message,
      dealId,
      senderId,
      senderName,
      requestId,
      forceDeterministicFormat: process.env.CHAT_ASSISTANT_DETERMINISTIC === '1',
    });

    const resultDealId = outcome.dealId ?? dealId;

    if (resultDealId) {
      await this.prisma.communication.create({
        data: {
          dealId: resultDealId,
          workspaceId,
          direction: 'inbound',
          type: 'chat',
          senderName,
          senderId,
          content: message,
          metadata: channelId ? { channelId } : undefined,
        },
      });

      await this.auditService.create({
        workspaceId,
        dealId: resultDealId,
        action: 'message_received',
        objectType: 'Communication',
        objectId: resultDealId,
        actorType: 'user',
        actorId: senderId,
        metadata: {
          intent: outcome.intent.intent,
          confidence: outcome.intent.confidence,
          channelId,
        },
        requestId,
      });
    }

    return {
      intent: outcome.intent.intent,
      confidence: outcome.intent.confidence,
      dealId: resultDealId,
      response: outcome.responseText,
    };
  }
}
