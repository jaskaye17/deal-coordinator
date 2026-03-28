'use client';

import {
  useState,
  useRef,
  useId,
  useLayoutEffect,
  useCallback,
  Children,
  isValidElement,
  cloneElement,
  type ReactElement,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

export type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  /** Extra classes on the trigger wrapper */
  className?: string;
  /**
   * When true, tooltip stays open briefly when moving pointer to it (for links inside).
   * Tooltip receives pointer events.
   */
  interactive?: boolean;
};

/**
 * Tooltip rendered in a document body portal so it is not clipped by overflow:hidden ancestors.
 * Shows on hover or when the trigger receives focus.
 */
export function Tooltip({
  content,
  children,
  className = '',
  interactive = false,
}: TooltipProps) {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipStyle, setTipStyle] = useState<CSSProperties>({});
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tip = tipRef.current;
    if (!trigger || !tip) return;

    const tr = trigger.getBoundingClientRect();
    const margin = 8;
    const gap = 6;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;

    let left = tr.left + tr.width / 2 - tw / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));

    let top = tr.top - gap - th;
    if (top < margin) {
      top = tr.bottom + gap;
    }

    setTipStyle({
      position: 'fixed',
      left,
      top,
      zIndex: 9999,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const tip = tipRef.current;
    const ro = tip ? new ResizeObserver(() => updatePosition()) : null;
    if (tip) ro?.observe(tip);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      ro?.disconnect();
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    cancelHide();
    setOpen(true);
  }, [cancelHide]);

  const hide = useCallback(() => {
    cancelHide();
    if (interactive) {
      hideTimerRef.current = setTimeout(() => setOpen(false), 180);
    } else {
      setOpen(false);
    }
  }, [cancelHide, interactive]);

  const triggerChild = (() => {
    try {
      const only = Children.only(children);
      if (isValidElement(only)) {
        const prev = (only.props as { 'aria-describedby'?: string })['aria-describedby'];
        return cloneElement(only as ReactElement<{ 'aria-describedby'?: string }>, {
          'aria-describedby': open ? tipId : prev,
        });
      }
    } catch {
      /* not a single child */
    }
    return children;
  })();

  const tooltipNode =
    open && mounted ? (
      <div
        ref={tipRef}
        role="tooltip"
        id={tipId}
        onMouseEnter={interactive ? show : undefined}
        onMouseLeave={interactive ? hide : undefined}
        className={`w-max max-w-[min(20rem,calc(100vw-1rem))] rounded-md bg-slate-800 px-2.5 py-2 text-left text-xs font-normal leading-snug text-white shadow-lg ring-1 ring-slate-700/80 ${
          interactive ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={tipStyle}
      >
        {content}
      </div>
    ) : null;

  return (
    <>
      <span
        ref={triggerRef}
        className={`inline-flex align-middle ${className}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {triggerChild}
      </span>
      {mounted && tooltipNode ? createPortal(tooltipNode, document.body) : null}
    </>
  );
}
