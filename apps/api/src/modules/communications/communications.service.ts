import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@deal-coordinator/shared';

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByDeal(
    workspaceId: string,
    dealId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<{ data: any[]; meta: { page: number; pageSize: number; total: number } }> {
    const take = Math.min(pageSize, MAX_PAGE_SIZE);
    const skip = (page - 1) * take;

    const where = { workspaceId, dealId };

    const [items, total] = await Promise.all([
      this.prisma.communication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.communication.count({ where }),
    ]);

    return { data: items, meta: { page, pageSize: take, total } };
  }
}
