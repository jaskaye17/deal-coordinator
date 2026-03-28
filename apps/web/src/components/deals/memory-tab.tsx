'use client';

import { Badge, Button, Card, EmptyState, Input, Textarea } from '@deal-coordinator/ui';
import { useState } from 'react';
import {
  useCreateMemory,
  useMemoryEntries,
  useUpdateMemory,
} from '@/lib/hooks';
import type { MemoryEntry } from '@/lib/types/deal';
import { formatDateTime } from '@/lib/utils';

function MemoryCard({
  entry,
  dealId,
}: {
  entry: MemoryEntry;
  dealId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  const [category, setCategory] = useState(entry.category ?? '');
  const update = useUpdateMemory(dealId);

  const save = () => {
    update.mutate(
      {
        id: entry.id,
        content,
        category: category || undefined,
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <Textarea
          label="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
        />
        <Input
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-3"
        />
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            type="button"
            loading={update.isPending}
            onClick={save}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="secondary"
            type="button"
            disabled={update.isPending}
            onClick={() => {
              setContent(entry.content);
              setCategory(entry.category ?? '');
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50/50"
    >
      <p className="whitespace-pre-wrap text-sm text-slate-800">
        {entry.content}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="blue">{entry.scope}</Badge>
        {entry.category ? (
          <Badge variant="gray">{entry.category}</Badge>
        ) : null}
        <span className="text-xs text-slate-500">
          {entry.createdBy ? (
            <>
              By <span className="font-mono">{entry.createdBy}</span>
              {' · '}
            </>
          ) : null}
          {formatDateTime(entry.createdAt)}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">Click to edit</p>
    </button>
  );
}

export function MemoryTab({ dealId }: { dealId: string }) {
  const { data, isLoading, isError } = useMemoryEntries(dealId);
  const create = useCreateMemory(dealId);
  const [showForm, setShowForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const submitNew = () => {
    if (!newContent.trim()) return;
    create.mutate(
      { content: newContent.trim(), category: newCategory.trim() || undefined },
      {
        onSuccess: () => {
          setNewContent('');
          setNewCategory('');
          setShowForm(false);
        },
      },
    );
  };

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading memory…</p>;
  }
  if (isError || !data) {
    return (
      <EmptyState title="Could not load memory" description="Try again later." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Deal memory</h2>
        <Button
          size="sm"
          type="button"
          variant={showForm ? 'secondary' : 'primary'}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Close' : 'Add memory'}
        </Button>
      </div>

      {showForm ? (
        <Card title="New entry">
          <Textarea
            label="Content"
            placeholder="Note something important about this deal…"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={4}
          />
          <Input
            label="Category"
            placeholder="e.g. client preference"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="mt-3"
          />
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              loading={create.isPending}
              onClick={submitNew}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={create.isPending}
              onClick={() => {
                setShowForm(false);
                setNewContent('');
                setNewCategory('');
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      {data.data.length === 0 && !showForm ? (
        <EmptyState
          title="No memory entries"
          description="Add notes and context your team can reuse on this deal."
        />
      ) : (
        <ul className="space-y-3" role="list">
          {data.data.map((entry) => (
            <li key={entry.id}>
              <MemoryCard entry={entry} dealId={dealId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
