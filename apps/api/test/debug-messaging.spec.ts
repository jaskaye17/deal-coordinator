import { describe, it, expect, beforeEach } from 'vitest';
import { DebugMessagingProvider } from '../src/modules/messaging/providers/debug.provider';

describe('DebugMessagingProvider', () => {
  let provider: DebugMessagingProvider;

  beforeEach(() => {
    provider = new DebugMessagingProvider();
  });

  describe('sendMessage', () => {
    it('returns a debug message ID and status', async () => {
      const result = await provider.sendMessage({
        to: '+15551234567',
        body: 'Hello from debug',
      });

      expect(result.messageId).toMatch(/^debug-/);
      expect(result.status).toBe('debug_sent');
    });

    it('stores message in history', async () => {
      await provider.sendMessage({ to: '+1555', body: 'Test 1' });
      await provider.sendMessage({ to: '+1666', body: 'Test 2' });

      const history = provider.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].direction).toBe('outbound');
      expect(history[1].body).toBe('Test 2');
    });
  });

  describe('simulateInbound', () => {
    it('creates an inbound message in history', () => {
      const msg = provider.simulateInbound('+15559999', 'I have a question');

      expect(msg.direction).toBe('inbound');
      expect(msg.body).toBe('I have a question');
      expect(msg.id).toMatch(/^debug-in-/);

      const history = provider.getHistory();
      expect(history).toHaveLength(1);
    });
  });

  describe('clearHistory', () => {
    it('empties the message history', async () => {
      await provider.sendMessage({ to: '+1555', body: 'msg' });
      provider.simulateInbound('+1666', 'reply');

      expect(provider.getHistory()).toHaveLength(2);

      provider.clearHistory();

      expect(provider.getHistory()).toHaveLength(0);
    });
  });

  describe('channel', () => {
    it('reports debug channel', () => {
      expect(provider.channel).toBe('debug');
    });
  });
});
