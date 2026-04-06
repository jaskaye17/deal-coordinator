import { Controller, Get, Header, Post, Param, Query, StreamableFile } from '@nestjs/common';
import type { DocumentsService } from './documents.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';

@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('deals/:dealId/documents/:documentId/viewer')
  async getViewer(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documentsService.getViewerContext(
      tenant.workspaceId,
      dealId,
      documentId,
    );
  }

  @Get('deals/:dealId/documents/:documentId/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'inline')
  async streamPdf(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Param('documentId') documentId: string,
  ): Promise<StreamableFile> {
    const buffer = await this.documentsService.getDocumentPdfBuffer(
      tenant.workspaceId,
      dealId,
      documentId,
    );
    return new StreamableFile(buffer);
  }

  @Get('deals/:dealId/documents')
  async listByDeal(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.documentsService.listByDeal(
      tenant.workspaceId,
      dealId,
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Post('deals/:dealId/documents/generate')
  async generateForDeal(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
  ) {
    return this.documentsService.generateForDeal(
      tenant.workspaceId,
      dealId,
      tenant.userId,
      tenant.requestId,
    );
  }

  @Get('documents/:documentId/versions')
  async getVersions(
    @Tenant() tenant: TenantContext,
    @Param('documentId') documentId: string,
  ): Promise<any> {
    return this.documentsService.getVersions(
      tenant.workspaceId,
      documentId,
    );
  }

  @Post('documents/:documentId/regenerate')
  async regenerateDocument(
    @Tenant() tenant: TenantContext,
    @Param('documentId') documentId: string,
  ): Promise<any> {
    return this.documentsService.regenerateDocument(
      tenant.workspaceId,
      documentId,
      tenant.userId,
      tenant.requestId,
    );
  }
}
