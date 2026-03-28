import type { DealType } from '@deal-coordinator/shared';
import type { TransitionRequest, TransitionResult, WorkflowDefinition } from '../types';
import { workflowRegistry } from '../machines';

function isAdminOverride(request: TransitionRequest): boolean {
  return request.actor.role === 'admin' && Boolean(request.reason?.trim());
}

export function validateTransition(
  request: TransitionRequest,
  registry: Map<DealType, WorkflowDefinition> = workflowRegistry,
): TransitionResult {
  const definition = registry.get(request.dealType);
  if (!definition) {
    return {
      allowed: false,
      reason: `No workflow defined for deal type "${request.dealType}"`,
    };
  }

  const stageDef = definition.stages.get(request.currentStage);
  if (!stageDef) {
    return {
      allowed: false,
      reason: `Stage "${request.currentStage}" is not part of workflow "${definition.name}"`,
    };
  }

  const transition = stageDef.transitions.find((t) => t.to === request.targetStage);
  if (!transition) {
    return {
      allowed: false,
      reason: `Transition from "${request.currentStage}" to "${request.targetStage}" is not allowed`,
    };
  }

  if (!transition.guard) {
    return { allowed: true };
  }

  const guardResult = transition.guard(request);
  if (guardResult.allowed) {
    return { allowed: true };
  }

  if (isAdminOverride(request)) {
    return {
      allowed: true,
      override: true,
      reason: guardResult.reason,
    };
  }

  return guardResult;
}

export * from './guards';
