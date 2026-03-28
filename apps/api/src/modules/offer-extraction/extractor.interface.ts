export interface ExtractedOfferFields {
  buyerName?: string;
  buyerEntityName?: string;
  offerPrice?: number;
  earnestMoney?: number;
  financingType?: string;
  optionPeriodDays?: number;
  closeDate?: string;
  proofOfFundsPresent?: boolean;
  preapprovalPresent?: boolean;
}

export interface ExtractionResult {
  fields: ExtractedOfferFields;
  confidence: Record<string, number>;
  source: Record<string, string>;
  completeness: number;
}

export interface OfferExtractor {
  extract(
    files: Array<{ fileName: string; fileUrl: string | null; fileType: string | null }>,
    existingData?: Partial<ExtractedOfferFields>,
  ): Promise<ExtractionResult>;
}

export const OFFER_EXTRACTOR = 'OFFER_EXTRACTOR';
