import { Module } from '@nestjs/common';
import { AcceptanceController } from './acceptance.controller';
import { AcceptanceService } from './acceptance.service';
import { AuditModule } from '../audit/audit.module';
import { ReviewTasksModule } from '../review-tasks/review-tasks.module';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [AuditModule, ReviewTasksModule, FileStorageModule],
  controllers: [AcceptanceController],
  providers: [AcceptanceService],
  exports: [AcceptanceService],
})
export class AcceptanceModule {}
