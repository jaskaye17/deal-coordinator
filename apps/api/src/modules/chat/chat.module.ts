import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AuditModule } from '../audit/audit.module';
import { DealsModule } from '../deals/deals.module';
import { DealQueryModule } from '../deal-query/deal-query.module';
import { ConversationalAiModule } from '../conversational-ai/conversational-ai.module';

@Module({
  imports: [AuditModule, DealsModule, DealQueryModule, ConversationalAiModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
