import { Injectable, Logger } from '@nestjs/common';
import type {
  EnvelopeDocumentInput,
  EnvelopeTabInput,
  SignatureProvider,
} from './signature-provider.interface';

@Injectable()
export class DocuSignProvider implements SignatureProvider {
  private readonly logger = new Logger(DocuSignProvider.name);
  private readonly clientId: string | null;
  private readonly clientSecret: string | null;
  private readonly baseUrl: string;

  constructor() {
    this.clientId = process.env.DOCUSIGN_CLIENT_ID ?? null;
    this.clientSecret = process.env.DOCUSIGN_SECRET ?? null;
    this.baseUrl = process.env.DOCUSIGN_BASE_URL ?? 'https://demo.docusign.net/restapi';
  }

  private get isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  async createEnvelope(params: {
    envelopeId: string;
    recipients: Array<{ name: string; email: string; role: string }>;
    documentIds: string[];
    documents?: EnvelopeDocumentInput[];
    tabs?: EnvelopeTabInput[];
  }): Promise<{ providerEnvelopeId: string }> {
    if (!this.isConfigured) {
      this.logger.warn('DocuSign not configured, returning stub envelope');
      return { providerEnvelopeId: `docusign-stub-${params.envelopeId}` };
    }

    this.logger.log(`Creating DocuSign envelope for ${params.recipients.length} recipients`);

    const tabs = params.tabs ?? [];
    const signers = params.recipients.map((r, i) => {
      const recipientId = String(i + 1);
      const mine = tabs.filter((t) => t.recipientId === recipientId);
      const signHereTabs = mine
        .filter((t) => t.tabType === 'signHere')
        .map((t) => ({
          documentId: t.documentId,
          pageNumber: String(t.pageNumber),
          xPosition: String(Math.round(t.xPosition)),
          yPosition: String(Math.round(t.yPosition)),
        }));
      const textTabs = mine
        .filter((t) => t.tabType === 'text')
        .map((t) => ({
          documentId: t.documentId,
          pageNumber: String(t.pageNumber),
          xPosition: String(Math.round(t.xPosition)),
          yPosition: String(Math.round(t.yPosition)),
          value: t.value ?? '',
          width: String(Math.round(t.width ?? 140)),
          height: String(Math.round(t.height ?? 22)),
        }));
      const checkboxTabs = mine
        .filter((t) => t.tabType === 'checkbox')
        .map((t) => ({
          documentId: t.documentId,
          pageNumber: String(t.pageNumber),
          xPosition: String(Math.round(t.xPosition)),
          yPosition: String(Math.round(t.yPosition)),
          width: String(Math.round(t.width ?? 18)),
          height: String(Math.round(t.height ?? 18)),
          selected:
            t.value === 'true' ||
            t.value === 'yes' ||
            t.value === '1' ||
            t.value === 'on',
        }));
      return {
        email: r.email,
        name: r.name,
        recipientId,
        routingOrder: recipientId,
        tabs: {
          ...(signHereTabs.length ? { signHereTabs } : {}),
          ...(textTabs.length ? { textTabs } : {}),
          ...(checkboxTabs.length ? { checkboxTabs } : {}),
        },
      };
    });

    const envelopeDefinition: Record<string, unknown> = {
      emailSubject: 'Please sign the following documents',
      status: 'created',
      recipients: { signers },
    };

    if (params.documents?.length) {
      envelopeDefinition.documents = params.documents.map((d) => ({
        documentBase64: d.documentBase64,
        name: d.name,
        documentId: d.documentId,
      }));
    }

    try {
      const token = await this.getAccessToken();
      const accountId = await this.getAccountId(token);

      const res = await fetch(`${this.baseUrl}/v2.1/accounts/${accountId}/envelopes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(envelopeDefinition),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`DocuSign create failed: ${res.status} ${err}`);
      }

      const data = (await res.json()) as { envelopeId?: string };
      return { providerEnvelopeId: data.envelopeId ?? '' };
    } catch (err) {
      this.logger.error(`DocuSign envelope creation failed: ${err}`);
      return { providerEnvelopeId: `docusign-error-${params.envelopeId}` };
    }
  }

  async sendEnvelope(providerEnvelopeId: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn('DocuSign not configured, stub send');
      return;
    }

    try {
      const token = await this.getAccessToken();
      const accountId = await this.getAccountId(token);

      await fetch(`${this.baseUrl}/v2.1/accounts/${accountId}/envelopes/${providerEnvelopeId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'sent' }),
      });
    } catch (err) {
      this.logger.error(`DocuSign send failed: ${err}`);
    }
  }

  async getEnvelopeStatus(providerEnvelopeId: string): Promise<{
    status: string;
    recipients: Array<{ name: string; email: string; status: string; signedAt?: string }>;
  }> {
    if (!this.isConfigured) {
      return { status: 'sent', recipients: [] };
    }

    try {
      const token = await this.getAccessToken();
      const accountId = await this.getAccountId(token);

      const res = await fetch(
        `${this.baseUrl}/v2.1/accounts/${accountId}/envelopes/${providerEnvelopeId}/recipients`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) throw new Error(`Status check failed: ${res.status}`);

      const data = (await res.json()) as { signers?: any[] };
      const signers = (data.signers ?? []).map((s: any) => ({
        name: s.name,
        email: s.email,
        status: s.status === 'completed' ? 'signed' : s.status,
        signedAt: s.signedDateTime,
      }));

      const allSigned = signers.every((s: any) => s.status === 'signed');
      const someSigned = signers.some((s: any) => s.status === 'signed');

      let status = 'sent';
      if (allSigned) status = 'completed';
      else if (someSigned) status = 'partially_signed';

      return { status, recipients: signers };
    } catch (err) {
      this.logger.error(`DocuSign status check failed: ${err}`);
      return { status: 'sent', recipients: [] };
    }
  }

  private async getAccessToken(): Promise<string> {
    const res = await fetch(
      `https://${process.env.DOCUSIGN_AUTH_DOMAIN ?? 'account-d.docusign.com'}/oauth/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId!,
          client_secret: this.clientSecret!,
          scope: 'signature',
        }),
      },
    );

    if (!res.ok) throw new Error('DocuSign auth failed');
    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  private async getAccountId(token: string): Promise<string> {
    const res = await fetch(
      `https://${process.env.DOCUSIGN_AUTH_DOMAIN ?? 'account-d.docusign.com'}/oauth/userinfo`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) throw new Error('DocuSign userinfo failed');
    const data = (await res.json()) as { accounts?: Array<{ account_id?: string }> };
    return data.accounts?.[0]?.account_id ?? '';
  }
}
