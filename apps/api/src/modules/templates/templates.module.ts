import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { TemplatesController } from './templates.controller';
import { WorkflowsController } from './workflows.controller';
import { TemplatesService } from './templates.service';
import { TemplateIngestionService } from './template-ingestion.service';
import { TemplateFieldDetectionService } from './template-field-detection.service';
import { TemplateFieldsService } from './template-fields.service';

@Module({
  imports: [PrismaModule, FileStorageModule],
  controllers: [TemplatesController, WorkflowsController],
  providers: [
    TemplatesService,
    TemplateIngestionService,
    TemplateFieldDetectionService,
    TemplateFieldsService,
  ],
  exports: [TemplatesService, TemplateIngestionService, TemplateFieldsService],
})
export class TemplatesModule {}
