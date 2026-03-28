'use client';

import { Badge, Card } from '@deal-coordinator/ui';
import { useOfferComparison } from '@/lib/hooks';
import type { OfferComparison, OfferComparisonRow } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

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

export function OfferComparisonView({ dealId }: { dealId: string }) {
  const { data, isLoading } = useOfferComparison(dealId);

  if (isLoading) {
    return <div className="animate-pulse h-48 rounded bg-slate-100" />;
  }

  if (!data || !data.offers || data.offers.length === 0) {
    return <p className="text-sm text-slate-500">No offers to compare.</p>;
  }

  const comparison: OfferComparison = data;

  const fields: { label: string; render: (o: OfferComparisonRow) => React.ReactNode }[] = [
    { label: 'Status', render: (o) => <Badge variant={STATUS_VARIANTS[o.status] ?? 'gray'}>{o.status.replace(/_/g, ' ')}</Badge> },
    { label: 'Buyer', render: (o) => o.buyerName ?? '—' },
    {
      label: 'Price',
      render: (o) => {
        const priceDiff = comparison.listPrice && o.offerPrice ? o.offerPrice - comparison.listPrice : null;
        return (
          <div>
            <div>{formatCurrency(o.offerPrice)}</div>
            {priceDiff != null && (
              <div className={`text-xs ${priceDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceDiff >= 0 ? '+' : ''}{formatCurrency(priceDiff)} vs list
              </div>
            )}
          </div>
        );
      },
    },
    { label: 'Earnest Money', render: (o) => formatCurrency(o.earnestMoney) },
    { label: 'Financing', render: (o) => o.financingType ?? '—' },
    { label: 'Option Period', render: (o) => o.optionPeriodDays != null ? `${o.optionPeriodDays} days` : '—' },
    { label: 'Close Date', render: (o) => formatDate(o.closeDate) },
    {
      label: 'Proof of Funds',
      render: (o) => (
        <Badge variant={o.proofOfFundsStatus === 'provided' ? 'green' : 'yellow'}>
          {o.proofOfFundsStatus ?? 'unknown'}
        </Badge>
      ),
    },
    {
      label: 'Preapproval',
      render: (o) => (
        <Badge variant={o.preapprovalStatus === 'provided' ? 'green' : 'yellow'}>
          {o.preapprovalStatus ?? 'unknown'}
        </Badge>
      ),
    },
    { label: 'Files', render: (o) => `${o.fileCount} file(s)` },
    {
      label: 'Completeness',
      render: (o) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-blue-500"
              style={{ width: `${Math.round(o.completeness * 100)}%` }}
            />
          </div>
          <span className="text-xs">{Math.round(o.completeness * 100)}%</span>
        </div>
      ),
    },
  ];

  return (
    <Card
      title="Offer Comparison"
      description={comparison.listPrice ? `List price: ${formatCurrency(comparison.listPrice)}` : undefined}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Field</th>
              {comparison.offers.map((o) => (
                <th key={o.offerId} className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">
                  {o.offerLabel ?? o.buyerName ?? o.offerId.slice(0, 8)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.label} className="border-b border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-700">{f.label}</td>
                {comparison.offers.map((o) => (
                  <td key={o.offerId} className="px-3 py-2 text-slate-700">
                    {f.render(o)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
