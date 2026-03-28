import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { AuditModule } from '../audit/audit.module';
import { FormRulesModule } from '../form-rules/form-rules.module';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [AuditModule, FormRulesModule, FileStorageModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
