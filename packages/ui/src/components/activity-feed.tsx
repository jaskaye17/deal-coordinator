'use client';

import type { ReactNode } from 'react';

export interface ActivityFeedItem {
  id: string;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  timestamp: Date | string | number;
  actor?: ReactNode;
}

export interface ActivityFeedProps {
  items: ActivityFeedItem[];
  className?: string;
}

function formatRelative(timestamp: Date | string | number): string {
  const d =
    typeof timestamp === 'string' || typeof timestamp === 'number'
      ? new Date(timestamp)
      : timestamp;
  const ms = Date.now() - d.getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function ActivityFeed({ items, className = '' }: ActivityFeedProps) {
  return (
    <ul className={`relative space-y-0 ${className}`} role="list">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-4 pb-8 last:pb-0">
            <div className="relative flex shrink-0 flex-col items-center">
              <div
                className={`relative z-10 flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm ${
                  item.icon == null ? 'text-xs font-semibold text-slate-400' : ''
                }`}
              >
                {item.icon != null ? (
                  item.icon
                ) : (
                  <span className="size-2 rounded-full bg-slate-300" />
                )}
              </div>
              {!isLast ? (
                <span
                  className="absolute left-1/2 top-9 h-[calc(100%-0.25rem)] w-px -translate-x-1/2 bg-slate-200"
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium text-slate-900">
                  {item.title}
                </span>
                <time
                  className="text-xs text-slate-400"
                  dateTime={
                    typeof item.timestamp === 'string' ||
                    typeof item.timestamp === 'number'
                      ? new Date(item.timestamp).toISOString()
                      : item.timestamp.toISOString()
                  }
                >
                  {formatRelative(item.timestamp)}
                </time>
              </div>
              {item.actor != null ? (
                <p className="mt-0.5 text-xs text-slate-500">{item.actor}</p>
              ) : null}
              {item.description != null ? (
                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
