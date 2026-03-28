'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TEMPLATE_TYPES } from '@deal-coordinator/shared';

export type WorkflowRef = {
  key: string;
  label: string;
  description?: string | null;
};

export type TemplateRow = {
  id: string;
  workspaceId: string | null;
  name: string;
  slug: string;
  description: string | null;
  isSystemTemplate: boolean;
  parentTemplateId: string | null;
  status: string;
  documentType: string;
  tags: unknown;
  jurisdiction: string | null;
  notes: string | null;
  isRequiredByDefault: boolean;
  fieldMappingJson: unknown;
  createdAt: string;
  updatedAt: string;
  workflows: WorkflowRef[];
  latestVersion: {
    id: string;
    versionNumber: number;
    downloadUrl: string | null;
  } | null;
};

export type TemplatesListMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type TemplatesListResponse = {
  data: TemplateRow[];
  meta: TemplatesListMeta;
};

/** Subset of `GET /templates/:id` used by the template PDF viewer. */
export type TemplateDetail = {
  id: string;
  name: string;
  slug: string;
  documentType: string;
  versions: Array<{
    id: string;
    versionNumber: number;
    sourceFileName: string;
    downloadUrl: string | null;
  }>;
};

export type TemplatesListParams = {
  page: number;
  pageSize: number;
  q?: string;
  documentType?: string;
  workflowKey?: string;
  scope?: 'all' | 'system' | 'workspace';
  status?: string;
};

export const TEMPLATE_TYPE_OPTIONS = [...TEMPLATE_TYPES];

export function templatesListQueryKey(params: TemplatesListParams) {
  return ['templates', params] as const;
}

export function useTemplatesList(params: TemplatesListParams) {
  return useQuery({
    queryKey: templatesListQueryKey(params),
    queryFn: () =>
      api.get<TemplatesListResponse>('/templates', {
        page: params.page,
        pageSize: params.pageSize,
        q: params.q || undefined,
        documentType: params.documentType || undefined,
        workflowKey: params.workflowKey || undefined,
        scope: params.scope ?? 'all',
        status: params.status || undefined,
      }),
  });
}

export function useTemplateDetail(templateId: string) {
  return useQuery({
    queryKey: ['template-detail', templateId],
    queryFn: () => api.get<TemplateDetail>(`/templates/${templateId}`),
    enabled: Boolean(templateId),
  });
}

export function useWorkflowDefinitions() {
  return useQuery({
    queryKey: ['workflow-definitions'],
    queryFn: () => api.get<WorkflowRef[]>('/workflows'),
  });
}

export function useIngestGlobalTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { dryRun?: boolean }) =>
      api.post<{
        filesScanned: number;
        templatesUpserted: number;
        versionsCreated: number;
        versionsSkippedSameHash: number;
        workflowLinksSynced: number;
        errors: { relativePath: string; message: string }[];
      }>('/templates/ingest-global', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] });
      void qc.invalidateQueries({ queryKey: ['workflow-definitions'] });
    },
  });
}

export function useUploadTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      file: File;
      name: string;
      slug: string;
      documentType: string;
      description?: string;
      workflows: string[];
      isGlobal: boolean;
      fieldMappingJson?: string;
      jurisdiction?: string;
    }) => {
      const fd = new FormData();
      fd.append('file', args.file);
      fd.append('name', args.name);
      fd.append('slug', args.slug);
      fd.append('documentType', args.documentType);
      if (args.description) fd.append('description', args.description);
      if (args.workflows.length) {
        fd.append('workflows', JSON.stringify(args.workflows));
      }
      if (args.isGlobal) fd.append('isGlobal', 'true');
      if (args.fieldMappingJson?.trim()) {
        fd.append('fieldMappingJson', args.fieldMappingJson.trim());
      }
      if (args.jurisdiction?.trim()) {
        fd.append('jurisdiction', args.jurisdiction.trim());
      }
      return api.postFormData<TemplateRow>('/templates/upload', fd);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}
