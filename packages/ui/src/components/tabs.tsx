'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const scrollHideClass =
  '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={dir === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
      />
    </svg>
  );
}

export interface TabItem {
  key: string;
  label: ReactNode;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  /** Controlled active tab key */
  activeTab?: string;
  onTabChange?: (key: string) => void;
  className?: string;
  tabListClassName?: string;
  panelClassName?: string;
}

export function Tabs({
  tabs,
  activeTab: activeTabProp,
  onTabChange,
  className = '',
  tabListClassName = '',
  panelClassName = '',
}: TabsProps) {
  const firstKey = tabs[0]?.key ?? '';
  const [internalKey, setInternalKey] = useState(firstKey);

  const isControlled = activeTabProp !== undefined;
  const activeKey = isControlled ? activeTabProp : internalKey;

  useEffect(() => {
    if (!isControlled && firstKey && !tabs.some((t) => t.key === internalKey)) {
      setInternalKey(firstKey);
    }
  }, [firstKey, internalKey, isControlled, tabs]);

  const setActive = useCallback(
    (key: string) => {
      onTabChange?.(key);
      if (!isControlled) {
        setInternalKey(key);
      }
    },
    [isControlled, onTabChange],
  );

  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  const tabKeysFingerprint = tabs.map((t) => t.key).join('|');

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  const updateScrollAffordance = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const eps = 3;
    const over = scrollWidth > clientWidth + eps;
    setOverflowing(over);
    setCanScrollLeft(over && scrollLeft > eps);
    setCanScrollRight(over && scrollLeft + clientWidth < scrollWidth - eps);
  }, []);

  useLayoutEffect(() => {
    updateScrollAffordance();
  }, [tabKeysFingerprint, updateScrollAffordance]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => updateScrollAffordance());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollAffordance]);

  useLayoutEffect(() => {
    const root = scrollerRef.current;
    const btn = root?.querySelector(`#tab-${CSS.escape(activeKey)}`) as HTMLElement | null;
    if (root && btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeKey]);

  const scrollTabs = useCallback((dir: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = Math.min(Math.floor(el.clientWidth * 0.65), 280);
    el.scrollBy({ left: dir === 'left' ? -delta : delta, behavior: 'smooth' });
  }, []);

  return (
    <div className={className}>
      <div
        className={`flex min-w-0 items-stretch border-b border-slate-200 ${tabListClassName}`}
      >
        {overflowing ? (
          <button
            type="button"
            className={`flex w-9 shrink-0 items-center justify-center border-r border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 ${
              canScrollLeft ? '' : 'pointer-events-none opacity-30'
            }`}
            aria-label="Scroll tabs left"
            disabled={!canScrollLeft}
            onClick={() => scrollTabs('left')}
          >
            <ChevronIcon dir="left" />
          </button>
        ) : null}
        <div
          ref={scrollerRef}
          onScroll={updateScrollAffordance}
          className={`min-w-0 flex-1 overflow-x-auto scroll-smooth ${scrollHideClass}`}
        >
          <div role="tablist" className="flex w-max min-w-full gap-1">
            {tabs.map((tab) => {
              const selected = tab.key === activeKey;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  id={`tab-${tab.key}`}
                  aria-controls={`tabpanel-${tab.key}`}
                  onClick={() => {
                    setActive(tab.key);
                  }}
                  className={`relative -mb-px shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
                    selected
                      ? 'text-slate-900'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                  {selected ? (
                    <span
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-slate-900"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        {overflowing ? (
          <button
            type="button"
            className={`flex w-9 shrink-0 items-center justify-center border-l border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 ${
              canScrollRight ? '' : 'pointer-events-none opacity-30'
            }`}
            aria-label="Scroll tabs right"
            disabled={!canScrollRight}
            onClick={() => scrollTabs('right')}
          >
            <ChevronIcon dir="right" />
          </button>
        ) : null}
      </div>
      <div
        role="tabpanel"
        id={active ? `tabpanel-${active.key}` : undefined}
        aria-labelledby={active ? `tab-${active.key}` : undefined}
        className={`pt-4 ${panelClassName}`}
      >
        {active?.content}
      </div>
    </div>
  );
}
