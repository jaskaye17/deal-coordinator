'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CalendarEventRecord } from '@/lib/types';

export function useCalendarEvents(dealId: string) {
  return useQuery({
    queryKey: ['calendar-events', dealId],
    queryFn: async () => {
      const res = await api.get<{ items: CalendarEventRecord[]; meta: Record<string, unknown> }>(
        `/deals/${dealId}/calendar-events`,
      );
      return (res as any).items ?? (res as any).data ?? res;
    },
    enabled: Boolean(dealId),
  });
}

export function useCreateCalendarEvent(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      eventType?: string;
      title: string;
      description?: string;
      startDate: string;
      endDate?: string;
    }) => api.post<CalendarEventRecord>(`/deals/${dealId}/calendar-events`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['calendar-events', dealId] });
    },
  });
}

export function useExtractKeyDates(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ keyDates: unknown[]; events: CalendarEventRecord[] }>(
        `/deals/${dealId}/extract-key-dates`,
        {},
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['calendar-events', dealId] });
      void qc.invalidateQueries({ queryKey: ['deal', dealId] });
    },
  });
}

export function useNotifyTitle(dealId: string) {
  return useMutation({
    mutationFn: (body?: { recipientName?: string; recipientEmail?: string }) =>
      api.post(`/deals/${dealId}/notify-title`, body ?? {}),
  });
}

export function useNotifyLender(dealId: string) {
  return useMutation({
    mutationFn: (body?: { recipientName?: string; recipientEmail?: string }) =>
      api.post(`/deals/${dealId}/notify-lender`, body ?? {}),
  });
}
