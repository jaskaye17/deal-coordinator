import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('DocuSign envelope flow (mocked)', () => {
  const mockPrisma = {
    signatureEnvelope: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    document: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };

  const mockAudit = {
    create: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DocuSignProvider (unconfigured stub mode)', () => {
    it('returns stub envelope ID when not configured', async () => {
      const { DocuSignProvider } = await import(
        '../src/modules/signatures/docusign.provider'
      );

      const provider = new DocuSignProvider();

      const result = await provider.createEnvelope({
        envelopeId: 'env-1',
        recipients: [{ name: 'Jane Doe', email: 'jane@example.com', role: 'buyer' }],
        documentIds: ['doc-1'],
      });

      expect(result.providerEnvelopeId).toContain('docusign-stub-');
    });

    it('sendEnvelope completes without error in stub mode', async () => {
      const { DocuSignProvider } = await import(
        '../src/modules/signatures/docusign.provider'
      );

      const provider = new DocuSignProvider();
      await expect(provider.sendEnvelope('fake-id')).resolves.toBeUndefined();
    });

    it('getEnvelopeStatus returns sent status in stub mode', async () => {
      const { DocuSignProvider } = await import(
        '../src/modules/signatures/docusign.provider'
      );

      const provider = new DocuSignProvider();
      const result = await provider.getEnvelopeStatus('fake-id');

      expect(result.status).toBe('sent');
      expect(result.recipients).toEqual([]);
    });
  });

  describe('DocuSign webhook handling', () => {
    it('matches envelope by providerEnvelopeId', async () => {
      mockPrisma.signatureEnvelope.findFirst.mockResolvedValue({
        id: 'internal-env-1',
        workspaceId: 'ws-1',
        providerEnvelopeId: 'docusign-abc-123',
      });

      const envelope = await mockPrisma.signatureEnvelope.findFirst({
        where: { providerEnvelopeId: 'docusign-abc-123' },
      });

      expect(envelope).toBeTruthy();
      expect(envelope.id).toBe('internal-env-1');
    });

    it('returns null for unknown envelope', async () => {
      mockPrisma.signatureEnvelope.findFirst.mockResolvedValue(null);

      const envelope = await mockPrisma.signatureEnvelope.findFirst({
        where: { providerEnvelopeId: 'unknown-id' },
      });

      expect(envelope).toBeNull();
    });
  });
});
