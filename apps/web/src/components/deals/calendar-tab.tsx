'use client';

import { useState } from 'react';
import { Badge, Button, Card, EmptyState } from '@deal-coordinator/ui';
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useExtractKeyDates,
  useNotifyTitle,
  useNotifyLender,
} from '@/lib/hooks';
import type { CalendarEventRecord } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const EVENT_TYPE_LABELS: Record<string, string> = {
  earnest_money_deadline: 'Earnest Money',
  option_deadline: 'Option Period',
  financing_deadline: 'Financing',
  appraisal_deadline: 'Appraisal',
  closing_date: 'Closing',
  inspection: 'Inspection',
  walkthrough: 'Walkthrough',
  custom: 'Custom',
};

const EVENT_TYPE_VARIANT: Record<string, 'blue' | 'yellow' | 'green' | 'purple' | 'gray'> = {
  earnest_money_deadline: 'yellow',
  option_deadline: 'yellow',
  financing_deadline: 'blue',
  appraisal_deadline: 'blue',
  closing_date: 'green',
  inspection: 'purple',
  walkthrough: 'purple',
  custom: 'gray',
};

function NewEventForm({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const createEvent = useCreateCalendarEvent(dealId);
  const [form, setForm] = useState({ title: '', eventType: 'custom', startDate: '', description: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.startDate) return;
    await createEvent.mutateAsync({
      title: form.title,
      eventType: form.eventType,
      startDate: form.startDate,
      description: form.description || undefined,
    });
    onClose();
  };

  return (
    <Card title="Add Calendar Event">
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        <input
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Event title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />
        <select
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={form.eventType}
          onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}
        >
          {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          type="date"
          value={form.startDate}
          onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
          required
        />
        <input
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <div className="col-span-full flex gap-2">
          <Button type="submit" size="sm" disabled={createEvent.isPending}>
            {createEvent.isPending ? 'Adding…' : 'Add Event'}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function CalendarTab({ dealId }: { dealId: string }) {
  const { data: events, isLoading } = useCalendarEvents(dealId);
  const extractKeyDates = useExtractKeyDates(dealId);
  const notifyTitle = useNotifyTitle(dealId);
  const notifyLender = useNotifyLender(dealId);
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return <div className="animate-pulse h-32 rounded bg-slate-100" />;
  }

  const eventList: CalendarEventRecord[] = Array.isArray(events) ? events : [];

  const sortedEvents = [...eventList].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  const isPast = (date: string) => new Date(date) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Calendar & Key Dates ({eventList.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={extractKeyDates.isPending}
            onClick={() => extractKeyDates.mutate()}
          >
            {extractKeyDates.isPending ? 'Extracting…' : 'Extract Key Dates'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            Add Event
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={notifyTitle.isPending}
          onClick={() => notifyTitle.mutate({})}
        >
          {notifyTitle.isPending ? 'Notifying…' : 'Notify Title'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={notifyLender.isPending}
          onClick={() => notifyLender.mutate({})}
        >
          {notifyLender.isPending ? 'Notifying…' : 'Notify Lender'}
        </Button>
      </div>

      {showForm && <NewEventForm dealId={dealId} onClose={() => setShowForm(false)} />}

      {sortedEvents.length === 0 && !showForm ? (
        <EmptyState
          title="No calendar events"
          description='Use "Extract Key Dates" to auto-create events from contract data, or add them manually.'
        />
      ) : (
        <div className="space-y-2">
          {sortedEvents.map((event) => (
            <div
              key={event.id}
              className={`flex items-center gap-4 rounded-lg border px-4 py-3 ${
                isPast(event.startDate)
                  ? 'border-slate-200 bg-slate-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="min-w-[5rem] text-center">
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {new Date(event.startDate).getDate()}
                </div>
                <div className="text-xs uppercase text-slate-500">
                  {new Date(event.startDate).toLocaleString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{event.title}</span>
                  <Badge variant={EVENT_TYPE_VARIANT[event.eventType ?? 'custom'] ?? 'gray'}>
                    {EVENT_TYPE_LABELS[event.eventType ?? 'custom'] ?? event.eventType ?? 'Event'}
                  </Badge>
                  {isPast(event.startDate) && (
                    <Badge variant="gray">Past</Badge>
                  )}
                </div>
                {event.description && (
                  <p className="mt-1 text-xs text-slate-500">{event.description}</p>
                )}
              </div>
              <div className="text-xs text-slate-500 whitespace-nowrap">
                {formatDate(event.startDate)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
