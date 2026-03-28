import { Injectable, Logger } from '@nestjs/common';
import type { MessagingProvider, SendMessageParams } from '../messaging-provider.interface';

@Injectable()
export class TwilioWhatsAppProvider implements MessagingProvider {
  readonly channel = 'whatsapp';
  private readonly logger = new Logger(TwilioWhatsAppProvider.name);
  private client: any = null;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token) {
      try {
        const twilio = require('twilio');
        this.client = twilio(sid, token);
      } catch {
        this.logger.warn('Twilio SDK not available for WhatsApp');
      }
    }
  }

  async sendMessage(params: SendMessageParams): Promise<{ messageId: string; status: string }> {
    if (!this.client) {
      this.logger.warn('Twilio WhatsApp not configured, stub mode');
      return { messageId: `fake-wa-${Date.now()}`, status: 'stub_sent' };
    }

    const fromNumber = params.from ?? `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
    const msg = await this.client.messages.create({
      to: `whatsapp:${params.to}`,
      from: fromNumber,
      body: params.body,
    });

    return { messageId: msg.sid, status: msg.status };
  }
}
