export interface ExternalCalendarEvent {
  externalId: string;
  title: string;
  startTime: string;
  endTime?: string;
  description?: string;
  attendees?: Array<{ email: string; name?: string }>;
}

export interface CalendarProvider {
  readonly providerName: string;
  createEvent(
    accessToken: string,
    event: {
      title: string;
      startTime: string;
      endTime?: string;
      description?: string;
      attendees?: Array<{ email: string; name?: string }>;
    },
  ): Promise<ExternalCalendarEvent>;

  updateEvent(
    accessToken: string,
    externalId: string,
    updates: Partial<{
      title: string;
      startTime: string;
      endTime: string;
      description: string;
    }>,
  ): Promise<ExternalCalendarEvent>;

  deleteEvent(accessToken: string, externalId: string): Promise<void>;
}
