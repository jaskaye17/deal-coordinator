import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import {
  AppError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@deal-coordinator/shared';

@Injectable()
export class ReviewTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(
    workspaceId: string,
    filters?: {
      status?: string;
      actionType?: string;
      dealId?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ items: any[]; meta: { page: number; pageSize: number; total: number } }> {
    const page = filters?.page ?? 1;
    const take = Math.min(filters?.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = (page - 1) * take;

    const where: any = { workspaceId };
    if (filters?.status) where.status = filters.status;
    if (filters?.actionType) where.actionType = filters.actionType;
    if (filters?.dealId) where.dealId = filters.dealId;

    const [items, total] = await Promise.all([
      this.prisma.reviewTask.findMany({
        where,
        include: { deal: { select: { id: true, title: true, address: true, stage: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.reviewTask.count({ where }),
    ]);

    return { items, meta: { page, pageSize: take, total } };
  }

  async findById(workspaceId: string, id: string): Promise<any> {
    const task = await this.prisma.reviewTask.findFirst({
      where: { id, workspaceId },
      include: { deal: { select: { id: true, title: true, address: true, stage: true } } },
    });

    if (!task) {
      throw new AppError('NOT_FOUND', 404, 'Review task not found');
    }

    return task;
  }

  async create(
    workspaceId: string,
    data: {
      dealId: string;
      actionType: string;
      objectType: string;
      objectId: string;
      payloadJson?: any;
      assignedToUserId?: string;
    },
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const task = await this.prisma.reviewTask.create({
      data: {
        workspaceId,
        dealId: data.dealId,
        actionType: data.actionType,
        objectType: data.objectType,
        objectId: data.objectId,
        payloadJson: data.payloadJson ?? undefined,
        assignedToUserId: data.assignedToUserId ?? undefined,
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId: data.dealId,
      action: 'review_task_created',
      objectType: 'ReviewTask',
      objectId: task.id,
      actorType: 'user',
      actorId,
      after: task,
      requestId,
    });

    return task;
  }

  async approve(
    workspaceId: string,
    id: string,
    actorId: string,
    requestId: string,
    notes?: string,
  ): Promise<any> {
    return this.resolveTask(workspaceId, id, 'approved', actorId, requestId, notes);
  }

  async reject(
    workspaceId: string,
    id: string,
    actorId: string,
    requestId: string,
    notes?: string,
  ): Promise<any> {
    return this.resolveTask(workspaceId, id, 'rejected', actorId, requestId, notes);
  }

  async requestChanges(
    workspaceId: string,
    id: string,
    actorId: string,
    requestId: string,
    notes?: string,
  ): Promise<any> {
    return this.resolveTask(workspaceId, id, 'changes_requested', actorId, requestId, notes);
  }

  async hold(
    workspaceId: string,
    id: string,
    actorId: string,
    requestId: string,
    notes?: string,
  ): Promise<any> {
    return this.resolveTask(workspaceId, id, 'on_hold', actorId, requestId, notes);
  }

  private async resolveTask(
    workspaceId: string,
    id: string,
    status: string,
    actorId: string,
    requestId: string,
    notes?: string,
  ): Promise<any> {
    const existing = await this.findById(workspaceId, id);

    const updated = await this.prisma.reviewTask.update({
      where: { id },
      data: {
        status,
        reviewedByUserId: actorId,
        resolvedAt: new Date(),
        reviewNotes: notes ?? undefined,
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId: existing.dealId,
      action: 'review_task_actioned',
      objectType: 'ReviewTask',
      objectId: id,
      actorType: 'user',
      actorId,
      before: { status: existing.status },
      after: { status },
      metadata: { notes },
      requestId,
    });

    return updated;
  }
}
