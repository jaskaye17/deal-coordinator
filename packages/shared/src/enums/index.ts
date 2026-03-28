export const DEAL_TYPES = ['listing', 'buyer_rep', 'contract_to_close'] as const;
export type DealType = (typeof DEAL_TYPES)[number];

export const DEAL_STAGES = [
  'new_intake',
  'awaiting_info',
  'drafting_forms',
  'awaiting_review',
  'sent_for_signature',
  'partially_signed',
  'fully_signed',
  'listing_prep',
  'active',
  'offers_received',
  'offer_selected',
  'contract_drafting',
  'contract_awaiting_review',
  'contract_sent',
  'executed',
  'under_contract',
  'closed',
  'archived',
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export const DEAL_FIELD_SOURCES = ['manual', 'ai_parse', 'import', 'system'] as const;
export type DealFieldSource = (typeof DEAL_FIELD_SOURCES)[number];

export const DEAL_FIELD_CONFIDENCES = ['high', 'medium', 'low'] as const;
export type DealFieldConfidence = (typeof DEAL_FIELD_CONFIDENCES)[number];

export const UNRESOLVED_ITEM_TYPES = ['missing_info', 'confirm_field', 'exception'] as const;
export type UnresolvedItemType = (typeof UNRESOLVED_ITEM_TYPES)[number];

export const UNRESOLVED_ITEM_STATUSES = ['open', 'confirmed', 'resolved', 'dismissed'] as const;
export type UnresolvedItemStatus = (typeof UNRESOLVED_ITEM_STATUSES)[number];

export const DOCUMENT_STATUSES = [
  'draft',
  'missing_info',
  'awaiting_review',
  'approved',
  'sent',
  'signed',
  'superseded',
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const REVIEW_TASK_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'changes_requested',
  'on_hold',
  'canceled',
] as const;
export type ReviewTaskStatus = (typeof REVIEW_TASK_STATUSES)[number];

export const REVIEW_ACTION_TYPES = [
  'send_listing_packet',
  'send_acceptance_packet',
  'send_email',
  'send_text',
  'manual_review',
  'notify_title',
  'notify_lender',
] as const;
export type ReviewActionType = (typeof REVIEW_ACTION_TYPES)[number];

export const REVIEW_TASK_ACTIONS = ['approve', 'reject', 'request_changes', 'hold'] as const;
export type ReviewTaskAction = (typeof REVIEW_TASK_ACTIONS)[number];

export const SIGNATURE_ENVELOPE_STATUSES = [
  'draft',
  'sent',
  'partially_signed',
  'completed',
  'declined',
  'voided',
  'failed',
] as const;
export type SignatureEnvelopeStatus = (typeof SIGNATURE_ENVELOPE_STATUSES)[number];

export const DOCUMENT_TYPES = [
  'listing_agreement',
  'seller_disclosure',
  'lead_paint_disclosure',
  'hoa_addendum',
  'agency_disclosure',
  'mls_input_sheet',
  'purchase_agreement',
  'acceptance_letter',
  'counter_offer',
  'amendment',
  'other',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const TEMPLATE_TYPES = [
  'listing_agreement',
  'seller_disclosure',
  'lead_paint_disclosure',
  'hoa_addendum',
  'agency_disclosure',
  'mls_input_sheet',
  'purchase_agreement',
  'acceptance_letter',
  'counter_offer',
  'amendment',
  'other',
] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export const TASK_CATEGORIES = [
  'listing_prep',
  'intake',
  'closing',
  'general',
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const OFFER_STATUSES = [
  'received',
  'summarized',
  'incomplete',
  'shortlisted',
  'selected',
  'rejected',
  'accepted',
  'superseded',
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const FINANCING_TYPES = [
  'conventional',
  'fha',
  'va',
  'usda',
  'cash',
  'seller_financing',
  'other',
] as const;
export type FinancingType = (typeof FINANCING_TYPES)[number];

export const CALENDAR_EVENT_TYPES = [
  'earnest_money_deadline',
  'option_deadline',
  'financing_deadline',
  'appraisal_deadline',
  'closing_date',
  'inspection',
  'walkthrough',
  'custom',
] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export const CALENDAR_EVENT_STATUSES = ['active', 'completed', 'canceled'] as const;
export type CalendarEventStatus = (typeof CALENDAR_EVENT_STATUSES)[number];

export const NOTIFICATION_TYPES = ['title_company', 'lender'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'skipped', 'blocked'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const COMMUNICATION_DIRECTIONS = ['inbound', 'outbound'] as const;
export type CommunicationDirection = (typeof COMMUNICATION_DIRECTIONS)[number];

export const COMMUNICATION_TYPES = ['chat', 'email', 'text', 'phone', 'system'] as const;
export type CommunicationType = (typeof COMMUNICATION_TYPES)[number];

export const EXCEPTION_STATUSES = [
  'detected',
  'question_sent',
  'awaiting_response',
  'resolved',
  'closed',
] as const;
export type ExceptionStatus = (typeof EXCEPTION_STATUSES)[number];

export const EXCEPTION_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type ExceptionSeverity = (typeof EXCEPTION_SEVERITIES)[number];

export const MEMORY_ENTRY_SCOPES = ['workspace', 'deal'] as const;
export type MemoryEntryScope = (typeof MEMORY_ENTRY_SCOPES)[number];

export const AUDIT_ACTIONS = [
  'deal_created',
  'deal_updated',
  'deal_stage_changed',
  'field_updated',
  'unresolved_item_created',
  'unresolved_item_resolved',
  'exception_created',
  'exception_updated',
  'exception_resolved',
  'message_received',
  'memory_created',
  'memory_updated',
  'document_created',
  'document_regenerated',
  'document_status_changed',
  'review_task_created',
  'review_task_actioned',
  'offer_created',
  'task_created',
  'task_updated',
  'admin_override',
  'deal_folder_initialized',
  'signature_envelope_created',
  'signature_envelope_sent',
  'signature_status_changed',
  'checklist_activated',
  'offer_received',
  'offer_summarized',
  'offer_shortlisted',
  'offer_selected',
  'offer_rejected',
  'offer_file_uploaded',
  'acceptance_package_prepared',
  'acceptance_review_task_created',
  'title_notified',
  'lender_notified',
  'key_dates_extracted',
  'calendar_event_created',
  'stage_transitioned',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const ACTOR_TYPES = ['user', 'system', 'ai'] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const WORKSPACE_ROLES = ['admin', 'agent', 'reviewer'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const DEAL_ASSIGNMENT_ROLES = [
  'primary_agent',
  'co_agent',
  'transaction_coordinator',
  'reviewer',
] as const;
export type DealAssignmentRole = (typeof DEAL_ASSIGNMENT_ROLES)[number];
