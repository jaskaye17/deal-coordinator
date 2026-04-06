import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import type { WorkspacesService } from './workspaces.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';
import { AppError } from '@deal-coordinator/shared';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get(':id')
  async findOne(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<any> {
    if (id !== tenant.workspaceId) {
      throw new AppError('FORBIDDEN', 403, 'Cannot access another workspace');
    }
    return this.workspacesService.findById(id);
  }

  @Patch(':id/settings')
  async updateSettings(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ): Promise<any> {
    if (id !== tenant.workspaceId) {
      throw new AppError('FORBIDDEN', 403, 'Cannot access another workspace');
    }
    return this.workspacesService.updateSettings(id, body);
  }
}
