'use client';

import { Badge, Button, Card } from '@deal-coordinator/ui';
import { useOffer } from '@/lib/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-green-600',
  medium: 'text-yellow-600',
  low: 'text-red-600',
};

function confidenceLabel(value: number): string {
  if (value >= 0.85) return 'high';
  if (value >= 0.5) return 'medium';
  return 'low';
}

export function OfferDetailPanel({
  offerId,
  dealId,
  onBack,
}: {
  offerId: string;
  dealId: string;
  onBack: () => void;
}) {
  const { data: offer, isLoading } = useOffer(offerId);

  if (isLoading) {
    return <div className="animate-pulse h-48 rounded bg-slate-100" />;
  }

  if (!offer) {
    return <p className="text-sm text-slate-500">Offer not found.</p>;
  }

  const confidence = offer.extractionConfidenceJson ?? {};
  const summary = offer.summaryJson as { completeness?: number; source?: Record<string, string> } | null;

  return (
    <div className="space-y-4">
      <Button variant="secondary" size="sm" onClick={onBack}>
        Back to offers
      </Button>

      <Card title={offer.offerLabel ?? offer.buyerName ?? 'Offer Details'}>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant={offer.status === 'selected' || offer.status === 'accepted' ? 'green' : 'blue'}>
            {offer.status.replace(/_/g, ' ')}
          </Badge>
          {summary?.completeness != null && (
            <span className="text-xs text-slate-500">
              {Math.round(summary.completeness * 100)}% complete
            </span>
          )}
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          {([
            ['Buyer Name', offer.buyerName, 'buyerName'],
            ['Entity', offer.buyerEntityName, 'buyerEntityName'],
            ['Agent', offer.buyerAgent, null],
            ['Offer Price', formatCurrency(offer.offerPrice), 'offerPrice'],
            ['Earnest Money', formatCurrency(offer.earnestMoney), 'earnestMoney'],
            ['Financing', offer.financingType, 'financingType'],
            ['Option Period', offer.optionPeriodDays != null ? `${offer.optionPeriodDays} days` : null, 'optionPeriodDays'],
            ['Close Date', formatDate(offer.closeDate), 'closeDate'],
            ['Proof of Funds', offer.proofOfFundsStatus, 'proofOfFundsPresent'],
            ['Preapproval', offer.preapprovalStatus, 'preapprovalPresent'],
          ] as [string, string | null | undefined, string | null][]).map(([label, value, confKey]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
                {confKey && confidence[confKey] != null && (
                  <span className={`ml-1 ${CONFIDENCE_COLORS[confidenceLabel(confidence[confKey]!)]}`}>
                    ({Math.round(confidence[confKey]! * 100)}%)
                  </span>
                )}
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {summary?.source && (
        <Card title="Extraction Sources">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries(summary.source).map(([field, src]) => (
              <div key={field} className="flex justify-between">
                <span className="text-slate-600">{field.replace(/_/g, ' ')}</span>
                <Badge variant={src === 'user_provided' ? 'green' : 'gray'}>
                  {String(src).replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {offer.files && offer.files.length > 0 && (
        <Card title="Files">
          <ul className="space-y-2">
            {offer.files.map((f) => (
              <li key={f.id} className="flex items-center justify-between rounded border border-slate-100 px-3 py-2 text-sm">
                <span className="font-medium text-slate-700">{f.fileName}</span>
                <span className="text-xs text-slate-500">
                  {f.fileType ?? 'unknown'} · {formatDate(f.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {offer.terms && (
        <Card title="Terms">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{offer.terms}</p>
        </Card>
      )}

      {offer.notes && (
        <Card title="Notes">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{offer.notes}</p>
        </Card>
      )}
    </div>
  );
}
