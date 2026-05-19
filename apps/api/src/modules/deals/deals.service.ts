import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { FilesService } from '../files/files.service';
import {
  AppError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  generateDealName,
} from '@deal-coordinator/shared';
import type { DealStage, DealType } from '@deal-coordinator/shared';
import { validateTransition } from '@deal-coordinator/workflow';
import { reserveUniqueDealSlug } from './deal-slug.util';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly filesService: FilesService,
  ) {}

  async list(
    workspaceId: string,
    filters: { stage?: string; dealType?: string; page?: number; pageSize?: number },
  ): Promise<{ items: any[]; meta: { page: number; pageSize: number; total: number } }> {
    const page = filters.page ?? 1;
    const take = Math.min(filters.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = (page - 1) * take;

    const where: any = { workspaceId };
    if (filters.stage) where.stage = filters.stage;
    if (filters.dealType) where.dealType = filters.dealType;

    const [items, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.deal.count({ where }),
    ]);

    return { items, meta: { page, pageSize: take, total } };
  }

  async findById(workspaceId: string, dealId: string): Promise<any> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: {
        parties: true,
        fields: true,
        assignments: { include: { user: true } },
      },
    });

    if (!deal) {
      throw new AppError('NOT_FOUND', 404, 'Deal not found');
    }

    return deal;
  }

  async getFoldersForDeal(workspaceId: string, dealId: string): Promise<any[]> {
    await this.findById(workspaceId, dealId);
    return this.filesService.getDealFolderTreeForDeal(workspaceId, dealId);
  }

  async create(
    workspaceId: string,
    data: {
      dealType: string;
      title?: string;
      address?: string;
      description?: string;
      primaryContactName?: string;
      propertyAddress?: string;
    },
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const primaryContactName =
      data.primaryContactName?.trim() || data.title?.trim() || 'New deal';
    const propertyAddress =
      data.propertyAddress?.trim() || data.address?.trim() || 'Unknown property';
    const { displayName, slug: baseSlug } = generateDealName({
      primaryContactName,
      propertyAddress,
    });
    const slug = await reserveUniqueDealSlug(this.prisma.deal, workspaceId, baseSlug);

    const deal = await this.prisma.deal.create({
      data: {
        workspaceId,
        dealType: data.dealType,
        title: data.title ?? displayName,
        address: data.address ?? propertyAddress,
        description: data.description,
        displayName,
        slug,
        propertyAddress,
        primaryContactName,
        stage: 'new_intake',
      },
    });

    await this.filesService.ensureDefaultDealFolders(
      workspaceId,
      deal.id,
      actorId,
      requestId,
      'default',
    );

    await this.auditService.create({
      workspaceId,
      dealId: deal.id,
      action: 'deal_created',
      objectType: 'Deal',
      objectId: deal.id,
      actorType: 'user',
      actorId,
      after: deal,
      requestId,
    });

    return deal;
  }

  async update(
    workspaceId: string,
    dealId: string,
    data: Record<string, any>,
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const existing = await this.findById(workspaceId, dealId);

    const deal = await this.prisma.deal.update({
      where: { id: dealId },
      data,
    });

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'deal_updated',
      objectType: 'Deal',
      objectId: dealId,
      actorType: 'user',
      actorId,
      before: existing,
      after: deal,
      requestId,
    });

    return deal;
  }

  async upsertFields(
    workspaceId: string,
    dealId: string,
    fields: Record<string, { value: unknown; source: string; confidence: string }>,
    actorId: string,
    requestId: string,
  ) {
    await this.findById(workspaceId, dealId);

    const results = [];
    for (const [fieldName, fieldData] of Object.entries(fields)) {
      const confidenceNum =
        fieldData.confidence === 'high' ? 1.0 : fieldData.confidence === 'medium' ? 0.7 : 0.3;

      const existing = await this.prisma.dealField.findUnique({
        where: { dealId_fieldName: { dealId, fieldName } },
      });

      const field = await this.prisma.dealField.upsert({
        where: { dealId_fieldName: { dealId, fieldName } },
        create: {
          dealId,
          workspaceId,
          fieldName,
          fieldValue: String(fieldData.value),
          source: fieldData.source,
          confidence: confidenceNum,
          needsConfirmation: fieldData.confidence !== 'high',
        },
        update: {
          fieldValue: String(fieldData.value),
          source: fieldData.source,
          confidence: confidenceNum,
          needsConfirmation: fieldData.confidence !== 'high',
        },
      });

      await this.auditService.create({
        workspaceId,
        dealId,
        action: 'field_updated',
        objectType: 'DealField',
        objectId: field.id,
        actorType: 'user',
        actorId,
        before: existing,
        after: field,
        requestId,
      });

      results.push(field);
    }

    return results;
  }

  async transition(
    workspaceId: string,
    dealId: string,
    targetStage: string,
    actorId: string,
    actorRole: string,
    requestId: string,
    reason?: string,
  ): Promise<any> {
    const deal = await this.findById(workspaceId, dealId);

    const result = validateTransition({
      dealType: deal.dealType as DealType,
      currentStage: deal.stage as DealStage,
      targetStage: targetStage as DealStage,
      actor: { role: actorRole, userId: actorId },
      reason,
    });

    if (!result.allowed) {
      throw new AppError(
        'VALIDATION_ERROR',
        422,
        result.reason ?? 'Transition not allowed',
      );
    }

    const updated = await this.prisma.deal.update({
      where: { id: dealId },
      data: { stage: targetStage },
    });

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'deal_stage_changed',
      objectType: 'Deal',
      objectId: dealId,
      actorType: 'user',
      actorId,
      before: { stage: deal.stage },
      after: { stage: targetStage },
      metadata: { reason, override: result.override ?? false },
      requestId,
    });

    if (result.override) {
      await this.auditService.create({
        workspaceId,
        dealId,
        action: 'admin_override',
        objectType: 'Deal',
        objectId: dealId,
        actorType: 'user',
        actorId,
        metadata: {
          transition: `${deal.stage} -> ${targetStage}`,
          reason,
          guardReason: result.reason,
        },
        requestId,
      });
    }

    return updated;
  }
}
