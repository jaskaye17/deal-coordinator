import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewTasksService } from '../src/modules/review-tasks/review-tasks.service';

const mockPrisma = {
  reviewTask: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

const mockAudit = { create: vi.fn() };

function createService() {
  return new ReviewTasksService(mockPrisma as any, mockAudit as any);
}

describe('ReviewTasksService', () => {
  let service: ReviewTasksService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createService();
  });

  describe('create', () => {
    it('creates a review task with correct workspace scoping', async () => {
      const createdTask = {
        id: 'rt-1',
        workspaceId: 'ws-1',
        dealId: 'deal-1',
        actionType: 'manual_review',
        objectType: 'Document',
        objectId: 'doc-1',
        status: 'pending',
      };

      mockPrisma.reviewTask.create.mockResolvedValue(createdTask);
      mockAudit.create.mockResolvedValue(undefined);

      const result = await service.create(
        'ws-1',
        {
          dealId: 'deal-1',
          actionType: 'manual_review',
          objectType: 'Document',
          objectId: 'doc-1',
        },
        'user-1',
        'req-1',
      );

      expect(mockPrisma.reviewTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: 'ws-1',
          dealId: 'deal-1',
          actionType: 'manual_review',
          objectType: 'Document',
          objectId: 'doc-1',
        }),
      });
      expect(result).toEqual(createdTask);
      expect(mockAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-1',
          action: 'review_task_created',
          objectType: 'ReviewTask',
          objectId: 'rt-1',
        }),
      );
    });
  });

  describe('approve', () => {
    it('sets status to approved, reviewedByUserId, and resolvedAt', async () => {
      const existingTask = { id: 'rt-1', workspaceId: 'ws-1', dealId: 'deal-1', status: 'pending' };
      const updatedTask = { ...existingTask, status: 'approved', reviewedByUserId: 'user-1' };

      mockPrisma.reviewTask.findFirst.mockResolvedValue(existingTask);
      mockPrisma.reviewTask.update.mockResolvedValue(updatedTask);
      mockAudit.create.mockResolvedValue(undefined);

      const result = await service.approve('ws-1', 'rt-1', 'user-1', 'req-1');

      expect(mockPrisma.reviewTask.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: expect.objectContaining({
          status: 'approved',
          reviewedByUserId: 'user-1',
          resolvedAt: expect.any(Date),
        }),
      });
      expect(result).toEqual(updatedTask);
    });
  });

  describe('reject', () => {
    it('sets status to rejected', async () => {
      const existingTask = { id: 'rt-2', workspaceId: 'ws-1', dealId: 'deal-1', status: 'pending' };
      const updatedTask = { ...existingTask, status: 'rejected' };

      mockPrisma.reviewTask.findFirst.mockResolvedValue(existingTask);
      mockPrisma.reviewTask.update.mockResolvedValue(updatedTask);
      mockAudit.create.mockResolvedValue(undefined);

      const result = await service.reject('ws-1', 'rt-2', 'user-1', 'req-1');

      expect(mockPrisma.reviewTask.update).toHaveBeenCalledWith({
        where: { id: 'rt-2' },
        data: expect.objectContaining({ status: 'rejected' }),
      });
      expect(result.status).toBe('rejected');
    });
  });

  describe('requestChanges', () => {
    it('sets status to changes_requested', async () => {
      const existingTask = { id: 'rt-3', workspaceId: 'ws-1', dealId: 'deal-1', status: 'pending' };
      const updatedTask = { ...existingTask, status: 'changes_requested' };

      mockPrisma.reviewTask.findFirst.mockResolvedValue(existingTask);
      mockPrisma.reviewTask.update.mockResolvedValue(updatedTask);
      mockAudit.create.mockResolvedValue(undefined);

      const result = await service.requestChanges('ws-1', 'rt-3', 'user-1', 'req-1', 'Please fix X');

      expect(mockPrisma.reviewTask.update).toHaveBeenCalledWith({
        where: { id: 'rt-3' },
        data: expect.objectContaining({ status: 'changes_requested', reviewNotes: 'Please fix X' }),
      });
      expect(result.status).toBe('changes_requested');
    });
  });

  describe('hold', () => {
    it('sets status to on_hold', async () => {
      const existingTask = { id: 'rt-4', workspaceId: 'ws-1', dealId: 'deal-1', status: 'pending' };
      const updatedTask = { ...existingTask, status: 'on_hold' };

      mockPrisma.reviewTask.findFirst.mockResolvedValue(existingTask);
      mockPrisma.reviewTask.update.mockResolvedValue(updatedTask);
      mockAudit.create.mockResolvedValue(undefined);

      const result = await service.hold('ws-1', 'rt-4', 'user-1', 'req-1');

      expect(mockPrisma.reviewTask.update).toHaveBeenCalledWith({
        where: { id: 'rt-4' },
        data: expect.objectContaining({ status: 'on_hold' }),
      });
      expect(result.status).toBe('on_hold');
    });
  });

  describe('findById', () => {
    it('throws when review task not found', async () => {
      mockPrisma.reviewTask.findFirst.mockResolvedValue(null);

      await expect(service.findById('ws-1', 'nonexistent')).rejects.toThrow('Review task not found');
    });

    it('throws when review task is in different workspace', async () => {
      mockPrisma.reviewTask.findFirst.mockResolvedValue(null);

      await expect(service.findById('ws-other', 'rt-1')).rejects.toThrow('Review task not found');

      expect(mockPrisma.reviewTask.findFirst).toHaveBeenCalledWith({
        where: { id: 'rt-1', workspaceId: 'ws-other' },
        include: expect.any(Object),
      });
    });
  });
});
