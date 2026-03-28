import { Injectable, Logger } from '@nestjs/common';
import type { MessagingProvider, SendMessageParams } from '../messaging-provider.interface';

@Injectable()
export class BlueBubblesProvider implements MessagingProvider {
  readonly channel = 'imessage';
  private readonly logger = new Logger(BlueBubblesProvider.name);
  private readonly baseUrl: string | null;
  private readonly apiKey: string | null;

  constructor() {
    this.baseUrl = process.env.BLUEBUBBLES_URL ?? null;
    this.apiKey = process.env.BLUEBUBBLES_API_KEY ?? null;
  }

  async sendMessage(params: SendMessageParams): Promise<{ messageId: string; status: string }> {
    if (!this.baseUrl || !this.apiKey) {
      this.logger.warn('BlueBubbles not configured, stub mode');
      return { messageId: `fake-imsg-${Date.now()}`, status: 'stub_sent' };
    }

    const url = `${this.baseUrl}/api/v1/message/text`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        chatGuid: `iMessage;-;${params.to}`,
        message: params.body,
        method: 'private-api',
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      this.logger.error(`BlueBubbles send failed: ${res.status} ${errBody}`);
      throw new Error(`BlueBubbles send failed: ${res.status}`);
    }

    const data = (await res.json()) as { data?: { guid?: string } };
    return { messageId: data.data?.guid ?? `bb-${Date.now()}`, status: 'sent' };
  }
}
