import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { AuditModule } from '../audit/audit.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { OfferExtractionModule } from '../offer-extraction/offer-extraction.module';
import { OfferComparisonModule } from '../offer-comparison/offer-comparison.module';

@Module({
  imports: [AuditModule, FileStorageModule, OfferExtractionModule, OfferComparisonModule],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
