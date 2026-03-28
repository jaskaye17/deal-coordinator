import { Controller, Get, Post, Param } from '@nestjs/common';
import { AcceptanceService } from './acceptance.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';

@Controller()
export class AcceptanceController {
  constructor(private readonly acceptanceService: AcceptanceService) {}

  @Post('offers/:offerId/prepare-acceptance')
  async prepareAcceptance(
    @Tenant() tenant: TenantContext,
    @Param('offerId') offerId: string,
  ): Promise<any> {
    return this.acceptanceService.prepareAcceptancePackage(
      tenant.workspaceId,
      offerId,
      tenant.userId,
      tenant.requestId,
    );
  }

  @Get('deals/:dealId/acceptance-documents')
  async listAcceptanceDocuments(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
  ): Promise<any> {
    return this.acceptanceService.listAcceptanceDocuments(
      tenant.workspaceId,
      dealId,
    );
  }
}
