import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';
import type { MessagingProvider, SendMessageParams } from '../messaging-provider.interface';

@Injectable()
export class TwilioProvider implements MessagingProvider {
  readonly channel = 'sms';
  private readonly logger = new Logger(TwilioProvider.name);
  private client: ReturnType<typeof twilio> | null = null;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token) {
      try {
        this.client = twilio(sid, token);
      } catch {
        this.logger.warn('Twilio SDK not available');
      }
    }
  }

  async sendMessage(params: SendMessageParams): Promise<{ messageId: string; status: string }> {
    if (!this.client) {
      this.logger.warn('Twilio not configured, logging message instead');
      const fakeId = `fake-twilio-${Date.now()}`;
      this.logger.log(`[STUB SMS] To: ${params.to}, Body: ${params.body.slice(0, 50)}...`);
      return { messageId: fakeId, status: 'stub_sent' };
    }

    const fromNumber = params.from ?? process.env.TWILIO_PHONE_NUMBER;
    const msg = await this.client.messages.create({
      to: params.to,
      from: fromNumber,
      body: params.body,
      ...(params.mediaUrl ? { mediaUrl: [params.mediaUrl] } : {}),
    });

    return { messageId: msg.sid, status: msg.status };
  }
}
