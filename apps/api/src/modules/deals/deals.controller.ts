import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { DealsService } from './deals.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';
import {
  createDealSchema,
  updateDealSchema,
  updateDealFieldsSchema,
} from '@deal-coordinator/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';

const transitionSchema = z.object({
  targetStage: z.string(),
  reason: z.string().optional(),
});

@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  async list(
    @Tenant() tenant: TenantContext,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('stage') stage?: string,
    @Query('dealType') dealType?: string,
  ): Promise<any> {
    return this.dealsService.list(tenant.workspaceId, {
      stage,
      dealType,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post()
  async create(
    @Tenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(createDealSchema))
    body: {
      dealType: string;
      title?: string;
      address?: string;
      description?: string;
      primaryContactName?: string;
      propertyAddress?: string;
    },
  ): Promise<any> {
    return this.dealsService.create(
      tenant.workspaceId,
      body,
      tenant.userId,
      tenant.requestId,
    );
  }

  @Get(':id/folders')
  async listFolders(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<any> {
    return this.dealsService.getFoldersForDeal(tenant.workspaceId, id);
  }

  @Get(':id')
  async findOne(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<any> {
    return this.dealsService.findById(tenant.workspaceId, id);
  }

  @Patch(':id')
  async update(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDealSchema)) body: Record<string, any>,
  ): Promise<any> {
    return this.dealsService.update(
      tenant.workspaceId,
      id,
      body,
      tenant.userId,
      tenant.requestId,
    );
  }

  @Patch(':id/fields')
  async upsertFields(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDealFieldsSchema))
    body: Record<string, { value: unknown; source: string; confidence: string }>,
  ) {
    return this.dealsService.upsertFields(
      tenant.workspaceId,
      id,
      body,
      tenant.userId,
      tenant.requestId,
    );
  }

  @Post(':id/transition')
  async transition(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(transitionSchema))
    body: { targetStage: string; reason?: string },
  ): Promise<any> {
    return this.dealsService.transition(
      tenant.workspaceId,
      id,
      body.targetStage,
      tenant.userId,
      tenant.role,
      tenant.requestId,
      body.reason,
    );
  }
}
