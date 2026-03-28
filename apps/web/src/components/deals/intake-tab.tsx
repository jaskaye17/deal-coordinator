'use client';

import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
} from '@deal-coordinator/ui';
import type { TableColumn } from '@deal-coordinator/ui';
import {
  DEAL_FIELD_SOURCES,
  type DealFieldConfidence,
  type DealFieldSource,
} from '@deal-coordinator/shared';
import { useState } from 'react';
import {
  useDeal,
  useResolveUnresolvedItem,
  useUnresolvedItems,
  useUpdateDealFields,
} from '@/lib/hooks';
import type { DealFieldRow, UnresolvedItem } from '@/lib/types/deal';

function isDealFieldSource(s: string): s is DealFieldSource {
  return (DEAL_FIELD_SOURCES as readonly string[]).includes(s);
}

function sourceBadgeVariant(
  source: string,
): 'blue' | 'purple' | 'green' | 'gray' {
  switch (source) {
    case 'manual':
      return 'blue';
    case 'ai_parse':
      return 'purple';
    case 'import':
      return 'green';
    case 'system':
      return 'gray';
    default:
      return 'gray';
  }
}

function confidenceDisplay(confidence: number | null | undefined): {
  label: string;
  variant: 'green' | 'yellow' | 'red' | 'gray';
} {
  if (confidence == null) {
    return { label: 'N/A', variant: 'gray' };
  }
  if (confidence >= 0.85) return { label: 'High', variant: 'green' };
  if (confidence >= 0.5) return { label: 'Medium', variant: 'yellow' };
  return { label: 'Low', variant: 'red' };
}

function numericToConfidence(
  n: number | null | undefined,
): DealFieldConfidence {
  if (n == null) return 'medium';
  if (n >= 0.85) return 'high';
  if (n >= 0.5) return 'medium';
  return 'low';
}

function FieldRowActions({
  field,
  dealId,
}: {
  field: DealFieldRow;
  dealId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(field.fieldValue ?? '');
  const updateFields = useUpdateDealFields(dealId);

  const save = () => {
    const source: DealFieldSource = isDealFieldSource(field.source)
      ? field.source
      : 'manual';
    updateFields.mutate(
      {
        [field.fieldName]: {
          value,
          source,
          confidence: numericToConfidence(field.confidence),
        },
      },
      {
        onSuccess: () => setEditing(false),
      },
    );
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          className="min-w-[12rem] flex-1"
          inputClassName="font-mono text-xs"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            type="button"
            loading={updateFields.isPending}
            onClick={save}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="secondary"
            type="button"
            disabled={updateFields.isPending}
            onClick={() => {
              setValue(field.fieldValue ?? '');
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(true)}>
      Edit
    </Button>
  );
}

function buildFieldColumns(dealId: string): TableColumn<DealFieldRow>[] {
  return [
    {
      key: 'fieldName',
      header: 'Field name',
      render: (row) => (
        <span className="font-medium text-slate-900">{row.fieldName}</span>
      ),
    },
    {
      key: 'fieldValue',
      header: 'Value',
      render: (row) => (
        <span className="max-w-xs truncate font-mono text-xs text-slate-700">
          {row.fieldValue ?? '—'}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => (
        <Badge variant={sourceBadgeVariant(row.source)}>{row.source}</Badge>
      ),
    },
    {
      key: 'confidence',
      header: 'Confidence',
      render: (row) => {
        const c = confidenceDisplay(row.confidence);
        return <Badge variant={c.variant}>{c.label}</Badge>;
      },
    },
    {
      key: 'needsConfirmation',
      header: 'Status',
      render: (row) =>
        row.needsConfirmation ? (
          <Badge variant="yellow">Confirm</Badge>
        ) : (
          <Badge variant="green">OK</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => <FieldRowActions field={row} dealId={dealId} />,
    },
  ];
}

function unresolvedStatusVariant(
  status: string,
): 'green' | 'yellow' | 'gray' | 'red' {
  switch (status) {
    case 'open':
      return 'yellow';
    case 'resolved':
    case 'confirmed':
      return 'green';
    case 'dismissed':
      return 'gray';
    default:
      return 'gray';
  }
}

function UnresolvedCard({
  item,
  dealId,
}: {
  item: UnresolvedItem;
  dealId: string;
}) {
  const resolve = useResolveUnresolvedItem(dealId);
  const open = item.status === 'open';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-900">{item.question}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="blue">{item.type}</Badge>
        {item.suggestedValue ? (
          <span className="text-xs text-slate-600">
            Suggested:{' '}
            <span className="font-mono text-slate-800">
              {item.suggestedValue}
            </span>
          </span>
        ) : null}
        <Badge variant={unresolvedStatusVariant(item.status)}>
          {item.status}
        </Badge>
      </div>
      {open ? (
        <div className="mt-4">
          <Button
            size="sm"
            type="button"
            loading={resolve.isPending}
            onClick={() => resolve.mutate(item.id)}
          >
            Resolve
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function IntakeTab({ dealId }: { dealId: string }) {
  const dealQuery = useDeal(dealId);
  const unresolvedQuery = useUnresolvedItems(dealId);

  if (dealQuery.isLoading) {
    return <p className="text-sm text-slate-500">Loading deal fields…</p>;
  }
  if (dealQuery.isError || !dealQuery.data) {
    return (
      <EmptyState
        title="Could not load fields"
        description="Try refreshing the page."
      />
    );
  }

  const fields = dealQuery.data.fields ?? [];
  const columns = buildFieldColumns(dealId);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Deal fields
        </h2>
        {fields.length === 0 ? (
          <EmptyState
            title="No fields yet"
            description="Fields will appear as they are captured or imported."
          />
        ) : (
          <DataTable
            columns={columns}
            data={fields}
            emptyMessage="No fields."
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Unresolved items
        </h2>
        {unresolvedQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : unresolvedQuery.isError ? (
          <EmptyState title="Failed to load unresolved items" />
        ) : unresolvedQuery.data?.data.length === 0 ? (
          <EmptyState
            title="Nothing unresolved"
            description="All intake questions are cleared."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {unresolvedQuery.data?.data.map((item) => (
              <UnresolvedCard key={item.id} item={item} dealId={dealId} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
