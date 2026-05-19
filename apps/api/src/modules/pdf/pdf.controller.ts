import { Controller, Post, Param, Body } from '@nestjs/common';
import { PDFService } from './pdf.service';
import { Tenant } from '../../common/decorators/tenant.decorator';
import type { TenantContext } from '@deal-coordinator/shared';

@Controller()
export class PDFController {
  constructor(private readonly pdfService: PDFService) {}

  @Post('deals/:dealId/generate-pdf')
  async generatePdf(
    @Tenant() tenant: TenantContext,
    @Param('dealId') dealId: string,
    @Body() body: { templateId: string; fieldData: Record<string, string> },
  ): Promise<any> {
    return this.pdfService.fillPdf(
      tenant.workspaceId,
      dealId,
      body.templateId,
      body.fieldData,
      tenant.userId,
      tenant.requestId,
    );
  }
}
