import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OffersService } from '../src/modules/offers/offers.service';

function createMocks() {
  const prisma = {
    deal: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    offer: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    offerFile: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    unresolvedItem: {
      create: vi.fn(),
    },
  } as any;

  const audit = {
    create: vi.fn().mockResolvedValue({}),
  } as any;

  const extraction = {
    extractAndUpdate: vi.fn().mockResolvedValue({ fields: {}, confidence: {}, source: {}, completeness: 0.5 }),
  } as any;

  const storage = {
    storeFile: vi.fn().mockResolvedValue('/files/test.pdf'),
  } as any;

  return { prisma, audit, extraction, storage };
}

describe('OffersService – selected-offer workflow', () => {
  let mocks: ReturnType<typeof createMocks>;
  let service: OffersService;

  beforeEach(() => {
    mocks = createMocks();
    service = new OffersService(mocks.prisma, mocks.audit, mocks.extraction, mocks.storage);
  });

  describe('select', () => {
    const baseOffer = {
      id: 'offer-1',
      dealId: 'deal-1',
      workspaceId: 'ws-1',
      status: 'shortlisted',
      buyerName: 'Alice',
      offerPrice: 450000,
      closeDate: new Date('2026-06-01'),
      files: [],
      deal: { id: 'deal-1', title: 'Test', address: '123 Main', stage: 'offers_received' },
    };

    it('marks offer as selected and supersedes others', async () => {
      mocks.prisma.offer.findFirst.mockResolvedValue(baseOffer);
      mocks.prisma.offer.update.mockResolvedValue({ ...baseOffer, status: 'selected' });
      mocks.prisma.offer.updateMany.mockResolvedValue({ count: 1 });
      mocks.prisma.deal.findFirst.mockResolvedValue({ id: 'deal-1', dealType: 'listing', stage: 'offers_received' });
      mocks.prisma.deal.update.mockResolvedValue({});

      const result = await service.select('ws-1', 'offer-1', 'user-1', 'req-1');

      expect(result.status).toBe('selected');

      expect(mocks.prisma.offer.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          dealId: 'deal-1',
          id: { not: 'offer-1' },
        }),
        data: { status: 'superseded' },
      });
    });

    it('creates audit event for selection', async () => {
      mocks.prisma.offer.findFirst.mockResolvedValue(baseOffer);
      mocks.prisma.offer.update.mockResolvedValue({ ...baseOffer, status: 'selected' });
      mocks.prisma.offer.updateMany.mockResolvedValue({ count: 0 });
      mocks.prisma.deal.findFirst.mockResolvedValue({ id: 'deal-1', dealType: 'listing', stage: 'offers_received' });
      mocks.prisma.deal.update.mockResolvedValue({});

      await service.select('ws-1', 'offer-1', 'user-1', 'req-1');

      const auditCalls = mocks.audit.create.mock.calls;
      const selectionAudit = auditCalls.find(
        (c: any[]) => c[0].action === 'offer_selected',
      );
      expect(selectionAudit).toBeDefined();
    });

    it('creates unresolved item when offer data is incomplete', async () => {
      const incompleteOffer = {
        ...baseOffer,
        buyerName: null,
        offerPrice: null,
        closeDate: null,
      };
      mocks.prisma.offer.findFirst.mockResolvedValue(incompleteOffer);
      mocks.prisma.offer.update.mockResolvedValue({ ...incompleteOffer, status: 'selected' });
      mocks.prisma.offer.updateMany.mockResolvedValue({ count: 0 });
      mocks.prisma.deal.findFirst.mockResolvedValue({ id: 'deal-1', dealType: 'listing', stage: 'offers_received' });
      mocks.prisma.deal.update.mockResolvedValue({});

      await service.select('ws-1', 'offer-1', 'user-1', 'req-1');

      expect(mocks.prisma.unresolvedItem.create).toHaveBeenCalled();
      const unresolvedCall = mocks.prisma.unresolvedItem.create.mock.calls[0][0];
      expect(unresolvedCall.data.question).toContain('buyerName');
    });

    it('rejects selection from invalid status', async () => {
      const rejectedOffer = { ...baseOffer, status: 'rejected' };
      mocks.prisma.offer.findFirst.mockResolvedValue(rejectedOffer);

      await expect(
        service.select('ws-1', 'offer-1', 'user-1', 'req-1'),
      ).rejects.toThrow('Cannot select offer');
    });
  });

  describe('shortlist', () => {
    it('transitions received offer to shortlisted', async () => {
      const offer = {
        id: 'offer-1',
        dealId: 'deal-1',
        workspaceId: 'ws-1',
        status: 'received',
        files: [],
        deal: { id: 'deal-1', title: 'Test', address: '123 Main', stage: 'active' },
      };
      mocks.prisma.offer.findFirst.mockResolvedValue(offer);
      mocks.prisma.offer.update.mockResolvedValue({ ...offer, status: 'shortlisted' });

      const result = await service.shortlist('ws-1', 'offer-1', 'user-1', 'req-1');
      expect(result.status).toBe('shortlisted');
    });
  });

  describe('reject', () => {
    it('rejects an offer and records notes', async () => {
      const offer = {
        id: 'offer-1',
        dealId: 'deal-1',
        workspaceId: 'ws-1',
        status: 'received',
        notes: null,
        files: [],
        deal: { id: 'deal-1', title: 'Test', address: '123 Main', stage: 'active' },
      };
      mocks.prisma.offer.findFirst.mockResolvedValue(offer);
      mocks.prisma.offer.update.mockResolvedValue({ ...offer, status: 'rejected', notes: 'Too low' });

      const result = await service.reject('ws-1', 'offer-1', 'user-1', 'req-1', 'Too low');
      expect(result.status).toBe('rejected');
    });

    it('cannot reject already accepted offer', async () => {
      const offer = {
        id: 'offer-1',
        dealId: 'deal-1',
        workspaceId: 'ws-1',
        status: 'accepted',
        files: [],
        deal: { id: 'deal-1', title: 'Test', address: '123 Main', stage: 'active' },
      };
      mocks.prisma.offer.findFirst.mockResolvedValue(offer);

      await expect(
        service.reject('ws-1', 'offer-1', 'user-1', 'req-1'),
      ).rejects.toThrow('Cannot reject offer');
    });
  });
});
