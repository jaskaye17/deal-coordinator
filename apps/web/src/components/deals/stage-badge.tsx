'use client';

import { Badge } from '@deal-coordinator/ui';
import { stageLabelMap, stageVariant } from '@/lib/utils';

export function StageBadge({ stage }: { stage: string }) {
  const label = stageLabelMap[stage] ?? stage;
  return <Badge variant={stageVariant(stage)}>{label}</Badge>;
}
