'use client';

import { useId } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  /** Visible text in the dropdown (native `<option>` supports text only). */
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'children'> {
  label?: ReactNode;
  options: SelectOption[];
  error?: string;
  id?: string;
  className?: string;
  selectClassName?: string;
}

export function Select({
  label,
  options,
  error,
  id: idProp,
  className = '',
  selectClassName = '',
  disabled,
  ...selectProps
}: SelectProps) {
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
      <div className="relative">
        <select
          id={id}
          disabled={disabled}
          aria-invalid={error != null && error !== '' ? true : undefined}
          aria-describedby={
            error != null && error !== '' ? errorId : undefined
          }
          className={`block w-full appearance-none rounded-md border bg-white py-2 pl-3 pr-10 text-sm text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
            error != null && error !== ''
              ? 'border-red-300 focus-visible:ring-red-500'
              : 'border-slate-200 hover:border-slate-300'
          } ${selectClassName}`}
          {...selectProps}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400"
          aria-hidden
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </div>
      {error != null && error !== '' ? (
        <p id={errorId} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
