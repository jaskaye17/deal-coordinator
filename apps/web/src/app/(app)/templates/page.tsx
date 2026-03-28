'use client';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, Drawer, Spinner, EmptyState } from '@deal-coordinator/ui';
import {
  useTemplatesList,
  useWorkflowDefinitions,
  useUploadTemplate,
  useIngestGlobalTemplates,
  TEMPLATE_TYPE_OPTIONS,
  type TemplateRow,
} from '@/lib/hooks';

const PAGE_SIZE = 50;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function AddTemplateModal({
  open,
  onClose,
  workflowOptions,
}: {
  open: boolean;
  onClose: () => void;
  workflowOptions: { key: string; label: string }[];
}) {
  const upload = useUploadTemplate();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [documentType, setDocumentType] = useState<string>(
    TEMPLATE_TYPE_OPTIONS[0] ?? 'other',
  );
  const [description, setDescription] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [fieldMappingJson, setFieldMappingJson] = useState('');
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setName('');
    setSlug('');
    setDocumentType(TEMPLATE_TYPE_OPTIONS[0] ?? 'other');
    setDescription('');
    setJurisdiction('');
    setFieldMappingJson('');
    setSelectedWorkflows([]);
    setIsGlobal(false);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function toggleWorkflow(key: string) {
    setSelectedWorkflows((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError('Choose a PDF file.');
      return;
    }
    if (!name.trim() || !slug.trim()) {
      setError('Name and slug are required.');
      return;
    }
    upload.mutate(
      {
        file,
        name: name.trim(),
        slug: slug.trim(),
        documentType,
        description: description.trim() || undefined,
        workflows: selectedWorkflows,
        isGlobal,
        fieldMappingJson: fieldMappingJson.trim() || undefined,
        jurisdiction: jurisdiction.trim() || undefined,
      },
      {
        onSuccess: () => handleClose(),
        onError: (err: Error & { message?: string }) => {
          setError(err?.message ?? 'Upload failed');
        },
      },
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <h3 className="text-lg font-semibold text-slate-900">Add template</h3>
        <p className="mt-1 text-sm text-slate-500">
          Upload a PDF. Global templates require a workspace admin; the API enforces this.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">PDF file</label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Slug (unique)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              placeholder="my-template-key"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Document type</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {TEMPLATE_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Jurisdiction</label>
            <input
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder="e.g. TX"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-slate-700">Workflows</span>
            <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded border border-slate-200 p-2">
              {workflowOptions.length === 0 ? (
                <p className="text-xs text-slate-500">No workflows loaded</p>
              ) : (
                workflowOptions.map((w) => (
                  <label key={w.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedWorkflows.includes(w.key)}
                      onChange={() => toggleWorkflow(w.key)}
                    />
                    <span>{w.label}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Field mapping (JSON, optional)
            </label>
            <textarea
              value={fieldMappingJson}
              onChange={(e) => setFieldMappingJson(e.target.value)}
              rows={3}
              placeholder='{"pdf_field": "{{dealField}}"}'
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isGlobal}
              onChange={(e) => setIsGlobal(e.target.checked)}
            />
            Add as global (system template)
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={upload.isPending}>
              {upload.isPending ? 'Uploading…' : 'Save'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

const OTHER_COL_DEFAULTS = [140, 96, 112, 200, 88, 72, 152, 88] as const;
const MIN_COL_WIDTH = 64;

function measureNameColumnWidth(names: string[]): number {
  if (typeof window === 'undefined') return 160;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 160;
  let max = 0;
  ctx.font = '500 12px ui-sans-serif, system-ui, sans-serif';
  max = Math.max(max, ctx.measureText('NAME').width);
  ctx.font = '500 14px ui-sans-serif, system-ui, sans-serif';
  for (const n of names) {
    max = Math.max(max, ctx.measureText(n || '—').width);
  }
  return Math.max(MIN_COL_WIDTH, Math.ceil(max) + 24);
}

function ResizableTh({
  width,
  children,
  onResize,
  lockNameWidth,
}: {
  width: number;
  children: ReactNode;
  onResize: (delta: number) => void;
  lockNameWidth?: () => void;
}) {
  return (
    <th
      style={{ width, minWidth: width, maxWidth: width }}
      className="relative border-b border-slate-200 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-600"
    >
      <div className="overflow-hidden text-ellipsis">{children}</div>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Resize column"
        className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize border-0 bg-transparent p-0 hover:bg-slate-200/80"
        onMouseDown={(e) => {
          e.preventDefault();
          lockNameWidth?.();
          let lastX = e.clientX;
          const onMove = (ev: MouseEvent) => {
            onResize(ev.clientX - lastX);
            lastX = ev.clientX;
          };
          const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }}
      />
    </th>
  );
}

function TemplatesTable({ rows }: { rows: TemplateRow[] }) {
  const router = useRouter();
  const measuredName = useMemo(
    () => measureNameColumnWidth(rows.map((r) => r.name)),
    [rows],
  );
  const nameWidthLocked = useRef(false);
  const [widths, setWidths] = useState<number[]>(() => [
    measuredName,
    ...OTHER_COL_DEFAULTS,
  ]);

  useLayoutEffect(() => {
    if (nameWidthLocked.current) return;
    setWidths((w) => {
      const next = [...w];
      next[0] = measuredName;
      return next;
    });
  }, [measuredName]);

  const setColWidth = (index: number, delta: number) => {
    setWidths((prev) => {
      const next = [...prev];
      const cur = next[index] ?? MIN_COL_WIDTH;
      next[index] = Math.max(MIN_COL_WIDTH, cur + delta);
      return next;
    });
  };

  const lockNameWidth = () => {
    nameWidthLocked.current = true;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table
        className="w-full border-collapse text-left text-sm"
        style={{ tableLayout: 'fixed' }}
      >
        <colgroup>
          {widths.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead className="bg-slate-50">
          <tr>
            <ResizableTh
              width={widths[0]!}
              onResize={(d) => setColWidth(0, d)}
              lockNameWidth={lockNameWidth}
            >
              Name
            </ResizableTh>
            <ResizableTh width={widths[1]!} onResize={(d) => setColWidth(1, d)}>
              Slug
            </ResizableTh>
            <ResizableTh width={widths[2]!} onResize={(d) => setColWidth(2, d)}>
              Type
            </ResizableTh>
            <ResizableTh width={widths[3]!} onResize={(d) => setColWidth(3, d)}>
              Scope
            </ResizableTh>
            <ResizableTh width={widths[4]!} onResize={(d) => setColWidth(4, d)}>
              Workflows
            </ResizableTh>
            <ResizableTh width={widths[5]!} onResize={(d) => setColWidth(5, d)}>
              Status
            </ResizableTh>
            <ResizableTh width={widths[6]!} onResize={(d) => setColWidth(6, d)}>
              Version
            </ResizableTh>
            <ResizableTh width={widths[7]!} onResize={(d) => setColWidth(7, d)}>
              Updated
            </ResizableTh>
            <ResizableTh width={widths[8]!} onResize={(d) => setColWidth(8, d)}>
              View
            </ResizableTh>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr
              key={t.id}
              className={`border-b border-slate-100 hover:bg-slate-50/80 ${
                t.latestVersion ? 'cursor-pointer' : ''
              }`}
              onClick={() => {
                if (t.latestVersion) router.push(`/templates/view/${t.id}`);
              }}
              title={t.latestVersion ? 'Click to open in viewer' : undefined}
            >
              <td className="overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                {t.name}
              </td>
              <td className="overflow-hidden text-ellipsis px-3 py-2 font-mono text-xs text-slate-600">
                {t.slug}
              </td>
              <td className="overflow-hidden text-ellipsis px-3 py-2 text-slate-700">
                {t.documentType}
              </td>
              <td className="px-3 py-2">
                {t.isSystemTemplate ? (
                  <Badge variant="blue">Global</Badge>
                ) : (
                  <Badge variant="gray">Workspace</Badge>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {t.workflows.length === 0 ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    t.workflows.slice(0, 4).map((w) => (
                      <Badge key={w.key} variant="gray">
                        {w.label}
                      </Badge>
                    ))
                  )}
                  {t.workflows.length > 4 && (
                    <span className="text-xs text-slate-500">+{t.workflows.length - 4}</span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2">
                <Badge variant={t.status === 'active' ? 'green' : 'gray'}>{t.status}</Badge>
              </td>
              <td className="px-3 py-2 text-slate-600">
                {t.latestVersion ? `v${t.latestVersion.versionNumber}` : '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                {formatDate(t.updatedAt)}
              </td>
              <td className="px-3 py-2">
                {t.latestVersion ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/templates/view/${t.id}`);
                    }}
                  >
                    View
                  </Button>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TemplatesPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [workflowKey, setWorkflowKey] = useState('');
  const [scope, setScope] = useState<'all' | 'system' | 'workspace'>('all');
  const [status, setStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(searchInput.trim()), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, documentType, workflowKey, scope, status]);

  const listParams = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      q: debouncedQ || undefined,
      documentType: documentType || undefined,
      workflowKey: workflowKey || undefined,
      scope,
      status: status || undefined,
    }),
    [page, debouncedQ, documentType, workflowKey, scope, status],
  );

  const { data, isLoading } = useTemplatesList(listParams);
  const { data: workflowDefs } = useWorkflowDefinitions();
  const ingest = useIngestGlobalTemplates();
  const [ingestNote, setIngestNote] = useState<string | null>(null);

  const items = data?.data ?? [];
  const meta = data?.meta;
  const workflowOptions =
    workflowDefs?.map((w) => ({ key: w.key, label: w.label })) ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Document templates</h2>
          <p className="mt-1 text-sm text-slate-500">
            Library templates stored in the database and object storage (paginated API).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShowAdd(true)}>
            Add template
          </Button>
          <Button
            variant="secondary"
            disabled={ingest.isPending}
            onClick={() => {
              setIngestNote(null);
              ingest.mutate(
                {},
                {
                  onSuccess: (s) => {
                    setIngestNote(
                      `Ingest: +${s.versionsCreated} version(s), skipped ${s.versionsSkippedSameHash} unchanged.`,
                    );
                  },
                  onError: (err: Error) => setIngestNote(err.message),
                },
              );
            }}
          >
            {ingest.isPending ? 'Ingesting…' : 'Ingest from repo'}
          </Button>
        </div>
      </div>

      {ingestNote && (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{ingestNote}</p>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div style={{ width: 250 }} className="shrink-0">
            <label className="block text-xs font-medium text-slate-600">Search</label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name…"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <Button type="button" variant="secondary" onClick={() => setFiltersOpen(true)}>
            Filters
          </Button>
        </div>
      </Card>

      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} title="Template filters">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600">Document type</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {TEMPLATE_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Workflow</label>
            <select
              value={workflowKey}
              onChange={(e) => setWorkflowKey(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {workflowOptions.map((w) => (
                <option key={w.key} value={w.key}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Scope</label>
            <select
              value={scope}
              onChange={(e) =>
                setScope(e.target.value as 'all' | 'system' | 'workspace')
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">All visible</option>
              <option value="system">Global only</option>
              <option value="workspace">This workspace</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <Button type="button" variant="secondary" onClick={() => setFiltersOpen(false)}>
            Done
          </Button>
        </div>
      </Drawer>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No templates"
          description="Ingest from the repo, upload a PDF, or adjust filters."
        />
      ) : (
        <>
          <TemplatesTable rows={items} />
          {meta && (
            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Page {meta.page} of {meta.totalPages} · {meta.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AddTemplateModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        workflowOptions={workflowOptions}
      />
    </div>
  );
}
