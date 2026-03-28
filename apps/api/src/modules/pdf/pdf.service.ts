import { Inject, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  FILE_STORAGE_PROVIDER,
  type FileStorageProvider,
} from '../file-storage/file-storage.interface';
import { resolveDealDataSource } from '../../common/deal-data-source.util';

type TemplateLike = {
  id: string;
  name: string;
  documentType: string;
  fieldMappingJson?: unknown;
};

const DEAL_DOC_FOLDER = 'root/contracts';

@Injectable()
export class PDFService {
  private readonly logger = new Logger(PDFService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly storageProvider: FileStorageProvider,
  ) {}

  private async loadPdfBytesFromStorage(storageKey: string): Promise<Uint8Array | null> {
    const ref = await this.storageProvider.getSignedUrl(storageKey);
    if (ref.startsWith('http://') || ref.startsWith('https://')) {
      try {
        const response = await fetch(ref);
        if (!response.ok) return null;
        return new Uint8Array(await response.arrayBuffer());
      } catch {
        return null;
      }
    }
    try {
      const buf = await fs.readFile(ref);
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }

  async fillPdf(
    workspaceId: string,
    dealId: string,
    templateId: string,
    fieldData: Record<string, string>,
    actorId: string,
    requestId: string,
  ): Promise<any> {
    const template = await this.prisma.template.findFirst({
      where: {
        id: templateId,
        status: 'active',
        OR: [{ workspaceId: null, isSystemTemplate: true }, { workspaceId }],
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: { fields: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: { fields: true },
    });
    if (!deal) {
      throw new Error('Deal not found');
    }

    const ver = template.versions[0];
    const templateFields = ver?.fields ?? [];

    const resolved: Record<string, string> = { ...fieldData };
    for (const tf of templateFields) {
      const fromDeal = resolveDealDataSource(deal, deal.fields, tf.dataSourceKey);
      const v =
        fromDeal ||
        tf.defaultValue ||
        resolved[tf.name] ||
        '';
      if (v) resolved[tf.name] = v;
    }

    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

    let pdfBytes: Uint8Array;
    const mapping = (template.fieldMappingJson as Record<string, string>) ?? {};

    if (ver?.storageKey) {
      const raw = await this.loadPdfBytesFromStorage(ver.storageKey);
      if (raw) {
        try {
          const existingPdf = await PDFDocument.load(raw);
          const form = existingPdf.getForm();

          for (const [pdfFieldName, templateKey] of Object.entries(mapping)) {
            const valueKey = templateKey.replace(/\{\{(\w+)\}\}/g, '$1');
            const value =
              resolved[valueKey] ?? resolved[pdfFieldName] ?? fieldData[valueKey] ?? '';
            try {
              const field = form.getTextField(pdfFieldName);
              field.setText(value);
            } catch {
              this.logger.debug(`PDF text field "${pdfFieldName}" not found, skipping`);
            }
          }

          const needsTextOverlay = new Set<string>();
          for (const tf of templateFields) {
            if (tf.type !== 'text' && tf.type !== 'checkbox') continue;
            const value = resolved[tf.name] ?? tf.defaultValue ?? '';
            if (tf.type === 'checkbox') {
              try {
                const cb = form.getCheckBox(tf.name);
                if (value === 'true' || value === 'yes' || value === '1' || value === 'on') {
                  cb.check();
                } else {
                  cb.uncheck();
                }
              } catch {
                /* no matching widget */
              }
            } else {
              try {
                form.getTextField(tf.name).setText(String(value));
              } catch {
                needsTextOverlay.add(tf.name);
              }
            }
          }

          const font = await existingPdf.embedFont(StandardFonts.Helvetica);
          for (const tf of templateFields) {
            if (tf.type !== 'text' || !needsTextOverlay.has(tf.name)) continue;
            const val = String(resolved[tf.name] ?? tf.defaultValue ?? '');
            if (!val) continue;
            const pages = existingPdf.getPages();
            const page = pages[tf.pageIndex] ?? pages[0];
            if (!page) continue;
            const r = tf.rect as { x: number; y: number; width: number; height: number };
            try {
              page.drawText(val, {
                x: r.x,
                y: r.y,
                size: Math.min(11, Math.max(8, r.height * 0.65)),
                maxWidth: r.width,
                font,
                color: rgb(0, 0, 0),
              });
            } catch (e) {
              this.logger.debug(`Overlay text for ${tf.name} failed: ${e}`);
            }
          }

          try {
            form.flatten();
          } catch {
            /* non-form PDF */
          }
          pdfBytes = await existingPdf.save();
        } catch (err) {
          this.logger.warn(`AcroForm / overlay fill failed, falling back: ${err}`);
          pdfBytes = await this.createOverlayPdf(template, resolved);
        }
      } else {
        pdfBytes = await this.createOverlayPdf(template, resolved);
      }
    } else {
      pdfBytes = await this.createOverlayPdf(template, resolved);
    }

    const filename = `${template.documentType}_filled_${Date.now()}.pdf`;
    const content = Buffer.from(pdfBytes);

    const fileUrl = await this.storageProvider.storeFile(
      workspaceId,
      dealId,
      DEAL_DOC_FOLDER,
      filename,
      content,
    );

    let document = await this.prisma.document.findFirst({
      where: { dealId, workspaceId, templateId },
    });

    if (!document) {
      document = await this.prisma.document.create({
        data: {
          dealId,
          workspaceId,
          templateId,
          documentType: template.documentType,
          name: template.name,
          status: 'draft',
          currentVersionNumber: 0,
          requiresReview: true,
        },
      });
    }

    const newVersion = document.currentVersionNumber + 1;

    await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        workspaceId,
        versionNumber: newVersion,
        fileUrl,
        generatedFromFieldsJson: resolved,
        createdByActorType: 'system',
        createdByActorId: actorId,
        changeSummary: 'PDF generated from template',
      },
    });

    const updated = await this.prisma.document.update({
      where: { id: document.id },
      data: { currentVersionNumber: newVersion, latestFileUrl: fileUrl, status: 'draft' },
    });

    await this.auditService.create({
      workspaceId,
      dealId,
      action: 'document_created',
      objectType: 'Document',
      objectId: document.id,
      actorType: 'user',
      actorId,
      after: updated,
      metadata: {
        templateId,
        templateName: template.name,
        fieldCount: Object.keys(resolved).length,
      },
      requestId,
    });

    return updated;
  }

  private async createOverlayPdf(
    template: TemplateLike,
    fieldData: Record<string, string>,
  ): Promise<Uint8Array> {
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

    let page = doc.addPage([612, 792]);
    let y = 740;

    page.drawText(template.name ?? 'Document', {
      x: 50,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 30;

    const mappings = (template.fieldMappingJson as Record<string, string>) ?? {};
    const fieldEntries =
      Object.keys(mappings).length > 0
        ? Object.entries(mappings)
        : Object.entries(fieldData).map(([k]) => [k, `{{${k}}}`] as [string, string]);

    for (const [label, templateKey] of fieldEntries) {
      if (y < 60) {
        page = doc.addPage([612, 792]);
        y = 740;
      }

      const valueKey = (templateKey as string).replace(/\{\{(\w+)\}\}/g, '$1');
      const value = fieldData[valueKey] ?? fieldData[label] ?? '(not provided)';

      page.drawText(`${label}:`, { x: 50, y, size: 11, font: boldFont, color: rgb(0, 0, 0) });
      page.drawText(String(value), { x: 200, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
      y -= 20;
    }

    return doc.save();
  }
}
