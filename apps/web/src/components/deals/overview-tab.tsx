'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge, Card } from '@deal-coordinator/ui';
import { api } from '@/lib/api';
import { useUnresolvedItems, useOffers, useCalendarEvents } from '@/lib/hooks';
import type { DealDetail } from '@/lib/types/deal';
import type { SignatureEnvelopeRecord, OfferRecord, CalendarEventRecord } from '@/lib/types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDealType,
  stageLabelMap,
  stageVariant,
} from '@/lib/utils';

function OpenItemsSummary({ dealId }: { dealId: string }) {
  const { data, isLoading, isError } = useUnresolvedItems(dealId);
  if (isLoading) {
    return (
      <p className="text-sm text-slate-500">Loading open items…</p>
    );
  }
  if (isError || !data) {
    return (
      <p className="text-sm text-slate-500">Could not load open items.</p>
    );
  }
  const open = data.data.filter((i) => i.status === 'open').length;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-2xl font-semibold tabular-nums text-slate-900">
        {open}
      </span>
      <span className="text-sm text-slate-600">open unresolved items</span>
      <Badge variant={open > 0 ? 'yellow' : 'green'}>
        {open > 0 ? 'Action needed' : 'Clear'}
      </Badge>
    </div>
  );
}

function SignatureStatus({ dealId }: { dealId: string }) {
  const { data: envelopes, isLoading } = useQuery({
    queryKey: ['signature-envelopes', dealId],
    queryFn: () => api.get<SignatureEnvelopeRecord[]>(`/deals/${dealId}/signature-envelopes`),
    enabled: Boolean(dealId),
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading signature status…</p>;
  }

  if (!envelopes || envelopes.length === 0) {
    return <p className="text-sm text-slate-500">No signature envelopes for this deal.</p>;
  }

  const envelopeStatusVariant: Record<string, 'gray' | 'yellow' | 'blue' | 'green' | 'purple'> = {
    draft: 'gray',
    sent: 'blue',
    partially_signed: 'yellow',
    completed: 'green',
    voided: 'gray',
  };

  return (
    <ul className="space-y-3">
      {envelopes.map((env) => (
        <li
          key={env.id}
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <div className="flex items-center justify-between">
            <Badge variant={envelopeStatusVariant[env.status] ?? 'gray'}>
              {env.status.replace(/_/g, ' ')}
            </Badge>
            <span className="text-xs text-slate-500">
              {env.sentAt ? `Sent ${formatDateTime(env.sentAt)}` : 'Not sent'}
            </span>
          </div>
          {env.completedAt && (
            <p className="mt-1 text-xs text-green-600">
              Completed {formatDateTime(env.completedAt)}
            </p>
          )}
          {env.recipientsJson && env.recipientsJson.length > 0 && (
            <div className="mt-2 space-y-1">
              {env.recipientsJson.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-slate-400">({r.role})</span>
                  {r.status && (
                    <Badge variant={r.status === 'signed' ? 'green' : 'gray'}>
                      {r.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function OffersSummary({ dealId }: { dealId: string }) {
  const { data, isLoading } = useOffers(dealId);
  if (isLoading) return <p className="text-sm text-slate-500">Loading offers…</p>;

  const offers: OfferRecord[] = Array.isArray(data) ? data : [];
  if (offers.length === 0) return null;

  const selected = offers.find((o) => o.status === 'selected' || o.status === 'accepted');
  const active = offers.filter((o) => !['rejected', 'superseded'].includes(o.status));

  return (
    <Card title="Offers">
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-semibold tabular-nums text-slate-900">{active.length}</span>
          <span className="text-sm text-slate-600">active offer{active.length !== 1 ? 's' : ''}</span>
          <Badge variant={selected ? 'green' : active.length > 0 ? 'blue' : 'gray'}>
            {selected ? 'Offer Selected' : `${active.length} Pending`}
          </Badge>
        </div>
        {selected && (
          <div className="rounded border border-green-200 bg-green-50 p-3 text-sm">
            <div className="font-medium text-green-800">
              Selected: {selected.buyerName ?? selected.offerLabel ?? 'Offer'}
            </div>
            <div className="mt-1 text-green-700">
              {selected.offerPrice ? `$${Number(selected.offerPrice).toLocaleString()}` : '—'} ·{' '}
              {selected.financingType ?? '—'} ·{' '}
              {selected.closeDate ? new Date(selected.closeDate).toLocaleDateString() : '—'}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function KeyDatesSummary({ dealId }: { dealId: string }) {
  const { data, isLoading } = useCalendarEvents(dealId);
  if (isLoading) return null;

  const events: CalendarEventRecord[] = Array.isArray(data) ? data : [];
  if (events.length === 0) return null;

  const upcoming = events
    .filter((e) => new Date(e.startDate) >= new Date() && e.status === 'active')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  if (upcoming.length === 0) return null;

  return (
    <Card title="Upcoming Key Dates">
      <ul className="space-y-2">
        {upcoming.map((evt) => {
          const daysUntil = Math.ceil(
            (new Date(evt.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          );
          return (
            <li key={evt.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={daysUntil <= 3 ? 'yellow' : 'blue'}>
                  {daysUntil}d
                </Badge>
                <span className="text-slate-700">{evt.title}</span>
              </div>
              <span className="text-xs text-slate-500">
                {new Date(evt.startDate).toLocaleDateString()}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function OverviewTab({ deal }: { deal: DealDetail }) {
  const stageLabel = stageLabelMap[deal.stage] ?? deal.stage;

  return (
    <div className="space-y-6">
      <Card title="Deal summary">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Address
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {deal.address ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              MLS number
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {deal.mlsNumber ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              List price
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {formatCurrency(deal.listPrice)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Closing date
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {formatDate(deal.closingDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Stage
            </dt>
            <dd className="mt-1">
              <Badge variant={stageVariant(deal.stage)}>{stageLabel}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Type
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {formatDealType(deal.dealType)}
            </dd>
          </div>
        </dl>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Assigned users">
          {deal.assignments.length === 0 ? (
            <p className="text-sm text-slate-500">No assignments yet.</p>
          ) : (
            <ul className="space-y-3" role="list">
              {deal.assignments.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-0.5 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm font-medium text-slate-900">
                    {a.user.name}
                  </span>
                  <span className="text-xs text-slate-500">{a.user.email}</span>
                  <Badge variant="blue" className="mt-1 w-fit">
                    {a.role.replace(/_/g, ' ')}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Parties">
          {deal.parties.length === 0 ? (
            <p className="text-sm text-slate-500">No parties on file.</p>
          ) : (
            <ul className="space-y-3" role="list">
              {deal.parties.map((p) => (
                <li
                  key={p.id}
                  className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {p.name}
                    </span>
                    <Badge variant="gray">{p.role}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {[p.email, p.phone].filter(Boolean).join(' · ') || '—'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Key dates">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">
              Created
            </dt>
            <dd className="mt-1 text-sm text-slate-800">
              {formatDate(deal.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">
              Updated
            </dt>
            <dd className="mt-1 text-sm text-slate-800">
              {formatDate(deal.updatedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">
              Closing
            </dt>
            <dd className="mt-1 text-sm text-slate-800">
              {formatDate(deal.closingDate)}
            </dd>
          </div>
        </dl>
      </Card>

      <OffersSummary dealId={deal.id} />

      <KeyDatesSummary dealId={deal.id} />

      <Card title="Open items">
        <OpenItemsSummary dealId={deal.id} />
      </Card>

      <Card title="Signature status">
        <SignatureStatus dealId={deal.id} />
      </Card>
    </div>
  );
}
