import { Injectable } from '@nestjs/common';

export interface RequiredDocument {
  templateType: string;
  name: string;
  required: boolean;
  reason: string;
}

const REQUIRED_FIELDS: Record<string, string[]> = {
  listing_agreement: ['seller_name', 'address', 'list_price'],
  seller_disclosure: ['seller_name', 'address'],
  lead_paint_disclosure: ['seller_name', 'address', 'year_built'],
  hoa_addendum: ['seller_name', 'address', 'hoa_name'],
  agency_disclosure: ['seller_name', 'address'],
};

@Injectable()
export class FormRulesService {
  getRequiredDocuments(
    dealType: string,
    dealFields: Record<string, string | null>,
  ): RequiredDocument[] {
    const docs: RequiredDocument[] = [];

    if (dealType !== 'listing') {
      return docs;
    }

    docs.push({
      templateType: 'listing_agreement',
      name: 'Listing Agreement',
      required: true,
      reason: 'Required for all listings',
    });

    docs.push({
      templateType: 'seller_disclosure',
      name: 'Seller Disclosure',
      required: true,
      reason: 'Required for all listings',
    });

    const yearBuilt = dealFields['year_built'];
    if (yearBuilt != null) {
      const year = parseInt(yearBuilt, 10);
      if (!isNaN(year) && year < 1978) {
        docs.push({
          templateType: 'lead_paint_disclosure',
          name: 'Lead Paint Disclosure',
          required: true,
          reason: 'Required for properties built before 1978',
        });
      }
    }

    if (dealFields['hoa_flag'] === 'true') {
      docs.push({
        templateType: 'hoa_addendum',
        name: 'HOA Addendum',
        required: true,
        reason: 'Required when property has an HOA',
      });
    }

    docs.push({
      templateType: 'agency_disclosure',
      name: 'Agency Disclosure',
      required: true,
      reason: 'Required for all listings',
    });

    return docs;
  }

  getMissingFields(
    templateType: string,
    dealFields: Record<string, string | null>,
  ): string[] {
    const required = REQUIRED_FIELDS[templateType];
    if (!required) {
      return [];
    }

    return required.filter(
      (field) =>
        dealFields[field] === undefined ||
        dealFields[field] === null ||
        dealFields[field] === '',
    );
  }
}
