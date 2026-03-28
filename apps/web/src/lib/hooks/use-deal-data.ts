'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { dealQueryKey } from '@/lib/hooks/use-deals';
import type {
  AuditEvent,
  Communication,
  DealException,
  DealQueryResponse,
  MemoryEntry,
  Paginated,
  UnresolvedItem,
} from '@/lib/types/deal';
import type { DealFieldConfidence, DealFieldSource } from '@deal-coordinator/shared';

export function auditEventsQueryKey(dealId: string) {
  return ['audit-events', dealId] as const;
}

export function useAuditEvents(dealId: string, pageSize = 100) {
  return useQuery({
    queryKey: [...auditEventsQueryKey(dealId), pageSize],
    queryFn: () =>
      api.get<Paginated<AuditEvent>>(`/deals/${dealId}/audit-events`, {
        page: 1,
        pageSize,
      }),
    enabled: Boolean(dealId),
  });
}

export function unresolvedItemsQueryKey(dealId: string) {
  return ['unresolved-items', dealId] as const;
}

export function useUnresolvedItems(dealId: string, pageSize = 100) {
  return useQuery({
    queryKey: [...unresolvedItemsQueryKey(dealId), pageSize],
    queryFn: () =>
      api.get<Paginated<UnresolvedItem>>(`/deals/${dealId}/unresolved-items`, {
        page: 1,
        pageSize,
      }),
    enabled: Boolean(dealId),
  });
}

export function communicationsQueryKey(dealId: string) {
  return ['communications', dealId] as const;
}

export function useCommunications(dealId: string, pageSize = 200) {
  return useQuery({
    queryKey: [...communicationsQueryKey(dealId), pageSize],
    queryFn: () =>
      api.get<Paginated<Communication>>(`/deals/${dealId}/communications`, {
        page: 1,
        pageSize,
      }),
    enabled: Boolean(dealId),
  });
}

export function memoryEntriesQueryKey(dealId: string) {
  return ['memory-entries', dealId] as const;
}

export function useMemoryEntries(dealId: string, pageSize = 100) {
  return useQuery({
    queryKey: [...memoryEntriesQueryKey(dealId), pageSize],
    queryFn: () =>
      api.get<Paginated<MemoryEntry>>(`/deals/${dealId}/memory`, {
        page: 1,
        pageSize,
      }),
    enabled: Boolean(dealId),
  });
}

export function exceptionsQueryKey(dealId: string) {
  return ['exceptions', dealId] as const;
}

export function useExceptions(dealId: string, pageSize = 100) {
  return useQuery({
    queryKey: [...exceptionsQueryKey(dealId), pageSize],
    queryFn: () =>
      api.get<Paginated<DealException>>(`/deals/${dealId}/exceptions`, {
        page: 1,
        pageSize,
      }),
    enabled: Boolean(dealId),
  });
}

export function useCreateMemory(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { content: string; category?: string }) =>
      api.post(`/deals/${dealId}/memory`, {
        content: body.content,
        scope: 'deal',
        category: body.category,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: memoryEntriesQueryKey(dealId) });
    },
  });
}

export function useUpdateMemory(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      content?: string;
      category?: string;
    }) =>
      api.patch(`/memory/${vars.id}`, {
        content: vars.content,
        category: vars.category,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: memoryEntriesQueryKey(dealId) });
    },
  });
}

export function useUpdateException(exceptionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { status: string; resolution?: string }) =>
      api.patch(`/exceptions/${exceptionId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['exceptions'] });
    },
  });
}

export function useDealQuery(dealId: string) {
  return useMutation({
    mutationFn: (question: string) =>
      api.post<DealQueryResponse>(`/deals/${dealId}/query`, { question }),
  });
}

export function useUpdateDealFields(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<
      string,
      { value: unknown; source: DealFieldSource; confidence: DealFieldConfidence }
    >) => api.patch(`/deals/${dealId}/fields`, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: dealQueryKey(dealId) });
    },
  });
}

export function useResolveUnresolvedItem(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/unresolved-items/${id}`, { status: 'resolved' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: unresolvedItemsQueryKey(dealId) });
      void qc.invalidateQueries({ queryKey: dealQueryKey(dealId) });
    },
  });
}
