export interface SendMessageParams {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string;
}

export interface InboundMessage {
  from: string;
  to: string;
  body: string;
  channel: 'sms' | 'whatsapp' | 'imessage';
  externalId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface MessagingProvider {
  readonly channel: string;
  sendMessage(params: SendMessageParams): Promise<{ messageId: string; status: string }>;
}

export const MESSAGING_PROVIDERS = 'MESSAGING_PROVIDERS';
