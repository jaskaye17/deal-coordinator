'use client';

import { useMemo, useState } from 'react';
import { EmptyState } from '@deal-coordinator/ui';
import {
  useDealFolders,
  useFolderFiles,
  type DealFolderTreeNode,
} from '@/lib/hooks/use-deal-files';

function collectFolders(nodes: DealFolderTreeNode[], depth = 0): { node: DealFolderTreeNode; depth: number }[] {
  const out: { node: DealFolderTreeNode; depth: number }[] = [];
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.children?.length) {
      out.push(...collectFolders(n.children, depth + 1));
    }
  }
  return out;
}

export interface DealFilesTabProps {
  dealId: string;
}

export function DealFilesTab({ dealId }: DealFilesTabProps) {
  const { data: roots, isLoading, isError } = useDealFolders(dealId);
  const flat = useMemo(() => (roots?.length ? collectFolders(roots) : []), [roots]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const effectiveFolderId = selectedId ?? flat[0]?.node.id ?? null;
  const { data: files, isLoading: filesLoading } = useFolderFiles(effectiveFolderId);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3 rounded-lg border border-slate-200 bg-white p-6">
        <div className="h-4 w-48 rounded bg-slate-100" />
        <div className="h-40 rounded bg-slate-50" />
      </div>
    );
  }

  if (isError || !roots?.length) {
    return (
      <EmptyState
        title="No folders yet"
        description="Folders are created when the deal is created. Try refreshing or contact support if this persists."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Folders
        </h3>
        <ul className="max-h-[420px] space-y-0.5 overflow-y-auto text-sm">
          {flat.map(({ node, depth }) => {
            const active = node.id === effectiveFolderId;
            const count = node._count?.files ?? 0;
            return (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(node.id)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors ${
                    active ? 'bg-brand-50 text-brand-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
                >
                  <span className="min-w-0 truncate">{node.name}</span>
                  <span className="ml-2 shrink-0 tabular-nums text-xs text-slate-400">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Files in folder</h3>
        {filesLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-3/4 rounded bg-slate-50" />
          </div>
        ) : !files?.length ? (
          <p className="text-sm text-slate-500">No files in this folder.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
                <span className="font-medium text-slate-800">{f.fileName}</span>
                <span className="text-xs text-slate-400">
                  {f.assetType ? f.assetType.replace(/_/g, ' ') : f.mimeType ?? 'file'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
