import { Controller, Get } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.workflowDefinition.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
