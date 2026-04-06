import { Controller, Get, Patch, Param, Query, Body } from '@nestjs/common';
import type { UnresolvedItemsService } from './unresolved-items.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';

@Controller()
export class UnresolvedItemsController {
  constructor(private readonly unresolvedItemsService: UnresolvedItemsService) {}

  @Get('deals/:dealId/unresolved-items')
  async listByDeal(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.unresolvedItemsService.listByDeal(
      tenant.workspaceId,
      dealId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Patch('unresolved-items/:id')
  async update(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.unresolvedItemsService.update(
      tenant.workspaceId,
      id,
      body,
      tenant.userId,
      tenant.requestId,
    );
  }
}
