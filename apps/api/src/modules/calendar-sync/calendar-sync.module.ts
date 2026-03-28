import { Module } from '@nestjs/common';
import { CalendarSyncController } from './calendar-sync.controller';
import { CalendarSyncService } from './calendar-sync.service';
import { GoogleCalendarProvider } from './providers/google-calendar.provider';
import { MicrosoftCalendarProvider } from './providers/microsoft-calendar.provider';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CalendarSyncController],
  providers: [CalendarSyncService, GoogleCalendarProvider, MicrosoftCalendarProvider],
  exports: [CalendarSyncService],
})
export class CalendarSyncModule {}
