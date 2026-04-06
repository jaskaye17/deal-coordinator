import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import type { CalendarEventsService } from './calendar-events.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';

@Controller()
export class CalendarEventsController {
  constructor(private readonly calendarEventsService: CalendarEventsService) {}

  @Get('deals/:dealId/calendar-events')
  async list(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<any> {
    return this.calendarEventsService.listByDeal(
      tenant.workspaceId,
      dealId,
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Post('deals/:dealId/calendar-events')
  async create(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Body() body: {
      eventType?: string;
      title: string;
      description?: string;
      startDate: string;
      endDate?: string;
      attendeesJson?: Array<{ name: string; email?: string }>;
    },
  ): Promise<any> {
    return this.calendarEventsService.create(
      tenant.workspaceId,
      { ...body, dealId },
      tenant.userId,
      tenant.requestId,
    );
  }
}
