import {
  Controller,
  Get,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import { SignaturesService } from './signatures.service';
import { ReviewTasksService } from '../review-tasks/review-tasks.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';
import { AppError } from '@deal-coordinator/shared';

@Controller()
export class SignaturesController {
  constructor(
    private readonly signaturesService: SignaturesService,
    private readonly reviewTasksService: ReviewTasksService,
  ) {}

  @Post('review-tasks/:id/send')
  async sendFromReviewTask(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<any> {
    const reviewTask = await this.reviewTasksService.findById(tenant.workspaceId, id);

    const payload = reviewTask.payloadJson as {
      recipients?: Array<{ name: string; email: string; role: string }>;
      documentIds?: string[];
    } | null;

    if (!payload?.recipients || !payload?.documentIds) {
      throw new AppError(
        'VALIDATION_ERROR',
        422,
        'Review task payload must contain recipients and documentIds',
      );
    }

    const envelope = await this.signaturesService.createEnvelope(
      tenant.workspaceId,
      reviewTask.dealId,
      id,
      payload.recipients,
      payload.documentIds,
      tenant.userId,
      tenant.requestId,
    );

    const sent = await this.signaturesService.sendEnvelope(
      tenant.workspaceId,
      envelope.id,
      tenant.userId,
      tenant.requestId,
    );

    return sent;
  }

  @Get('signature-envelopes/:id')
  async findOne(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
  ): Promise<any> {
    return this.signaturesService.findEnvelopeById(tenant.workspaceId, id);
  }

  @Post('signature-envelopes/:id/simulate-status')
  async simulateStatus(
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { recipientEmail: string },
  ): Promise<any> {
    return this.signaturesService.simulateStatus(
      tenant.workspaceId,
      id,
      body.recipientEmail,
      tenant.userId,
      tenant.requestId,
    );
  }
}
