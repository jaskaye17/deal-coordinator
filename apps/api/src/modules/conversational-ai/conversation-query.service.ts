import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { DealStage, DealType } from '@deal-coordinator/shared';
import { workflowRegistry } from '@deal-coordinator/workflow';

const TERMINAL_STAGES = new Set<string>(['closed', 'archived']);

@Injectable()
export class ConversationQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveDeals(workspaceId: string) {
    const deals = await this.prisma.deal.findMany({
      where: {
        workspaceId,
        stage: { notIn: [...TERMINAL_STAGES] },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        dealType: true,
        stage: true,
        title: true,
        displayName: true,
        address: true,
        propertyAddress: true,
        updatedAt: true,
      },
    });
    return { deals, total: deals.length };
  }

  async getDealByAddress(workspaceId: string, query: string) {
    const q = query.trim();
    if (!q) return null;
    return this.prisma.deal.findFirst({
      where: {
        workspaceId,
        OR: [
          { address: { contains: q, mode: 'insensitive' } },
          { propertyAddress: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { fields: true },
    });
  }

  async getDealStatus(workspaceId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: { fields: true },
    });
    if (!deal) return null;

    const [
      openUnresolved,
      openExceptions,
      offerCount,
      documentCount,
    ] = await Promise.all([
      this.prisma.unresolvedItem.count({
        where: { dealId, workspaceId, status: 'open' },
      }),
      this.prisma.exception.count({
        where: {
          dealId,
          workspaceId,
          status: { notIn: ['resolved', 'closed'] },
        },
      }),
      this.prisma.offer.count({ where: { dealId, workspaceId } }),
      this.prisma.document.count({ where: { dealId, workspaceId } }),
    ]);

    const workflow = workflowRegistry.get(deal.dealType as DealType);
    const stageDef = workflow?.stages.get(deal.stage as DealStage);
    const transitions =
      stageDef?.transitions.map((t) => ({
        to: t.to,
        label: t.label ?? t.to,
      })) ?? [];

    return {
      deal: {
        id: deal.id,
        dealType: deal.dealType,
        stage: deal.stage,
        title: deal.title,
        displayName: deal.displayName,
        address: deal.address,
        propertyAddress: deal.propertyAddress,
      },
      counts: {
        unresolvedItems: openUnresolved,
        exceptions: openExceptions,
        offers: offerCount,
        documents: documentCount,
      },
      transitions,
      fields: deal.fields.map((f) => ({
        name: f.fieldName,
        value: f.fieldValue,
      })),
    };
  }

  async getBrokerInfo(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, slug: true },
    });
    if (!workspace) return null;

    const memberships = await this.prisma.workspaceMembership.findMany({
      where: { workspaceId },
      take: 20,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      workspace,
      members: memberships.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
    };
  }

  async getUpcomingDeadlines(workspaceId: string, horizonDays = 30) {
    const now = new Date();
    const until = new Date(now);
    until.setDate(until.getDate() + horizonDays);

    const [events, tasks] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where: {
          workspaceId,
          startDate: { gte: now, lte: until },
          status: { not: 'cancelled' },
        },
        orderBy: { startDate: 'asc' },
        take: 25,
        include: {
          deal: {
            select: {
              id: true,
              displayName: true,
              title: true,
              address: true,
            },
          },
        },
      }),
      this.prisma.task.findMany({
        where: {
          workspaceId,
          status: { notIn: ['done', 'completed', 'cancelled'] },
          dueDate: { gte: now, lte: until },
        },
        orderBy: { dueDate: 'asc' },
        take: 25,
        include: {
          deal: {
            select: {
              id: true,
              displayName: true,
              title: true,
            },
          },
        },
      }),
    ]);

    return {
      calendarEvents: events.map((e) => ({
        id: e.id,
        title: e.title,
        startDate: e.startDate.toISOString(),
        dealId: e.dealId,
        dealLabel:
          e.deal.displayName ?? e.deal.title ?? e.deal.address ?? e.dealId,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate?.toISOString() ?? null,
        dealId: t.dealId,
        dealLabel: t.deal.displayName ?? t.deal.title ?? t.dealId,
      })),
    };
  }

  async getMissingItems(workspaceId: string, dealId: string) {
    const items = await this.prisma.unresolvedItem.findMany({
      where: { dealId, workspaceId, status: 'open' },
      orderBy: { createdAt: 'desc' },
    });
    return {
      unresolvedItems: items.map((i) => ({
        id: i.id,
        fieldName: i.fieldName,
        question: i.question,
        type: i.type,
      })),
    };
  }
}
