import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { DealsModule } from '../deals/deals.module';
import { LLMModule } from '../llm/llm.module';
import { AssistantToolsService } from './assistant-tools.service';
import { ChatOrchestratorService } from './chat-orchestrator.service';
import { ConversationContextService } from './conversation-context.service';
import { ConversationQueryService } from './conversation-query.service';
import { ConversationalIntentService } from './conversational-intent.service';
import { GuidanceEngineService } from './guidance-engine.service';

@Module({
  imports: [PrismaModule, AuditModule, DealsModule, LLMModule],
  providers: [
    ConversationalIntentService,
    ConversationQueryService,
    GuidanceEngineService,
    ConversationContextService,
    AssistantToolsService,
    ChatOrchestratorService,
  ],
  exports: [
    ChatOrchestratorService,
    ConversationalIntentService,
    AssistantToolsService,
    ConversationQueryService,
    GuidanceEngineService,
  ],
})
export class ConversationalAiModule {}
