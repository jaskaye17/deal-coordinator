import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import {
  AppError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@deal-coordinator/shared';

const LISTING_PREP_CHECKLIST = [
  { title: 'Schedule photography', sortOrder: 1 },
  { title: 'Order lockbox', sortOrder: 2 },
  { title: 'Install sign', sortOrder: 3 },
  { title: 'Prepare MLS input', sortOrder: 4 },
  { title: 'Marketing kickoff', sortOrder: 5 },
];

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listByDeal(
    workspaceId: string,
    dealId: string,
    page?: number,
    pageSize?: number,
  ): Promise<{ items: any[]; meta: { page: number; pageSize: number; total: number } }> {
    const p = page ?? 1;
    const take = Math.min(pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = (p - 1) * take;

    const where = { workspaceId, dealId };

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip,
        take,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, meta: { page: p, pageSize: take, total } };
  }

  async create(
    workspaceId: string,
    data: {
      dealId: string;
      title: string;
      description?: string;
      category?: string;
      sortOrder?: number;
      dueDate?: string;
      assignedTo?: string;
    },
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const task = await this.prisma.task.create({
      data: {
        workspaceId,
        dealId: data.dealId,
        title: data.title,
        description: data.description,
        category: data.category,
        sortOrder: data.sortOrder ?? 0,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        assignedTo: data.assignedTo,
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId: data.dealId,
      action: 'task_created',
      objectType: 'Task',
      objectId: task.id,
      actorType: 'user',
      actorId,
      after: task,
      requestId,
    });

    return task;
  }

  async update(
    workspaceId: string,
    taskId: string,
    data: {
      status?: string;
      title?: string;
      description?: string;
      assignedTo?: string;
      dueDate?: string;
    },
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const existing = await this.prisma.task.findFirst({
      where: { id: taskId, workspaceId },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'Task not found');
    }

    const updateData: any = {};
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'completed') {
        updateData.completedAt = new Date();
      }
    }
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    await this.auditService.create({
      workspaceId,
      dealId: existing.dealId,
      action: 'task_updated',
      objectType: 'Task',
      objectId: taskId,
      actorType: 'user',
      actorId,
      before: existing,
      after: updated,
      requestId,
    });

    return updated;
  }

  async activateListingPrepChecklist(
    workspaceId: string,
    dealId: string,
    actorId: string,
    requestId: string,
  ): Promise<any[]> {
    const tasks = [];

    for (const item of LISTING_PREP_CHECKLIST) {
      const task = await this.prisma.task.create({
        data: {
          workspaceId,
          dealId,
          title: item.title,
          sortOrder: item.sortOrder,
          category: 'listing_prep',
          sourceType: 'checklist',
          sourceId: 'listing_prep',
        },
      });
      tasks.push(task);
    }

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'checklist_activated',
      objectType: 'Deal',
      objectId: dealId,
      actorType: 'system',
      actorId,
      after: { checklist: 'listing_prep', taskCount: tasks.length },
      requestId,
    });

    return tasks;
  }
}
