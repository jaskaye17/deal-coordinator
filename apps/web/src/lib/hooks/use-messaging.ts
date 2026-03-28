'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { communicationsQueryKey } from '@/lib/hooks/use-deal-data';

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { dealId: string; channel: string; recipient: string; content: string }) =>
      api.post('/messages/send', body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: communicationsQueryKey(vars.dealId) });
    },
  });
}

export function useGeneratePdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, ...body }: { dealId: string; templateId: string; fieldData: Record<string, string> }) =>
      api.post(`/deals/${dealId}/generate-pdf`, body),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ['documents', vars.dealId] }),
  });
}
