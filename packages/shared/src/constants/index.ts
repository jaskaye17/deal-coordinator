export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const CONFIDENCE_THRESHOLD_HIGH = 0.85;
export const CONFIDENCE_THRESHOLD_MEDIUM = 0.5;
export const DEFAULT_AUDIT_RETENTION_YEARS = 7;

export const DEFAULT_REVIEW_GATE_ACTIONS = [
  'send_for_signature',
  'send_email',
  'send_text',
] as const;

/** Fixed IDs for local demo seed + web login (keep in sync with `packages/db/prisma/seed.ts`). */
export const DEMO_SEED_IDS = {
  workspaceId: '00000000-0000-4000-8000-000000000001',
  userIds: {
    admin: '00000000-0000-4000-8000-000000000011',
    agent: '00000000-0000-4000-8000-000000000012',
    reviewer: '00000000-0000-4000-8000-000000000013',
  },
} as const;
