'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_OPEN = 'phone-simulator-open';

type PhoneSimulatorContextValue = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  hydrated: boolean;
};

const PhoneSimulatorContext = createContext<PhoneSimulatorContextValue | null>(null);

export function PhoneSimulatorProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      if (sessionStorage.getItem(STORAGE_OPEN) === '1') {
        setIsOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    try {
      sessionStorage.setItem(STORAGE_OPEN, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(STORAGE_OPEN, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ isOpen, setOpen, toggle, hydrated }),
    [isOpen, setOpen, toggle, hydrated],
  );

  return (
    <PhoneSimulatorContext.Provider value={value}>{children}</PhoneSimulatorContext.Provider>
  );
}

export function usePhoneSimulator() {
  const ctx = useContext(PhoneSimulatorContext);
  if (!ctx) {
    throw new Error('usePhoneSimulator must be used within PhoneSimulatorProvider');
  }
  return ctx;
}
