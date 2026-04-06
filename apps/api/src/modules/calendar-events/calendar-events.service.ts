import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import { AppError, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@deal-coordinator/shared';

@Injectable()
export class CalendarEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listByDeal(
    workspaceId: string,
    dealId: string,
    page?: number,
    pageSize?: number,
  ): Promise<any> {
    const currentPage = page ?? 1;
    const take = Math.min(pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = (currentPage - 1) * take;
    const where = { workspaceId, dealId };

    const [items, total] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where,
        orderBy: { startDate: 'asc' },
        skip,
        take,
      }),
      this.prisma.calendarEvent.count({ where }),
    ]);

    return { items, meta: { page: currentPage, pageSize: take, total } };
  }

  async create(
    workspaceId: string,
    data: {
      dealId: string;
      eventType?: string;
      title: string;
      description?: string;
      startDate: string;
      endDate?: string;
      attendeesJson?: Array<{ name: string; email?: string }>;
      sourceType?: string;
      sourceId?: string;
    },
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: data.dealId, workspaceId },
    });

    if (!deal) {
      throw new AppError('NOT_FOUND', 404, 'Deal not found');
    }

    const event = await this.prisma.calendarEvent.create({
      data: {
        workspaceId,
        dealId: data.dealId,
        eventType: data.eventType ?? 'custom',
        title: data.title,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        attendeesJson: (data.attendeesJson as any) ?? undefined,
        status: 'active',
        sourceType: data.sourceType ?? 'manual',
        sourceId: data.sourceId,
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId: data.dealId,
      action: 'calendar_event_created',
      objectType: 'CalendarEvent',
      objectId: event.id,
      actorType: 'user',
      actorId,
      after: event,
      requestId,
    });

    return event;
  }

  async createBatch(
    workspaceId: string,
    dealId: string,
    events: Array<{
      eventType: string;
      title: string;
      description?: string;
      startDate: string;
      sourceType?: string;
      sourceId?: string;
    }>,
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const created: any[] = [];
    for (const evt of events) {
      const event = await this.create(
        workspaceId,
        { ...evt, dealId },
        actorId,
        requestId,
      );
      created.push(event);
    }
    return created;
  }
}
