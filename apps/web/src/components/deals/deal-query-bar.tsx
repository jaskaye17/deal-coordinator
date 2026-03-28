'use client';

import { Button, Card, Input } from '@deal-coordinator/ui';
import { useState } from 'react';
import { useDealQuery } from '@/lib/hooks';

const EXAMPLES = ["What's next?", "What's missing?", 'Status summary'] as const;

export function DealQueryBar({ dealId }: { dealId: string }) {
  const [question, setQuestion] = useState('');
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const query = useDealQuery(dealId);

  const run = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    query.mutate(trimmed, {
      onSuccess: (res) => setLastAnswer(res.answer),
    });
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-4 py-4">
        {lastAnswer != null ? (
          <Card className="mb-4 border-slate-200" title="Answer">
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {lastAnswer}
            </p>
          </Card>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              placeholder="Ask about this deal…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  run(question);
                }
              }}
            />
          </div>
          <Button
            type="button"
            className="shrink-0"
            loading={query.isPending}
            onClick={() => run(question)}
          >
            Ask
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setQuestion(chip);
                run(chip);
              }}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              {chip}
            </button>
          ))}
        </div>
        {query.isError ? (
          <p className="mt-2 text-xs text-red-600">
            Could not run query. Check API configuration.
          </p>
        ) : null}
      </div>
    </div>
  );
}
