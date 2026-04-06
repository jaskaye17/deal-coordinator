import { Injectable, Logger } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import type { GoogleCalendarProvider } from './providers/google-calendar.provider';
import type { MicrosoftCalendarProvider } from './providers/microsoft-calendar.provider';
import type { CalendarProvider } from './calendar-provider.interface';

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);
  private readonly providers: Map<string, CalendarProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly googleProvider: GoogleCalendarProvider,
    private readonly microsoftProvider: MicrosoftCalendarProvider,
  ) {
    this.providers = new Map<string, CalendarProvider>([
      ['google', googleProvider],
      ['microsoft', microsoftProvider],
    ]);
  }

  async syncEventToExternal(
    userId: string,
    calendarEventId: string,
    provider: string,
  ): Promise<any> {
    const calProvider = this.providers.get(provider);
    if (!calProvider) throw new Error(`Unknown calendar provider: ${provider}`);

    const connection = await this.prisma.userConnection.findUnique({
      where: { userId_provider: { userId, provider } },
    });

    if (!connection?.accessToken) {
      this.logger.warn(`No ${provider} connection for user ${userId}`);
      return null;
    }

    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: calendarEventId },
    });

    if (!event) throw new Error('Calendar event not found');

    if (event.externalId && event.externalProvider === provider) {
      const updated = await calProvider.updateEvent(connection.accessToken, event.externalId, {
        title: event.title,
        startTime: event.startDate.toISOString(),
        endTime: event.endDate?.toISOString(),
        description: event.description ?? undefined,
      });

      await this.prisma.calendarEvent.update({
        where: { id: calendarEventId },
        data: { externalId: updated.externalId, externalProvider: provider },
      });

      return updated;
    }

    const created = await calProvider.createEvent(connection.accessToken, {
      title: event.title,
      startTime: event.startDate.toISOString(),
      endTime: event.endDate?.toISOString(),
      description: event.description ?? undefined,
    });

    await this.prisma.calendarEvent.update({
      where: { id: calendarEventId },
      data: { externalId: created.externalId, externalProvider: provider },
    });

    return created;
  }

  async connectProvider(
    userId: string,
    provider: string,
    tokens: { accessToken: string; refreshToken?: string; expiresAt?: Date; externalId?: string },
  ): Promise<any> {
    return this.prisma.userConnection.upsert({
      where: { userId_provider: { userId, provider } },
      create: {
        userId,
        provider,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        externalId: tokens.externalId,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        externalId: tokens.externalId,
      },
    });
  }

  async getConnections(userId: string): Promise<any> {
    return this.prisma.userConnection.findMany({
      where: { userId },
      select: { id: true, provider: true, externalId: true, createdAt: true, expiresAt: true },
    });
  }
}
