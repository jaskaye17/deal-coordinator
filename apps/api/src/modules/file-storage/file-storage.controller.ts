import { Controller, Get, Post, Param } from '@nestjs/common';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';
import { FileStorageService } from './file-storage.service';

@Controller('deals/:dealId')
export class FileStorageController {
  constructor(private readonly fileStorageService: FileStorageService) {}

  @Post('folders/initialize')
  async initializeFolders(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
  ): Promise<{ folders: string[] }> {
    const folders = await this.fileStorageService.initializeDealFolders(
      tenant.workspaceId,
      dealId,
      tenant.userId,
      tenant.requestId,
    );
    return { folders };
  }

  @Get('files')
  async listFiles(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
  ): Promise<{ files: { path: string; name: string; folder: string }[] }> {
    const files = await this.fileStorageService.listFiles(
      tenant.workspaceId,
      dealId,
    );
    return { files };
  }
}
