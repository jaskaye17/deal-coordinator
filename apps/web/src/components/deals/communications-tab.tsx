'use client';

import { useState } from 'react';
import { Badge, Button, Card, EmptyState, Spinner } from '@deal-coordinator/ui';
import { useCommunications, useSendMessage } from '@/lib/hooks';
import type { Communication } from '@/lib/types/deal';

interface Props {
  dealId: string;
}

function MessageBubble({ message }: { message: Communication }) {
  const isOutbound = message.direction === 'outbound';
  const isAI = Boolean(message.metadata?.aiGenerated);
  const channel = message.metadata?.channel ?? message.type;

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
          isOutbound
            ? isAI
              ? 'bg-purple-50 text-purple-900 ring-1 ring-purple-200'
              : 'bg-brand-600 text-white'
            : 'bg-slate-100 text-slate-900'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium opacity-75">
            {message.senderName ?? (isOutbound ? 'You' : 'Unknown')}
          </span>
          {isAI && (
            <Badge variant="purple" className="text-[10px]">
              AI
            </Badge>
          )}
          {channel ? (
            <span className="text-[10px] uppercase opacity-50">{channel}</span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm whitespace-pre-wrap">{message.content}</p>
        <p className="mt-1 text-right text-[10px] opacity-50">
          {new Date(message.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function SendMessageForm({ dealId }: { dealId: string }) {
  const sendMessage = useSendMessage();
  const [channel, setChannel] = useState('sms');
  const [recipient, setRecipient] = useState('');
  const [content, setContent] = useState('');
  const [expanded, setExpanded] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage.mutate(
      { dealId, channel, recipient, content },
      {
        onSuccess: () => {
          setContent('');
          setExpanded(false);
        },
      },
    );
  }

  if (!expanded) {
    return (
      <Button size="sm" onClick={() => setExpanded(true)} className="w-full">
        Send Message
      </Button>
    );
  }

  return (
    <Card className="p-3">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="imessage">iMessage</option>
          </select>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Phone or contact"
            required
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your message..."
          required
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={sendMessage.isPending || !content || !recipient}
          >
            {sendMessage.isPending ? 'Sending...' : 'Send'}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setExpanded(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function CommunicationsTab({ dealId }: Props) {
  const { data, isLoading, isError } = useCommunications(dealId);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="Could not load communications"
        description="Check your connection and try again."
      />
    );
  }

  const chronological = [...data.data].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="space-y-4">
      <SendMessageForm dealId={dealId} />

      {chronological.length > 0 ? (
        <div className="space-y-3">
          {chronological.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No messages yet"
          description="Messages from SMS, WhatsApp, iMessage, and system communications will appear here."
        />
      )}
    </div>
  );
}
