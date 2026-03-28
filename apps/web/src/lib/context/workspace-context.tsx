'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { STORAGE_USER, STORAGE_WORKSPACE } from '@/lib/api';

type WorkspaceContextValue = {
  workspaceId: string | null;
  userId: string | null;
  setWorkspace: (workspaceId: string, userId: string) => void;
  clearWorkspace: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setWorkspaceId(localStorage.getItem(STORAGE_WORKSPACE));
    setUserId(localStorage.getItem(STORAGE_USER));
  }, []);

  const setWorkspace = useCallback(
    (nextWorkspaceId: string, nextUserId: string) => {
      const prevWorkspaceId = localStorage.getItem(STORAGE_WORKSPACE);
      const prevUserId = localStorage.getItem(STORAGE_USER);

      localStorage.setItem(STORAGE_WORKSPACE, nextWorkspaceId);
      localStorage.setItem(STORAGE_USER, nextUserId);
      setWorkspaceId(nextWorkspaceId);
      setUserId(nextUserId);

      if (prevWorkspaceId !== nextWorkspaceId || prevUserId !== nextUserId) {
        void queryClient.resetQueries();
      }
    },
    [queryClient],
  );

  const clearWorkspace = useCallback(() => {
    localStorage.removeItem(STORAGE_WORKSPACE);
    localStorage.removeItem(STORAGE_USER);
    setWorkspaceId(null);
    setUserId(null);
    void queryClient.resetQueries();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      workspaceId,
      userId,
      setWorkspace,
      clearWorkspace,
    }),
    [workspaceId, userId, setWorkspace, clearWorkspace],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}
