'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type UserSimulatorPrefs = {
  agentFromE164: string | null;
};

export function useUserSimulatorPrefs() {
  return useQuery({
    queryKey: ['user-simulator'],
    queryFn: () => api.get<UserSimulatorPrefs>('/users/me/simulator'),
  });
}

export function useSaveUserSimulatorPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { agentFromE164: string }) =>
      api.put<{ success: boolean }>('/users/me/simulator', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['user-simulator'] });
    },
  });
}

export function useClearUserSimulatorPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<{ success: boolean }>('/users/me/simulator'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['user-simulator'] });
    },
  });
}
