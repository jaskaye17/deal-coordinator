'use client';

import {
  Badge,
  Button,
  Card,
  DataTable,
  Drawer,
  EmptyState,
} from '@deal-coordinator/ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { NewDealForm } from '@/components/deals/new-deal-form';
import { StageBadge } from '@/components/deals/stage-badge';
import { useDeals } from '@/lib/hooks';
import type { Deal } from '@/lib/types';
import { dealTypeLabelMap, formatDate } from '@/lib/utils';

function dealTypeVariant(
  t: string,
): 'blue' | 'purple' | 'gray' | 'green' | 'yellow' {
  if (t === 'listing') return 'blue';
  if (t === 'buyer_rep') return 'purple';
  if (t === 'contract_to_close') return 'green';
  return 'gray';
}

export default function DealsPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isFetching } = useDeals();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const deals = data?.data ?? [];

  const columns = useMemo(
    () => [
      {
        key: 'title',
        header: 'Deal',
        render: (row: Deal) =>
          row.displayName?.trim() || row.title?.trim() || '—',
      },
      {
        key: 'dealType',
        header: 'Type',
        render: (row: Deal) => (
          <Badge variant={dealTypeVariant(row.dealType)}>
            {dealTypeLabelMap[row.dealType] ?? row.dealType}
          </Badge>
        ),
      },
      {
        key: 'stage',
        header: 'Stage',
        render: (row: Deal) => <StageBadge stage={row.stage} />,
      },
      {
        key: 'address',
        header: 'Address',
        render: (row: Deal) => row.address?.trim() || '—',
      },
      {
        key: 'createdAt',
        header: 'Created',
        render: (row: Deal) => formatDate(row.createdAt),
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Deals
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              All deals in this workspace.
            </p>
          </div>
          <div className="h-10 w-28 animate-pulse rounded-md bg-slate-200" />
        </div>
        <div className="mt-8 h-64 animate-pulse rounded-lg border border-slate-100 bg-slate-100/80" />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Deals
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              All deals in this workspace.
            </p>
          </div>
        </div>
        <Card className="mt-8">
          <p className="text-sm text-slate-600">
            {error instanceof Error ? error.message : 'Failed to load deals.'}
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

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Deals
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            All deals in this workspace.
            {data?.meta != null ? (
              <span className="text-slate-400">
                {' '}
                · {data.meta.total} total
              </span>
            ) : null}
          </p>
        </div>
        <Button type="button" onClick={() => setDrawerOpen(true)}>
          New Deal
        </Button>
      </div>

      <div className="mt-8">
        {deals.length === 0 ? (
          <Card>
            <EmptyState
              title="No deals yet"
              description="Create a deal to start tracking intake, documents, and exceptions."
              action={
                <Button type="button" onClick={() => setDrawerOpen(true)}>
                  New Deal
                </Button>
              }
            />
          </Card>
        ) : (
          <DataTable<Deal>
            columns={columns}
            data={deals}
            onRowClick={(row) => router.push(`/deals/${row.id}`)}
          />
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="New deal"
      >
        <NewDealForm onCancel={() => setDrawerOpen(false)} />
      </Drawer>
    </div>
  );
}
