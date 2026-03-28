'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, EmptyState, Spinner } from '@deal-coordinator/ui';
import { fetchBinary } from '@/lib/api';
import { useTemplateDetail } from '@/lib/hooks';

export default function TemplatePdfViewerPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = typeof params.templateId === 'string' ? params.templateId : '';
  const { data: template, isLoading: metaLoading, isError: metaError } =
    useTemplateDetail(templateId);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const hasPdf = Boolean(template?.versions?.length);

  useEffect(() => {
    setLoadError(false);
    let revoke: string | null = null;
    let cancelled = false;

    if (!templateId || !hasPdf) {
      setBlobUrl(null);
      return () => {};
    }

    void (async () => {
      try {
        const blob = await fetchBinary(`/templates/${templateId}/pdf`);
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        revoke = objectUrl;
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setBlobUrl(null);
          setLoadError(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [templateId, hasPdf]);

  if (!templateId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Invalid link" description="Missing template id." />
      </div>
    );
  }

  if (metaLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <Spinner />
      </div>
    );
  }

  if (metaError || !template) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Could not load template"
          description="Check permissions or return to Document templates."
          action={
            <Button type="button" variant="secondary" onClick={() => router.push('/templates')}>
              Back to templates
            </Button>
          }
        />
      </div>
    );
  }

  if (!hasPdf) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="No PDF for this template"
          description="Upload or ingest a version to preview it here."
          action={
            <Button type="button" variant="secondary" onClick={() => router.push('/templates')}>
              Back to templates
            </Button>
          }
        />
      </div>
    );
  }

  const latest = template.versions[0]!;
  const title = `${template.name} · v${latest.versionNumber}`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8">
      <nav className="mb-4 text-sm" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/templates" className="font-medium text-brand-600 hover:text-brand-700">
              Document templates
            </Link>
          </li>
          <li aria-hidden className="select-none text-slate-300">
            /
          </li>
          <li className="truncate text-slate-600" aria-current="page">
            {template.name}
          </li>
        </ol>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {template.documentType} · {template.slug}
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => router.push('/templates')}>
          Back to templates
        </Button>
      </header>

      <Card className="overflow-hidden p-0">
        {loadError ? (
          <div className="p-8">
            <EmptyState
              title="Preview unavailable"
              description="The PDF could not be loaded. Try again from the list."
            />
          </div>
        ) : !blobUrl ? (
          <div className="flex min-h-[480px] items-center justify-center p-8">
            <Spinner />
          </div>
        ) : (
          <iframe
            title={title}
            src={blobUrl}
            className="h-[min(85vh,900px)] w-full border-0 bg-slate-100"
          />
        )}
      </Card>
    </div>
  );
}
