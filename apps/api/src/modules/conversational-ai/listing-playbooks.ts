/**
 * Workflow / compliance playbook: required and conditional checklist items.
 * Truth for “what’s missing” comes from DB + these rules; LLM only narrates.
 */
export type PlaybookDealSnapshot = {
  dealType: string;
  stage: string;
  /** e.g. deal field `year_built` parsed as number when present */
  yearBuilt?: number | null;
};

export type PlaybookItemDef = {
  id: string;
  label: string;
  required: boolean;
  /** If set, item applies only when this returns true */
  applies?: (deal: PlaybookDealSnapshot) => boolean;
};

export const LISTING_COMPLIANCE_PLAYBOOK: PlaybookItemDef[] = [
  {
    id: 'iabs',
    label: 'IABS (Information About Brokerage Services)',
    required: true,
  },
  {
    id: 'listing_agreement',
    label: 'Listing agreement',
    required: true,
  },
  {
    id: 'disclosures',
    label: 'Seller disclosures package',
    required: true,
  },
  {
    id: 'lead_paint',
    label: 'Lead-based paint disclosure (pre-1978)',
    required: false,
    applies: (d) =>
      d.yearBuilt != null && !Number.isNaN(d.yearBuilt) && d.yearBuilt < 1978,
  },
];

export function playbookItemsForDeal(deal: PlaybookDealSnapshot): PlaybookItemDef[] {
  return LISTING_COMPLIANCE_PLAYBOOK.filter((item) => {
    if (!item.applies) return true;
    return item.applies(deal);
  });
}
