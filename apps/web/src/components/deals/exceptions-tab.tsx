'use client';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Textarea,
} from '@deal-coordinator/ui';
import { useState } from 'react';
import { useExceptions, useUpdateException } from '@/lib/hooks';
import type { DealException } from '@/lib/types/deal';
import { formatDateTime } from '@/lib/utils';

function severityVariant(
  s: string,
): 'blue' | 'yellow' | 'orange' | 'red' | 'gray' {
  switch (s) {
    case 'low':
      return 'blue';
    case 'medium':
      return 'yellow';
    case 'high':
      return 'orange';
    case 'critical':
      return 'red';
    default:
      return 'gray';
  }
}

function exceptionStatusVariant(
  s: string,
): 'red' | 'yellow' | 'green' | 'gray' {
  switch (s) {
    case 'detected':
      return 'red';
    case 'question_sent':
    case 'awaiting_response':
      return 'yellow';
    case 'resolved':
      return 'green';
    case 'closed':
      return 'gray';
    default:
      return 'gray';
  }
}

function isOpenException(e: DealException) {
  return e.status !== 'resolved' && e.status !== 'closed';
}

function ExceptionCard({ ex }: { ex: DealException }) {
  const update = useUpdateException(ex.id);
  const [resolution, setResolution] = useState('');
  const [showResolve, setShowResolve] = useState(false);
  const open = isOpenException(ex);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{ex.title}</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant={severityVariant(ex.severity)}>{ex.severity}</Badge>
          <Badge variant={exceptionStatusVariant(ex.status)}>{ex.status}</Badge>
        </div>
      </div>
      {ex.description ? (
        <p className="mt-2 text-sm text-slate-600">{ex.description}</p>
      ) : null}
      <p className="mt-2 text-xs text-slate-400">
        {formatDateTime(ex.createdAt)}
      </p>
      {ex.resolution ? (
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-medium text-slate-800">Resolution: </span>
          {ex.resolution}
        </p>
      ) : null}
      {open ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {showResolve ? (
            <div className="space-y-3">
              <Textarea
                label="Resolution"
                placeholder="Describe how this was resolved…"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  type="button"
                  loading={update.isPending}
                  onClick={() =>
                    update.mutate(
                      {
                        status: 'resolved',
                        resolution: resolution.trim() || undefined,
                      },
                      {
                        onSuccess: () => {
                          setShowResolve(false);
                          setResolution('');
                        },
                      },
                    )
                  }
                >
                  Submit resolution
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  disabled={update.isPending}
                  onClick={() => {
                    setShowResolve(false);
                    setResolution('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              type="button"
              variant="secondary"
              onClick={() => setShowResolve(true)}
            >
              Resolve
            </Button>
          )}
        </div>
      ) : null}
    </Card>
  );
}

export function ExceptionsTab({ dealId }: { dealId: string }) {
  const { data, isLoading, isError } = useExceptions(dealId);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading exceptions…</p>;
  }
  if (isError || !data) {
    return (
      <EmptyState
        title="Could not load exceptions"
        description="Try again later."
      />
    );
  }

  if (data.data.length === 0) {
    return (
      <EmptyState
        title="No exceptions"
        description="Exceptions and blockers for this deal appear here."
      />
    );
  }

  return (
    <ul className="space-y-4" role="list">
      {data.data.map((ex) => (
        <li key={ex.id}>
          <ExceptionCard ex={ex} />
        </li>
      ))}
    </ul>
  );
}
