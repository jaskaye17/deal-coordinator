'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Badge, Button, Card, EmptyState, Spinner } from '@deal-coordinator/ui';
import { fetchBinary } from '@/lib/api';
import { useDocumentViewer } from '@/lib/hooks';
import { formatDateTime } from '@/lib/utils';

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
  const cfg = STATUS_BADGE[status] ?? {
    label: status.replace(/_/g, ' '),
    variant: 'gray' as BadgeVariant,
  };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = typeof params.dealId === 'string' ? params.dealId : '';
  const documentId = typeof params.documentId === 'string' ? params.documentId : '';
  const { data, isLoading, isError } = useDocumentViewer(dealId, documentId);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    setPdfError(false);
    let revoke: string | null = null;
    let cancelled = false;

    if (!data?.previewUrl) {
      setBlobUrl(null);
      return () => {};
    }

    if (data.previewUrl.startsWith('http://') || data.previewUrl.startsWith('https://')) {
      setBlobUrl(null);
      return () => {};
    }

    void (async () => {
      try {
        const blob = await fetchBinary(
          `/deals/${dealId}/documents/${documentId}/pdf`,
        );
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        revoke = objectUrl;
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setBlobUrl(null);
          setPdfError(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [data?.previewUrl, dealId, documentId]);

  if (!dealId || !documentId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Invalid link" description="Missing deal or document id." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          title="Could not load document"
          description="Check permissions and try again."
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/deals/${dealId}`)}
            >
              Back to deal
            </Button>
          }
        />
      </div>
    );
  }

  const { document: doc, fields, previewUrl, signature, auditLog } = data;

  const iframeSrc =
    previewUrl?.startsWith('http://') || previewUrl?.startsWith('https://')
      ? previewUrl
      : blobUrl;

  const showPdf = Boolean(iframeSrc) && !pdfError;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8">
      <nav className="mb-4 text-sm" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/deals" className="font-medium text-brand-600 hover:text-brand-700">
              Deals
            </Link>
          </li>
          <li aria-hidden className="select-none text-slate-300">
            /
          </li>
          <li>
            <Link
              href={`/deals/${dealId}`}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Deal
            </Link>
          </li>
          <li aria-hidden className="select-none text-slate-300">
            /
          </li>
          <li className="truncate text-slate-600" aria-current="page">
            {doc.name}
          </li>
        </ol>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900">{doc.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {statusBadge(doc.status)}
            {signature && (
              <Badge variant="purple">
                Signature: {signature.status.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/deals/${dealId}`)}
        >
          Back to deal
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden p-0">
          {!previewUrl ? (
            <div className="p-8">
              <EmptyState
                title="No file yet"
                description="Generate this document from a template or upload a version to preview it here."
              />
            </div>
          ) : !showPdf ? (
            <div className="flex min-h-[480px] items-center justify-center p-8">
              {pdfError ? (
                <EmptyState
                  title="Preview unavailable"
                  description="The PDF could not be loaded. Try again or open from storage."
                />
              ) : (
                <Spinner />
              )}
            </div>
          ) : (
            <iframe
              title={doc.name}
              src={iframeSrc ?? undefined}
              className="h-[min(85vh,900px)] w-full border-0 bg-slate-100"
            />
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-slate-800">Template fields</h2>
            {fields.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No linked template fields. Link a template or add fields in the template editor.
              </p>
            ) : (
              <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm">
                {fields.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-md border border-slate-100 bg-slate-50/80 px-2 py-1.5"
                  >
                    <span className="font-medium text-slate-800">{f.name}</span>
                    <span className="ml-2 text-slate-500">({f.type})</span>
                    {f.signerRole && (
                      <span className="ml-2 inline-block">
                        <Badge variant="gray">{f.signerRole}</Badge>
                      </span>
                    )}
                    {f.dataSourceKey && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">{f.dataSourceKey}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {signature && (
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-slate-800">Signature envelope</h2>
              <dl className="mt-2 space-y-1 text-xs text-slate-600">
                <div>
                  <dt className="inline text-slate-500">Internal ID</dt>{' '}
                  <dd className="inline font-mono">{signature.envelopeId}</dd>
                </div>
                {signature.providerEnvelopeId && (
                  <div>
                    <dt className="inline text-slate-500">Provider</dt>{' '}
                    <dd className="inline font-mono">{signature.providerEnvelopeId}</dd>
                  </div>
                )}
                {signature.sentAt && (
                  <div>
                    <dt className="inline text-slate-500">Sent</dt>{' '}
                    <dd className="inline">{formatDateTime(signature.sentAt)}</dd>
                  </div>
                )}
              </dl>
            </Card>
          )}

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-slate-800">Document audit</h2>
            {auditLog.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No audit entries for this document.</p>
            ) : (
              <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-xs">
                {auditLog.map((row) => (
                  <li
                    key={row.id}
                    className="border-b border-slate-100 pb-2 last:border-0"
                  >
                    <span className="font-medium text-slate-700">{row.action}</span>
                    <span className="ml-2 text-slate-400">
                      {formatDateTime(row.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
