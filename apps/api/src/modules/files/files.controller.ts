import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { FileRoutingKind, TenantContext } from '@deal-coordinator/shared';

@Controller()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('folders')
  async listFolders(
    @Tenant() tenant: TenantContext,
    @Query('dealId') dealId?: string,
    @Query('parentId') parentId?: string,
    @Query('scope') scope?: string,
  ): Promise<any> {
    return this.filesService.listFolders(tenant.workspaceId, { dealId, parentId, scope });
  }

  @Post('folders')
  async createFolder(
    @Tenant() tenant: TenantContext,
    @Body() body: { name: string; dealId?: string; parentId?: string; scope?: string },
  ): Promise<any> {
    return this.filesService.createFolder(tenant.workspaceId, body, tenant.userId, tenant.requestId);
  }

  @Delete('folders/:id')
  async deleteFolder(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<any> {
    await this.filesService.deleteFolder(tenant.workspaceId, id, tenant.userId, tenant.requestId);
    return { success: true };
  }

  @Get('folders/tree')
  async getFolderTree(@Tenant() tenant: TenantContext): Promise<any> {
    return this.filesService.getFolderTree(tenant.workspaceId);
  }

  @Get('folders/:id/contents')
  async getFolderContents(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Query('filePage') filePage?: string,
    @Query('filePageSize') filePageSize?: string,
  ): Promise<any> {
    return this.filesService.getFolderContents(tenant.workspaceId, id, {
      filePage:
        filePage !== undefined && filePage !== '' && Number.isFinite(Number(filePage))
          ? parseInt(filePage, 10)
          : undefined,
      filePageSize:
        filePageSize !== undefined && filePageSize !== '' && Number.isFinite(Number(filePageSize))
          ? parseInt(filePageSize, 10)
          : undefined,
    });
  }

  @Get('folders/:id/files')
  async listFolderFiles(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<any> {
    return this.filesService.listFilesInFolder(tenant.workspaceId, id);
  }

  @Get('files')
  async listFiles(
    @Tenant() tenant: TenantContext,
    @Query('dealId') dealId?: string,
    @Query('folderId') folderId?: string,
    @Query('scope') scope?: string,
  ): Promise<any> {
    return this.filesService.listFiles(tenant.workspaceId, { dealId, folderId, scope });
  }

  @Post('files/upload')
  async uploadFile(
    @Tenant() tenant: TenantContext,
    @Body() body: {
      fileName: string;
      content: string;
      mimeType?: string;
      dealId?: string;
      folderId?: string;
      scope?: string;
      routingKind?: FileRoutingKind;
    },
  ): Promise<any> {
    const buffer = Buffer.from(body.content, 'base64');
    return this.filesService.uploadFile(
      tenant.workspaceId,
      { ...body, content: buffer },
      tenant.userId,
      tenant.requestId,
    );
  }

  @Get('files/:id/content')
  async streamFileAsset(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    const { buffer, mimeType, fileName } = await this.filesService.getFileAssetBuffer(
      tenant.workspaceId,
      id,
    );
    const type = mimeType?.trim() || 'application/octet-stream';
    const safeName = fileName.replace(/[\r\n"]/g, '_');
    return new StreamableFile(buffer, {
      type,
      disposition: `inline; filename="${safeName}"`,
    });
  }

  @Get('files/:id/url')
  async getFileUrl(@Param('id') id: string): Promise<any> {
    const url = await this.filesService.getFileUrl(id);
    return { url };
  }

  @Get('files/:id')
  async getFileAsset(@Tenant() tenant: TenantContext, @Param('id') id: string): Promise<any> {
    return this.filesService.getFileAssetMeta(tenant.workspaceId, id);
  }

  @Delete('files/:id')
  async deleteFile(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<any> {
    await this.filesService.deleteFile(tenant.workspaceId, id, tenant.userId, tenant.requestId);
    return { success: true };
  }
}
