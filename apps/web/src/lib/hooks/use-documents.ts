'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DocumentRecord, DocumentVersion, DocumentViewerContext } from '@/lib/types';

/** Paginated API responses come back as `{ data, meta }` from the client; lists must unwrap `data`. */
function unwrapDataArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const d = (raw as { data: unknown }).data;
    if (Array.isArray(d)) return d as T[];
  }
  return [];
}

export function useDocuments(dealId: string) {
  return useQuery({
    queryKey: ['documents', dealId],
    queryFn: async () => {
      const raw = await api.get<DocumentRecord[] | { data: DocumentRecord[]; meta?: unknown }>(
        `/deals/${dealId}/documents`,
      );
      return unwrapDataArray<DocumentRecord>(raw);
    },
    enabled: Boolean(dealId),
  });
}

export function useDocumentVersions(documentId: string) {
  return useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: () => api.get<DocumentVersion[]>(`/documents/${documentId}/versions`),
    enabled: Boolean(documentId),
  });
}

export function useDocumentViewer(dealId: string, documentId: string) {
  return useQuery({
    queryKey: ['document-viewer', dealId, documentId],
    queryFn: () =>
      api.get<DocumentViewerContext>(
        `/deals/${dealId}/documents/${documentId}/viewer`,
      ),
    enabled: Boolean(dealId && documentId),
  });
}

export function useGenerateDocuments(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<DocumentRecord[]>(`/deals/${dealId}/documents/generate`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['documents', dealId] });
      void qc.invalidateQueries({ queryKey: ['deal', dealId] });
    },
  });
}

export function useRegenerateDocument(documentId: string, dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<DocumentRecord>(`/documents/${documentId}/regenerate`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['documents', dealId] });
      void qc.invalidateQueries({ queryKey: ['document-versions', documentId] });
    },
  });
}
