import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PDFService } from '../src/modules/pdf/pdf.service';

const mockPrisma = {
  deal: {
    findFirst: vi.fn(),
  },
  template: {
    findFirst: vi.fn(),
  },
  templateWorkflow: {
    findFirst: vi.fn(),
  },
  document: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  documentVersion: {
    create: vi.fn(),
  },
};

const mockAudit = {
  create: vi.fn().mockResolvedValue(undefined),
};

const mockStorage = {
  storeFile: vi.fn().mockResolvedValue('/tmp/storage/test.pdf'),
  getSignedUrl: vi.fn(),
};

function createService() {
  return new PDFService(
    mockPrisma as any,
    mockAudit as any,
    mockStorage as any,
  );
}

describe('PDFService', () => {
  let service: PDFService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createService();
    mockPrisma.deal.findFirst.mockResolvedValue({ id: 'deal-1', fields: [] });
    mockPrisma.templateWorkflow.findFirst.mockResolvedValue({
      workflowKey: 'listing',
    });
  });

  describe('fillPdf', () => {
    it('creates overlay PDF when template has no stored PDF version', async () => {
      mockPrisma.template.findFirst.mockResolvedValue({
        id: 'tmpl-1',
        name: 'Purchase Agreement',
        documentType: 'purchase_agreement',
        status: 'active',
        fieldMappingJson: {
          buyer_name: '{{buyerName}}',
          purchase_price: '{{price}}',
        },
        versions: [],
      });

      mockPrisma.document.findFirst.mockResolvedValue(null);
      mockPrisma.document.create.mockResolvedValue({
        id: 'doc-1',
        currentVersionNumber: 0,
        templateId: 'tmpl-1',
      });
      mockPrisma.document.update.mockResolvedValue({
        id: 'doc-1',
        currentVersionNumber: 1,
        latestFileUrl: '/tmp/storage/test.pdf',
      });

      const result = await service.fillPdf(
        'ws-1',
        'deal-1',
        'tmpl-1',
        { buyerName: 'John Smith', price: '$450,000' },
        'user-1',
        'req-1',
      );

      expect(mockStorage.storeFile).toHaveBeenCalledWith(
        'ws-1',
        'deal-1',
        'root/contracts',
        expect.stringContaining('purchase_agreement_filled_'),
        expect.any(Buffer),
      );
      expect(mockPrisma.documentVersion.create).toHaveBeenCalled();
      expect(result.currentVersionNumber).toBe(1);
    });

    it('reuses existing document record', async () => {
      mockPrisma.template.findFirst.mockResolvedValue({
        id: 'tmpl-2',
        name: 'Acceptance',
        documentType: 'acceptance_letter',
        status: 'active',
        fieldMappingJson: {},
        versions: [],
      });

      mockPrisma.document.findFirst.mockResolvedValue({
        id: 'doc-existing',
        currentVersionNumber: 2,
        templateId: 'tmpl-2',
      });
      mockPrisma.document.update.mockResolvedValue({
        id: 'doc-existing',
        currentVersionNumber: 3,
        latestFileUrl: '/tmp/storage/test.pdf',
      });

      const result = await service.fillPdf(
        'ws-1',
        'deal-1',
        'tmpl-2',
        { field1: 'value1' },
        'user-1',
        'req-2',
      );

      expect(mockPrisma.document.create).not.toHaveBeenCalled();
      expect(result.currentVersionNumber).toBe(3);
    });

    it('throws when template not found', async () => {
      mockPrisma.template.findFirst.mockResolvedValue(null);

      await expect(
        service.fillPdf('ws-1', 'deal-1', 'nonexistent', {}, 'user-1', 'req-3'),
      ).rejects.toThrow('Template not found');
    });
  });
});
