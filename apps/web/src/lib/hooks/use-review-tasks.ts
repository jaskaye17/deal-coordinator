'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ReviewTaskRecord } from '@/lib/types';

export function useReviewTasks(params?: { status?: string; actionType?: string; dealId?: string }) {
  return useQuery({
    queryKey: ['review-tasks', params],
    queryFn: () => api.get<{ data: ReviewTaskRecord[]; meta: Record<string, unknown> }>('/review-tasks', params as Record<string, string>),
  });
}

export function useReviewTask(id: string) {
  return useQuery({
    queryKey: ['review-task', id],
    queryFn: () => api.get<ReviewTaskRecord>(`/review-tasks/${id}`),
    enabled: Boolean(id),
  });
}

export function useReviewAction(id: string) {
  const qc = useQueryClient();
  return {
    approve: useMutation({
      mutationFn: (notes?: string) => api.post(`/review-tasks/${id}/approve`, { notes }),
      onSuccess: () => { void qc.invalidateQueries({ queryKey: ['review-tasks'] }); void qc.invalidateQueries({ queryKey: ['review-task', id] }); },
    }),
    reject: useMutation({
      mutationFn: (notes?: string) => api.post(`/review-tasks/${id}/reject`, { notes }),
      onSuccess: () => { void qc.invalidateQueries({ queryKey: ['review-tasks'] }); void qc.invalidateQueries({ queryKey: ['review-task', id] }); },
    }),
    requestChanges: useMutation({
      mutationFn: (notes?: string) => api.post(`/review-tasks/${id}/request-changes`, { notes }),
      onSuccess: () => { void qc.invalidateQueries({ queryKey: ['review-tasks'] }); void qc.invalidateQueries({ queryKey: ['review-task', id] }); },
    }),
    hold: useMutation({
      mutationFn: (notes?: string) => api.post(`/review-tasks/${id}/hold`, { notes }),
      onSuccess: () => { void qc.invalidateQueries({ queryKey: ['review-tasks'] }); void qc.invalidateQueries({ queryKey: ['review-task', id] }); },
    }),
  };
}
