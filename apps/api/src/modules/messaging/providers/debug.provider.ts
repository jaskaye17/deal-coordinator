import { Injectable, Logger } from '@nestjs/common';
import type { MessagingProvider, SendMessageParams } from '../messaging-provider.interface';

interface DebugMessage {
  id: string;
  to: string;
  body: string;
  timestamp: Date;
  direction: 'outbound' | 'inbound';
}

@Injectable()
export class DebugMessagingProvider implements MessagingProvider {
  readonly channel = 'debug';
  private readonly logger = new Logger(DebugMessagingProvider.name);
  private readonly messages: DebugMessage[] = [];

  async sendMessage(params: SendMessageParams): Promise<{ messageId: string; status: string }> {
    const id = `debug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.messages.push({
      id,
      to: params.to,
      body: params.body,
      timestamp: new Date(),
      direction: 'outbound',
    });
    this.logger.log(`[DEBUG MSG] To: ${params.to} | ${params.body.slice(0, 80)}`);
    return { messageId: id, status: 'debug_sent' };
  }

  getHistory(): DebugMessage[] {
    return [...this.messages];
  }

  clearHistory(): void {
    this.messages.length = 0;
  }

  simulateInbound(from: string, body: string): DebugMessage {
    const msg: DebugMessage = {
      id: `debug-in-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      to: from,
      body,
      timestamp: new Date(),
      direction: 'inbound',
    };
    this.messages.push(msg);
    return msg;
  }
}
