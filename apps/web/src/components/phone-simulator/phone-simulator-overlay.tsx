'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePhoneSimulator } from '@/lib/context/phone-simulator-context';
import { PhoneSimulatorContent } from './phone-simulator-content';

const POS_KEY = 'phone-simulator-pos';

export function PhoneSimulatorOverlay() {
  const { isOpen, setOpen, toggle, hydrated } = usePhoneSimulator();
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { x: number; y: number };
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          setPos(p);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const savePos = useCallback((p: { x: number; y: number }) => {
    try {
      sessionStorage.setItem(POS_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const handle = (e.target as HTMLElement).closest('[data-drag-handle]') as HTMLElement | null;
      if (!handle) return;
      e.preventDefault();
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      handle.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const w = rect.width;
        const h = rect.height;
        let nx = ev.clientX - offsetX;
        let ny = ev.clientY - offsetY;
        nx = Math.max(8, Math.min(nx, window.innerWidth - w - 8));
        ny = Math.max(8, Math.min(ny, window.innerHeight - h - 8));
        setPos({ x: nx, y: ny });
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        try {
          handle.releasePointerCapture(ev.pointerId);
        } catch {
          /* ignore */
        }
        setPos((current) => {
          if (current) savePos(current);
          return current;
        });
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [savePos],
  );

  if (!hydrated) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label={isOpen ? 'Close phone simulator' : 'Open phone simulator'}
        aria-expanded={isOpen}
        onClick={() => toggle()}
        className="fixed bottom-6 right-6 z-[140] flex size-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg ring-2 ring-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      >
        <svg className="size-7" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
        </svg>
      </button>

      {isOpen ? (
        <div
          ref={panelRef}
          className={`fixed z-[130] flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-2xl ring-1 ring-black/5 ${
            minimized
              ? 'h-12 w-[min(360px,calc(100vw-2rem))]'
              : 'h-[min(88vh,calc(100vh-3.5rem))] w-[min(400px,calc(100vw-2rem))]'
          }`}
          style={
            pos !== null
              ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
              : { right: 24, bottom: 96, left: 'auto', top: 'auto' }
          }
        >
          <div
            data-drag-handle
            onPointerDown={onPointerDown}
            className="flex h-11 shrink-0 cursor-grab select-none items-center justify-between border-b border-slate-200 bg-white px-3 active:cursor-grabbing"
          >
            <span className="text-sm font-semibold text-slate-800">Phone simulator</span>
            <div
              className="flex items-center gap-0.5"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label={minimized ? 'Expand' : 'Minimize'}
                onClick={() => setMinimized((m) => !m)}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                {minimized ? (
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setOpen(false);
                  setMinimized(false);
                }}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          {!minimized ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 pb-2 pt-1">
              <PhoneSimulatorContent layout="dock" />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
