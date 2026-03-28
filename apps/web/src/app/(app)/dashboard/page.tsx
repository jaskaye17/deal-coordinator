'use client';

import {
  ActivityFeed,
  Button,
  Card,
  StatCard,
} from '@deal-coordinator/ui';
import { useDashboard } from '@/lib/hooks';
import type { AuditEvent } from '@/lib/types';

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg border border-slate-100 bg-slate-100/80"
          />
        ))}
      </div>
      <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-slate-100" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="size-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-2/3 max-w-xs animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useDashboard();

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of deals and recent activity.
        </p>
        <div className="mt-8">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <Card className="mt-8">
          <p className="text-sm text-slate-600">
            {error instanceof Error ? error.message : 'Failed to load dashboard.'}
          </p>
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refetch()}
              loading={isFetching}
            >
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const feedItems = data.recentActivity.map((ev: AuditEvent) => ({
    id: ev.id,
    title: ev.action,
    description: ev.objectType,
    timestamp: ev.createdAt,
    actor: ev.actorId,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Overview of deals and recent activity.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Deals" value={data.totalDeals} />
        <StatCard label="Awaiting Info" value={data.awaitingInfoCount} />
        <StatCard label="Open Exceptions" value={data.openExceptionsCount} />
        <StatCard
          label="Recent Actions"
          value={data.recentActivity.length}
        />
      </div>

      <div className="mt-8">
        <Card
          title="Recent activity"
          description="Latest audit events across your workspace."
        >
          {feedItems.length === 0 ? (
            <p className="text-sm text-slate-500">No recent activity yet.</p>
          ) : (
            <ActivityFeed items={feedItems} className="pt-1" />
          )}
        </Card>
      </div>
    </div>
  );
}
