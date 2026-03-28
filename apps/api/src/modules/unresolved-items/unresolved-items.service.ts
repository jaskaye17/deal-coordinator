import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AppError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@deal-coordinator/shared';

@Injectable()
export class UnresolvedItemsService {
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
      this.prisma.unresolvedItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.unresolvedItem.count({ where }),
    ]);

    return { data: items, meta: { page, pageSize: take, total } };
  }

  async update(
    workspaceId: string,
    id: string,
    data: { status: string; resolvedBy?: string },
    actorId: string,
    requestId: string,
  ) {
    const existing = await this.prisma.unresolvedItem.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'Unresolved item not found');
    }

    const updateData: any = { status: data.status };
    if (['resolved', 'confirmed', 'dismissed'].includes(data.status)) {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = data.resolvedBy ?? actorId;
    }

    const updated = await this.prisma.unresolvedItem.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.create({
      workspaceId,
      dealId: existing.dealId,
      action: 'unresolved_item_resolved',
      objectType: 'UnresolvedItem',
      objectId: id,
      actorType: 'user',
      actorId,
      before: { status: existing.status },
      after: { status: data.status },
      requestId,
    });

    return updated;
  }
}
