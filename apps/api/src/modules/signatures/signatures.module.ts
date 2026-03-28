import { Module, forwardRef } from '@nestjs/common';
import { SIGNATURE_PROVIDER } from './signature-provider.interface';
import { FakeSignatureProvider } from './fake-signature.provider';
import { DocuSignProvider } from './docusign.provider';
import { DocuSignWebhookController } from './docusign-webhook.controller';
import { SignaturesService } from './signatures.service';
import { SignaturesController } from './signatures.controller';
import { AuditModule } from '../audit/audit.module';
import { ReviewTasksModule } from '../review-tasks/review-tasks.module';
import { TasksModule } from '../tasks/tasks.module';
import { FileStorageModule } from '../file-storage/file-storage.module';

const signatureProvider = {
  provide: SIGNATURE_PROVIDER,
  useClass:
    process.env.DOCUSIGN_CLIENT_ID && process.env.DOCUSIGN_SECRET
      ? DocuSignProvider
      : FakeSignatureProvider,
};

@Module({
  imports: [
    AuditModule,
    ReviewTasksModule,
    FileStorageModule,
    forwardRef(() => TasksModule),
  ],
  controllers: [SignaturesController, DocuSignWebhookController],
  providers: [signatureProvider, SignaturesService],
  exports: [SignaturesService],
})
export class SignaturesModule {}
