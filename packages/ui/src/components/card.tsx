import type { ReactNode } from 'react';

export interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Rendered in the header row (e.g. Edit / Save actions). */
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Card({
  title,
  description,
  actions,
  footer,
  children,
  className = '',
}: CardProps) {
  const hasHeader = title != null || description != null || actions != null;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {hasHeader ? (
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {title != null ? (
                <h3 className="text-base font-semibold tracking-tight text-slate-900">
                  {title}
                </h3>
              ) : null}
              {description != null ? (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              ) : null}
            </div>
            {actions != null ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
            ) : null}
          </div>
        </div>
      ) : null}
      {children != null ? <div className="px-5 py-4">{children}</div> : null}
      {footer != null ? (
        <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
