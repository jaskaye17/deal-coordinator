import { Module } from '@nestjs/common';
import { OFFER_EXTRACTOR } from './extractor.interface';
import { MockOfferExtractor } from './mock-extractor';
import { OfferExtractionService } from './offer-extraction.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [
    {
      provide: OFFER_EXTRACTOR,
      useClass: MockOfferExtractor,
    },
    OfferExtractionService,
  ],
  exports: [OfferExtractionService],
})
export class OfferExtractionModule {}
