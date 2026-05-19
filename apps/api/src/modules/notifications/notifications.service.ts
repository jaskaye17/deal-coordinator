import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '@deal-coordinator/shared';

export interface NotificationPayload {
  recipientName: string;
  recipientEmail: string;
  recipientRole: string;
  subject: string;
  body: string;
  dealId: string;
  offerId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async notifyTitle(
    workspaceId: string,
    dealId: string,
    actorId: string,
    requestId: string,
    overrides?: { recipientName?: string; recipientEmail?: string },
  ): Promise<any> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: { fields: true, parties: true, offers: { where: { status: { in: ['selected', 'accepted'] } } } },
    });

    if (!deal) {
      throw new AppError('NOT_FOUND', 404, 'Deal not found');
    }

    const titleParty = deal.parties.find((p) => p.role === 'title_company' || p.role === 'escrow');
    const recipientName = overrides?.recipientName ?? titleParty?.name ?? 'Title Company';
    const recipientEmail = overrides?.recipientEmail ?? titleParty?.email ?? 'title@example.com';

    const selectedOffer = deal.offers[0];
    const fieldMap: Record<string, string | null> = {};
    for (const f of deal.fields) fieldMap[f.fieldName] = f.fieldValue;

    const content = this.buildTitleNotification(deal, selectedOffer, fieldMap);
    const subject = `New Executed Contract – ${fieldMap.property_address ?? deal.title ?? dealId}`;

    const communication = await this.prisma.communication.create({
      data: {
        workspaceId,
        dealId,
        direction: 'outbound',
        type: 'email',
        senderName: 'Deal Coordinator System',
        content,
        metadata: {
          notificationType: 'title_company',
          subject,
          recipientName,
          recipientEmail,
          recipientRole: 'title_company',
          offerId: selectedOffer?.id,
        },
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'title_notified',
      objectType: 'Communication',
      objectId: communication.id,
      actorType: 'user',
      actorId,
      after: { recipientName, recipientEmail, communicationId: communication.id },
      requestId,
    });

    return communication;
  }

  async notifyLender(
    workspaceId: string,
    dealId: string,
    actorId: string,
    requestId: string,
    overrides?: { recipientName?: string; recipientEmail?: string },
  ): Promise<any> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: { fields: true, parties: true, offers: { where: { status: { in: ['selected', 'accepted'] } } } },
    });

    if (!deal) {
      throw new AppError('NOT_FOUND', 404, 'Deal not found');
    }

    const lenderParty = deal.parties.find((p) => p.role === 'lender' || p.role === 'mortgage_broker');
    const recipientName = overrides?.recipientName ?? lenderParty?.name ?? 'Lender';
    const recipientEmail = overrides?.recipientEmail ?? lenderParty?.email ?? 'lender@example.com';

    const selectedOffer = deal.offers[0];
    const fieldMap: Record<string, string | null> = {};
    for (const f of deal.fields) fieldMap[f.fieldName] = f.fieldValue;

    const content = this.buildLenderNotification(deal, selectedOffer, fieldMap);
    const subject = `Executed Contract Notification – ${fieldMap.property_address ?? deal.title ?? dealId}`;

    const communication = await this.prisma.communication.create({
      data: {
        workspaceId,
        dealId,
        direction: 'outbound',
        type: 'email',
        senderName: 'Deal Coordinator System',
        content,
        metadata: {
          notificationType: 'lender',
          subject,
          recipientName,
          recipientEmail,
          recipientRole: 'lender',
          offerId: selectedOffer?.id,
        },
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'lender_notified',
      objectType: 'Communication',
      objectId: communication.id,
      actorType: 'user',
      actorId,
      after: { recipientName, recipientEmail, communicationId: communication.id },
      requestId,
    });

    return communication;
  }

  private buildTitleNotification(deal: any, offer: any, fields: Record<string, string | null>): string {
    const lines = [
      'Dear Title Company,',
      '',
      `We are pleased to inform you that a purchase contract has been executed for:`,
      '',
      `Property: ${fields.property_address ?? deal.title ?? '(address pending)'}`,
      `Seller: ${fields.seller_name ?? '(pending)'}`,
      `Buyer: ${offer?.buyerName ?? '(pending)'}`,
      `Purchase Price: ${offer?.offerPrice ? `$${Number(offer.offerPrice).toLocaleString()}` : '(pending)'}`,
      `Earnest Money: ${offer?.earnestMoney ? `$${Number(offer.earnestMoney).toLocaleString()}` : '(pending)'}`,
      `Closing Date: ${offer?.closeDate ? new Date(offer.closeDate).toISOString().split('T')[0] : '(pending)'}`,
      '',
      'Please prepare the title commitment and coordinate closing logistics.',
      '',
      'Thank you,',
      'Deal Coordinator System',
    ];
    return lines.join('\n');
  }

  private buildLenderNotification(deal: any, offer: any, fields: Record<string, string | null>): string {
    const lines = [
      'Dear Lender,',
      '',
      `We are notifying you that a purchase contract has been executed for:`,
      '',
      `Property: ${fields.property_address ?? deal.title ?? '(address pending)'}`,
      `Buyer: ${offer?.buyerName ?? '(pending)'}`,
      `Purchase Price: ${offer?.offerPrice ? `$${Number(offer.offerPrice).toLocaleString()}` : '(pending)'}`,
      `Financing Type: ${offer?.financingType ?? '(pending)'}`,
      `Closing Date: ${offer?.closeDate ? new Date(offer.closeDate).toISOString().split('T')[0] : '(pending)'}`,
      '',
      'Please begin the loan process and coordinate with the buyer and title company.',
      '',
      'Thank you,',
      'Deal Coordinator System',
    ];
    return lines.join('\n');
  }
}
