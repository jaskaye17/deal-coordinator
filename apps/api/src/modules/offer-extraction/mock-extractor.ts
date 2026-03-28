import { Injectable } from '@nestjs/common';
import type {
  OfferExtractor,
  ExtractedOfferFields,
  ExtractionResult,
} from './extractor.interface';

@Injectable()
export class MockOfferExtractor implements OfferExtractor {
  async extract(
    files: Array<{ fileName: string; fileUrl: string | null; fileType: string | null }>,
    existingData?: Partial<ExtractedOfferFields>,
  ): Promise<ExtractionResult> {
    const fields: ExtractedOfferFields = { ...existingData };
    const confidence: Record<string, number> = {};
    const source: Record<string, string> = {};

    if (!fields.buyerName) {
      fields.buyerName = 'John & Jane Doe';
      confidence.buyerName = 0.7;
      source.buyerName = 'mock_extraction';
    } else {
      confidence.buyerName = 1.0;
      source.buyerName = 'user_provided';
    }

    if (fields.offerPrice == null) {
      fields.offerPrice = 425000;
      confidence.offerPrice = 0.65;
      source.offerPrice = 'mock_extraction';
    } else {
      confidence.offerPrice = 1.0;
      source.offerPrice = 'user_provided';
    }

    if (fields.earnestMoney == null) {
      fields.earnestMoney = 5000;
      confidence.earnestMoney = 0.6;
      source.earnestMoney = 'mock_extraction';
    } else {
      confidence.earnestMoney = 1.0;
      source.earnestMoney = 'user_provided';
    }

    if (!fields.financingType) {
      fields.financingType = 'conventional';
      confidence.financingType = 0.8;
      source.financingType = 'mock_extraction';
    } else {
      confidence.financingType = 1.0;
      source.financingType = 'user_provided';
    }

    if (fields.optionPeriodDays == null) {
      fields.optionPeriodDays = 10;
      confidence.optionPeriodDays = 0.55;
      source.optionPeriodDays = 'mock_extraction';
    } else {
      confidence.optionPeriodDays = 1.0;
      source.optionPeriodDays = 'user_provided';
    }

    if (!fields.closeDate) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      fields.closeDate = d.toISOString().split('T')[0];
      confidence.closeDate = 0.5;
      source.closeDate = 'mock_extraction';
    } else {
      confidence.closeDate = 1.0;
      source.closeDate = 'user_provided';
    }

    if (fields.proofOfFundsPresent == null) {
      fields.proofOfFundsPresent = files.some(
        (f) => f.fileName.toLowerCase().includes('proof') || f.fileName.toLowerCase().includes('pof'),
      );
      confidence.proofOfFundsPresent = 0.5;
      source.proofOfFundsPresent = 'filename_heuristic';
    }

    if (fields.preapprovalPresent == null) {
      fields.preapprovalPresent = files.some(
        (f) =>
          f.fileName.toLowerCase().includes('preapproval') ||
          f.fileName.toLowerCase().includes('pre-approval'),
      );
      confidence.preapprovalPresent = 0.5;
      source.preapprovalPresent = 'filename_heuristic';
    }

    const totalFields = Object.keys(fields).length;
    const providedFields = Object.values(fields).filter((v) => v != null).length;
    const completeness = totalFields > 0 ? providedFields / totalFields : 0;

    return { fields, confidence, source, completeness };
  }
}
