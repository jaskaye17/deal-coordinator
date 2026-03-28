import { Module } from '@nestjs/common';
import { ReviewTasksController } from './review-tasks.controller';
import { ReviewTasksService } from './review-tasks.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ReviewTasksController],
  providers: [ReviewTasksService],
  exports: [ReviewTasksService],
})
export class ReviewTasksModule {}
