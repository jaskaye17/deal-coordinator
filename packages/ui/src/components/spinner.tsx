'use client';

export interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className = '', label = 'Loading' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block size-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600 ${className}`}
    />
  );
}
