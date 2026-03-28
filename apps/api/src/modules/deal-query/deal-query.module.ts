import { Module } from '@nestjs/common';
import { DealQueryController } from './deal-query.controller';
import { DealQueryService } from './deal-query.service';

@Module({
  controllers: [DealQueryController],
  providers: [DealQueryService],
  exports: [DealQueryService],
})
export class DealQueryModule {}
