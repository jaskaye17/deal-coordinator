import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AppError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@deal-coordinator/shared';

@Injectable()
export class MemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listByDeal(
    workspaceId: string,
    dealId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ) {
    const take = Math.min(pageSize, MAX_PAGE_SIZE);
    const skip = (page - 1) * take;

    const where = { workspaceId, dealId };

    const [items, total] = await Promise.all([
      this.prisma.memoryEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.memoryEntry.count({ where }),
    ]);

    return { data: items, meta: { page, pageSize: take, total } };
  }

  async create(
    workspaceId: string,
    dealId: string,
    data: { content: string; scope: string; category?: string },
    actorId: string,
    requestId: string,
  ) {
    const entry = await this.prisma.memoryEntry.create({
      data: {
        workspaceId,
        dealId,
        content: data.content,
        scope: data.scope,
        category: data.category,
        createdBy: actorId,
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'memory_created',
      objectType: 'MemoryEntry',
      objectId: entry.id,
      actorType: 'user',
      actorId,
      after: entry,
      requestId,
    });

    return entry;
  }

  async update(
    workspaceId: string,
    id: string,
    data: { content?: string; scope?: string; category?: string },
    actorId: string,
    requestId: string,
  ) {
    const existing = await this.prisma.memoryEntry.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'Memory entry not found');
    }

    const updated = await this.prisma.memoryEntry.update({
      where: { id },
      data,
    });

    await this.auditService.create({
      workspaceId,
      dealId: existing.dealId ?? undefined,
      action: 'memory_updated',
      objectType: 'MemoryEntry',
      objectId: id,
      actorType: 'user',
      actorId,
      before: existing,
      after: updated,
      requestId,
    });

    return updated;
  }
}
