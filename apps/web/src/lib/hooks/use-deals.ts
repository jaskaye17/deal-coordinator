'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { CreateDealInput, Deal, DealsListResponse } from '@/lib/types';
import type { DealDetail } from '@/lib/types/deal';

export function dealQueryKey(dealId: string) {
  return ['deal', dealId] as const;
}

export function useDeals(
  params?: {
    page?: number;
    pageSize?: number;
    stage?: string;
    dealType?: string;
  },
) {
  return useQuery({
    queryKey: ['deals', params],
    queryFn: () => api.get<DealsListResponse>('/deals', params),
  });
}

export function useDeal(dealId: string) {
  return useQuery({
    queryKey: dealQueryKey(dealId),
    queryFn: () => api.get<DealDetail>(`/deals/${dealId}`),
    enabled: Boolean(dealId),
    retry: (count, err) => {
      if (err instanceof ApiError && err.status === 404) return false;
      return count < 2;
    },
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDealInput) => api.post<Deal>('/deals', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['deals'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateDeal(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch<Deal>(`/deals/${dealId}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dealQueryKey(dealId) });
      void queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useTransitionDeal(dealId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { targetStage: string; reason?: string }) =>
      api.post<Deal>(`/deals/${dealId}/transition`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dealQueryKey(dealId) });
      void queryClient.invalidateQueries({ queryKey: ['deals'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
