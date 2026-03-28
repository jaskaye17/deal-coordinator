import type { DealStage } from '@deal-coordinator/shared';
import type { StageDefinition, WorkflowDefinition } from '../types';
import { requireListingClosureRoles, reviewerOrAdminGuard } from '../transitions/guards';

function listingStages(
  entries: [DealStage, StageDefinition][],
): Map<DealStage, StageDefinition> {
  return new Map(entries);
}

export const listingWorkflow: WorkflowDefinition = {
  name: 'listing',
  initialStage: 'new_intake',
  stages: listingStages([
    [
      'new_intake',
      {
        transitions: [
          { to: 'awaiting_info', label: 'Request information' },
          { to: 'drafting_forms', label: 'Start drafting' },
        ],
      },
    ],
    [
      'awaiting_info',
      {
        transitions: [
          { to: 'drafting_forms', label: 'Information received' },
          { to: 'new_intake', label: 'Back to intake' },
        ],
      },
    ],
    [
      'drafting_forms',
      {
        transitions: [{ to: 'awaiting_review', label: 'Submit for review' }],
      },
    ],
    [
      'awaiting_review',
      {
        transitions: [
          {
            to: 'sent_for_signature',
            label: 'Send for signature',
            guard: reviewerOrAdminGuard,
          },
          { to: 'drafting_forms', label: 'Return for edits', guard: reviewerOrAdminGuard },
        ],
      },
    ],
    [
      'sent_for_signature',
      {
        transitions: [
          { to: 'partially_signed', label: 'Partially signed' },
          { to: 'fully_signed', label: 'Fully signed' },
        ],
      },
    ],
    [
      'partially_signed',
      {
        transitions: [
          { to: 'fully_signed', label: 'Complete signatures' },
          { to: 'sent_for_signature', label: 'Re-send for signature' },
        ],
      },
    ],
    [
      'fully_signed',
      {
        transitions: [{ to: 'listing_prep', label: 'Begin listing prep' }],
      },
    ],
    [
      'listing_prep',
      {
        transitions: [{ to: 'active', label: 'Go live' }],
      },
    ],
    [
      'active',
      {
        transitions: [
          { to: 'offers_received', label: 'Offers received' },
          { to: 'closed', label: 'Close listing', guard: requireListingClosureRoles },
          { to: 'archived', label: 'Archive' },
        ],
      },
    ],
    [
      'offers_received',
      {
        transitions: [
          { to: 'offer_selected', label: 'Select offer' },
          { to: 'active', label: 'Withdraw selection' },
        ],
      },
    ],
    [
      'offer_selected',
      {
        transitions: [{ to: 'contract_drafting', label: 'Start contract' }],
      },
    ],
    [
      'contract_drafting',
      {
        transitions: [{ to: 'contract_awaiting_review', label: 'Submit contract for review' }],
      },
    ],
    [
      'contract_awaiting_review',
      {
        transitions: [
          { to: 'contract_sent', label: 'Send contract', guard: reviewerOrAdminGuard },
          { to: 'contract_drafting', label: 'Return for edits', guard: reviewerOrAdminGuard },
        ],
      },
    ],
    [
      'contract_sent',
      {
        transitions: [{ to: 'executed', label: 'Executed' }],
      },
    ],
    [
      'executed',
      {
        transitions: [{ to: 'under_contract', label: 'Under contract' }],
      },
    ],
    [
      'under_contract',
      {
        transitions: [{ to: 'closed', label: 'Close deal', guard: requireListingClosureRoles }],
      },
    ],
    [
      'closed',
      {
        transitions: [{ to: 'archived', label: 'Archive' }],
      },
    ],
    ['archived', { transitions: [] }],
  ]),
};
