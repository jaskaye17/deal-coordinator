import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import {
  AppError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@deal-coordinator/shared';

@Injectable()
export class ExceptionsService {
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
      this.prisma.exception.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.exception.count({ where }),
    ]);

    return { data: items, meta: { page, pageSize: take, total } };
  }

  async create(
    workspaceId: string,
    data: { dealId: string; title: string; description: string; severity: string },
    actorId: string,
    requestId: string,
  ) {
    const exception = await this.prisma.exception.create({
      data: {
        workspaceId,
        dealId: data.dealId,
        title: data.title,
        description: data.description,
        severity: data.severity,
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId: data.dealId,
      action: 'exception_created',
      objectType: 'Exception',
      objectId: exception.id,
      actorType: 'user',
      actorId,
      after: exception,
      requestId,
    });

    return exception;
  }

  async update(
    workspaceId: string,
    id: string,
    data: { status: string; resolution?: string },
    actorId: string,
    requestId: string,
  ) {
    const existing = await this.prisma.exception.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'Exception not found');
    }

    const updateData: any = { status: data.status };
    if (data.resolution) {
      updateData.resolution = data.resolution;
    }
    if (['resolved', 'closed'].includes(data.status)) {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = actorId;
    }

    const updated = await this.prisma.exception.update({
      where: { id },
      data: updateData,
    });

    const action = ['resolved', 'closed'].includes(data.status)
      ? 'exception_resolved'
      : 'exception_updated';

    await this.auditService.create({
      workspaceId,
      dealId: existing.dealId,
      action,
      objectType: 'Exception',
      objectId: id,
      actorType: 'user',
      actorId,
      before: { status: existing.status },
      after: { status: data.status, resolution: data.resolution },
      requestId,
    });

    return updated;
  }

  async countOpen(workspaceId: string) {
    return this.prisma.exception.count({
      where: {
        workspaceId,
        status: { notIn: ['resolved', 'closed'] },
      },
    });
  }
}
