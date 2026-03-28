'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Card } from '@deal-coordinator/ui';
import { api } from '@/lib/api';
import { useWorkspace } from '@/lib/context/workspace-context';

type MeWorkspace = { id: string; name: string; slug: string; role: string };

type MeResponse = {
  id: string;
  name: string;
  email: string;
  workspaces: MeWorkspace[];
};

type WorkspaceResponse = {
  id: string;
  name: string;
};

export function TopBar({ title }: { title: string }) {
  const { workspaceId, userId, setWorkspace } = useWorkspace();
  const router = useRouter();
  const [showSwitcher, setShowSwitcher] = useState(false);

  const { data: workspace } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api.get<WorkspaceResponse>(`/workspaces/${workspaceId}`),
    enabled: Boolean(workspaceId),
  });

  const { data: me } = useQuery({
    queryKey: ['auth-me', userId],
    queryFn: () => api.get<MeResponse>('/auth/me'),
    enabled: Boolean(userId),
  });

  const hasMultipleWorkspaces = me?.workspaces && me.workspaces.length > 1;

  function switchToWorkspace(ws: MeWorkspace) {
    if (!me) return;
    setWorkspace(ws.id, me.id);
    setShowSwitcher(false);
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="relative sticky top-0 z-40">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h1>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <button
            type="button"
            className="hidden text-right sm:block"
            onClick={() => hasMultipleWorkspaces && setShowSwitcher(!showSwitcher)}
            title={hasMultipleWorkspaces ? 'Switch workspace' : undefined}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Workspace</p>
            <p className="flex items-center gap-1 font-medium text-slate-800">
              {workspace?.name ?? (workspaceId ? '…' : '—')}
              {hasMultipleWorkspaces && (
                <svg className="size-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              )}
            </p>
          </button>
          <div className="h-8 w-px bg-slate-200" aria-hidden />
          <div className="flex items-center gap-2">
            <span
              className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-brand-700"
              aria-hidden
            >
              {(me?.name ?? me?.email ?? '?').slice(0, 1).toUpperCase()}
            </span>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate font-medium text-slate-800">{me?.name ?? 'User'}</p>
              <p className="truncate text-xs text-slate-500">{me?.email ?? userId ?? ''}</p>
            </div>
          </div>
        </div>
      </header>

      {showSwitcher && me?.workspaces && (
        <div className="absolute right-6 top-full z-50 mt-px w-72">
          <Card className="border-slate-200 shadow-lg">
            <div className="space-y-1">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Your workspaces</p>
              {me.workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => switchToWorkspace(ws)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                    ws.id === workspaceId ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <p className="font-medium">{ws.name}</p>
                    <p className="text-xs text-slate-500">{ws.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ws.id === workspaceId ? 'green' : 'gray'}>{ws.role}</Badge>
                    {ws.id === workspaceId && (
                      <svg className="size-4 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>
          <button
            type="button"
            className="fixed inset-0 z-[-1]"
            onClick={() => setShowSwitcher(false)}
            aria-label="Close workspace switcher"
          />
        </div>
      )}
    </div>
  );
}
