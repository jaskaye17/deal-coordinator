import { Controller, Post, Param, Body, UsePipes } from '@nestjs/common';
import type { DealQueryService } from './deal-query.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';
import { dealQuerySchema } from '@deal-coordinator/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller()
export class DealQueryController {
  constructor(private readonly dealQueryService: DealQueryService) {}

  @Post('deals/:dealId/query')
  @UsePipes(new ZodValidationPipe(dealQuerySchema))
  async query(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Body() body: { question: string },
  ) {
    return this.dealQueryService.query(
      tenant.workspaceId,
      dealId,
      body.question,
    );
  }
}
