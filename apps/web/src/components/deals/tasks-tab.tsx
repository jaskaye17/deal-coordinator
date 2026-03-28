'use client';

import { Badge, Button, Card, EmptyState } from '@deal-coordinator/ui';
import { useTasks, useUpdateTask, useActivateListingPrep } from '@/lib/hooks';
import { formatDate } from '@/lib/utils';
import type { TaskRecord } from '@/lib/types';

function humanize(s: string) {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function TaskItem({ task, dealId }: { task: TaskRecord; dealId: string }) {
  const update = useUpdateTask(task.id, dealId);
  const isCompleted = task.status === 'completed';

  const toggle = () => {
    update.mutate({
      status: isCompleted ? 'pending' : 'completed',
    });
  };

  return (
    <li className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={toggle}
        disabled={update.isPending}
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${
          isCompleted
            ? 'border-green-500 bg-green-500 text-white'
            : 'border-slate-300 bg-white hover:border-brand-500'
        }`}
      >
        {isCompleted && (
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm font-medium ${
              isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'
            }`}
          >
            {task.title}
          </span>
          {task.category && <Badge variant="gray">{humanize(task.category)}</Badge>}
          {isCompleted && <Badge variant="green">Done</Badge>}
        </div>
        {task.description && (
          <p className={`mt-0.5 text-sm ${isCompleted ? 'text-slate-400' : 'text-slate-500'}`}>
            {task.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          {task.dueDate && (
            <span>Due {formatDate(task.dueDate)}</span>
          )}
          {task.assignedTo && (
            <span>Assigned: {task.assignedTo}</span>
          )}
          {task.completedAt && (
            <span>Completed {formatDate(task.completedAt)}</span>
          )}
        </div>
      </div>
    </li>
  );
}

export function TasksTab({ dealId }: { dealId: string }) {
  const { data: tasks, isLoading, isError } = useTasks(dealId);
  const activateListingPrep = useActivateListingPrep(dealId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Could not load tasks"
        description="Check your connection and try again."
      />
    );
  }

  const allTasks = tasks ?? [];
  const hasListingPrep = allTasks.some((t) => t.category === 'listing_prep');
  const completed = allTasks.filter((t) => t.status === 'completed').length;

  const grouped = allTasks.reduce<Record<string, TaskRecord[]>>((acc, task) => {
    const cat = task.category ?? 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {});

  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const aMin = Math.min(...(grouped[a] ?? []).map((t) => t.sortOrder));
    const bMin = Math.min(...(grouped[b] ?? []).map((t) => t.sortOrder));
    return aMin - bMin;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-slate-700">
            {allTasks.length} task{allTasks.length !== 1 ? 's' : ''}
          </h3>
          {allTasks.length > 0 && (
            <span className="text-xs text-slate-500">
              {completed}/{allTasks.length} completed
            </span>
          )}
        </div>
        {!hasListingPrep && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={activateListingPrep.isPending}
            onClick={() => activateListingPrep.mutate()}
          >
            {activateListingPrep.isPending ? 'Activating…' : 'Activate Listing Prep'}
          </Button>
        )}
      </div>

      {activateListingPrep.isError && (
        <p className="text-sm text-red-600">
          Failed to activate listing prep. Please try again.
        </p>
      )}

      {allTasks.length === 0 ? (
        <Card>
          <EmptyState
            title="No tasks yet"
            description="Tasks will appear here when checklists are activated for this deal."
          />
        </Card>
      ) : (
        sortedCategories.map((category) => {
          const categoryTasks = (grouped[category] ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
          const catCompleted = categoryTasks.filter((t) => t.status === 'completed').length;
          return (
            <Card key={category} title={humanize(category)}>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all"
                    style={{ width: `${categoryTasks.length > 0 ? (catCompleted / categoryTasks.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-slate-500">
                  {catCompleted}/{categoryTasks.length}
                </span>
              </div>
              <ul>
                {categoryTasks.map((task) => (
                  <TaskItem key={task.id} task={task} dealId={dealId} />
                ))}
              </ul>
            </Card>
          );
        })
      )}
    </div>
  );
}
