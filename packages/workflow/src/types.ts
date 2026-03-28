import type { DealStage, DealType } from '@deal-coordinator/shared';

export type TransitionActor = {
  role: string;
  userId: string;
};

export type TransitionRequest = {
  dealType: DealType;
  currentStage: DealStage;
  targetStage: DealStage;
  actor: TransitionActor;
  reason?: string;
};

export type TransitionResult = {
  allowed: boolean;
  reason?: string;
  /** Set when an admin bypassed a failing guard using `reason`. */
  override?: boolean;
};

export type Guard = (request: TransitionRequest) => TransitionResult;

export type StageTransition = {
  to: DealStage;
  guard?: Guard;
  label?: string;
};

export type StageDefinition = {
  transitions: StageTransition[];
};

export type WorkflowDefinition = {
  name: string;
  initialStage: DealStage;
  stages: Map<DealStage, StageDefinition>;
};
