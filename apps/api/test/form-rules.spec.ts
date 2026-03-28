import { describe, it, expect } from 'vitest';
import { FormRulesService } from '../src/modules/form-rules/form-rules.service';

describe('FormRulesService', () => {
  const service = new FormRulesService();

  describe('getRequiredDocuments', () => {
    describe('listing type', () => {
      it('always includes listing_agreement, seller_disclosure, agency_disclosure', () => {
        const docs = service.getRequiredDocuments('listing', {});
        const types = docs.map((d) => d.templateType);

        expect(types).toContain('listing_agreement');
        expect(types).toContain('seller_disclosure');
        expect(types).toContain('agency_disclosure');
      });

      it('includes lead_paint_disclosure when year_built < 1978', () => {
        const docs = service.getRequiredDocuments('listing', { year_built: '1960' });
        const types = docs.map((d) => d.templateType);

        expect(types).toContain('lead_paint_disclosure');
      });

      it('excludes lead_paint_disclosure when year_built >= 1978', () => {
        const docs = service.getRequiredDocuments('listing', { year_built: '1980' });
        const types = docs.map((d) => d.templateType);

        expect(types).not.toContain('lead_paint_disclosure');
      });

      it('includes hoa_addendum when hoa_flag === "true"', () => {
        const docs = service.getRequiredDocuments('listing', { hoa_flag: 'true' });
        const types = docs.map((d) => d.templateType);

        expect(types).toContain('hoa_addendum');
      });

      it('excludes hoa_addendum when hoa_flag !== "true"', () => {
        const docs = service.getRequiredDocuments('listing', { hoa_flag: 'false' });
        const types = docs.map((d) => d.templateType);

        expect(types).not.toContain('hoa_addendum');
      });
    });

    it('returns empty array for non-listing deal types', () => {
      const docs = service.getRequiredDocuments('buyer_rep', {});
      expect(docs).toEqual([]);
    });
  });

  describe('getMissingFields', () => {
    it('returns all required fields when deal has no data', () => {
      const missing = service.getMissingFields('listing_agreement', {});
      expect(missing).toEqual(['seller_name', 'address', 'list_price']);
    });

    it('returns empty array when all fields present', () => {
      const missing = service.getMissingFields('listing_agreement', {
        seller_name: 'Jane Doe',
        address: '123 Main St',
        list_price: '450000',
      });
      expect(missing).toEqual([]);
    });

    it('correctly identifies missing fields for listing_agreement', () => {
      const missing = service.getMissingFields('listing_agreement', {
        seller_name: 'Jane Doe',
        address: null,
        list_price: '',
      });
      expect(missing).toEqual(['address', 'list_price']);
    });

    it('returns empty array for unknown template type', () => {
      const missing = service.getMissingFields('unknown_type', {});
      expect(missing).toEqual([]);
    });
  });
});
