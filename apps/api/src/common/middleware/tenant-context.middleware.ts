import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // CORS preflight does not send custom headers; do not require tenant on OPTIONS
    if (req.method === 'OPTIONS') {
      return next();
    }

    // If JWT guard already set tenant context, skip
    if ((req as any).tenantContext) {
      return next();
    }

    const workspaceId = req.headers['x-workspace-id'] as string | undefined;
    const userId = req.headers['x-user-id'] as string | undefined;

    if (!workspaceId || !userId) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Missing workspace or user headers' },
        requestId: (req as any).requestId,
      });
      return;
    }

    const membership = await this.prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!membership) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not a member of this workspace' },
        requestId: (req as any).requestId,
      });
      return;
    }

    (req as any).tenantContext = {
      workspaceId,
      userId,
      role: membership.role,
      requestId: (req as any).requestId,
    };

    next();
  }
}
