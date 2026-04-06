import { Controller, Post, Body } from '@nestjs/common';
import type { MessagingService } from './messaging.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';

@Controller()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('messages/send')
  async send(
    @Tenant() tenant: TenantContext,
    @Body() body: { dealId: string; channel: string; recipient: string; content: string },
  ): Promise<any> {
    return this.messagingService.sendMessage(
      tenant.workspaceId,
      body.dealId,
      body.channel,
      body.recipient,
      body.content,
      tenant.userId,
      tenant.requestId,
    );
  }
}
