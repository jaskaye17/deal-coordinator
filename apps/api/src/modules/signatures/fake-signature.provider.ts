import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  EnvelopeDocumentInput,
  EnvelopeTabInput,
  SignatureProvider,
} from './signature-provider.interface';

interface StoredRecipient {
  name: string;
  email: string;
  role: string;
  status: string;
  signedAt?: string;
}

interface StoredEnvelope {
  envelopeId: string;
  providerEnvelopeId: string;
  recipients: StoredRecipient[];
  documentIds: string[];
  status: string;
}

@Injectable()
export class FakeSignatureProvider implements SignatureProvider {
  private envelopes = new Map<string, StoredEnvelope>();

  async createEnvelope(params: {
    envelopeId: string;
    recipients: Array<{ name: string; email: string; role: string }>;
    documentIds: string[];
    documents?: EnvelopeDocumentInput[];
    tabs?: EnvelopeTabInput[];
  }): Promise<{ providerEnvelopeId: string }> {
    void params.documents;
    void params.tabs;
    const providerEnvelopeId = `fake-env-${randomUUID()}`;

    this.envelopes.set(providerEnvelopeId, {
      envelopeId: params.envelopeId,
      providerEnvelopeId,
      recipients: params.recipients.map((r) => ({
        ...r,
        status: 'pending',
      })),
      documentIds: params.documentIds,
      status: 'draft',
    });

    return { providerEnvelopeId };
  }

  async sendEnvelope(providerEnvelopeId: string): Promise<void> {
    const envelope = this.envelopes.get(providerEnvelopeId);
    if (!envelope) throw new Error(`Envelope ${providerEnvelopeId} not found in fake provider`);

    envelope.status = 'sent';
    envelope.recipients.forEach((r) => {
      r.status = 'sent';
    });
  }

  async getEnvelopeStatus(providerEnvelopeId: string): Promise<{
    status: string;
    recipients: Array<{ name: string; email: string; status: string; signedAt?: string }>;
  }> {
    const envelope = this.envelopes.get(providerEnvelopeId);
    if (!envelope) throw new Error(`Envelope ${providerEnvelopeId} not found in fake provider`);

    return {
      status: envelope.status,
      recipients: envelope.recipients.map((r) => ({
        name: r.name,
        email: r.email,
        status: r.status,
        signedAt: r.signedAt,
      })),
    };
  }

  simulateRecipientSigned(providerEnvelopeId: string, recipientEmail: string): void {
    const envelope = this.envelopes.get(providerEnvelopeId);
    if (!envelope) throw new Error(`Envelope ${providerEnvelopeId} not found in fake provider`);

    const recipient = envelope.recipients.find((r) => r.email === recipientEmail);
    if (!recipient) throw new Error(`Recipient ${recipientEmail} not found in envelope`);

    recipient.status = 'signed';
    recipient.signedAt = new Date().toISOString();

    const allSigned = envelope.recipients.every((r) => r.status === 'signed');
    envelope.status = allSigned ? 'completed' : 'partially_signed';
  }
}
