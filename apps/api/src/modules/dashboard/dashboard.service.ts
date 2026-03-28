import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getStats(workspaceId: string): Promise<any> {
    const [totalDeals, awaitingInfoCount, openExceptionsCount, recentActivity] =
      await Promise.all([
        this.prisma.deal.count({ where: { workspaceId } }),
        this.prisma.deal.count({
          where: { workspaceId, stage: 'awaiting_info' },
        }),
        this.prisma.exception.count({
          where: {
            workspaceId,
            status: { notIn: ['resolved', 'closed'] },
          },
        }),
        this.auditService.recent(workspaceId, 10),
      ]);

    return {
      totalDeals,
      awaitingInfoCount,
      openExceptionsCount,
      recentActivity,
    };
  }
}
