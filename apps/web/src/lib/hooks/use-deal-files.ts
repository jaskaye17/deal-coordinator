'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function dealFoldersQueryKey(dealId: string) {
  return ['dealFolders', dealId] as const;
}

export interface DealFolderTreeNode {
  id: string;
  name: string;
  path: string;
  children?: DealFolderTreeNode[];
  _count?: { files: number; children?: number };
}

export function useDealFolders(dealId: string) {
  return useQuery({
    queryKey: dealFoldersQueryKey(dealId),
    queryFn: () => api.get<DealFolderTreeNode[]>(`/deals/${dealId}/folders`),
    enabled: Boolean(dealId),
  });
}

export function folderFilesQueryKey(folderId: string) {
  return ['folderFiles', folderId] as const;
}

export interface FolderFileRow {
  id: string;
  fileName: string;
  fileKey: string;
  assetType?: string | null;
  mimeType?: string | null;
  createdAt: string;
}

export function useFolderFiles(folderId: string | null) {
  return useQuery({
    queryKey: folderFilesQueryKey(folderId ?? ''),
    queryFn: () => api.get<FolderFileRow[]>(`/folders/${folderId}/files`),
    enabled: Boolean(folderId),
  });
}
