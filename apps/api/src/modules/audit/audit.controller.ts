import { Controller, Get, Param, Query } from '@nestjs/common';
import type { AuditService } from './audit.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';

@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('deals/:dealId/audit-events')
  async listByDeal(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<any> {
    return this.auditService.listByDeal(
      tenant.workspaceId,
      dealId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }
}
