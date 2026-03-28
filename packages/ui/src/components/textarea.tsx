'use client';

import { useId } from 'react';
import type { ReactNode, TextareaHTMLAttributes } from 'react';

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label?: ReactNode;
  error?: string;
  id?: string;
  className?: string;
  textareaClassName?: string;
}

export function Textarea({
  label,
  error,
  id: idProp,
  className = '',
  textareaClassName = '',
  disabled,
  rows = 4,
  ...textareaProps
}: TextareaProps) {
  const uid = useId();
  const id = idProp ?? uid;
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      {label != null ? (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      ) : null}
      <textarea
        id={id}
        rows={rows}
        disabled={disabled}
        aria-invalid={error != null && error !== '' ? true : undefined}
        aria-describedby={
          error != null && error !== '' ? errorId : undefined
        }
        className={`block w-full resize-y rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
          error != null && error !== ''
            ? 'border-red-300 focus-visible:ring-red-500'
            : 'border-slate-200 hover:border-slate-300'
        } ${textareaClassName}`}
        {...textareaProps}
      />
      {error != null && error !== '' ? (
        <p id={errorId} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
