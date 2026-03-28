'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, EmptyState, Spinner } from '@deal-coordinator/ui';
import { fetchBinary } from '@/lib/api';
import { useFileAssetMeta } from '@/lib/hooks';

function isPdfMime(m: string | null | undefined, fileName: string): boolean {
  if (m === 'application/pdf') return true;
  return fileName.toLowerCase().endsWith('.pdf');
}

function isImageMime(m: string | null | undefined, fileName: string): boolean {
  if (m?.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName);
}

export default function FileAssetViewerPage() {
  const params = useParams();
  const router = useRouter();
  const fileId = typeof params.fileId === 'string' ? params.fileId : '';
  const { data: meta, isLoading: metaLoading, isError: metaError } = useFileAssetMeta(fileId);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
    let revoke: string | null = null;
    let cancelled = false;

    if (!fileId) {
      setBlobUrl(null);
      return () => {};
    }

    void (async () => {
      try {
        const blob = await fetchBinary(`/files/${fileId}/content`, '*/*');
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
  }, [fileId]);

  if (!fileId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Invalid link" description="Missing file id." />
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

  if (metaError || !meta) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Could not load file"
          description="Check permissions or return to Files."
          action={
            <Button type="button" variant="secondary" onClick={() => router.push('/files')}>
              Back to Files
            </Button>
          }
        />
      </div>
    );
  }

  const showPdf = isPdfMime(meta.mimeType, meta.fileName);
  const showImage = !showPdf && isImageMime(meta.mimeType, meta.fileName);
  const showPreview = Boolean(blobUrl) && !loadError && (showPdf || showImage);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8">
      <nav className="mb-4 text-sm" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/files" className="font-medium text-brand-600 hover:text-brand-700">
              Files
            </Link>
          </li>
          <li aria-hidden className="select-none text-slate-300">
            /
          </li>
          <li className="truncate text-slate-600" aria-current="page">
            {meta.fileName}
          </li>
        </ol>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900">{meta.fileName}</h1>
          {meta.mimeType ? (
            <p className="mt-1 text-sm text-slate-500">{meta.mimeType}</p>
          ) : null}
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => router.push('/files')}>
          Back to Files
        </Button>
      </header>

      <Card className="overflow-hidden p-0">
        {loadError ? (
          <div className="p-8">
            <EmptyState
              title="Preview unavailable"
              description="The file could not be loaded. Try again from Files."
            />
          </div>
        ) : !blobUrl ? (
          <div className="flex min-h-[480px] items-center justify-center p-8">
            <Spinner />
          </div>
        ) : showPreview ? showPdf ? (
          <iframe
            title={meta.fileName}
            src={blobUrl}
            className="h-[min(85vh,900px)] w-full border-0 bg-slate-100"
          />
        ) : (
          <div className="flex justify-center bg-slate-50 p-4">
            <img
              src={blobUrl}
              alt={meta.fileName}
              className="max-h-[min(85vh,900px)] max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              title="No in-app preview"
              description="This file type opens best after download. Use the button below."
              action={
                <a
                  href={blobUrl}
                  download={meta.fileName}
                  className="inline-flex rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Download
                </a>
              }
            />
          </div>
        )}
      </Card>
    </div>
  );
}
