import { Controller, Post, Body, Logger } from '@nestjs/common';
import { SignaturesService } from './signatures.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('webhooks')
export class DocuSignWebhookController {
  private readonly logger = new Logger(DocuSignWebhookController.name);

  constructor(
    private readonly signaturesService: SignaturesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('docusign')
  async handleWebhook(@Body() body: any): Promise<any> {
    this.logger.log(`DocuSign webhook: ${body.event}`);

    const envelopeId = body.data?.envelopeId ?? body.envelopeId;
    if (!envelopeId) {
      return { received: true, skipped: true };
    }

    const envelope = await this.prisma.signatureEnvelope.findFirst({
      where: { providerEnvelopeId: envelopeId },
    });

    if (!envelope) {
      this.logger.warn(`No envelope found for DocuSign ID: ${envelopeId}`);
      return { received: true, matched: false };
    }

    await this.signaturesService.syncEnvelopeStatus(
      envelope.workspaceId,
      envelope.id,
      'docusign-webhook',
      `webhook-ds-${Date.now()}`,
    );

    return { received: true, matched: true, envelopeId: envelope.id };
  }
}
