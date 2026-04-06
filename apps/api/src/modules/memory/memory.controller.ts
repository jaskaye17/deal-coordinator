import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UsePipes,
} from '@nestjs/common';
import type { MemoryService } from './memory.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';
import { createMemorySchema } from '@deal-coordinator/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller()
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get('deals/:dealId/memory')
  async listByDeal(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.memoryService.listByDeal(
      tenant.workspaceId,
      dealId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Post('deals/:dealId/memory')
  @UsePipes(new ZodValidationPipe(createMemorySchema))
  async create(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Body() body: { content: string; scope: string; category?: string },
  ) {
    return this.memoryService.create(
      tenant.workspaceId,
      dealId,
      body,
      tenant.userId,
      tenant.requestId,
    );
  }

  @Patch('memory/:id')
  async update(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { content?: string; scope?: string; category?: string },
  ) {
    return this.memoryService.update(
      tenant.workspaceId,
      id,
      body,
      tenant.userId,
      tenant.requestId,
    );
  }
}
