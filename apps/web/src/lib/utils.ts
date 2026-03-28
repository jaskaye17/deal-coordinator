import type { BadgeProps } from '@deal-coordinator/ui';
import { DEAL_STAGES } from '@deal-coordinator/shared';

export type StageBadgeVariant = NonNullable<BadgeProps['variant']>;

function humanizeSnake(s: string): string {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  deal_created: 'Deal Created',
  deal_updated: 'Deal Updated',
  deal_stage_changed: 'Stage Changed',
  field_updated: 'Field Updated',
  unresolved_item_created: 'Unresolved Item Created',
  unresolved_item_resolved: 'Unresolved Item Resolved',
  exception_created: 'Exception Created',
  exception_updated: 'Exception Updated',
  exception_resolved: 'Exception Resolved',
  message_received: 'Message Received',
  memory_created: 'Memory Created',
  memory_updated: 'Memory Updated',
  document_created: 'Document Created',
  review_task_created: 'Review Task Created',
  review_task_actioned: 'Review Task Actioned',
  offer_created: 'Offer Created',
  task_created: 'Task Created',
  task_updated: 'Task Updated',
  admin_override: 'Admin Override',
};

export function humanizeAuditAction(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? humanizeSnake(action);
}

export function formatCurrency(
  value: string | number | null | undefined,
): string {
  if (value == null || value === '') return '—';
  const n = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export const stageLabelMap: Record<string, string> = Object.fromEntries(
  DEAL_STAGES.map((stage) => [stage, humanizeSnake(stage)]),
);

export const stageColorMap: Record<string, StageBadgeVariant> = {
  new_intake: 'blue',
  awaiting_info: 'yellow',
  drafting_forms: 'purple',
  awaiting_review: 'purple',
  active: 'green',
  closed: 'gray',
  archived: 'gray',
};

export function stageVariant(stage: string): StageBadgeVariant {
  return stageColorMap[stage] ?? 'gray';
}

export const dealTypeLabelMap: Record<string, string> = {
  listing: 'Listing',
  buyer_rep: 'Buyer Rep',
  contract_to_close: 'Contract to Close',
};

export function formatDealType(dealType: string): string {
  return dealTypeLabelMap[dealType] ?? humanizeSnake(dealType);
}

export function formatDate(
  value: string | Date | null | undefined,
): string {
  if (value == null || value === '') return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(
  value: string | Date | null | undefined,
): string {
  if (value == null || value === '') return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelativeTime(
  value: string | Date | null | undefined,
): string {
  if (value == null || value === '') return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  const ms = Date.now() - d.getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return `${min} minute${min === 1 ? '' : 's'} ago`;
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  }
  const day = Math.floor(hr / 24);
  if (day < 7) {
    return `${day} day${day === 1 ? '' : 's'} ago`;
  }
  const week = Math.floor(day / 7);
  if (week < 5) {
    return `${week} week${week === 1 ? '' : 's'} ago`;
  }
  return formatDate(d.toISOString());
}
