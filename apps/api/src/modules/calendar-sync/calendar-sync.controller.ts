import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import type { CalendarSyncService } from './calendar-sync.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';

@Controller()
export class CalendarSyncController {
  constructor(private readonly calendarSyncService: CalendarSyncService) {}

  @Post('calendar-events/:id/sync')
  async syncEvent(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { provider: string },
  ): Promise<any> {
    return this.calendarSyncService.syncEventToExternal(tenant.userId, id, body.provider);
  }

  @Post('integrations/calendar/connect')
  async connectCalendar(
    @Tenant() tenant: TenantContext,
    @Body() body: { provider: string; accessToken: string; refreshToken?: string; expiresAt?: string },
  ): Promise<any> {
    return this.calendarSyncService.connectProvider(tenant.userId, body.provider, {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  @Get('integrations/connections')
  async getConnections(@Tenant() tenant: TenantContext): Promise<any> {
    return this.calendarSyncService.getConnections(tenant.userId);
  }
}
