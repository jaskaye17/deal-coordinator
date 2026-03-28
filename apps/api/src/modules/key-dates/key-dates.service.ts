import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CalendarEventsService } from '../calendar-events/calendar-events.service';
import { AppError } from '@deal-coordinator/shared';

export interface ExtractedKeyDate {
  eventType: string;
  title: string;
  date: string;
  source: string;
}

@Injectable()
export class KeyDatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly calendarEventsService: CalendarEventsService,
  ) {}

  async extractAndCreateEvents(
    workspaceId: string,
    dealId: string,
    actorId: string,
    requestId: string,
  ) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: {
        fields: true,
        offers: { where: { status: { in: ['selected', 'accepted'] } }, take: 1 },
      },
    });

    if (!deal) {
      throw new AppError('NOT_FOUND', 404, 'Deal not found');
    }

    const offer = deal.offers[0];
    const fieldMap: Record<string, string | null> = {};
    for (const f of deal.fields) fieldMap[f.fieldName] = f.fieldValue;

    const keyDates = this.extractKeyDates(offer, fieldMap);

    const eventInputs = keyDates.map((kd) => ({
      eventType: kd.eventType,
      title: kd.title,
      description: `Source: ${kd.source}`,
      startDate: kd.date,
      sourceType: 'key_date_extraction' as const,
      sourceId: offer?.id ?? dealId,
    }));

    const events = await this.calendarEventsService.createBatch(
      workspaceId,
      dealId,
      eventInputs,
      actorId,
      requestId,
    );

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'key_dates_extracted',
      objectType: 'Deal',
      objectId: dealId,
      actorType: 'user',
      actorId,
      after: { keyDates, eventIds: events.map((e: any) => e.id) },
      requestId,
    });

    return { keyDates, events };
  }

  extractKeyDates(
    offer: any | undefined,
    fieldMap: Record<string, string | null>,
  ): ExtractedKeyDate[] {
    const dates: ExtractedKeyDate[] = [];
    const today = new Date();

    if (offer?.closeDate) {
      dates.push({
        eventType: 'closing_date',
        title: 'Closing Date',
        date: new Date(offer.closeDate).toISOString().split('T')[0]!,
        source: 'offer',
      });
    } else if (fieldMap.closing_date) {
      dates.push({
        eventType: 'closing_date',
        title: 'Closing Date',
        date: fieldMap.closing_date,
        source: 'deal_field',
      });
    }

    if (offer?.optionPeriodDays != null && offer.optionPeriodDays > 0) {
      const contractDate = offer.receivedAt ?? offer.createdAt ?? today;
      const optionDeadline = new Date(contractDate);
      optionDeadline.setDate(optionDeadline.getDate() + offer.optionPeriodDays);
      dates.push({
        eventType: 'option_deadline',
        title: `Option Period Deadline (${offer.optionPeriodDays} days)`,
        date: optionDeadline.toISOString().split('T')[0]!,
        source: 'offer',
      });
    }

    if (offer?.earnestMoney && offer.earnestMoney > 0) {
      const contractDate = offer.receivedAt ?? offer.createdAt ?? today;
      const emDeadline = new Date(contractDate);
      emDeadline.setDate(emDeadline.getDate() + 3);
      dates.push({
        eventType: 'earnest_money_deadline',
        title: 'Earnest Money Deposit Deadline',
        date: emDeadline.toISOString().split('T')[0]!,
        source: 'calculated',
      });
    }

    if (offer?.financingType && offer.financingType !== 'cash') {
      const contractDate = offer.receivedAt ?? offer.createdAt ?? today;
      const financingDeadline = new Date(contractDate);
      financingDeadline.setDate(financingDeadline.getDate() + 21);
      dates.push({
        eventType: 'financing_deadline',
        title: 'Financing Contingency Deadline',
        date: financingDeadline.toISOString().split('T')[0]!,
        source: 'calculated',
      });

      const appraisalDeadline = new Date(contractDate);
      appraisalDeadline.setDate(appraisalDeadline.getDate() + 14);
      dates.push({
        eventType: 'appraisal_deadline',
        title: 'Appraisal Deadline',
        date: appraisalDeadline.toISOString().split('T')[0]!,
        source: 'calculated',
      });
    }

    return dates;
  }
}
