import { Module } from '@nestjs/common';
import { OfferComparisonService } from './offer-comparison.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [OfferComparisonService],
  exports: [OfferComparisonService],
})
export class OfferComparisonModule {}
