'use client';

import { useState } from 'react';
import { Badge, Button, Card, EmptyState, Select, Textarea } from '@deal-coordinator/ui';
import { useReviewTasks, useReviewAction } from '@/lib/hooks';
import { formatDate } from '@/lib/utils';
import type { ReviewTaskRecord } from '@/lib/types';

type BadgeVariant = 'gray' | 'yellow' | 'blue' | 'green' | 'purple' | 'red';

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'yellow' },
  approved: { label: 'Approved', variant: 'green' },
  rejected: { label: 'Rejected', variant: 'red' },
  changes_requested: { label: 'Changes Requested', variant: 'blue' },
  on_hold: { label: 'On Hold', variant: 'gray' },
};

function statusBadge(status: string) {
  const cfg = STATUS_BADGE[status] ?? { label: status.replace(/_/g, ' '), variant: 'gray' as BadgeVariant };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function humanize(s: string) {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function ReviewDetail({ task, onClose }: { task: ReviewTaskRecord; onClose: () => void }) {
  const [notes, setNotes] = useState('');
  const actions = useReviewAction(task.id);

  const handleAction = (action: 'approve' | 'reject' | 'requestChanges' | 'hold') => {
    actions[action].mutate(notes || undefined, {
      onSuccess: () => {
        setNotes('');
        onClose();
      },
    });
  };

  const anyPending =
    actions.approve.isPending ||
    actions.reject.isPending ||
    actions.requestChanges.isPending ||
    actions.hold.isPending;

  return (
    <div className="space-y-4 border-t border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <span className="text-xs font-medium uppercase text-slate-500">Object Type</span>
          <p className="text-slate-900">{humanize(task.objectType)}</p>
        </div>
        <div>
          <span className="text-xs font-medium uppercase text-slate-500">Action Type</span>
          <p className="text-slate-900">{humanize(task.actionType)}</p>
        </div>
        {task.deal && (
          <div className="sm:col-span-2">
            <span className="text-xs font-medium uppercase text-slate-500">Deal</span>
            <p className="text-slate-900">
              {task.deal.title || task.deal.address || task.deal.id}
            </p>
          </div>
        )}
        {task.reviewNotes && (
          <div className="sm:col-span-2">
            <span className="text-xs font-medium uppercase text-slate-500">Previous Notes</span>
            <p className="text-slate-700">{task.reviewNotes}</p>
          </div>
        )}
        {task.payloadJson && (
          <div className="sm:col-span-2">
            <span className="text-xs font-medium uppercase text-slate-500">Payload</span>
            <pre className="mt-1 max-h-40 overflow-auto rounded bg-white p-2 text-xs text-slate-700 border border-slate-200">
              {JSON.stringify(task.payloadJson, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div>
        <Textarea
          placeholder="Review notes (optional)…"
          value={notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={anyPending}
          onClick={() => handleAction('approve')}
        >
          {actions.approve.isPending ? 'Approving…' : 'Approve'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={anyPending}
          onClick={() => handleAction('requestChanges')}
        >
          Request Changes
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={anyPending}
          onClick={() => handleAction('hold')}
        >
          Hold
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={anyPending}
          onClick={() => handleAction('reject')}
        >
          Reject
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          Close
        </Button>
      </div>

      {(actions.approve.isError || actions.reject.isError || actions.requestChanges.isError || actions.hold.isError) && (
        <p className="text-sm text-red-600">Action failed. Please try again.</p>
      )}
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'changes_requested', label: 'Changes Requested' },
  { value: 'on_hold', label: 'On Hold' },
];

const ACTION_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'approve_document', label: 'Approve Document' },
  { value: 'approve_field_change', label: 'Approve Field Change' },
  { value: 'approve_exception', label: 'Approve Exception' },
  { value: 'approve_communication', label: 'Approve Communication' },
];

export default function ReviewQueuePage() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const params: { status?: string; actionType?: string } = {};
  if (statusFilter) params.status = statusFilter;
  if (actionTypeFilter) params.actionType = actionTypeFilter;

  const { data, isLoading, isError } = useReviewTasks(Object.keys(params).length > 0 ? params : undefined);

  const tasks: ReviewTaskRecord[] = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl pb-20">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
        />
        <Select
          options={ACTION_TYPE_OPTIONS}
          value={actionTypeFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setActionTypeFilter(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Could not load review tasks"
          description="Check your connection and try again."
        />
      ) : tasks.length === 0 ? (
        <Card>
          <EmptyState
            title="No review tasks"
            description="Nothing to review right now. Adjust your filters or check back later."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto_auto] gap-x-4 border-b border-slate-200 pb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              <span>Deal</span>
              <span>Action</span>
              <span>Object</span>
              <span>Status</span>
              <span>Created</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <div key={task.id}>
                  <div
                    className="grid cursor-pointer grid-cols-[1fr_1fr_1fr_auto_auto_auto] items-center gap-x-4 py-3 text-sm transition-colors hover:bg-slate-50"
                    onClick={() =>
                      setExpandedId(expandedId === task.id ? null : task.id)
                    }
                  >
                    <span className="truncate font-medium text-slate-900">
                      {task.deal?.title || task.deal?.address || task.dealId.slice(0, 8)}
                    </span>
                    <span className="text-slate-600">
                      {humanize(task.actionType)}
                    </span>
                    <span className="text-slate-600">
                      {humanize(task.objectType)}
                    </span>
                    <span>{statusBadge(task.status)}</span>
                    <span className="text-slate-500">
                      {formatDate(task.createdAt)}
                    </span>
                    <span className="text-xs text-brand-600">
                      {expandedId === task.id ? 'Collapse' : 'Review'}
                    </span>
                  </div>
                  {expandedId === task.id && (
                    <ReviewDetail
                      task={task}
                      onClose={() => setExpandedId(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
