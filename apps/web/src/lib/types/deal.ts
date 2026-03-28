export interface DealParty {
  id: string;
  dealId: string;
  role: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
}

export interface DealFieldRow {
  id: string;
  fieldName: string;
  fieldValue?: string | null;
  source: string;
  confidence?: number | null;
  needsConfirmation: boolean;
}

export interface DealAssignment {
  id: string;
  dealId: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface DealDetail {
  id: string;
  workspaceId: string;
  dealType: string;
  stage: string;
  title?: string | null;
  displayName?: string | null;
  slug?: string | null;
  address?: string | null;
  propertyAddress?: string | null;
  primaryContactName?: string | null;
  description?: string | null;
  mlsNumber?: string | null;
  listPrice?: string | number | null;
  closingDate?: string | null;
  createdAt: string;
  updatedAt: string;
  parties: DealParty[];
  fields: DealFieldRow[];
  assignments: DealAssignment[];
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

export interface Communication {
  id: string;
  direction: string;
  type: string;
  senderName: string;
  senderId?: string | null;
  content: string;
  createdAt: string;
  metadata?: {
    aiGenerated?: boolean;
    channel?: string;
    [key: string]: unknown;
  } | null;
}

export interface AuditEvent {
  id: string;
  action: string;
  objectType: string;
  objectId: string;
  actorType: string;
  actorId: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}

export interface MemoryEntry {
  id: string;
  scope: string;
  content: string;
  category?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealException {
  id: string;
  title: string;
  description?: string | null;
  severity: string;
  status: string;
  resolution?: string | null;
  createdAt: string;
}

export interface UnresolvedItem {
  id: string;
  type: string;
  fieldName?: string | null;
  question: string;
  suggestedValue?: string | null;
  status: string;
  createdAt: string;
}

export interface DealQueryResponse {
  answer: string;
  data: unknown;
}
