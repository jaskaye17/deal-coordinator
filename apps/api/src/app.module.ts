import { Module } from '@nestjs/common';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { DealsModule } from './modules/deals/deals.module';
import { AuditModule } from './modules/audit/audit.module';
import { UnresolvedItemsModule } from './modules/unresolved-items/unresolved-items.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { MemoryModule } from './modules/memory/memory.module';
import { ExceptionsModule } from './modules/exceptions/exceptions.module';
import { ChatModule } from './modules/chat/chat.module';
import { DealQueryModule } from './modules/deal-query/deal-query.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReviewTasksModule } from './modules/review-tasks/review-tasks.module';
import { SignaturesModule } from './modules/signatures/signatures.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { OffersModule } from './modules/offers/offers.module';
import { AcceptanceModule } from './modules/acceptance/acceptance.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CalendarEventsModule } from './modules/calendar-events/calendar-events.module';
import { KeyDatesModule } from './modules/key-dates/key-dates.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { LLMModule } from './modules/llm/llm.module';
import { PDFModule } from './modules/pdf/pdf.module';
import { CalendarSyncModule } from './modules/calendar-sync/calendar-sync.module';
import { FilesModule } from './modules/files/files.module';
import { UserAiModule } from './modules/user-ai/user-ai.module';
import { TemplatesModule } from './modules/templates/templates.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    WorkspacesModule,
    DealsModule,
    AuditModule,
    UnresolvedItemsModule,
    CommunicationsModule,
    MemoryModule,
    ExceptionsModule,
    ChatModule,
    DealQueryModule,
    DashboardModule,
    ReviewTasksModule,
    SignaturesModule,
    TasksModule,
    DocumentsModule,
    OffersModule,
    AcceptanceModule,
    NotificationsModule,
    CalendarEventsModule,
    KeyDatesModule,
    MessagingModule,
    LLMModule,
    PDFModule,
    CalendarSyncModule,
    FilesModule,
    UserAiModule,
    TemplatesModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    consumer
      .apply(TenantContextMiddleware)
      .exclude('auth/(.*)', 'webhooks/(.*)')
      .forRoutes('*');
  }
}
