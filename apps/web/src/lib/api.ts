export const STORAGE_WORKSPACE = 'workspace-id';
export const STORAGE_USER = 'user-id';

function getApiOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXT_PUBLIC_API_URL is not set. In Vercel: Project → Settings → Environment Variables. Use your public API origin (e.g. https://deal-coordinator-api.onrender.com). Redeploy after changing it.',
      );
    }
    return 'http://localhost:3001';
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      'NEXT_PUBLIC_API_URL must be a full URL with a protocol (e.g. https://your-api.onrender.com).',
    );
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_API_URL must use http:// or https://');
  }
  return parsed.origin;
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const origin = getApiOrigin();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${origin}/api${normalized}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function tenantHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }
  const workspaceId = localStorage.getItem(STORAGE_WORKSPACE) ?? '';
  const userId = localStorage.getItem(STORAGE_USER) ?? '';
  const headers: Record<string, string> = {};
  if (workspaceId) headers['x-workspace-id'] = workspaceId;
  if (userId) headers['x-user-id'] = userId;
  return headers;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(
    message: string,
    options: { status: number; code?: string; requestId?: string },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json().catch(() => ({})) : {};

  if (!res.ok) {
    const err = body as {
      error?: { code?: string; message?: string };
      requestId?: string;
    };
    const message =
      err.error?.message ??
      (typeof body === 'object' && body && 'message' in body
        ? String((body as { message?: string }).message)
        : res.statusText);
    throw new ApiError(message || 'Request failed', {
      status: res.status,
      code: err.error?.code,
      requestId: err.requestId,
    });
  }

  if (!isJson) {
    return undefined as T;
  }

  const envelope = body as { data: unknown; meta?: unknown };
  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    if ('meta' in envelope && envelope.meta) {
      return { data: envelope.data, meta: envelope.meta } as T;
    }
    return envelope.data as T;
  }

  return body as T;
}

/** Authenticated GET for non-JSON bodies (e.g. PDF or any file stream). */
export async function fetchBinary(path: string, accept = 'application/pdf,*/*'): Promise<Blob> {
  const headers: Record<string, string> = {
    Accept: accept,
    ...tenantHeaders(),
  };
  const res = await fetch(buildUrl(path), { method: 'GET', headers });
  if (!res.ok) {
    throw new ApiError(res.statusText || 'Request failed', { status: res.status });
  }
  return res.blob();
}

async function request<T>(
  method: string,
  path: string,
  options: {
    params?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
  } = {},
): Promise<T> {
  const { params, body } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...tenantHeaders(),
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(buildUrl(path, params), init);
  return parseResponse<T>(res);
}

export const api = {
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return request<T>('GET', path, { params });
  },

  post<T>(path: string, body: unknown) {
    return request<T>('POST', path, { body });
  },

  put<T>(path: string, body: unknown) {
    return request<T>('PUT', path, { body });
  },

  patch<T>(path: string, body: unknown) {
    return request<T>('PATCH', path, { body });
  },

  delete<T>(path: string) {
    return request<T>('DELETE', path);
  },

  /** multipart/form-data (do not set Content-Type; browser sets boundary) */
  postFormData<T>(path: string, formData: FormData) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...tenantHeaders(),
    };
    return fetch(buildUrl(path), { method: 'POST', headers, body: formData }).then(
      (res) => parseResponse<T>(res),
    );
  },
};
