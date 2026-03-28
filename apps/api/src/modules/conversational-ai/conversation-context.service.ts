import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Structured context only — not raw transcript. */
export type StructuredConversationContext = {
  workspaceId: string;
  focusDealId?: string;
  deal?: {
    id: string;
    dealType: string;
    stage: string;
    displayName: string | null;
    title: string | null;
    address: string | null;
    propertyAddress: string | null;
  };
  /** Short summaries of last few messages (truncated), optional */
  recentSummaries: string[];
  yearBuilt?: number | null;
};

@Injectable()
export class ConversationContextService {
  constructor(private readonly prisma: PrismaService) {}

  async build(params: {
    workspaceId: string;
    dealId?: string;
    maxRecentMessages?: number;
  }): Promise<StructuredConversationContext> {
    const { workspaceId, dealId, maxRecentMessages = 3 } = params;

    const recentSummaries: string[] = [];
    if (dealId) {
      const comms = await this.prisma.communication.findMany({
        where: { workspaceId, dealId },
        orderBy: { createdAt: 'desc' },
        take: maxRecentMessages,
        select: { content: true, direction: true },
      });
      for (const c of comms.reverse()) {
        const prefix = c.direction === 'inbound' ? 'User' : 'Team';
        const text = c.content.replace(/\s+/g, ' ').trim();
        recentSummaries.push(
          `${prefix}: ${text.length > 100 ? `${text.slice(0, 97)}…` : text}`,
        );
      }
    }

    if (!dealId) {
      return { workspaceId, recentSummaries };
    }

    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: {
        fields: { where: { fieldName: 'year_built' }, take: 1 },
      },
    });

    if (!deal) {
      return { workspaceId, focusDealId: dealId, recentSummaries };
    }

    const yb = deal.fields[0]?.fieldValue;
    let yearBuilt: number | null = null;
    if (yb) {
      const n = parseInt(yb, 10);
      yearBuilt = Number.isFinite(n) ? n : null;
    }

    return {
      workspaceId,
      focusDealId: deal.id,
      deal: {
        id: deal.id,
        dealType: deal.dealType,
        stage: deal.stage,
        displayName: deal.displayName,
        title: deal.title,
        address: deal.address,
        propertyAddress: deal.propertyAddress,
      },
      recentSummaries,
      yearBuilt,
    };
  }
}
