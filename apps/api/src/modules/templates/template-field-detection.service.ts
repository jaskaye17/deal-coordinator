import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { PDFField } from 'pdf-lib';

export type DetectedTemplateField = {
  name: string;
  type: 'text' | 'checkbox' | 'signature';
  pageIndex: number;
  rect: { x: number; y: number; width: number; height: number };
  defaultValue?: string;
};

@Injectable()
export class TemplateFieldDetectionService {
  private readonly logger = new Logger(TemplateFieldDetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async detectFromBuffer(buf: Buffer): Promise<DetectedTemplateField[]> {
    const { PDFDocument } = await import('pdf-lib');
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
    const pages = pdf.getPages();
    const pageHeight = pages[0]?.getHeight() ?? 792;

    const out: DetectedTemplateField[] = [];
    const seen = new Set<string>();

    try {
      const form = pdf.getForm();
      const fields = form.getFields();
      let stack = 0;
      for (const field of fields) {
        const name = field.getName();
        if (seen.has(name)) continue;
        seen.add(name);
        const type = this.inferFieldType(field);
        const rect = this.firstWidgetRect(field) ?? {
          x: 72,
          y: pageHeight - 120 - stack * 28,
          width: 220,
          height: 18,
        };
        stack += 1;
        let defaultValue: string | undefined;
        try {
          if (this.isPdfTextField(field)) {
            defaultValue = (field as { getText?: () => string }).getText?.() ?? undefined;
          }
        } catch {
          /* ignore */
        }
        out.push({
          name,
          type,
          pageIndex: 0,
          rect,
          defaultValue,
        });
      }
    } catch (e) {
      this.logger.debug(`AcroForm detection skipped: ${e}`);
    }

    const raw = buf.toString('latin1');
    const re = /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g;
    let m: RegExpExecArray | null;
    let ph = 0;
    while ((m = re.exec(raw)) !== null) {
      const name = m[1];
      if (!name) continue;
      const key = `ph:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        name,
        type: 'text',
        pageIndex: 0,
        rect: {
          x: 72,
          y: pageHeight - 160 - ph * 22,
          width: 240,
          height: 14,
        },
        defaultValue: '',
      });
      ph += 1;
    }

    return out;
  }

  async persistForVersion(templateVersionId: string, buf: Buffer) {
    const detected = await this.detectFromBuffer(buf);
    await this.prisma.templateField.deleteMany({ where: { templateVersionId } });
    if (!detected.length) return [];
    await this.prisma.templateField.createMany({
      data: detected.map((d, i) => ({
        templateVersionId,
        name: d.name,
        type: d.type,
        pageIndex: d.pageIndex,
        rect: d.rect as object,
        defaultValue: d.defaultValue ?? null,
        sortOrder: i,
      })),
    });
    return this.prisma.templateField.findMany({
      where: { templateVersionId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  private inferFieldType(field: PDFField): DetectedTemplateField['type'] {
    if (this.isPdfTextField(field)) return 'text';
    if (this.isPdfCheckBox(field)) return 'checkbox';
    if (this.isPdfSignature(field)) return 'signature';
    return 'text';
  }

  private isPdfTextField(f: PDFField): boolean {
    return f.constructor.name === 'PDFTextField';
  }

  private isPdfCheckBox(f: PDFField): boolean {
    return f.constructor.name === 'PDFCheckBox';
  }

  private isPdfSignature(f: PDFField): boolean {
    return f.constructor.name === 'PDFSignature';
  }

  private firstWidgetRect(field: PDFField): { x: number; y: number; width: number; height: number } | null {
    try {
      const acro: any = (field as any).acroField;
      const widgets = acro?.getWidgets?.() ?? [];
      const w0 = widgets[0];
      if (!w0?.getRectangle) return null;
      const r = w0.getRectangle();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    } catch {
      return null;
    }
  }
}
