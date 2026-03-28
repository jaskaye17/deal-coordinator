import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { OfferComparisonService } from '../offer-comparison/offer-comparison.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';

@Controller()
export class OffersController {
  constructor(
    private readonly offersService: OffersService,
    private readonly comparisonService: OfferComparisonService,
  ) {}

  @Get('deals/:dealId/offers')
  async list(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<any> {
    return this.offersService.list(
      tenant.workspaceId,
      dealId,
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Post('deals/:dealId/offers')
  async create(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Body() body: {
      offerLabel?: string;
      buyerName?: string;
      buyerEntityName?: string;
      buyerAgent?: string;
      offerPrice?: number;
      earnestMoney?: number;
      financingType?: string;
      optionPeriodDays?: number;
      closeDate?: string;
      terms?: string;
      notes?: string;
    },
  ): Promise<any> {
    const offer = await this.offersService.create(
      tenant.workspaceId,
      dealId,
      body,
      tenant.userId,
      tenant.requestId,
    );

    try {
      await this.offersService.triggerExtraction(
        tenant.workspaceId,
        offer.id,
        tenant.userId,
        tenant.requestId,
      );
    } catch {
      // extraction is best-effort at intake
    }

    return this.offersService.findById(tenant.workspaceId, offer.id);
  }

  @Get('deals/:dealId/offers/compare')
  async compare(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
  ): Promise<any> {
    return this.comparisonService.compare(tenant.workspaceId, dealId);
  }

  @Get('offers/:offerId')
  async findOne(
    @Tenant() tenant: TenantContext,
    @Param('offerId') offerId: string,
  ): Promise<any> {
    return this.offersService.findById(tenant.workspaceId, offerId);
  }

  @Patch('offers/:offerId')
  async update(
    @Tenant() tenant: TenantContext,
    @Param('offerId') offerId: string,
    @Body() body: Record<string, unknown>,
  ): Promise<any> {
    return this.offersService.update(
      tenant.workspaceId,
      offerId,
      body,
      tenant.userId,
      tenant.requestId,
    );
  }

  @Post('offers/:offerId/shortlist')
  async shortlist(
    @Tenant() tenant: TenantContext,
    @Param('offerId') offerId: string,
  ): Promise<any> {
    return this.offersService.shortlist(
      tenant.workspaceId,
      offerId,
      tenant.userId,
      tenant.requestId,
    );
  }

  @Post('offers/:offerId/select')
  async select(
    @Tenant() tenant: TenantContext,
    @Param('offerId') offerId: string,
  ): Promise<any> {
    return this.offersService.select(
      tenant.workspaceId,
      offerId,
      tenant.userId,
      tenant.requestId,
    );
  }

  @Post('offers/:offerId/reject')
  async reject(
    @Tenant() tenant: TenantContext,
    @Param('offerId') offerId: string,
    @Body() body: { notes?: string },
  ): Promise<any> {
    return this.offersService.reject(
      tenant.workspaceId,
      offerId,
      tenant.userId,
      tenant.requestId,
      body.notes,
    );
  }

  @Post('offers/:offerId/files')
  async addFile(
    @Tenant() tenant: TenantContext,
    @Param('offerId') offerId: string,
    @Body() body: { fileName: string; fileType?: string; versionLabel?: string; content: string },
  ): Promise<any> {
    return this.offersService.addFile(
      tenant.workspaceId,
      offerId,
      body,
      tenant.userId,
      tenant.requestId,
    );
  }

  @Get('offers/:offerId/files')
  async listFiles(
    @Tenant() tenant: TenantContext,
    @Param('offerId') offerId: string,
  ): Promise<any> {
    return this.offersService.listFiles(tenant.workspaceId, offerId);
  }
}
