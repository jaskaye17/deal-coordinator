import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  communication: {
    create: vi.fn().mockResolvedValue({ id: 'comm-1', content: 'test' }),
  },
  deal: {
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
  },
  dealParty: {
    findFirst: vi.fn(),
  },
  dealAssignment: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
};

const mockAudit = {
  create: vi.fn().mockResolvedValue(undefined),
};

const mockFiles = {
  ensureDefaultDealFolders: vi.fn().mockResolvedValue(undefined),
};

const mockTwilio = {
  channel: 'sms',
  sendMessage: vi.fn().mockResolvedValue({ messageId: 'twilio-123', status: 'sent' }),
};

const mockWhatsApp = {
  channel: 'whatsapp',
  sendMessage: vi.fn().mockResolvedValue({ messageId: 'wa-456', status: 'sent' }),
};

const mockBlueBubbles = {
  channel: 'imessage',
  sendMessage: vi.fn().mockResolvedValue({ messageId: 'bb-789', status: 'sent' }),
};

vi.mock('../../src/prisma/prisma.service', () => ({
  PrismaService: vi.fn().mockImplementation(() => mockPrisma),
}));

import { MessagingService } from '../src/modules/messaging/messaging.service';

function createService() {
  return new MessagingService(
    mockPrisma as any,
    mockAudit as any,
    mockFiles as any,
    mockTwilio as any,
    mockWhatsApp as any,
    mockBlueBubbles as any,
  );
}

describe('MessagingService', () => {
  let service: MessagingService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.communication.create.mockResolvedValue({ id: 'comm-1', content: 'test' });
    mockPrisma.deal.findFirst.mockResolvedValue(null);
    mockPrisma.deal.create.mockReset();
    mockPrisma.dealParty.findFirst.mockReset();
    mockPrisma.dealAssignment.findFirst.mockReset();
    mockPrisma.dealAssignment.create.mockReset();
    mockFiles.ensureDefaultDealFolders.mockClear();
    service = createService();
  });

  describe('sendMessage', () => {
    it('sends via SMS provider and stores communication', async () => {
      const result = await service.sendMessage(
        'ws-1', 'deal-1', 'sms', '+15551234567', 'Hello buyer', 'user-1', 'req-1',
      );

      expect(mockTwilio.sendMessage).toHaveBeenCalledWith({
        to: '+15551234567',
        body: 'Hello buyer',
      });
      expect(mockPrisma.communication.create).toHaveBeenCalled();
      expect(mockAudit.create).toHaveBeenCalled();
      expect(result.status).toBe('sent');
    });

    it('sends via WhatsApp provider', async () => {
      await service.sendMessage(
        'ws-1', 'deal-1', 'whatsapp', '+15559876543', 'WhatsApp test', 'user-1', 'req-2',
      );

      expect(mockWhatsApp.sendMessage).toHaveBeenCalledWith({
        to: '+15559876543',
        body: 'WhatsApp test',
      });
    });

    it('sends via iMessage provider', async () => {
      await service.sendMessage(
        'ws-1', 'deal-1', 'imessage', '+15551112222', 'iMessage test', 'user-1', 'req-3',
      );

      expect(mockBlueBubbles.sendMessage).toHaveBeenCalledWith({
        to: '+15551112222',
        body: 'iMessage test',
      });
    });

    it('throws for unknown channel', async () => {
      await expect(
        service.sendMessage('ws-1', 'deal-1', 'pigeon', '+1555', 'test', 'user-1', 'req-4'),
      ).rejects.toThrow('No messaging provider for channel: pigeon');
    });
  });

  describe('handleInbound', () => {
    it('returns null when no workspace provided', async () => {
      const result = await service.handleInbound(
        { from: '+1555', to: '+1666', body: 'hi', channel: 'sms', timestamp: new Date() },
        '',
        'req-5',
      );
      expect(result.dealId).toBeNull();
    });

    it('associates message with deal via party phone lookup', async () => {
      mockPrisma.dealParty.findFirst.mockResolvedValue({
        deal: { id: 'deal-99', title: 'Test Deal' },
      });

      const result = await service.handleInbound(
        { from: '+15551234567', to: '+1666', body: 'Update on the deal', channel: 'sms', timestamp: new Date() },
        'ws-1',
        'req-6',
      );

      expect(result.dealId).toBe('deal-99');
      expect(mockPrisma.communication.create).toHaveBeenCalled();
      expect(mockAudit.create).toHaveBeenCalled();
    });

    it('uses metadata.dealId when provided (phone simulator)', async () => {
      mockPrisma.deal.findFirst.mockResolvedValueOnce({
        id: 'deal-explicit',
        workspaceId: 'ws-1',
      });

      const result = await service.handleInbound(
        {
          from: '+15559999999',
          to: '+1666',
          body: 'Hello',
          channel: 'sms',
          timestamp: new Date(),
          metadata: { dealId: 'deal-explicit', simulated: true },
        },
        'ws-1',
        'req-7',
      );

      expect(mockPrisma.deal.findFirst).toHaveBeenCalledWith({
        where: { id: 'deal-explicit', workspaceId: 'ws-1' },
      });
      expect(mockPrisma.dealParty.findFirst).not.toHaveBeenCalled();
      expect(result.dealId).toBe('deal-explicit');
    });

    it('creates sandbox deal when simulated and userId are set', async () => {
      mockPrisma.deal.findFirst.mockResolvedValueOnce(null);
      mockPrisma.deal.create.mockResolvedValue({
        id: 'deal-sandbox',
        title: 'Sandbox — phone simulator (user-1)',
      });
      mockPrisma.dealAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.dealAssignment.create.mockResolvedValue({});

      const result = await service.handleInbound(
        {
          from: '+15551234567',
          to: '+1666',
          body: 'hi',
          channel: 'sms',
          timestamp: new Date(),
          metadata: { simulated: true },
        },
        'ws-1',
        'req-sb',
        { userId: 'user-1' },
      );

      expect(mockPrisma.deal.create).toHaveBeenCalled();
      expect(mockFiles.ensureDefaultDealFolders).toHaveBeenCalled();
      expect(result.dealId).toBe('deal-sandbox');
      expect(mockPrisma.communication.create).toHaveBeenCalled();
    });

    it('reuses existing sandbox deal for simulated + userId', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({
        id: 'deal-existing',
        title: 'Sandbox — phone simulator (user-2)',
      });
      mockPrisma.dealAssignment.findFirst.mockResolvedValue({ id: 'da-1' });

      const result = await service.handleInbound(
        {
          from: '+15550000000',
          to: '+1666',
          body: 'start a listing',
          channel: 'sms',
          timestamp: new Date(),
          metadata: { simulated: true },
        },
        'ws-1',
        'req-sb2',
        { userId: 'user-2' },
      );

      expect(mockPrisma.deal.create).not.toHaveBeenCalled();
      expect(result.dealId).toBe('deal-existing');
    });
  });
});
