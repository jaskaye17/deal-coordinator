'use client';

import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { digitsFromPhone, formatPhoneMask } from '@/lib/contact-validation';
import { US_STATES } from '@/lib/us-states';
import { SETTINGS_FIELD_INPUT_CLASS } from './field-classes';

export function MaskedPhoneInput({
  digits,
  onDigitsChange,
  id,
  className,
  disabled,
}: {
  digits: string;
  onDigitsChange: (digits: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
}) {
  const fc = className ?? SETTINGS_FIELD_INPUT_CLASS;
  return (
    <input
      id={id}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      disabled={disabled}
      value={formatPhoneMask(digits)}
      onChange={(e) => onDigitsChange(digitsFromPhone(e.target.value))}
      placeholder="(555) 555-5555"
      className={fc}
    />
  );
}

export function ZipInput({
  value,
  onChange,
  id,
  className,
  disabled,
}: {
  value: string;
  onChange: (zipFive: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
}) {
  const fc = className ?? SETTINGS_FIELD_INPUT_CLASS;
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="postal-code"
      maxLength={5}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 5))}
      placeholder="12345"
      className={fc}
    />
  );
}

export function SearchableStateSelect({
  value,
  onChange,
  id,
  className,
}: {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [floatingStyle, setFloatingStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    if (!triggerRef.current) return;

    function updatePosition() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const margin = 8;
      const maxPanel = 280;
      const spaceBelow = window.innerHeight - r.bottom - margin;
      const spaceAbove = r.top - margin;
      const preferBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
      let top: number;
      let maxHeight: number;
      if (preferBelow) {
        maxHeight = Math.min(maxPanel, Math.max(120, spaceBelow));
        top = r.bottom + 4;
      } else {
        maxHeight = Math.min(maxPanel, Math.max(120, spaceAbove));
        top = r.top - maxHeight - 4;
      }
      setFloatingStyle({
        position: 'fixed',
        top,
        left: r.left,
        width: r.width,
        maxHeight,
        zIndex: 100,
      });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
      setQuery('');
    }
    if (open) {
      document.addEventListener('mousedown', handle);
      return () => document.removeEventListener('mousedown', handle);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return US_STATES;
    return US_STATES.filter(
      (s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    );
  }, [query]);

  const selected = US_STATES.find((s) => s.code === value);
  const fc = className ?? SETTINGS_FIELD_INPUT_CLASS;

  const dropdown =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            style={floatingStyle}
            className="flex flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
            role="listbox"
          >
            <input
              className="w-full shrink-0 border-b border-slate-100 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-inset focus:ring-brand-500"
              placeholder="Search states…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              autoFocus
            />
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                  setQuery('');
                }}
              >
                Clear
              </button>
              {filtered.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  role="option"
                  aria-selected={value === s.code}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    value === s.code ? 'bg-brand-50 font-medium text-brand-900' : 'text-slate-900'
                  }`}
                  onClick={() => {
                    onChange(s.code);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  {s.code} — {s.name}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={`${fc} flex w-full items-center justify-between gap-2 text-left`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected ? `${selected.code} — ${selected.name}` : 'Select state'}
        </span>
        <span className="shrink-0 text-slate-400" aria-hidden>
          ▾
        </span>
      </button>
      {dropdown}
    </div>
  );
}
