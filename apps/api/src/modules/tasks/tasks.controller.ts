import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';

@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('deals/:dealId/tasks')
  async listByDeal(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<any> {
    return this.tasksService.listByDeal(
      tenant.workspaceId,
      dealId,
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Patch('tasks/:id')
  async update(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: {
      status?: string;
      title?: string;
      description?: string;
      assignedTo?: string;
      dueDate?: string;
    },
  ): Promise<any> {
    return this.tasksService.update(
      tenant.workspaceId,
      id,
      body,
      tenant.userId,
      tenant.requestId,
    );
  }

  @Post('deals/:dealId/checklists/activate-listing-prep')
  async activateListingPrep(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
  ): Promise<any> {
    return this.tasksService.activateListingPrepChecklist(
      tenant.workspaceId,
      dealId,
      tenant.userId,
      tenant.requestId,
    );
  }
}
