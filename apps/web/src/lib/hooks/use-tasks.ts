'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TaskRecord } from '@/lib/types';

export function useTasks(dealId: string) {
  return useQuery({
    queryKey: ['tasks', dealId],
    queryFn: () => api.get<TaskRecord[]>(`/deals/${dealId}/tasks`),
    enabled: Boolean(dealId),
  });
}

export function useUpdateTask(taskId: string, dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch<TaskRecord>(`/tasks/${taskId}`, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['tasks', dealId] }); },
  });
}

export function useActivateListingPrep(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<TaskRecord[]>(`/deals/${dealId}/checklists/activate-listing-prep`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks', dealId] });
      void qc.invalidateQueries({ queryKey: ['deal', dealId] });
    },
  });
}
