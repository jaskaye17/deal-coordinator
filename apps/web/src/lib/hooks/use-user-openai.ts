'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type UserOpenAIStatus = {
  configured: boolean;
  model: string | null;
};

export const OPENAI_MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o mini (recommended)' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
] as const;

export function useUserOpenAIStatus() {
  return useQuery({
    queryKey: ['user-openai'],
    queryFn: () => api.get<UserOpenAIStatus>('/users/me/openai'),
  });
}

export function useSaveUserOpenAI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { apiKey: string; model?: string }) =>
      api.put<{ success: boolean }>('/users/me/openai', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['user-openai'] });
    },
  });
}

export function useClearUserOpenAI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<{ success: boolean }>('/users/me/openai'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['user-openai'] });
    },
  });
}
