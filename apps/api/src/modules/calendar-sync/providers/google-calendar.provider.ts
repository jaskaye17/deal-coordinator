import { Injectable, Logger } from '@nestjs/common';
import type { CalendarProvider, ExternalCalendarEvent } from '../calendar-provider.interface';

@Injectable()
export class GoogleCalendarProvider implements CalendarProvider {
  readonly providerName = 'google';
  private readonly logger = new Logger(GoogleCalendarProvider.name);

  async createEvent(
    accessToken: string,
    event: { title: string; startTime: string; endTime?: string; description?: string; attendees?: Array<{ email: string; name?: string }> },
  ): Promise<ExternalCalendarEvent> {
    const body = {
      summary: event.title,
      description: event.description,
      start: { dateTime: event.startTime, timeZone: 'America/Chicago' },
      end: { dateTime: event.endTime ?? event.startTime, timeZone: 'America/Chicago' },
      attendees: event.attendees?.map((a) => ({ email: a.email, displayName: a.name })),
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Google Calendar create failed: ${res.status} ${err}`);
      throw new Error(`Google Calendar API error: ${res.status}`);
    }

    const data = (await res.json()) as {
      id: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      description?: string;
    };
    return {
      externalId: data.id,
      title: data.summary ?? '',
      startTime: data.start?.dateTime ?? data.start?.date ?? '',
      endTime: data.end?.dateTime ?? data.end?.date,
      description: data.description,
    };
  }

  async updateEvent(
    accessToken: string,
    externalId: string,
    updates: Partial<{ title: string; startTime: string; endTime: string; description: string }>,
  ): Promise<ExternalCalendarEvent> {
    const body: Record<string, unknown> = {};
    if (updates.title) body.summary = updates.title;
    if (updates.description) body.description = updates.description;
    if (updates.startTime) body.start = { dateTime: updates.startTime, timeZone: 'America/Chicago' };
    if (updates.endTime) body.end = { dateTime: updates.endTime, timeZone: 'America/Chicago' };

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${externalId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Google Calendar update failed: ${res.status}`);
    const data = (await res.json()) as {
      id: string;
      summary?: string;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
    };
    return {
      externalId: data.id,
      title: data.summary ?? '',
      startTime: data.start?.dateTime ?? '',
      endTime: data.end?.dateTime,
    };
  }

  async deleteEvent(accessToken: string, externalId: string): Promise<void> {
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${externalId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}
