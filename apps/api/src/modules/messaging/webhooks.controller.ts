import { Controller, Post, Body, Req, Logger } from '@nestjs/common';
import type { Request } from 'express';
import type { MessagingService } from './messaging.service';
import type { InboundMessage } from './messaging-provider.interface';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly messagingService: MessagingService) {}

  @Post('twilio')
  async twilioInbound(@Body() body: any, @Req() req: Request): Promise<any> {
    this.logger.log(`Twilio webhook received from ${body.From}`);

    const isWhatsApp = body.From?.startsWith('whatsapp:');
    const from = isWhatsApp ? body.From.replace('whatsapp:', '') : body.From;

    const message: InboundMessage = {
      from,
      to: body.To ?? '',
      body: body.Body ?? '',
      channel: isWhatsApp ? 'whatsapp' : 'sms',
      externalId: body.MessageSid,
      timestamp: new Date(),
      metadata: { numMedia: body.NumMedia, accountSid: body.AccountSid },
    };

    // For webhooks, we need to identify workspace from config
    // In production, this would look up the Twilio number → workspace mapping
    const workspaceId = (req as any).tenantContext?.workspaceId ?? '';
    if (!workspaceId) {
      this.logger.warn('No workspace context for webhook, attempting lookup');
    }

    const result = await this.messagingService.handleInbound(
      message,
      workspaceId,
      (req as any).requestId ?? `webhook-${Date.now()}`,
    );

    return { success: true, dealId: result.dealId };
  }

  @Post('bluebubbles')
  async blueBubblesInbound(@Body() body: any, @Req() req: Request): Promise<any> {
    this.logger.log('BlueBubbles webhook received');

    const message: InboundMessage = {
      from: body.data?.handle ?? body.sender ?? '',
      to: 'self',
      body: body.data?.text ?? body.message ?? '',
      channel: 'imessage',
      externalId: body.data?.guid,
      timestamp: new Date(body.data?.dateCreated ?? Date.now()),
      metadata: body.data,
    };

    const workspaceId = (req as any).tenantContext?.workspaceId ?? '';

    const result = await this.messagingService.handleInbound(
      message,
      workspaceId,
      (req as any).requestId ?? `webhook-bb-${Date.now()}`,
    );

    return { success: true, dealId: result.dealId };
  }
}
