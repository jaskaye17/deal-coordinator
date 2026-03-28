export type EnvelopeDocumentInput = {
  name: string;
  documentBase64: string;
  /** DocuSign document id string, e.g. "1", "2" */
  documentId: string;
};

export type EnvelopeTabInput = {
  documentId: string;
  /** 1-based page number (DocuSign) */
  pageNumber: number;
  /** From left edge of page (points) */
  xPosition: number;
  /** From top edge of page (points) */
  yPosition: number;
  tabType: 'signHere' | 'text' | 'checkbox';
  value?: string;
  recipientId: string;
  width?: number;
  height?: number;
};

export interface SignatureProvider {
  createEnvelope(params: {
    envelopeId: string;
    recipients: Array<{ name: string; email: string; role: string }>;
    documentIds: string[];
    documents?: EnvelopeDocumentInput[];
    tabs?: EnvelopeTabInput[];
  }): Promise<{ providerEnvelopeId: string }>;

  sendEnvelope(providerEnvelopeId: string): Promise<void>;

  getEnvelopeStatus(providerEnvelopeId: string): Promise<{
    status: string;
    recipients: Array<{
      name: string;
      email: string;
      status: string;
      signedAt?: string;
    }>;
  }>;
}

export const SIGNATURE_PROVIDER = 'SIGNATURE_PROVIDER';
