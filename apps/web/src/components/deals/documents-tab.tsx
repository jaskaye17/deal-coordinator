'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Drawer, EmptyState } from '@deal-coordinator/ui';
import { useDocuments, useGenerateDocuments, useRegenerateDocument, useDocumentVersions } from '@/lib/hooks';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { DocumentRecord } from '@/lib/types';

type BadgeVariant = 'gray' | 'yellow' | 'blue' | 'green' | 'purple' | 'red';

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'Draft', variant: 'gray' },
  missing_info: { label: 'Missing Info', variant: 'yellow' },
  awaiting_review: { label: 'Awaiting Review', variant: 'blue' },
  approved: { label: 'Approved', variant: 'green' },
  sent: { label: 'Sent', variant: 'purple' },
  signed: { label: 'Signed', variant: 'green' },
  rejected: { label: 'Rejected', variant: 'red' },
};

function statusBadge(status: string) {
  const cfg = STATUS_BADGE[status] ?? { label: status.replace(/_/g, ' '), variant: 'gray' as BadgeVariant };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function humanize(s: string) {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function VersionDrawer({
  doc,
  dealId,
  onClose,
}: {
  doc: DocumentRecord;
  dealId: string;
  onClose: () => void;
}) {
  const { data: versions, isLoading } = useDocumentVersions(doc.id);

  return (
    <Drawer open onOpenChange={(o) => { if (!o) onClose(); }} title={doc.name}>
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge(doc.status)}
          {doc.requiresReview && <Badge variant="blue">Needs Review</Badge>}
          <Link
            href={`/deals/${dealId}/documents/${doc.id}`}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Open viewer →
          </Link>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium text-slate-700">Version History</h4>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : !versions || versions.length === 0 ? (
            <p className="text-sm text-slate-500">No versions yet.</p>
          ) : (
            <ul className="space-y-3">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">
                      v{v.versionNumber}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDateTime(v.createdAt)}
                    </span>
                  </div>
                  {v.changeSummary && (
                    <p className="mt-1 text-sm text-slate-600">{v.changeSummary}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="gray">{humanize(v.createdByActorType)}</Badge>
                    {v.fileUrl && (
                      <a
                        href={v.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function RegenerateButton({ doc, dealId }: { doc: DocumentRecord; dealId: string }) {
  const regen = useRegenerateDocument(doc.id, dealId);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={regen.isPending}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        regen.mutate();
      }}
    >
      {regen.isPending ? 'Regenerating…' : 'Regenerate'}
    </Button>
  );
}

export function DocumentsTab({ dealId }: { dealId: string }) {
  const { data: documents, isLoading, isError } = useDocuments(dealId);
  const generate = useGenerateDocuments(dealId);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Could not load documents"
        description="Check your connection and try again."
      />
    );
  }

  const docs = documents ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">
          {docs.length} document{docs.length !== 1 ? 's' : ''}
        </h3>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={generate.isPending}
          onClick={() => generate.mutate()}
        >
          {generate.isPending ? 'Generating…' : 'Generate Documents'}
        </Button>
      </div>

      {generate.isError && (
        <p className="text-sm text-red-600">
          Failed to generate documents. Please try again.
        </p>
      )}

      {docs.length === 0 ? (
        <Card>
          <EmptyState
            title="No documents"
            description='Click "Generate Documents" to create documents for this deal from templates.'
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Version</th>
                  <th className="pb-3 pr-4">Updated</th>
                  <th className="pb-3 pr-4">Actions</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{doc.name}</span>
                        {doc.status === 'missing_info' && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-yellow-100 text-yellow-700" title="Missing information">
                            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                        )}
                        {doc.requiresReview && (
                          <Badge variant="blue">Review</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {humanize(doc.documentType)}
                    </td>
                    <td className="py-3 pr-4">{statusBadge(doc.status)}</td>
                    <td className="py-3 pr-4 tabular-nums text-slate-600">
                      v{doc.currentVersionNumber}
                    </td>
                    <td className="py-3 pr-4 text-slate-500">
                      {formatDate(doc.updatedAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/deals/${dealId}/documents/${doc.id}`}
                        className="text-sm font-medium text-brand-600 hover:text-brand-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </Link>
                    </td>
                    <td className="py-3">
                      <RegenerateButton doc={doc} dealId={dealId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selectedDoc && (
        <VersionDrawer
          doc={selectedDoc}
          dealId={dealId}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
}
