import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getStats(@Tenant() tenant: TenantContext): Promise<any> {
    return this.dashboardService.getStats(tenant.workspaceId);
  }
}
