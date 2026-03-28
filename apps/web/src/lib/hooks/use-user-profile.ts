'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ResponsibleBrokerRow = {
  id: string;
  name: string;
  licenseNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
};

export type UserSettingsProfile = {
  user: { id: string; email: string; name: string };
  broker: {
    company: string;
    market: string;
    licenseNumber: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
    responsibleBrokerId: string;
  };
  agent: {
    phone: string;
    licenseNumber: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  responsibleBrokers: ResponsibleBrokerRow[];
};

export type UserProfilePatch = {
  name?: string;
  company?: string;
  market?: string;
  phone?: string;
  licenseNumber?: string;
  brokerLicenseNumber?: string;
  brokerAddress?: string;
  brokerCity?: string;
  brokerState?: string;
  brokerZip?: string;
  brokerPhone?: string;
  brokerEmail?: string;
  responsibleBrokerId?: string;
  agentAddress?: string;
  agentCity?: string;
  agentState?: string;
  agentZip?: string;
};

export type CreateResponsibleBrokerBody = {
  name: string;
  licenseNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
};

export function userProfileQueryKey(workspaceId: string | null) {
  return ['auth', 'profile', workspaceId] as const;
}

export function useUserProfile(workspaceId: string | null) {
  return useQuery({
    queryKey: userProfileQueryKey(workspaceId),
    queryFn: () => api.get<UserSettingsProfile>('/users/me/profile'),
    enabled: Boolean(workspaceId),
  });
}

export function usePatchUserProfile(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UserProfilePatch) => {
      if (!workspaceId) {
        throw new Error('No workspace selected');
      }
      return api.patch<UserSettingsProfile>('/users/me/profile', patch);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: userProfileQueryKey(workspaceId) });
      void qc.invalidateQueries({ queryKey: ['auth-me'] });
    },
  });
}

export function useCreateResponsibleBroker(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateResponsibleBrokerBody) => {
      if (!workspaceId) {
        throw new Error('No workspace selected');
      }
      return api.post<ResponsibleBrokerRow>('/users/me/responsible-brokers', body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: userProfileQueryKey(workspaceId) });
    },
  });
}
