import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Header,
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';
import type { Template } from '@deal-coordinator/db';
import { TemplatesService } from './templates.service';
import { TemplateIngestionService } from './template-ingestion.service';
import { TemplateFieldsService } from './template-fields.service';

type UploadedPdfFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

@Controller('templates')
export class TemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly templateIngestionService: TemplateIngestionService,
    private readonly templateFieldsService: TemplateFieldsService,
  ) {}

  @Get()
  list(
    @Tenant() tenant: TenantContext,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('q') q?: string,
    @Query('documentType') documentType?: string,
    @Query('workflowKey') workflowKey?: string,
    @Query('scope') scope?: string,
    @Query('status') status?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const rawSize = parseInt(pageSizeStr ?? '50', 10) || 50;
    const pageSize = Math.min(200, Math.max(1, rawSize));
    const scopeNorm =
      scope === 'system' || scope === 'workspace' ? scope : 'all';
    return this.templatesService.listPaginated(tenant.workspaceId, {
      page,
      pageSize,
      q,
      documentType,
      workflowKey,
      scope: scopeNorm,
      status,
    });
  }

  @Post('ingest-global')
  ingestGlobal(
    @Tenant() tenant: TenantContext,
    @Body() body: { dryRun?: boolean },
  ) {
    if (tenant.role !== 'admin') {
      throw new ForbiddenException('Only workspace admins can ingest global templates');
    }
    return this.templateIngestionService.ingestGlobalTemplates({
      dryRun: body?.dryRun === true,
    });
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  upload(
    @Tenant() tenant: TenantContext,
    @UploadedFile() file: UploadedPdfFile | undefined,
    @Body() body: Record<string, string | undefined>,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('file is required');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only application/pdf is allowed');
    }

    let workflows: string[] = [];
    if (body.workflows?.trim()) {
      try {
        const parsed = JSON.parse(body.workflows) as unknown;
        workflows = Array.isArray(parsed)
          ? parsed.filter((x): x is string => typeof x === 'string')
          : [];
      } catch {
        throw new BadRequestException('workflows must be a JSON array of strings');
      }
    }

    let fieldMappingJson: Record<string, unknown> | null | undefined;
    if (body.fieldMappingJson?.trim()) {
      try {
        fieldMappingJson = JSON.parse(
          body.fieldMappingJson,
        ) as Record<string, unknown>;
      } catch {
        throw new BadRequestException('fieldMappingJson must be valid JSON');
      }
    }

    const isGlobal = body.isGlobal === 'true' || body.isGlobal === '1';
    if (!body.name?.trim() || !body.slug?.trim() || !body.documentType?.trim()) {
      throw new BadRequestException('name, slug, and documentType are required');
    }

    return this.templatesService.createFromUpload(tenant.workspaceId, {
      file: {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      },
      name: body.name,
      slug: body.slug,
      documentType: body.documentType,
      description: body.description,
      workflows,
      isGlobal,
      role: tenant.role,
      fieldMappingJson,
      jurisdiction: body.jurisdiction,
    });
  }

  @Post()
  create(
    @Tenant() tenant: TenantContext,
    @Body()
    body: {
      name: string;
      slug: string;
      documentType: string;
      description?: string;
      workflows?: string[];
      parentTemplateId?: string;
      notes?: string;
      tags?: string[];
      fieldMappingJson?: Record<string, unknown> | null;
    },
  ) {
    return this.templatesService.createWorkspaceTemplate(
      tenant.workspaceId,
      body,
    );
  }

  @Get(':id/versions')
  versions(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.templatesService.listVersions(tenant.workspaceId, id);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'inline')
  async streamPdf(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    const { buffer, fileName } = await this.templatesService.getLatestPdfBuffer(
      tenant.workspaceId,
      id,
    );
    const safeName = fileName.replace(/[\r\n"]/g, '_');
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${safeName}"`,
    });
  }

  @Post(':id/duplicate')
  duplicate(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { name: string; slug: string },
  ) {
    return this.templatesService.duplicateTemplate(
      tenant.workspaceId,
      id,
      body,
      tenant.role,
    );
  }

  @Get(':id/versions/:versionId/fields')
  listTemplateFields(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.templateFieldsService.listFields(tenant.workspaceId, id, versionId);
  }

  @Put(':id/versions/:versionId/fields')
  replaceTemplateFields(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: { fields: any[] },
  ) {
    return this.templateFieldsService.replaceFields(
      tenant.workspaceId,
      id,
      versionId,
      body.fields ?? [],
    );
  }

  @Post(':id/versions/:versionId/fields')
  addTemplateField(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: any,
  ) {
    return this.templateFieldsService.addField(tenant.workspaceId, id, versionId, body);
  }

  @Patch(':id/versions/:versionId/fields/:fieldId')
  patchTemplateField(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Param('fieldId') fieldId: string,
    @Body() body: any,
  ) {
    return this.templateFieldsService.updateField(
      tenant.workspaceId,
      id,
      versionId,
      fieldId,
      body,
    );
  }

  @Delete(':id/versions/:versionId/fields/:fieldId')
  deleteTemplateField(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Param('fieldId') fieldId: string,
  ) {
    return this.templateFieldsService.deleteField(
      tenant.workspaceId,
      id,
      versionId,
      fieldId,
    );
  }

  @Post(':id/versions/:versionId/detect-fields')
  detectTemplateFields(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.templateFieldsService.detectFields(tenant.workspaceId, id, versionId);
  }

  @Get(':id')
  getById(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.templatesService.getById(tenant.workspaceId, id);
  }

  @Patch(':id')
  patch(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string | null;
      status?: string;
      notes?: string | null;
      tags?: string[];
      fieldMappingJson?: Record<string, unknown> | null;
    },
  ): Promise<Template> {
    return this.templatesService.updateWorkspaceTemplate(
      tenant.workspaceId,
      id,
      body,
    );
  }
}
