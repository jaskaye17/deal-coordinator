import { describe, it, expect } from 'vitest';
import {
  SIGNATURE_ENVELOPE_STATUSES,
  DOCUMENT_TYPES,
  AUDIT_ACTIONS,
} from '../enums';

describe('Phase 2 Enums', () => {
  describe('SIGNATURE_ENVELOPE_STATUSES', () => {
    it('includes expected values', () => {
      const statuses = [...SIGNATURE_ENVELOPE_STATUSES];

      expect(statuses).toContain('draft');
      expect(statuses).toContain('sent');
      expect(statuses).toContain('partially_signed');
      expect(statuses).toContain('completed');
      expect(statuses).toContain('declined');
      expect(statuses).toContain('voided');
      expect(statuses).toContain('failed');
    });
  });

  describe('DOCUMENT_TYPES', () => {
    it('includes expected values', () => {
      const types = [...DOCUMENT_TYPES];

      expect(types).toContain('listing_agreement');
      expect(types).toContain('seller_disclosure');
      expect(types).toContain('lead_paint_disclosure');
      expect(types).toContain('hoa_addendum');
      expect(types).toContain('agency_disclosure');
      expect(types).toContain('mls_input_sheet');
      expect(types).toContain('other');
    });
  });

  describe('AUDIT_ACTIONS', () => {
    it('includes Phase 2 actions', () => {
      const actions = [...AUDIT_ACTIONS];

      expect(actions).toContain('signature_envelope_created');
      expect(actions).toContain('signature_envelope_sent');
      expect(actions).toContain('signature_status_changed');
      expect(actions).toContain('checklist_activated');
      expect(actions).toContain('review_task_created');
      expect(actions).toContain('review_task_actioned');
      expect(actions).toContain('document_created');
      expect(actions).toContain('document_regenerated');
      expect(actions).toContain('document_status_changed');
    });
  });
});
