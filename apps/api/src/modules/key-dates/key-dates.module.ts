import { Module } from '@nestjs/common';
import { KeyDatesController } from './key-dates.controller';
import { KeyDatesService } from './key-dates.service';
import { AuditModule } from '../audit/audit.module';
import { CalendarEventsModule } from '../calendar-events/calendar-events.module';

@Module({
  imports: [AuditModule, CalendarEventsModule],
  controllers: [KeyDatesController],
  providers: [KeyDatesService],
  exports: [KeyDatesService],
})
export class KeyDatesModule {}
