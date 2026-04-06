import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '@deal-coordinator/shared';
import type { DealType, DealStage } from '@deal-coordinator/shared';
import { workflowRegistry } from '@deal-coordinator/workflow';

@Injectable()
export class DealQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async query(
    workspaceId: string,
    dealId: string,
    question: string,
  ): Promise<{ answer: string; data: any }> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
    });

    if (!deal) {
      throw new AppError('NOT_FOUND', 404, 'Deal not found');
    }

    const lower = question.toLowerCase();

    if (lower.includes("what's next") || lower.includes('next step')) {
      return this.getNextSteps(deal);
    }

    if (lower.includes('waiting on') || lower.includes('missing')) {
      return this.getWaitingOn(workspaceId, dealId);
    }

    if (lower.includes('exception') || lower.includes('blocker')) {
      return this.getBlockers(workspaceId, dealId);
    }

    if (lower.includes('status') || lower.includes('summary')) {
      return this.getSummary(workspaceId, dealId, deal);
    }

    return this.getSummary(workspaceId, dealId, deal);
  }

  private async getNextSteps(deal: any): Promise<{ answer: string; data: any }> {
    const workflow = workflowRegistry.get(deal.dealType as DealType);
    if (!workflow) {
      return {
        answer: `No workflow defined for deal type "${deal.dealType}".`,
        data: { currentStage: deal.stage, transitions: [] },
      };
    }

    const stageDef = workflow.stages.get(deal.stage as DealStage);
    const transitions =
      stageDef?.transitions.map((t) => ({
        to: t.to,
        label: t.label,
      })) ?? [];

    const transitionLabels = transitions.map((t) => t.label ?? t.to).join(', ');
    const answer = transitions.length > 0
      ? `Current stage: ${deal.stage}. Available next steps: ${transitionLabels}.`
      : `Current stage: ${deal.stage}. No transitions available (terminal stage).`;

    return { answer, data: { currentStage: deal.stage, transitions } };
  }

  private async getWaitingOn(
    workspaceId: string,
    dealId: string,
  ): Promise<{ answer: string; data: any }> {
    const items = await this.prisma.unresolvedItem.findMany({
      where: { dealId, workspaceId, status: 'open' },
      orderBy: { createdAt: 'desc' },
    });

    if (items.length === 0) {
      return {
        answer: 'No open unresolved items. All information has been provided.',
        data: { unresolvedItems: [] },
      };
    }

    const descriptions = items
      .map((i) => `- ${i.fieldName ?? 'item'}: ${i.question}`)
      .join('\n');

    return {
      answer: `Waiting on ${items.length} item(s):\n${descriptions}`,
      data: { unresolvedItems: items },
    };
  }

  private async getBlockers(
    workspaceId: string,
    dealId: string,
  ): Promise<{ answer: string; data: any }> {
    const exceptions = await this.prisma.exception.findMany({
      where: {
        dealId,
        workspaceId,
        status: { notIn: ['resolved', 'closed'] },
      },
      orderBy: { severity: 'desc' },
    });

    if (exceptions.length === 0) {
      return {
        answer: 'No open exceptions or blockers.',
        data: { exceptions: [] },
      };
    }

    const descriptions = exceptions
      .map((e) => `- [${e.severity}] ${e.title}`)
      .join('\n');

    return {
      answer: `${exceptions.length} open exception(s):\n${descriptions}`,
      data: { exceptions },
    };
  }

  private async getSummary(
    workspaceId: string,
    dealId: string,
    deal: any,
  ): Promise<{ answer: string; data: any }> {
    const [fields, partyCount, openItemsCount, openExceptionsCount] =
      await Promise.all([
        this.prisma.dealField.findMany({
          where: { dealId, workspaceId },
        }),
        this.prisma.dealParty.count({ where: { dealId, workspaceId } }),
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
      ]);

    const fieldSummary = fields
      .map((f) => `${f.fieldName}: ${f.fieldValue ?? 'N/A'}`)
      .join(', ');

    const answer = [
      `Deal: ${deal.title ?? deal.id}`,
      `Type: ${deal.dealType} | Stage: ${deal.stage}`,
      `Parties: ${partyCount} | Open items: ${openItemsCount} | Exceptions: ${openExceptionsCount}`,
      fieldSummary ? `Fields: ${fieldSummary}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      answer,
      data: {
        deal,
        fields,
        partyCount,
        openItemsCount,
        openExceptionsCount,
      },
    };
  }
}
