'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useConnections() {
  return useQuery({
    queryKey: ['integrations', 'connections'],
    queryFn: () =>
      api.get<Array<{ id: string; provider: string; externalId: string | null; createdAt: string; expiresAt: string | null }>>('/integrations/connections'),
  });
}

export function useConnectCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { provider: string; accessToken: string; refreshToken?: string; expiresAt?: string }) =>
      api.post('/integrations/calendar/connect', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

export function useSyncCalendarEvent() {
  return useMutation({
    mutationFn: ({ eventId, provider }: { eventId: string; provider: string }) =>
      api.post(`/calendar-events/${eventId}/sync`, { provider }),
  });
}
