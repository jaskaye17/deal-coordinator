import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { WebhooksController } from './webhooks.controller';
import { MessagingService } from './messaging.service';
import { MessageProcessingService } from './message-processing.service';
import { TwilioProvider } from './providers/twilio.provider';
import { TwilioWhatsAppProvider } from './providers/twilio-whatsapp.provider';
import { BlueBubblesProvider } from './providers/bluebubbles.provider';
import { DebugMessagingProvider } from './providers/debug.provider';
import { DebugMessagingController } from './debug.controller';
import { AuditModule } from '../audit/audit.module';
import { LLMModule } from '../llm/llm.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [AuditModule, LLMModule, FilesModule],
  controllers: [MessagingController, WebhooksController, DebugMessagingController],
  providers: [
    MessagingService,
    MessageProcessingService,
    TwilioProvider,
    TwilioWhatsAppProvider,
    BlueBubblesProvider,
    DebugMessagingProvider,
  ],
  exports: [MessagingService, MessageProcessingService, DebugMessagingProvider],
})
export class MessagingModule {}
