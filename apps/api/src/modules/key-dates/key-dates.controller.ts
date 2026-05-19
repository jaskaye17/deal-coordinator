import { Controller, Post, Param } from '@nestjs/common';
import { KeyDatesService } from './key-dates.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';

@Controller()
export class KeyDatesController {
  constructor(private readonly keyDatesService: KeyDatesService) {}

  @Post('deals/:dealId/extract-key-dates')
  async extractKeyDates(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
  ) {
    return this.keyDatesService.extractAndCreateEvents(
      tenant.workspaceId,
      dealId,
      tenant.userId,
      tenant.requestId,
    );
  }
}
