import { Module } from '@nestjs/common';
import { FILE_STORAGE_PROVIDER } from './file-storage.interface';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import { FileStorageService } from './file-storage.service';
import { FileStorageController } from './file-storage.controller';
import { AuditModule } from '../audit/audit.module';

const storageProvider = {
  provide: FILE_STORAGE_PROVIDER,
  useClass: process.env.STORAGE_DRIVER === 's3' ? S3StorageProvider : LocalStorageProvider,
};

@Module({
  imports: [AuditModule],
  controllers: [FileStorageController],
  providers: [storageProvider, FileStorageService],
  exports: [FileStorageService, FILE_STORAGE_PROVIDER],
})
export class FileStorageModule {}
