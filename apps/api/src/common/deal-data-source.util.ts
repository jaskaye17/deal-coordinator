export type DealForDataSource = {
  primaryContactName?: string | null;
  propertyAddress?: string | null;
  displayName?: string | null;
  title?: string | null;
  address?: string | null;
};

export type DealFieldRow = { fieldName: string; fieldValue: string | null };

/**
 * Resolve template field data sources like deal.primaryContactName or deal.field.seller_name.
 */
export function resolveDealDataSource(
  deal: DealForDataSource,
  fields: DealFieldRow[],
  key: string | null | undefined,
): string {
  if (!key?.trim()) return '';
  const k = key.trim();
  if (k === 'deal.primaryContactName') return deal.primaryContactName ?? '';
  if (k === 'deal.propertyAddress') return deal.propertyAddress ?? deal.address ?? '';
  if (k === 'deal.displayName') return deal.displayName ?? deal.title ?? '';
  if (k === 'deal.address') return deal.address ?? '';
  const m = /^deal\.field\.(.+)$/.exec(k);
  if (m) {
    const fn = m[1];
    const row = fields.find((f) => f.fieldName === fn);
    return row?.fieldValue ?? '';
  }
  return '';
}

export const DEAL_DATA_SOURCE_PRESETS = [
  { value: 'deal.primaryContactName', label: 'Primary contact name' },
  { value: 'deal.propertyAddress', label: 'Property address' },
  { value: 'deal.displayName', label: 'Deal display name' },
  { value: 'deal.address', label: 'Deal address (legacy)' },
  { value: 'deal.field.seller_name', label: 'Deal field: seller_name' },
  { value: 'deal.field.list_price', label: 'Deal field: list_price' },
  { value: 'deal.field.address', label: 'Deal field: address' },
] as const;
