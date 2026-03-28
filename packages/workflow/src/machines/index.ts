import { DEAL_STAGES, DEAL_TYPES, type DealType } from '@deal-coordinator/shared';
import type { WorkflowDefinition } from '../types';
import { listingWorkflow } from './listing';

export { DEAL_STAGES, DEAL_TYPES };

export const workflowRegistry: Map<DealType, WorkflowDefinition> = new Map([
  ['listing', listingWorkflow],
]);

export { listingWorkflow } from './listing';
