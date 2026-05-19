import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '@deal-coordinator/shared';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(workspaceId: string): Promise<any> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { settings: true },
    });

    if (!workspace) {
      throw new AppError('NOT_FOUND', 404, 'Workspace not found');
    }

    return workspace;
  }

  async updateSettings(
    workspaceId: string,
    data: {
      confidenceThresholdHigh?: number;
      confidenceThresholdMedium?: number;
      reviewGatePolicy?: any;
      auditRetentionYears?: number;
    },
  ): Promise<any> {
    return this.prisma.workspaceSettings.upsert({
      where: { workspaceId },
      update: data,
      create: { workspaceId, ...data },
    });
  }
}
