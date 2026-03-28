import type { WorkspaceRole } from '../enums';

export interface ApiResponseMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: ApiResponseMeta;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiError {
  error: ApiErrorBody;
  requestId: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface TenantContext {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  requestId: string;
}
