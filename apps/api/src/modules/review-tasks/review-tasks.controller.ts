import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ReviewTasksService } from './review-tasks.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';

@Controller('review-tasks')
export class ReviewTasksController {
  constructor(private readonly reviewTasksService: ReviewTasksService) {}

  @Get()
  async list(
    @Tenant() tenant: TenantContext,
    @Query('status') status?: string,
    @Query('actionType') actionType?: string,
    @Query('dealId') dealId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<any> {
    return this.reviewTasksService.list(tenant.workspaceId, {
      status,
      actionType,
      dealId,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  async findOne(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<any> {
    return this.reviewTasksService.findById(tenant.workspaceId, id);
  }

  @Post(':id/approve')
  async approve(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ): Promise<any> {
    return this.reviewTasksService.approve(
      tenant.workspaceId,
      id,
      tenant.userId,
      tenant.requestId,
      body.notes,
    );
  }

  @Post(':id/reject')
  async reject(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ): Promise<any> {
    return this.reviewTasksService.reject(
      tenant.workspaceId,
      id,
      tenant.userId,
      tenant.requestId,
      body.notes,
    );
  }

  @Post(':id/request-changes')
  async requestChanges(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ): Promise<any> {
    return this.reviewTasksService.requestChanges(
      tenant.workspaceId,
      id,
      tenant.userId,
      tenant.requestId,
      body.notes,
    );
  }

  @Post(':id/hold')
  async hold(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ): Promise<any> {
    return this.reviewTasksService.hold(
      tenant.workspaceId,
      id,
      tenant.userId,
      tenant.requestId,
      body.notes,
    );
  }
}
