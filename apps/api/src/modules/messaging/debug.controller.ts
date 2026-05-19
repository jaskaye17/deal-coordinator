import { Controller, Post, Get, Delete, Body, Logger } from '@nestjs/common';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';
import { DebugMessagingProvider } from './providers/debug.provider';
import { MessageProcessingService } from './message-processing.service';
import type { InboundMessage } from './messaging-provider.interface';

/** LLM ON unless the client explicitly turns MOCK on (handles string/body quirks). */
function simulateUseLlmEnabled(raw: unknown): boolean {
  if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
  return true;
}

@Controller('debug/messaging')
export class DebugMessagingController {
  private readonly logger = new Logger(DebugMessagingController.name);

  constructor(
    private readonly debugProvider: DebugMessagingProvider,
    private readonly messageProcessing: MessageProcessingService,
  ) {}

  @Post('simulate')
  async simulateInbound(
    @Tenant() tenant: TenantContext,
    @Body()
    body: {
      from: string;
      message: string;
      dealId?: string;
      channel?: string;
      useLLM?: boolean;
    },
  ): Promise<any> {
    this.logger.log(`[PHONE SIM] From: ${body.from} | ${body.message.slice(0, 80)}`);

    const msg = this.debugProvider.simulateInbound(body.from, body.message);

    const useLLM = simulateUseLlmEnabled(body.useLLM);

    const inboundMessage: InboundMessage = {
      from: body.from,
      to: 'debug-simulator',
      body: body.message,
      channel: (body.channel as any) ?? 'sms',
      externalId: msg.id,
      timestamp: msg.timestamp,
      metadata: {
        simulated: true,
        useLLM,
        ...(body.dealId?.trim() ? { dealId: body.dealId.trim() } : {}),
      },
    };

    const result = await this.messageProcessing.processInbound(
      inboundMessage,
      tenant.workspaceId,
      tenant.requestId,
      { userId: tenant.userId },
    );

    return {
      simulatedMessage: msg,
      processingResult: result,
    };
  }

  @Get('history')
  async getHistory(): Promise<any> {
    return this.debugProvider.getHistory();
  }

  @Delete('history')
  async clearHistory(): Promise<any> {
    this.debugProvider.clearHistory();
    return { success: true };
  }

  @Post('send')
  async sendDebugMessage(
    @Tenant() tenant: TenantContext,
    @Body() body: { to: string; message: string },
  ): Promise<any> {
    return this.debugProvider.sendMessage({ to: body.to, body: body.message });
  }
}
