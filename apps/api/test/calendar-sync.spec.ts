import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalendarSyncService } from '../src/modules/calendar-sync/calendar-sync.service';

const mockPrisma = {
  userConnection: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  calendarEvent: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const mockAudit = {
  create: vi.fn().mockResolvedValue(undefined),
};

const mockGoogleProvider = {
  providerName: 'google',
  createEvent: vi.fn().mockResolvedValue({
    externalId: 'google-event-123',
    title: 'Closing',
    startTime: '2025-08-15T10:00:00Z',
  }),
  updateEvent: vi.fn().mockResolvedValue({
    externalId: 'google-event-123',
    title: 'Updated Closing',
    startTime: '2025-08-20T10:00:00Z',
  }),
  deleteEvent: vi.fn().mockResolvedValue(undefined),
};

const mockMicrosoftProvider = {
  providerName: 'microsoft',
  createEvent: vi.fn().mockResolvedValue({
    externalId: 'outlook-event-456',
    title: 'Inspection',
    startTime: '2025-07-10T14:00:00Z',
  }),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
};

function createService() {
  return new CalendarSyncService(
    mockPrisma as any,
    mockAudit as any,
    mockGoogleProvider as any,
    mockMicrosoftProvider as any,
  );
}

describe('CalendarSyncService', () => {
  let service: CalendarSyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createService();
  });

  describe('syncEventToExternal', () => {
    it('creates a new Google Calendar event when no externalId', async () => {
      mockPrisma.userConnection.findUnique.mockResolvedValue({
        accessToken: 'google-token-xyz',
      });

      mockPrisma.calendarEvent.findUnique.mockResolvedValue({
        id: 'cal-1',
        title: 'Closing Date',
        startDate: new Date('2025-08-15T10:00:00Z'),
        endDate: null,
        description: 'Deal closing',
        externalId: null,
        externalProvider: null,
      });

      mockPrisma.calendarEvent.update.mockResolvedValue({});

      const result = await service.syncEventToExternal('user-1', 'cal-1', 'google');

      expect(mockGoogleProvider.createEvent).toHaveBeenCalledWith(
        'google-token-xyz',
        expect.objectContaining({ title: 'Closing Date' }),
      );
      expect(mockPrisma.calendarEvent.update).toHaveBeenCalledWith({
        where: { id: 'cal-1' },
        data: { externalId: 'google-event-123', externalProvider: 'google' },
      });
      expect(result.externalId).toBe('google-event-123');
    });

    it('updates existing Google Calendar event when externalId matches provider', async () => {
      mockPrisma.userConnection.findUnique.mockResolvedValue({
        accessToken: 'google-token-xyz',
      });

      mockPrisma.calendarEvent.findUnique.mockResolvedValue({
        id: 'cal-2',
        title: 'Updated Event',
        startDate: new Date('2025-08-20T10:00:00Z'),
        endDate: null,
        description: null,
        externalId: 'google-event-123',
        externalProvider: 'google',
      });

      mockPrisma.calendarEvent.update.mockResolvedValue({});

      const result = await service.syncEventToExternal('user-1', 'cal-2', 'google');

      expect(mockGoogleProvider.updateEvent).toHaveBeenCalledWith(
        'google-token-xyz',
        'google-event-123',
        expect.objectContaining({ title: 'Updated Event' }),
      );
    });

    it('creates Microsoft Calendar event', async () => {
      mockPrisma.userConnection.findUnique.mockResolvedValue({
        accessToken: 'ms-token-abc',
      });

      mockPrisma.calendarEvent.findUnique.mockResolvedValue({
        id: 'cal-3',
        title: 'Inspection',
        startDate: new Date('2025-07-10T14:00:00Z'),
        endDate: new Date('2025-07-10T16:00:00Z'),
        description: 'Home inspection',
        externalId: null,
        externalProvider: null,
      });

      mockPrisma.calendarEvent.update.mockResolvedValue({});

      const result = await service.syncEventToExternal('user-1', 'cal-3', 'microsoft');

      expect(mockMicrosoftProvider.createEvent).toHaveBeenCalled();
      expect(result.externalId).toBe('outlook-event-456');
    });

    it('returns null when user has no connection', async () => {
      mockPrisma.userConnection.findUnique.mockResolvedValue(null);

      const result = await service.syncEventToExternal('user-1', 'cal-1', 'google');
      expect(result).toBeNull();
    });

    it('throws for unknown provider', async () => {
      await expect(
        service.syncEventToExternal('user-1', 'cal-1', 'yahoo'),
      ).rejects.toThrow('Unknown calendar provider');
    });
  });

  describe('connectProvider', () => {
    it('upserts user connection', async () => {
      mockPrisma.userConnection.upsert.mockResolvedValue({
        id: 'conn-1',
        userId: 'user-1',
        provider: 'google',
      });

      const result = await service.connectProvider('user-1', 'google', {
        accessToken: 'new-token',
        refreshToken: 'refresh-token',
      });

      expect(mockPrisma.userConnection.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_provider: { userId: 'user-1', provider: 'google' } },
        }),
      );
    });
  });

  describe('getConnections', () => {
    it('lists user connections', async () => {
      mockPrisma.userConnection.findMany.mockResolvedValue([
        { id: 'conn-1', provider: 'google' },
        { id: 'conn-2', provider: 'microsoft' },
      ]);

      const result = await service.getConnections('user-1');
      expect(result).toHaveLength(2);
    });
  });
});
