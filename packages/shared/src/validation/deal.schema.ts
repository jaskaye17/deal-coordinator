import { z } from 'zod';
import {
  DEAL_FIELD_CONFIDENCES,
  DEAL_FIELD_SOURCES,
  DEAL_TYPES,
  EXCEPTION_SEVERITIES,
  EXCEPTION_STATUSES,
  MEMORY_ENTRY_SCOPES,
} from '../enums';

/** Zod `z.enum` expects a non-empty string tuple; const arrays satisfy this at runtime. */
function stringEnum<const T extends readonly string[]>(values: T) {
  return z.enum(values as unknown as [T[number], ...T[number][]]);
}

const createDealFields = z.object({
  dealType: stringEnum(DEAL_TYPES),
  primaryContactName: z.string().min(1).optional(),
  propertyAddress: z.string().min(1).optional(),
  title: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
});

export const createDealSchema = createDealFields.refine(
  (d) => {
    const contact = d.primaryContactName?.trim() || d.title?.trim();
    const prop = d.propertyAddress?.trim() || d.address?.trim();
    return Boolean(contact && prop);
  },
  {
    message:
      'Provide primary contact name and property address (or legacy title + address).',
  },
);

export const updateDealSchema = createDealFields.partial();

export const updateDealFieldsSchema = z.record(
  z.object({
    value: z.unknown(),
    source: stringEnum(DEAL_FIELD_SOURCES),
    confidence: stringEnum(DEAL_FIELD_CONFIDENCES),
  }),
);

export const createExceptionSchema = z.object({
  dealId: z.string(),
  title: z.string(),
  description: z.string(),
  severity: stringEnum(EXCEPTION_SEVERITIES),
});

export const updateExceptionSchema = z.object({
  status: stringEnum(EXCEPTION_STATUSES),
  resolution: z.string().optional(),
});

export const createMemorySchema = z.object({
  content: z.string(),
  scope: stringEnum(MEMORY_ENTRY_SCOPES),
  dealId: z.string().optional(),
  category: z.string().optional(),
});

export const chatIngestSchema = z.object({
  message: z.string(),
  senderId: z.string(),
  senderName: z.string(),
  channelId: z.string().optional(),
  dealId: z.string().optional(),
});

export const dealQuerySchema = z.object({
  question: z.string(),
});
