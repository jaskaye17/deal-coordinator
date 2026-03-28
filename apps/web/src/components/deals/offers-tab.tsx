'use client';

import { useState } from 'react';
import { Badge, Button, Card, EmptyState } from '@deal-coordinator/ui';
import {
  useOffers,
  useCreateOffer,
  useOfferAction,
  usePrepareAcceptance,
} from '@/lib/hooks';
import type { OfferRecord } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { OfferComparisonView } from './offer-comparison';
import { OfferDetailPanel } from './offer-detail-panel';

const STATUS_VARIANTS: Record<string, 'gray' | 'blue' | 'yellow' | 'green' | 'purple'> = {
  received: 'blue',
  summarized: 'purple',
  incomplete: 'yellow',
  shortlisted: 'yellow',
  selected: 'green',
  rejected: 'gray',
  accepted: 'green',
  superseded: 'gray',
};

function NewOfferForm({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const createOffer = useCreateOffer(dealId);
  const [form, setForm] = useState({
    offerLabel: '',
    buyerName: '',
    buyerAgent: '',
    offerPrice: '',
    earnestMoney: '',
    financingType: '',
    optionPeriodDays: '',
    closeDate: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createOffer.mutateAsync({
      offerLabel: form.offerLabel || undefined,
      buyerName: form.buyerName || undefined,
      buyerAgent: form.buyerAgent || undefined,
      offerPrice: form.offerPrice ? parseFloat(form.offerPrice) : undefined,
      earnestMoney: form.earnestMoney ? parseFloat(form.earnestMoney) : undefined,
      financingType: form.financingType || undefined,
      optionPeriodDays: form.optionPeriodDays ? parseInt(form.optionPeriodDays, 10) : undefined,
      closeDate: form.closeDate || undefined,
      notes: form.notes || undefined,
    });
    onClose();
  };

  return (
    <Card title="Add New Offer">
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        <input
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Offer label (e.g. Offer #1)"
          value={form.offerLabel}
          onChange={(e) => setForm((f) => ({ ...f, offerLabel: e.target.value }))}
        />
        <input
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Buyer name"
          value={form.buyerName}
          onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
        />
        <input
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Buyer agent"
          value={form.buyerAgent}
          onChange={(e) => setForm((f) => ({ ...f, buyerAgent: e.target.value }))}
        />
        <input
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          type="number"
          placeholder="Offer price"
          value={form.offerPrice}
          onChange={(e) => setForm((f) => ({ ...f, offerPrice: e.target.value }))}
        />
        <input
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          type="number"
          placeholder="Earnest money"
          value={form.earnestMoney}
          onChange={(e) => setForm((f) => ({ ...f, earnestMoney: e.target.value }))}
        />
        <select
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={form.financingType}
          onChange={(e) => setForm((f) => ({ ...f, financingType: e.target.value }))}
        >
          <option value="">Financing type</option>
          <option value="conventional">Conventional</option>
          <option value="fha">FHA</option>
          <option value="va">VA</option>
          <option value="cash">Cash</option>
          <option value="seller_financing">Seller Financing</option>
          <option value="other">Other</option>
        </select>
        <input
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          type="number"
          placeholder="Option period (days)"
          value={form.optionPeriodDays}
          onChange={(e) => setForm((f) => ({ ...f, optionPeriodDays: e.target.value }))}
        />
        <input
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          type="date"
          placeholder="Close date"
          value={form.closeDate}
          onChange={(e) => setForm((f) => ({ ...f, closeDate: e.target.value }))}
        />
        <textarea
          className="col-span-full rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Notes"
          value={form.notes}
          rows={2}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
        <div className="col-span-full flex gap-2">
          <Button type="submit" disabled={createOffer.isPending}>
            {createOffer.isPending ? 'Adding…' : 'Add Offer'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

function OfferRow({ offer, dealId, onSelect }: { offer: OfferRecord; dealId: string; onSelect: () => void }) {
  const action = useOfferAction(offer.id, dealId);
  const prepare = usePrepareAcceptance(offer.id, dealId);

  const completeness = (offer.summaryJson as { completeness?: number } | null)?.completeness;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900">
              {offer.offerLabel ?? offer.buyerName ?? 'Unnamed Offer'}
            </span>
            <Badge variant={STATUS_VARIANTS[offer.status] ?? 'gray'}>
              {offer.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="mt-2 grid gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-3">
            <div><span className="font-medium">Buyer:</span> {offer.buyerName ?? '—'}</div>
            <div><span className="font-medium">Price:</span> {formatCurrency(offer.offerPrice)}</div>
            <div><span className="font-medium">Earnest:</span> {formatCurrency(offer.earnestMoney)}</div>
            <div><span className="font-medium">Financing:</span> {offer.financingType ?? '—'}</div>
            <div><span className="font-medium">Option:</span> {offer.optionPeriodDays != null ? `${offer.optionPeriodDays} days` : '—'}</div>
            <div><span className="font-medium">Close:</span> {formatDate(offer.closeDate)}</div>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span>{offer.files?.length ?? 0} file(s)</span>
            {completeness != null && (
              <span>Completeness: {Math.round(completeness * 100)}%</span>
            )}
            <span>Received {formatDate(offer.receivedAt)}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={onSelect}>
          Details
        </Button>
        {['received', 'summarized', 'incomplete'].includes(offer.status) && (
          <Button
            variant="secondary"
            size="sm"
            disabled={action.isPending}
            onClick={() => action.mutate({ type: 'shortlist' })}
          >
            Shortlist
          </Button>
        )}
        {['received', 'summarized', 'incomplete', 'shortlisted'].includes(offer.status) && (
          <Button
            size="sm"
            disabled={action.isPending}
            onClick={() => action.mutate({ type: 'select' })}
          >
            Select
          </Button>
        )}
        {offer.status === 'selected' && (
          <Button
            size="sm"
            disabled={prepare.isPending}
            onClick={() => prepare.mutate()}
          >
            {prepare.isPending ? 'Preparing…' : 'Prepare Acceptance'}
          </Button>
        )}
        {!['accepted', 'rejected', 'superseded'].includes(offer.status) && (
          <Button
            variant="secondary"
            size="sm"
            disabled={action.isPending}
            onClick={() => action.mutate({ type: 'reject' })}
          >
            Reject
          </Button>
        )}
      </div>
    </div>
  );
}

export function OffersTab({ dealId }: { dealId: string }) {
  const { data: offers, isLoading } = useOffers(dealId);
  const [showForm, setShowForm] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="animate-pulse h-32 rounded bg-slate-100" />;
  }

  const offerList = Array.isArray(offers) ? offers : [];

  if (selectedOfferId) {
    return (
      <OfferDetailPanel
        offerId={selectedOfferId}
        dealId={dealId}
        onBack={() => setSelectedOfferId(null)}
      />
    );
  }

  if (showCompare) {
    return (
      <div>
        <Button variant="secondary" size="sm" onClick={() => setShowCompare(false)} className="mb-4">
          Back to offers
        </Button>
        <OfferComparisonView dealId={dealId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Offers ({offerList.length})
        </h3>
        <div className="flex gap-2">
          {offerList.length >= 2 && (
            <Button variant="secondary" size="sm" onClick={() => setShowCompare(true)}>
              Compare Offers
            </Button>
          )}
          <Button size="sm" onClick={() => setShowForm(true)}>
            Add Offer
          </Button>
        </div>
      </div>

      {showForm && (
        <NewOfferForm dealId={dealId} onClose={() => setShowForm(false)} />
      )}

      {offerList.length === 0 && !showForm ? (
        <EmptyState
          title="No offers yet"
          description="Add an offer to track buyer proposals for this listing."
          action={
            <Button onClick={() => setShowForm(true)}>Add First Offer</Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {offerList.map((offer: OfferRecord) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              dealId={dealId}
              onSelect={() => setSelectedOfferId(offer.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
