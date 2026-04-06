import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@deal-coordinator/shared';

export interface CreateAuditEventParams {
  workspaceId: string;
  dealId?: string;
  action: string;
  objectType: string;
  objectId: string;
  actorType: string;
  actorId: string;
  before?: any;
  after?: any;
  metadata?: any;
  requestId?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateAuditEventParams): Promise<any> {
    return this.prisma.auditEvent.create({
      data: {
        workspaceId: params.workspaceId,
        dealId: params.dealId,
        action: params.action,
        objectType: params.objectType,
        objectId: params.objectId,
        actorType: params.actorType,
        actorId: params.actorId,
        before: params.before ?? undefined,
        after: params.after ?? undefined,
        metadata: params.metadata ?? undefined,
        requestId: params.requestId,
      },
    });
  }

  async listByDeal(
    workspaceId: string,
    dealId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<{ data: any[]; meta: { page: number; pageSize: number; total: number } }> {
    const take = Math.min(pageSize, MAX_PAGE_SIZE);
    const skip = (page - 1) * take;

    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where: { workspaceId, dealId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditEvent.count({ where: { workspaceId, dealId } }),
    ]);

    return { data: items, meta: { page, pageSize: take, total } };
  }

  async recent(workspaceId: string, limit = 10): Promise<any[]> {
    return this.prisma.auditEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
