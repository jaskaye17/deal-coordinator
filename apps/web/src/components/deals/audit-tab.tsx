'use client';

import { ActivityFeed, EmptyState } from '@deal-coordinator/ui';
import type { ActivityFeedItem } from '@deal-coordinator/ui';
import { useAuditEvents } from '@/lib/hooks';
import { humanizeAuditAction } from '@/lib/utils';
import { useMemo } from 'react';

function JsonDetails({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  return (
    <details className="mt-2 rounded-md border border-slate-200 bg-slate-50/80 text-left">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-slate-600">
        {label}
      </summary>
      <pre className="max-h-48 overflow-auto border-t border-slate-200 p-3 text-xs text-slate-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export function AuditTab({ dealId }: { dealId: string }) {
  const { data, isLoading, isError } = useAuditEvents(dealId);

  const items: ActivityFeedItem[] = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((ev) => ({
      id: ev.id,
      title: humanizeAuditAction(ev.action),
      timestamp: ev.createdAt,
      actor: (
        <span>
          {ev.actorType} · <span className="font-mono">{ev.actorId}</span>
        </span>
      ),
      description: (
        <div>
          <p className="text-xs text-slate-500">
            {ev.objectType}{' '}
            <span className="font-mono">{ev.objectId}</span>
          </p>
          {ev.before != null ? (
            <JsonDetails label="Before" value={ev.before} />
          ) : null}
          {ev.after != null ? (
            <JsonDetails label="After" value={ev.after} />
          ) : null}
        </div>
      ),
    }));
  }, [data]);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading audit log…</p>;
  }
  if (isError || !data) {
    return (
      <EmptyState
        title="Could not load audit events"
        description="Try again in a moment."
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No audit events"
        description="Activity on this deal will be recorded here."
      />
    );
  }

  return <ActivityFeed items={items} />;
}
