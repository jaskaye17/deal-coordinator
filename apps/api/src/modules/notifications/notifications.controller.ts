import { Controller, Post, Param, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('deals/:dealId/notify-title')
  async notifyTitle(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Body() body: { recipientName?: string; recipientEmail?: string },
  ): Promise<any> {
    return this.notificationsService.notifyTitle(
      tenant.workspaceId,
      dealId,
      tenant.userId,
      tenant.requestId,
      body,
    );
  }

  @Post('deals/:dealId/notify-lender')
  async notifyLender(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Body() body: { recipientName?: string; recipientEmail?: string },
  ): Promise<any> {
    return this.notificationsService.notifyLender(
      tenant.workspaceId,
      dealId,
      tenant.userId,
      tenant.requestId,
      body,
    );
  }
}
