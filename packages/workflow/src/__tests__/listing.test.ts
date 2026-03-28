import { describe, it, expect } from 'vitest';
import { validateTransition } from '../transitions';
import { listingWorkflow } from '../machines/listing';

describe('Listing Workflow', () => {
  it('should have new_intake as initial stage', () => {
    expect(listingWorkflow.initialStage).toBe('new_intake');
  });

  it('should allow new_intake -> awaiting_info', () => {
    const result = validateTransition({
      dealType: 'listing',
      currentStage: 'new_intake',
      targetStage: 'awaiting_info',
      actor: { role: 'agent', userId: 'user-1' },
    });
    expect(result.allowed).toBe(true);
  });

  it('should allow new_intake -> drafting_forms', () => {
    const result = validateTransition({
      dealType: 'listing',
      currentStage: 'new_intake',
      targetStage: 'drafting_forms',
      actor: { role: 'agent', userId: 'user-1' },
    });
    expect(result.allowed).toBe(true);
  });

  it('should NOT allow new_intake -> active (invalid transition)', () => {
    const result = validateTransition({
      dealType: 'listing',
      currentStage: 'new_intake',
      targetStage: 'active',
      actor: { role: 'agent', userId: 'user-1' },
    });
    expect(result.allowed).toBe(false);
  });

  it('should NOT allow agent to transition awaiting_review -> sent_for_signature (requires reviewer)', () => {
    const result = validateTransition({
      dealType: 'listing',
      currentStage: 'awaiting_review',
      targetStage: 'sent_for_signature',
      actor: { role: 'agent', userId: 'user-1' },
    });
    expect(result.allowed).toBe(false);
  });

  it('should allow reviewer to transition awaiting_review -> sent_for_signature', () => {
    const result = validateTransition({
      dealType: 'listing',
      currentStage: 'awaiting_review',
      targetStage: 'sent_for_signature',
      actor: { role: 'reviewer', userId: 'user-1' },
    });
    expect(result.allowed).toBe(true);
  });

  it('should allow admin override with reason', () => {
    const result = validateTransition({
      dealType: 'listing',
      currentStage: 'awaiting_review',
      targetStage: 'sent_for_signature',
      actor: { role: 'admin', userId: 'admin-1' },
      reason: 'Urgent listing, bypassing review',
    });
    expect(result.allowed).toBe(true);
    expect(result.override).toBe(true);
  });

  it('should NOT allow admin override without reason', () => {
    const result = validateTransition({
      dealType: 'listing',
      currentStage: 'awaiting_review',
      targetStage: 'sent_for_signature',
      actor: { role: 'admin', userId: 'admin-1' },
    });
    expect(result.allowed).toBe(false);
  });

  it('should not allow transitions out of archived', () => {
    const result = validateTransition({
      dealType: 'listing',
      currentStage: 'archived',
      targetStage: 'active',
      actor: { role: 'admin', userId: 'admin-1' },
    });
    expect(result.allowed).toBe(false);
  });

  it('should reject unknown deal types', () => {
    const result = validateTransition({
      dealType: 'unknown' as any,
      currentStage: 'new_intake',
      targetStage: 'awaiting_info',
      actor: { role: 'agent', userId: 'user-1' },
    });
    expect(result.allowed).toBe(false);
  });

  it('should allow full listing flow: new_intake -> awaiting_info -> drafting_forms -> awaiting_review', () => {
    const stages: Array<[string, string]> = [
      ['new_intake', 'awaiting_info'],
      ['awaiting_info', 'drafting_forms'],
      ['drafting_forms', 'awaiting_review'],
    ];
    for (const [from, to] of stages) {
      const result = validateTransition({
        dealType: 'listing',
        currentStage: from as any,
        targetStage: to as any,
        actor: { role: 'agent', userId: 'user-1' },
      });
      expect(result.allowed).toBe(true);
    }
  });
});
