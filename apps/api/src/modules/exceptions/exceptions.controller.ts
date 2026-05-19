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
import { ExceptionsService } from './exceptions.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';
import {
  createExceptionSchema,
  updateExceptionSchema,
} from '@deal-coordinator/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller()
export class ExceptionsController {
  constructor(private readonly exceptionsService: ExceptionsService) {}

  @Get('deals/:dealId/exceptions')
  async listByDeal(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.exceptionsService.listByDeal(
      tenant.workspaceId,
      dealId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Post('deals/:dealId/exceptions')
  async create(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Body(new ZodValidationPipe(createExceptionSchema))
    body: { dealId: string; title: string; description: string; severity: string },
  ) {
    return this.exceptionsService.create(
      tenant.workspaceId,
      { ...body, dealId },
      tenant.userId,
      tenant.requestId,
    );
  }

  @Patch('exceptions/:id')
  @UsePipes(new ZodValidationPipe(updateExceptionSchema))
  async update(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { status: string; resolution?: string },
  ) {
    return this.exceptionsService.update(
      tenant.workspaceId,
      id,
      body,
      tenant.userId,
      tenant.requestId,
    );
  }
}
