import { Controller, Post, Body, UsePipes } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';
import { chatIngestSchema } from '@deal-coordinator/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('ingest')
  @UsePipes(new ZodValidationPipe(chatIngestSchema))
  async ingest(
    @Tenant() tenant: TenantContext,
    @Body()
    body: {
      message: string;
      senderId: string;
      senderName: string;
      channelId?: string;
      dealId?: string;
    },
  ) {
    return this.chatService.ingest({
      ...body,
      workspaceId: tenant.workspaceId,
      requestId: tenant.requestId,
    });
  }
}
