'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DEAL_FILES_ROOT_PATH, sortWorkspaceRootFolders } from '@deal-coordinator/shared';
import { api } from '@/lib/api';

export interface FileAssetMeta {
  id: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
}

export interface FolderRecord {
  id: string;
  name: string;
  path: string;
  scope: string;
  dealId: string | null;
  parentId: string | null;
  children?: FolderRecord[];
  _count?: { files: number; children: number };
  createdAt: string;
}

/** Matches `FilesService.getFolderTree` — spec lives in `@deal-coordinator/shared` `files-navigation.ts`. */
export interface FilesNavigationTree {
  workspace: FolderRecord[];
  deals: Array<{ dealId: string; label: string; rootFolder: FolderRecord }>;
}

/**
 * Ensures a consistent tree shape. Handles older APIs that returned a flat root `Folder[]`
 * and malformed payloads so the Files page never throws on `.workspace.length`.
 */
export function normalizeFilesNavigationTree(raw: unknown): FilesNavigationTree {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const dealsRaw = Array.isArray(o.deals) ? (o.deals as FilesNavigationTree['deals']) : [];
    return {
      workspace: Array.isArray(o.workspace) ? (o.workspace as FolderRecord[]) : [],
      deals: dealsRaw.filter((d) => Boolean(d?.dealId && d?.rootFolder?.id)),
    };
  }
  if (Array.isArray(raw)) {
    const folders = raw as FolderRecord[];
    const workspace = sortWorkspaceRootFolders(folders.filter((f) => f?.dealId == null));
    const dealRoots = folders.filter(
      (f) => f?.dealId != null && f.path === DEAL_FILES_ROOT_PATH,
    );
    dealRoots.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    const deals = dealRoots.map((rootFolder) => ({
      dealId: rootFolder.dealId as string,
      label: rootFolder.name,
      rootFolder,
    }));
    return { workspace, deals };
  }
  return { workspace: [], deals: [] };
}

export interface FileAssetRecord {
  id: string;
  fileName: string;
  fileKey: string;
  fileUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  scope: string;
  dealId: string | null;
  folderId: string | null;
  uploadedBy: string | null;
  folder?: { id: string; name: string; path: string } | null;
  createdAt: string;
}

export function useFolderTree() {
  return useQuery({
    queryKey: ['folders', 'tree'],
    queryFn: async () => {
      const raw = await api.get<unknown>('/folders/tree');
      return normalizeFilesNavigationTree(raw);
    },
  });
}

export type FolderBreadcrumbItem = Pick<
  FolderRecord,
  'id' | 'name' | 'path' | 'dealId' | 'parentId' | 'scope'
>;

export interface FolderContentsResponse {
  folder: FolderRecord;
  breadcrumb: FolderBreadcrumbItem[];
  childFolders: FolderRecord[];
  files: FileAssetRecord[];
  filePagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useFolderContents(
  folderId: string | null,
  filePage: number,
  options?: { pageSize?: number; enabled?: boolean },
) {
  const pageSize = options?.pageSize ?? 25;
  return useQuery({
    queryKey: ['folder-contents', folderId, filePage, pageSize],
    queryFn: () =>
      api.get<FolderContentsResponse>(`/folders/${folderId}/contents`, {
        filePage,
        filePageSize: pageSize,
      }),
    enabled: (options?.enabled ?? true) && Boolean(folderId),
  });
}

export function useChildFolders(parentId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['folders', 'children', parentId],
    queryFn: () => api.get<FolderRecord[]>('/folders', { parentId: parentId! }),
    enabled: Boolean(parentId) && (options?.enabled ?? true),
  });
}

export function useFolders(params?: { dealId?: string; parentId?: string; scope?: string }) {
  return useQuery({
    queryKey: ['folders', params],
    queryFn: () => api.get<FolderRecord[]>('/folders', params as any),
  });
}

export function useFiles(
  params?: { dealId?: string; folderId?: string; scope?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['files', params],
    queryFn: () => api.get<FileAssetRecord[]>('/files', params as any),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; dealId?: string; parentId?: string; scope?: string }) =>
      api.post('/folders', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['folders'] });
      void qc.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      fileName: string;
      content: string;
      mimeType?: string;
      dealId?: string;
      folderId?: string;
      scope?: string;
    }) => api.post('/files/upload', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['files'] });
      void qc.invalidateQueries({ queryKey: ['folders'] });
      void qc.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => api.delete(`/files/${fileId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['files'] });
      void qc.invalidateQueries({ queryKey: ['folders'] });
      void qc.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) => api.delete(`/folders/${folderId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['folders'] });
      void qc.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}

export function useFileUrl(fileId: string) {
  return useQuery({
    queryKey: ['file-url', fileId],
    queryFn: () => api.get<{ url: string }>(`/files/${fileId}/url`),
    enabled: Boolean(fileId),
  });
}

export function useFileAssetMeta(fileId: string) {
  return useQuery({
    queryKey: ['file-asset-meta', fileId],
    queryFn: () => api.get<FileAssetMeta>(`/files/${fileId}`),
    enabled: Boolean(fileId),
  });
}
