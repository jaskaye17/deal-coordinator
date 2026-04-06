import { Injectable, Logger } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import type { FilesService } from '../files/files.service';
import { generateDealName } from '@deal-coordinator/shared';
import { reserveUniqueDealSlug } from '../deals/deal-slug.util';
import type { MessagingProvider, InboundMessage } from './messaging-provider.interface';
import type { TwilioProvider } from './providers/twilio.provider';
import type { TwilioWhatsAppProvider } from './providers/twilio-whatsapp.provider';
import type { BlueBubblesProvider } from './providers/bluebubbles.provider';

/** Per-user practice deal created for the phone simulator (title includes user id). */
export const SANDBOX_DEAL_TITLE_PREFIX = 'Sandbox — phone simulator';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly providers: Map<string, MessagingProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly filesService: FilesService,
    private readonly twilioProvider: TwilioProvider,
    private readonly whatsappProvider: TwilioWhatsAppProvider,
    private readonly blueBubblesProvider: BlueBubblesProvider,
  ) {
    this.providers = new Map<string, MessagingProvider>([
      ['sms', twilioProvider],
      ['whatsapp', whatsappProvider],
      ['imessage', blueBubblesProvider],
    ]);
  }

  async sendMessage(
    workspaceId: string,
    dealId: string,
    channel: string,
    recipient: string,
    content: string,
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const provider = this.providers.get(channel);
    if (!provider) {
      throw new Error(`No messaging provider for channel: ${channel}`);
    }

    const result = await provider.sendMessage({ to: recipient, body: content });

    const communication = await this.prisma.communication.create({
      data: {
        workspaceId,
        dealId,
        direction: 'outbound',
        type: channel === 'sms' ? 'text' : channel,
        senderName: 'System',
        senderId: actorId,
        content,
        metadata: {
          channel,
          externalMessageId: result.messageId,
          status: result.status,
          recipient,
        },
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'message_received',
      objectType: 'Communication',
      objectId: communication.id,
      actorType: 'user',
      actorId,
      after: { channel, recipient, status: result.status },
      requestId,
    });

    return { communication, externalMessageId: result.messageId, status: result.status };
  }

  async handleInbound(
    message: InboundMessage,
    workspaceId: string,
    requestId: string,
    ctx?: { userId?: string },
  ): Promise<any> {
    if (!workspaceId) {
      this.logger.warn('handleInbound: missing workspaceId');
      return { communication: null, dealId: null };
    }

    const deal = await this.resolveInboundDeal(workspaceId, message, ctx);

    if (!deal) {
      this.logger.warn(`Inbound message from ${message.from}: no deal matched for workspace`);
      return { communication: null, dealId: null };
    }

    const communication = await this.prisma.communication.create({
      data: {
        workspaceId,
        dealId: deal.id,
        direction: 'inbound',
        type: message.channel === 'sms' ? 'text' : message.channel,
        senderName: message.from,
        content: message.body,
        metadata: {
          channel: message.channel,
          externalId: message.externalId,
          from: message.from,
          to: message.to,
          ...message.metadata,
        },
      },
    });

    await this.auditService.create({
      workspaceId,
      dealId: deal.id,
      action: 'message_received',
      objectType: 'Communication',
      objectId: communication.id,
      actorType: 'user',
      actorId: 'inbound',
      after: { channel: message.channel, from: message.from },
      requestId,
    });

    return { communication, dealId: deal.id };
  }

  /**
   * Explicit dealId from metadata (tests / tools), then simulated + signed-in user → sandbox thread,
   * else party match on From (production-style webhooks).
   */
  private async resolveInboundDeal(
    workspaceId: string,
    message: InboundMessage,
    ctx?: { userId?: string },
  ): Promise<any> {
    const raw = message.metadata?.dealId;
    const explicitId = typeof raw === 'string' && raw.trim() ? raw.trim() : null;
    if (explicitId) {
      const byId = await this.prisma.deal.findFirst({
        where: { id: explicitId, workspaceId },
      });
      if (byId) return byId;
      this.logger.warn(`Inbound explicit dealId ${explicitId} not found in workspace`);
    }

    const meta = message.metadata as { simulated?: boolean } | undefined;
    const userId = ctx?.userId;
    if (userId && meta?.simulated === true) {
      return this.getOrCreateSandboxDeal(workspaceId, userId);
    }

    return this.findDealByContact(workspaceId, message.from);
  }

  private sandboxTitle(userId: string): string {
    return `${SANDBOX_DEAL_TITLE_PREFIX} (${userId})`;
  }

  private async getOrCreateSandboxDeal(workspaceId: string, userId: string): Promise<any> {
    const title = this.sandboxTitle(userId);
    let deal = await this.prisma.deal.findFirst({
      where: { workspaceId, title },
    });
    if (!deal) {
      const named = generateDealName({
        primaryContactName: 'Phone Simulator',
        propertyAddress: title,
      });
      const slug = await reserveUniqueDealSlug(this.prisma.deal, workspaceId, named.slug);
      deal = await this.prisma.deal.create({
        data: {
          workspaceId,
          dealType: 'listing',
          stage: 'new_intake',
          title,
          displayName: named.displayName,
          slug,
          propertyAddress: title,
          primaryContactName: 'Phone Simulator',
          description: 'Practice intake from the phone simulator; safe to delete.',
        },
      });
      await this.filesService.ensureDefaultDealFolders(
        workspaceId,
        deal.id,
        userId,
        'messaging-sandbox',
        'default',
      );
    }
    const existingAssign = await this.prisma.dealAssignment.findFirst({
      where: { dealId: deal.id, userId, role: 'primary_agent' },
    });
    if (!existingAssign) {
      await this.prisma.dealAssignment.create({
        data: { dealId: deal.id, userId, role: 'primary_agent' },
      });
    }
    return deal;
  }

  private async findDealByContact(workspaceId: string, contactInfo: string): Promise<any> {
    const party = await this.prisma.dealParty.findFirst({
      where: {
        workspaceId,
        OR: [
          { phone: { contains: contactInfo.replace(/\D/g, '').slice(-10) } },
          { email: contactInfo },
        ],
      },
      include: { deal: true },
    });

    return party?.deal ?? null;
  }
}
