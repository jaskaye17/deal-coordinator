import { Injectable, Logger } from '@nestjs/common';
import type { CalendarProvider, ExternalCalendarEvent } from '../calendar-provider.interface';

@Injectable()
export class MicrosoftCalendarProvider implements CalendarProvider {
  readonly providerName = 'microsoft';
  private readonly logger = new Logger(MicrosoftCalendarProvider.name);

  async createEvent(
    accessToken: string,
    event: { title: string; startTime: string; endTime?: string; description?: string; attendees?: Array<{ email: string; name?: string }> },
  ): Promise<ExternalCalendarEvent> {
    const body = {
      subject: event.title,
      body: { contentType: 'text', content: event.description ?? '' },
      start: { dateTime: event.startTime, timeZone: 'Central Standard Time' },
      end: { dateTime: event.endTime ?? event.startTime, timeZone: 'Central Standard Time' },
      attendees: event.attendees?.map((a) => ({
        emailAddress: { address: a.email, name: a.name },
        type: 'required',
      })),
    };

    const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Microsoft Calendar create failed: ${res.status} ${err}`);
      throw new Error(`Microsoft Graph API error: ${res.status}`);
    }

    const data = (await res.json()) as {
      id: string;
      subject?: string;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
      body?: { content?: string };
    };
    return {
      externalId: data.id,
      title: data.subject ?? '',
      startTime: data.start?.dateTime ?? '',
      endTime: data.end?.dateTime,
      description: data.body?.content,
    };
  }

  async updateEvent(
    accessToken: string,
    externalId: string,
    updates: Partial<{ title: string; startTime: string; endTime: string; description: string }>,
  ): Promise<ExternalCalendarEvent> {
    const body: Record<string, unknown> = {};
    if (updates.title) body.subject = updates.title;
    if (updates.description) body.body = { contentType: 'text', content: updates.description };
    if (updates.startTime) body.start = { dateTime: updates.startTime, timeZone: 'Central Standard Time' };
    if (updates.endTime) body.end = { dateTime: updates.endTime, timeZone: 'Central Standard Time' };

    const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${externalId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Microsoft Calendar update failed: ${res.status}`);
    const data = (await res.json()) as {
      id: string;
      subject?: string;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
    };
    return {
      externalId: data.id,
      title: data.subject ?? '',
      startTime: data.start?.dateTime ?? '',
      endTime: data.end?.dateTime,
    };
  }

  async deleteEvent(accessToken: string, externalId: string): Promise<void> {
    await fetch(`https://graph.microsoft.com/v1.0/me/events/${externalId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}
