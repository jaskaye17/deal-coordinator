export interface AuditEvent {
  id: string;
  action: string;
  objectType: string;
  objectId: string;
  createdAt: string;
  actorId: string;
  actorType?: string;
  dealId?: string | null;
}

export interface DashboardData {
  totalDeals: number;
  awaitingInfoCount: number;
  openExceptionsCount: number;
  recentActivity: AuditEvent[];
}

export interface Deal {
  id: string;
  title: string | null;
  displayName?: string | null;
  slug?: string | null;
  dealType: string;
  stage: string;
  address: string | null;
  propertyAddress?: string | null;
  primaryContactName?: string | null;
  createdAt: string;
}

export interface ListMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface DealsListResponse {
  data: Deal[];
  meta: ListMeta;
}

export interface CreateDealInput {
  dealType: string;
  primaryContactName: string;
  propertyAddress: string;
  title?: string;
  address?: string;
  description?: string;
}

export interface DocumentRecord {
  id: string;
  dealId: string;
  documentType: string;
  name: string;
  status: string;
  currentVersionNumber: number;
  latestFileUrl: string | null;
  requiresReview: boolean;
  createdAt: string;
  updatedAt: string;
  template?: { id: string; name: string } | null;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileUrl: string | null;
  changeSummary: string | null;
  createdByActorType: string;
  createdAt: string;
}

export interface TemplateFieldRecord {
  id: string;
  name: string;
  type: string;
  pageIndex: number;
  rect: { x: number; y: number; width: number; height: number };
  defaultValue: string | null;
  signerRole: string | null;
  dataSourceKey: string | null;
  sortOrder: number;
}

export interface DocumentViewerContext {
  document: {
    id: string;
    name: string;
    status: string;
    documentType: string;
    templateId: string | null;
    latestFileUrl: string | null;
    currentVersionNumber: number;
    updatedAt: string;
    createdAt: string;
  };
  fields: TemplateFieldRecord[];
  previewUrl: string | null;
  signature: {
    envelopeId: string;
    providerEnvelopeId: string | null;
    status: string;
    sentAt: string | null;
    completedAt: string | null;
  } | null;
  auditLog: Array<{
    id: string;
    action: string;
    actorType: string;
    actorId: string;
    createdAt: string;
    metadata?: unknown;
  }>;
}

export interface ReviewTaskRecord {
  id: string;
  dealId: string;
  actionType: string;
  objectType: string;
  status: string;
  assignedToUserId: string | null;
  reviewedByUserId: string | null;
  payloadJson: Record<string, unknown> | null;
  reviewNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  deal?: { id: string; title: string | null; address: string | null };
}

export interface SignatureEnvelopeRecord {
  id: string;
  dealId: string;
  status: string;
  provider: string;
  recipientsJson: Array<{ name: string; email: string; role: string; status?: string; signedAt?: string }> | null;
  documentIdsJson: string[] | null;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface TaskRecord {
  id: string;
  dealId: string;
  title: string;
  description: string | null;
  status: string;
  category: string | null;
  sortOrder: number;
  dueDate: string | null;
  assignedTo: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface OfferRecord {
  id: string;
  dealId: string;
  offerLabel: string | null;
  status: string;
  buyerName: string | null;
  buyerEntityName: string | null;
  buyerAgent: string | null;
  offerPrice: string | null;
  earnestMoney: string | null;
  optionPeriodDays: number | null;
  financingType: string | null;
  closeDate: string | null;
  proofOfFundsStatus: string | null;
  preapprovalStatus: string | null;
  summaryJson: Record<string, unknown> | null;
  extractedFieldsJson: Record<string, unknown> | null;
  extractionConfidenceJson: Record<string, number> | null;
  terms: string | null;
  notes: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  files: OfferFileRecord[];
  deal?: { id: string; title: string | null; address: string | null; stage: string };
}

export interface OfferFileRecord {
  id: string;
  offerId: string;
  fileName: string;
  fileUrl: string | null;
  fileType: string | null;
  versionLabel: string | null;
  createdAt: string;
}

export interface OfferComparisonRow {
  offerId: string;
  offerLabel: string | null;
  buyerName: string | null;
  offerPrice: number | null;
  earnestMoney: number | null;
  financingType: string | null;
  optionPeriodDays: number | null;
  closeDate: string | null;
  proofOfFundsStatus: string | null;
  preapprovalStatus: string | null;
  status: string;
  completeness: number;
  fileCount: number;
}

export interface OfferComparison {
  dealId: string;
  listPrice: number | null;
  offers: OfferComparisonRow[];
  generatedAt: string;
}

export interface CalendarEventRecord {
  id: string;
  dealId: string;
  eventType: string | null;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  attendeesJson: Array<{ name: string; email?: string }> | null;
  status: string;
  sourceType: string | null;
  createdAt: string;
}

export interface AcceptanceResult {
  offer: OfferRecord;
  documents: DocumentRecord[];
  reviewTask: ReviewTaskRecord;
  missingRequired: string[];
}
