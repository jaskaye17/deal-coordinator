'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { OfferRecord, OfferComparison, AcceptanceResult, DocumentRecord } from '@/lib/types';

export function useOffers(dealId: string) {
  return useQuery({
    queryKey: ['offers', dealId],
    queryFn: async () => {
      const res = await api.get<{ items: OfferRecord[]; meta: Record<string, unknown> }>(
        `/deals/${dealId}/offers`,
      );
      return (res as any).items ?? (res as any).data ?? res;
    },
    enabled: Boolean(dealId),
  });
}

export function useOffer(offerId: string) {
  return useQuery({
    queryKey: ['offer', offerId],
    queryFn: () => api.get<OfferRecord>(`/offers/${offerId}`),
    enabled: Boolean(offerId),
  });
}

export function useOfferComparison(dealId: string) {
  return useQuery({
    queryKey: ['offer-comparison', dealId],
    queryFn: () => api.get<OfferComparison>(`/deals/${dealId}/offers/compare`),
    enabled: Boolean(dealId),
  });
}

export function useCreateOffer(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<OfferRecord>(`/deals/${dealId}/offers`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['offers', dealId] });
      void qc.invalidateQueries({ queryKey: ['offer-comparison', dealId] });
      void qc.invalidateQueries({ queryKey: ['deal', dealId] });
    },
  });
}

export function useOfferAction(offerId: string, dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: { type: 'shortlist' | 'select' | 'reject'; notes?: string }) =>
      api.post<OfferRecord>(`/offers/${offerId}/${action.type}`, { notes: action.notes }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['offers', dealId] });
      void qc.invalidateQueries({ queryKey: ['offer', offerId] });
      void qc.invalidateQueries({ queryKey: ['offer-comparison', dealId] });
      void qc.invalidateQueries({ queryKey: ['deal', dealId] });
    },
  });
}

export function usePrepareAcceptance(offerId: string, dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<AcceptanceResult>(`/offers/${offerId}/prepare-acceptance`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['offers', dealId] });
      void qc.invalidateQueries({ queryKey: ['offer', offerId] });
      void qc.invalidateQueries({ queryKey: ['acceptance-documents', dealId] });
      void qc.invalidateQueries({ queryKey: ['deal', dealId] });
    },
  });
}

export function useAcceptanceDocuments(dealId: string) {
  return useQuery({
    queryKey: ['acceptance-documents', dealId],
    queryFn: () => api.get<DocumentRecord[]>(`/deals/${dealId}/acceptance-documents`),
    enabled: Boolean(dealId),
  });
}
