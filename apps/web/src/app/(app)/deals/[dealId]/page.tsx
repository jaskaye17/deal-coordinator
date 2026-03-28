'use client';

import { Badge, Button, EmptyState, Tabs } from '@deal-coordinator/ui';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AuditTab } from '@/components/deals/audit-tab';
import { CalendarTab } from '@/components/deals/calendar-tab';
import { CommunicationsTab } from '@/components/deals/communications-tab';
import { DealQueryBar } from '@/components/deals/deal-query-bar';
import { DocumentsTab } from '@/components/deals/documents-tab';
import { ExceptionsTab } from '@/components/deals/exceptions-tab';
import { IntakeTab } from '@/components/deals/intake-tab';
import { MemoryTab } from '@/components/deals/memory-tab';
import { OffersTab } from '@/components/deals/offers-tab';
import { DealFilesTab } from '@/components/deals/deal-files-tab';
import { OverviewTab } from '@/components/deals/overview-tab';
import { TasksTab } from '@/components/deals/tasks-tab';
import { useDeal } from '@/lib/hooks';
import { ApiError } from '@/lib/api';
import { formatDealType, stageLabelMap } from '@/lib/utils';

function DealBreadcrumb({ currentLabel }: { currentLabel?: string }) {
  return (
    <nav className="mb-4 text-sm" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link href="/deals" className="font-medium text-brand-600 hover:text-brand-700">
            Deals
          </Link>
        </li>
        {currentLabel != null && currentLabel !== '' ? (
          <>
            <li aria-hidden className="select-none text-slate-300">
              /
            </li>
            <li className="min-w-0 max-w-full truncate text-slate-600" aria-current="page">
              {currentLabel}
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = typeof params.dealId === 'string' ? params.dealId : '';
  const { data: deal, isLoading, isError, error } = useDeal(dealId);

  const notFound = error instanceof ApiError && error.status === 404;

  if (!dealId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <DealBreadcrumb />
        <EmptyState title="Invalid deal" description="Missing deal id in URL." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 pb-40 pt-10">
        <DealBreadcrumb currentLabel="Loading…" />
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="h-4 w-96 rounded bg-slate-100" />
          <div className="h-64 rounded-lg bg-slate-100" />
        </div>
      </div>
    );
  }

  if (notFound || (isError && !deal)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mb-6 text-left">
          <DealBreadcrumb currentLabel={notFound ? 'Not found' : 'Error'} />
        </div>
        <EmptyState
          title="Deal not found"
          description="This deal may have been removed or the link is incorrect."
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/deals')}
            >
              Back to deals
            </Button>
          }
        />
      </div>
    );
  }

  if (isError || !deal) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <div className="mb-6">
          <DealBreadcrumb />
        </div>
        <EmptyState
          title="Something went wrong"
          description="We could not load this deal. Check workspace headers and API URL."
          action={
            <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const stageLabel = stageLabelMap[deal.stage] ?? deal.stage;

  const dealTitle =
    deal.displayName?.trim() || deal.title?.trim() || 'Untitled deal';

  return (
    <div className="mx-auto max-w-5xl px-4 pb-56 pt-10">
      <DealBreadcrumb currentLabel={dealTitle} />
      <header className="mb-8 border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{dealTitle}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {formatDealType(deal.dealType)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="gray">{stageLabel}</Badge>
            <Badge variant="blue">{formatDealType(deal.dealType)}</Badge>
          </div>
        </div>
      </header>

      <Tabs
        tabs={[
          {
            key: 'overview',
            label: 'Overview',
            content: <OverviewTab deal={deal} />,
          },
          {
            key: 'intake',
            label: 'Intake',
            content: <IntakeTab dealId={dealId} />,
          },
          {
            key: 'offers',
            label: 'Offers',
            content: <OffersTab dealId={dealId} />,
          },
          {
            key: 'documents',
            label: 'Documents',
            content: <DocumentsTab dealId={dealId} />,
          },
          {
            key: 'files',
            label: 'Files',
            content: <DealFilesTab dealId={dealId} />,
          },
          {
            key: 'communications',
            label: 'Communications',
            content: <CommunicationsTab dealId={dealId} />,
          },
          {
            key: 'tasks',
            label: 'Tasks',
            content: <TasksTab dealId={dealId} />,
          },
          {
            key: 'calendar',
            label: 'Calendar',
            content: <CalendarTab dealId={dealId} />,
          },
          {
            key: 'audit',
            label: 'Audit Log',
            content: <AuditTab dealId={dealId} />,
          },
          {
            key: 'memory',
            label: 'Memory',
            content: <MemoryTab dealId={dealId} />,
          },
          {
            key: 'exceptions',
            label: 'Exceptions',
            content: <ExceptionsTab dealId={dealId} />,
          },
        ]}
      />

      <DealQueryBar dealId={dealId} />
    </div>
  );
}
