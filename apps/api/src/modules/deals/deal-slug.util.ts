import type { PrismaClient } from '@prisma/client';
import { DEAL_SLUG_MAX_LENGTH } from '@deal-coordinator/shared';

type DealDelegate = Pick<PrismaClient['deal'], 'findFirst'>;

export async function reserveUniqueDealSlug(
  deal: DealDelegate,
  workspaceId: string,
  baseSlug: string,
): Promise<string> {
  const max = DEAL_SLUG_MAX_LENGTH;
  let candidate = baseSlug.slice(0, max).replace(/-+$/g, '') || 'deal';
  let n = 2;
  for (;;) {
    const taken = await deal.findFirst({
      where: { workspaceId, slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
    const suffix = `-${n}`;
    const trimmedBase = baseSlug.slice(0, Math.max(1, max - suffix.length)).replace(/-+$/g, '') || 'deal';
    candidate = `${trimmedBase}${suffix}`.slice(0, max);
    n += 1;
  }
}
