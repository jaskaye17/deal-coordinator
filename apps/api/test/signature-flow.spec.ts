import { describe, it, expect } from 'vitest';
import { FakeSignatureProvider } from '../src/modules/signatures/fake-signature.provider';

describe('FakeSignatureProvider', () => {
  function createProvider() {
    return new FakeSignatureProvider();
  }

  const recipients = [
    { name: 'Alice Seller', email: 'alice@example.com', role: 'seller' },
    { name: 'Bob Buyer', email: 'bob@example.com', role: 'buyer' },
  ];

  describe('createEnvelope', () => {
    it('returns a provider envelope ID', async () => {
      const provider = createProvider();
      const result = await provider.createEnvelope({
        envelopeId: 'env-1',
        recipients,
        documentIds: ['doc-1'],
      });

      expect(result.providerEnvelopeId).toBeDefined();
      expect(result.providerEnvelopeId).toMatch(/^fake-env-/);
    });
  });

  describe('sendEnvelope', () => {
    it('marks envelope as sent', async () => {
      const provider = createProvider();
      const { providerEnvelopeId } = await provider.createEnvelope({
        envelopeId: 'env-1',
        recipients,
        documentIds: ['doc-1'],
      });

      await provider.sendEnvelope(providerEnvelopeId);

      const status = await provider.getEnvelopeStatus(providerEnvelopeId);
      expect(status.status).toBe('sent');
      expect(status.recipients.every((r) => r.status === 'sent')).toBe(true);
    });
  });

  describe('getEnvelopeStatus', () => {
    it('returns correct status and recipients', async () => {
      const provider = createProvider();
      const { providerEnvelopeId } = await provider.createEnvelope({
        envelopeId: 'env-1',
        recipients,
        documentIds: ['doc-1'],
      });

      const status = await provider.getEnvelopeStatus(providerEnvelopeId);

      expect(status.status).toBe('draft');
      expect(status.recipients).toHaveLength(2);
      expect(status.recipients[0]).toEqual(
        expect.objectContaining({ name: 'Alice Seller', email: 'alice@example.com', status: 'pending' }),
      );
      expect(status.recipients[1]).toEqual(
        expect.objectContaining({ name: 'Bob Buyer', email: 'bob@example.com', status: 'pending' }),
      );
    });
  });

  describe('simulateRecipientSigned', () => {
    it('marks a recipient as signed', async () => {
      const provider = createProvider();
      const { providerEnvelopeId } = await provider.createEnvelope({
        envelopeId: 'env-1',
        recipients,
        documentIds: ['doc-1'],
      });

      await provider.sendEnvelope(providerEnvelopeId);
      provider.simulateRecipientSigned(providerEnvelopeId, 'alice@example.com');

      const status = await provider.getEnvelopeStatus(providerEnvelopeId);
      const alice = status.recipients.find((r) => r.email === 'alice@example.com')!;

      expect(alice.status).toBe('signed');
      expect(alice.signedAt).toBeDefined();
      expect(status.status).toBe('partially_signed');
    });

    it('sets envelope status to completed when all recipients have signed', async () => {
      const provider = createProvider();
      const { providerEnvelopeId } = await provider.createEnvelope({
        envelopeId: 'env-1',
        recipients,
        documentIds: ['doc-1'],
      });

      await provider.sendEnvelope(providerEnvelopeId);
      provider.simulateRecipientSigned(providerEnvelopeId, 'alice@example.com');
      provider.simulateRecipientSigned(providerEnvelopeId, 'bob@example.com');

      const status = await provider.getEnvelopeStatus(providerEnvelopeId);
      expect(status.status).toBe('completed');
      expect(status.recipients.every((r) => r.status === 'signed')).toBe(true);
    });

    it('throws when signing a non-existent recipient', async () => {
      const provider = createProvider();
      const { providerEnvelopeId } = await provider.createEnvelope({
        envelopeId: 'env-1',
        recipients,
        documentIds: ['doc-1'],
      });

      expect(() =>
        provider.simulateRecipientSigned(providerEnvelopeId, 'nobody@example.com'),
      ).toThrow('Recipient nobody@example.com not found in envelope');
    });
  });
});
