'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MessagingSimulateResult {
  simulatedMessage: { id: string; to: string; body: string; timestamp: string; direction: string };
  processingResult: {
    processed: boolean;
    dealId?: string;
    inferredDealId?: string;
    intent?: string;
    fieldsExtracted?: string[];
    response?: string;
    reason?: string;
  };
}

export function useSimulateMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      from: string;
      message: string;
      dealId?: string;
      channel?: string;
      useLLM?: boolean;
    }) => api.post<MessagingSimulateResult>('/debug/messaging/simulate', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debug-history'] }),
  });
}

export function useDebugHistory() {
  return useQuery({
    queryKey: ['debug-history'],
    queryFn: () => api.get<Array<{ id: string; to: string; body: string; timestamp: string; direction: string }>>('/debug/messaging/history'),
    refetchInterval: 3000,
  });
}

export function useClearDebugHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/debug/messaging/history'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debug-history'] }),
  });
}
