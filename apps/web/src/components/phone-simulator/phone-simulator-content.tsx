'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, Badge, Tooltip } from '@deal-coordinator/ui';
import { ApiError } from '@/lib/api';
import {
  useSimulateMessage,
  useDebugHistory,
  useClearDebugHistory,
  useUserSimulatorPrefs,
} from '@/lib/hooks';
import type { MessagingSimulateResult } from '@/lib/hooks/use-debug';

function FromNumberTooltipBody() {
  return (
    <span className="block space-y-2 text-xs leading-relaxed">
      <span>
        Optional: save this number under{' '}
        <Link
          href="/settings"
          className="font-medium text-sky-300 underline underline-offset-2 hover:text-white"
        >
          Settings → Phone simulator
        </Link>{' '}
        to prefill it next time you open the simulator.
      </span>
      <span>
        Routing uses an automatic sandbox thread for simulated texts; the model can infer which workspace deal you mean.
        The From value does not need to match a party phone.
      </span>
    </span>
  );
}

function LlmModeTooltipBody() {
  return (
    <span className="block space-y-2">
      <span>
        <strong className="font-semibold text-white">LLM MOCK</strong> (checkbox off): built-in fake responses
        only for this simulator—no API calls, no cost.
      </span>
      <span>
        <strong className="font-semibold text-white">LLM ON</strong>: uses{' '}
        <strong className="font-semibold text-white">your</strong> OpenAI API key from{' '}
        <Link
          href="/integrations"
          className="font-medium text-sky-300 underline underline-offset-2 hover:text-white"
        >
          Integrations → OpenAI
        </Link>
        . Deals and context are limited to your current workspace only.
      </span>
    </span>
  );
}

interface ConversationEntry {
  id: string;
  type: 'inbound' | 'outbound' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    intent?: string;
    fieldsExtracted?: string[];
    dealId?: string;
    processed?: boolean;
    inferredDealId?: string;
  };
}

/** Short labels → full messages for one-tap testing (matches assistant / intake patterns). */
const SIMULATOR_QUICK_REPLIES: { label: string; text: string }[] = [
  { label: 'Brokerage name', text: "What is my brokerage's name?" },
  { label: 'Active deals', text: 'What deals are active?' },
  { label: "What's next?", text: "What's next on this deal?" },
  { label: "What's missing?", text: "What's missing on this deal?" },
  { label: 'Hi', text: 'Hey!' },
  { label: 'New listing', text: 'Start listing 1403 Oak Street' },
  { label: 'Status', text: "What's the status of this deal?" },
  { label: 'Send docs', text: 'Can you send the listing documents for signature?' },
];

function AiProcessingTooltipBody({
  meta,
}: {
  meta: NonNullable<ConversationEntry['metadata']>;
}) {
  const fields =
    meta.fieldsExtracted && meta.fieldsExtracted.length > 0
      ? meta.fieldsExtracted.join(', ')
      : 'none';
  return (
    <span className="block max-w-xs space-y-2">
      <span className="block">
        <span className="font-semibold text-slate-200">Intent</span>
        <span className="mt-0.5 block text-white">{meta.intent ?? '—'}</span>
      </span>
      <span className="block">
        <span className="font-semibold text-slate-200">Deal</span>
        <span className="mt-0.5 block break-all font-mono text-[11px] text-white">{meta.dealId ?? '—'}</span>
      </span>
      {meta.inferredDealId ? (
        <span className="block">
          <span className="font-semibold text-slate-200">Inferred deal</span>
          <span className="mt-0.5 block break-all font-mono text-[11px] text-white">{meta.inferredDealId}</span>
        </span>
      ) : null}
      <span className="block">
        <span className="font-semibold text-slate-200">Fields extracted</span>
        <span className="mt-0.5 block text-white">{fields}</span>
      </span>
    </span>
  );
}

export function PhoneSimulatorContent({ layout }: { layout: 'page' | 'dock' }) {
  const [from, setFrom] = useState('+15551234567');
  const [message, setMessage] = useState('');
  const [useLLM, setUseLLM] = useState(true);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const fromHydratedRef = useRef(false);

  const simulate = useSimulateMessage();
  const { data: history } = useDebugHistory();
  const clearHistory = useClearDebugHistory();
  const { data: simPrefs } = useUserSimulatorPrefs();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fromHydratedRef.current && simPrefs?.agentFromE164) {
      setFrom(simPrefs.agentFromE164);
      fromHydratedRef.current = true;
    }
  }, [simPrefs?.agentFromE164]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  function appendSimulatorResult(result: MessagingSimulateResult) {
    const pr = result.processingResult;
    const entries: ConversationEntry[] = [];

    if (pr.processed === false) {
      entries.push({
        id: `sys-${Date.now()}`,
        type: 'system',
        content: `Not processed (${String(pr.reason ?? 'unknown')}). If you are signed in, simulated texts use an automatic sandbox thread—try again or check the API logs.`,
        timestamp: new Date().toISOString(),
        metadata: {
          intent: pr.intent,
          fieldsExtracted: pr.fieldsExtracted,
          dealId: pr.dealId,
          processed: false,
        },
      });
    } else if (pr.response) {
      entries.push({
        id: `resp-${Date.now()}`,
        type: 'outbound',
        content: String(pr.response),
        timestamp: new Date().toISOString(),
        metadata: {
          intent: pr.intent,
          fieldsExtracted: pr.fieldsExtracted,
          dealId: pr.dealId,
          processed: true,
          inferredDealId: pr.inferredDealId,
        },
      });
    } else {
      entries.push({
        id: `sys-${Date.now()}`,
        type: 'system',
        content: 'Processed but no reply text was returned.',
        timestamp: new Date().toISOString(),
        metadata: {
          intent: pr.intent,
          fieldsExtracted: pr.fieldsExtracted,
          dealId: pr.dealId,
          processed: true,
          inferredDealId: pr.inferredDealId,
        },
      });
    }

    setConversation((prev) => [...prev, ...entries]);
  }

  function submitSimulatorText(body: string) {
    const trimmed = body.trim();
    if (!trimmed || simulate.isPending) return;

    const entry: ConversationEntry = {
      id: `sent-${Date.now()}`,
      type: 'inbound',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setConversation((prev) => [...prev, entry]);

    simulate.mutate(
      { from, message: trimmed, useLLM: useLLM === true },
      {
        onSuccess: (result) => appendSimulatorResult(result),
        onError: (err) => {
          const msg =
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Request failed';
          setConversation((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              type: 'system',
              content: `Error: ${msg}`,
              timestamp: new Date().toISOString(),
            },
          ]);
        },
      },
    );
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    submitSimulatorText(message);
    setMessage('');
  }

  function handleQuickReply(text: string) {
    submitSimulatorText(text);
  }

  const llmToggleCompact = (
    <div className="flex items-center gap-1 text-[11px] leading-none">
      <label className="flex cursor-pointer items-center gap-1">
        <input
          type="checkbox"
          checked={useLLM}
          onChange={(e) => setUseLLM(e.target.checked)}
          className="size-3.5 rounded border-slate-300"
        />
        <span className={useLLM ? 'font-semibold text-green-700' : 'text-slate-500'}>
          {useLLM ? 'LLM' : 'Mock'}
        </span>
      </label>
      <Tooltip interactive content={<LlmModeTooltipBody />} className="shrink-0">
        <button
          type="button"
          className="flex size-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-semibold text-slate-500 hover:bg-slate-50"
          aria-label="LLM mode help"
        >
          ?
        </button>
      </Tooltip>
    </div>
  );

  const fromFieldCompact = (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <label htmlFor="phone-sim-from" className="shrink-0 text-[10px] font-medium text-slate-500">
        From
      </label>
      <Tooltip interactive content={<FromNumberTooltipBody />} className="shrink-0">
        <button
          type="button"
          className="flex size-4 shrink-0 items-center justify-center rounded-full border border-slate-200 text-[9px] font-bold text-slate-500 hover:bg-slate-100"
          aria-label="About the From number"
        >
          ?
        </button>
      </Tooltip>
      <input
        id="phone-sim-from"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        className="h-7 min-w-0 flex-1 rounded border border-slate-300 px-2 text-xs focus:border-brand-500 focus:outline-none"
      />
    </div>
  );

  const chatShellClass =
    layout === 'dock'
      ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm'
      : 'flex min-h-[min(78vh,820px)] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm';

  const chatCard = (
    <div className={chatShellClass}>
      <div
        className={`flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 ${layout === 'dock' ? 'px-2 py-1.5' : 'px-3 py-2'}`}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <div
            className={`flex shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 ${layout === 'dock' ? 'size-6' : 'size-7'}`}
          >
            <svg
              className={layout === 'dock' ? 'size-3' : 'size-3.5'}
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </div>
          <p className="truncate text-xs font-medium text-slate-900">{from}</p>
        </div>
        <Badge variant={useLLM ? 'green' : 'gray'} className="shrink-0 text-[10px]">
          {useLLM ? 'LLM' : 'MOCK'}
        </Badge>
      </div>

      <div
        className={`min-h-0 flex-1 basis-0 space-y-2 overflow-y-auto overflow-x-hidden bg-white overscroll-contain [-webkit-overflow-scrolling:touch] ${layout === 'dock' ? 'p-2' : 'p-3'}`}
        role="log"
        aria-label="Conversation"
      >
        {conversation.length === 0 && (
          <p className="mt-8 text-center text-xs text-slate-400">
            Send a message or tap a quick reply
          </p>
        )}
        {conversation.map((entry) => (
          <div
            key={entry.id}
            className={`flex ${
              entry.type === 'inbound'
                ? 'justify-end'
                : entry.type === 'system'
                  ? 'justify-center'
                  : 'justify-start'
            }`}
          >
            {entry.type === 'system' ? (
              <div className="max-w-[90%] rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800 ring-1 ring-amber-200">
                <div className="flex flex-wrap gap-1.5">
                  {entry.metadata?.intent && <Badge variant="blue">{entry.metadata.intent}</Badge>}
                  {entry.metadata?.dealId && (
                    <Badge variant="gray">Deal: {entry.metadata.dealId.slice(0, 8)}</Badge>
                  )}
                  {entry.metadata?.processed === false && <Badge variant="red">Not processed</Badge>}
                </div>
                <p className="mt-1">{entry.content}</p>
              </div>
            ) : (
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                  entry.type === 'inbound'
                    ? 'bg-brand-600 text-white'
                    : 'bg-purple-50 text-purple-900 ring-1 ring-purple-200'
                }`}
              >
                {entry.type === 'outbound' && (
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="text-xs font-semibold tracking-tight text-purple-900">AI</span>
                    {entry.metadata ? (
                      <Tooltip interactive content={<AiProcessingTooltipBody meta={entry.metadata} />}>
                        <button
                          type="button"
                          className="flex size-5 shrink-0 items-center justify-center rounded-full border border-purple-300/80 bg-white text-[10px] font-bold leading-none text-purple-700 shadow-sm hover:bg-purple-50 hover:text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1"
                          aria-label="Intent and processing details"
                        >
                          i
                        </button>
                      </Tooltip>
                    ) : null}
                  </div>
                )}
                <p className="whitespace-pre-wrap text-xs leading-snug">{entry.content}</p>
                <p className="mt-0.5 text-right text-[9px] opacity-60">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-1.5 pb-1.5 pt-1">
        <div className="-mx-0.5 mb-1 flex gap-1 overflow-x-auto overflow-y-hidden pb-0.5 [scrollbar-width:thin]">
          {SIMULATOR_QUICK_REPLIES.map((q) => (
            <button
              key={q.label}
              type="button"
              title={q.text}
              disabled={simulate.isPending}
              onClick={() => handleQuickReply(q.text)}
              className="shrink-0 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-0.5 text-left text-[10px] font-medium text-slate-700 shadow-sm hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSend} className="flex gap-1.5">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message…"
            className="h-8 min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-3 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <Button type="submit" size="sm" className="h-8 shrink-0 px-3 text-xs" disabled={simulate.isPending || !message.trim()}>
            {simulate.isPending ? '…' : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  );

  if (layout === 'dock') {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
        <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-1.5 py-1 shadow-sm">
          <div className="shrink-0 border-r border-slate-100 pr-1.5">{llmToggleCompact}</div>
          {fromFieldCompact}
          <Button
            variant="secondary"
            size="sm"
            type="button"
            className="h-7 shrink-0 px-2 text-[10px]"
            onClick={() => {
              clearHistory.mutate();
              setConversation([]);
            }}
          >
            Clear
          </Button>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{chatCard}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl min-h-0 flex-col gap-2 px-2 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Phone Simulator</h2>
          <p className="text-[11px] leading-snug text-slate-500">
            Sandbox thread + workspace deals. Use the floating phone button on any screen.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          className="h-8 text-xs"
          onClick={() => {
            clearHistory.mutate();
            setConversation([]);
          }}
        >
          Clear chat &amp; history
        </Button>
      </div>

      <div className="flex min-h-[min(82vh,880px)] min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 lg:min-h-[min(82vh,880px)]">
          <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
            <div className="shrink-0">{llmToggleCompact}</div>
            <div className="min-w-[200px] flex-1">{fromFieldCompact}</div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{chatCard}</div>
        </div>

        <Card className="flex max-h-48 min-h-0 w-full shrink-0 flex-col p-2 lg:max-h-none lg:w-44 lg:min-h-[min(82vh,880px)]">
          <h3 className="mb-1.5 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Debug log
          </h3>
          {!history || (Array.isArray(history) && history.length === 0) ? (
            <p className="text-[10px] text-slate-400">No messages</p>
          ) : (
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
              {(Array.isArray(history) ? history : []).map((msg: Record<string, unknown>) => (
                <div key={String(msg.id)} className="rounded border border-slate-100 bg-slate-50/80 p-1.5 text-[10px] leading-tight">
                  <div className="flex items-center justify-between gap-1">
                    <Badge variant={msg.direction === 'inbound' ? 'blue' : 'green'} className="text-[9px]">
                      {String(msg.direction)}
                    </Badge>
                    <span className="shrink-0 text-[9px] text-slate-400">
                      {new Date(String(msg.timestamp)).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-slate-600">{String(msg.body ?? '')}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
