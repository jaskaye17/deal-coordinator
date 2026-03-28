import { Module } from '@nestjs/common';
import { UnresolvedItemsController } from './unresolved-items.controller';
import { UnresolvedItemsService } from './unresolved-items.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [UnresolvedItemsController],
  providers: [UnresolvedItemsService],
  exports: [UnresolvedItemsService],
})
export class UnresolvedItemsModule {}
