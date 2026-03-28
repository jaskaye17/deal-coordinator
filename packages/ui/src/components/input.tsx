'use client';

import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'> {
  label?: ReactNode;
  error?: string;
  helperText?: ReactNode;
  id?: string;
  className?: string;
  inputClassName?: string;
}

export function Input({
  label,
  error,
  helperText,
  id: idProp,
  className = '',
  inputClassName = '',
  disabled,
  ...inputProps
}: InputProps) {
  const uid = useId();
  const id = idProp ?? uid;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const describedBy = [
    error ? errorId : null,
    helperText && !error ? helperId : null,
  ]
    .filter(Boolean)
    .join(' ');

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
      <input
        id={id}
        disabled={disabled}
        aria-invalid={error != null && error !== '' ? true : undefined}
        aria-describedby={describedBy !== '' ? describedBy : undefined}
        className={`block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
          error != null && error !== ''
            ? 'border-red-300 focus-visible:ring-red-500'
            : 'border-slate-200 hover:border-slate-300'
        } ${inputClassName}`}
        {...inputProps}
      />
      {error != null && error !== '' ? (
        <p id={errorId} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : helperText != null ? (
        <p id={helperId} className="mt-1.5 text-sm text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
